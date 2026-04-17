import {
  useParams,
  useNavigate,
  useLocation as useRouterLocation,
} from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import { products } from '../../data/products'; // REMOVED
// import { categories } from '../../data/categories'; // REMOVED
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import { getProductById } from "../../services/api/customerProductService";
import WishlistButton from "../../components/WishlistButton";
import StarRating from "../../components/ui/StarRating";
import { calculateProductPrice } from "../../utils/priceUtils";
import { useToast } from "../../context/ToastContext";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { cart, addToCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const { startLoading, stopLoading } = useLoading();
  const { showToast } = useToast();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [isProductDetailsExpanded, setIsProductDetailsExpanded] =
    useState(false);
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  const [product, setProduct] = useState<any>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailableAtLocation, setIsAvailableAtLocation] =
    useState<boolean>(true);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      startLoading();
      try {
        // Check if navigation came from store page
        const fromStore = (routerLocation.state as any)?.fromStore === true;

        // Fetch product details with location
        const response = await getProductById(
          id,
          location?.latitude,
          location?.longitude
        );
        if (response.success && response.data) {
          const productData = response.data as any;

          // Set location availability flag
          setIsAvailableAtLocation(productData.isAvailableAtLocation !== false);

          // Get all images (main + gallery)
          const allImages = [
            productData.mainImage || productData.imageUrl || "",
            ...(productData.galleryImages ||
              productData.galleryImageUrls ||
              []),
          ].filter(Boolean);

          setProduct({
            ...productData,
            // Ensure all critical fields have safe defaults
            id: productData._id || productData.id,
            name: productData.productName || productData.name || "Product",
            imageUrl: productData.mainImage || productData.imageUrl || "",
            allImages: allImages,
            price: productData.price || 0,
            mrp: productData.mrp || productData.price || 0,
            pack:
              productData.variations?.[0]?.title ||
              productData.variations?.[0]?.value ||
              productData.smallDescription ||
              "Standard",
          });

          // Reset selected variant and image when product changes
          setSelectedVariantIndex(0);
          setSelectedImageIndex(0);
          setSimilarProducts(response.data.similarProducts || []);

          // Fetch reviews
          fetchReviews(id);
        } else {
          setProduct(null);
          setError(response.message || "Product not found");
        }
      } catch (error: any) {
        console.error("Failed to fetch product", error);
        setProduct(null);
        setError(
          error.message || "Something went wrong while fetching product details"
        );
      } finally {
        setLoading(false);
        stopLoading();
      }
    };

    const fetchReviews = async (productId: string) => {
      setReviewsLoading(true);
      try {
        const { getProductReviews } = await import(
          "../../services/api/customerReviewService"
        );
        const res = await getProductReviews(productId);
        if (res.success) {
          setReviews(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchProduct();
  }, [id, location?.latitude, location?.longitude]);

  // Get selected variant
  const selectedVariant = product?.variations?.[selectedVariantIndex] || null;
  const {
    displayPrice: variantPrice,
    mrp: variantMrp,
    discount,
    hasDiscount,
  } = calculateProductPrice(product, selectedVariantIndex);

  const variantStock =
    selectedVariant?.stock !== undefined
      ? selectedVariant.stock
      : product?.stock || 0;
  const variantTitle =
    selectedVariant?.title ||
    selectedVariant?.value ||
    product?.pack ||
    "Standard";
  const isVariantAvailable =
    selectedVariant?.status !== "Sold out" &&
    (variantStock > 0 || variantStock === 0); // 0 means unlimited

  // Get all images for gallery
  const allImages =
    product?.allImages || [product?.imageUrl || ""].filter(Boolean);
  const currentImage = allImages[selectedImageIndex] || product?.imageUrl || "";

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  // Handle touch start
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // Handle touch end - perform swipe
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedImageIndex < allImages.length - 1) {
      setIsTransitioning(true);
      setSelectedImageIndex(selectedImageIndex + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }

    if (isRightSwipe && selectedImageIndex > 0) {
      setIsTransitioning(true);
      setSelectedImageIndex(selectedImageIndex - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  // Get quantity in cart - check by product ID and variant if available
  const cartItem = product
    ? cart.items.find((item) => {
      if (!item?.product) return false;
      const itemProductId = item.product.id || item.product._id;
      const productId = product.id || product._id;

      if (itemProductId !== productId) return false;

      // If product has variations, we need to match the selected one
      if (product.variations && product.variations.length > 0) {
        if (selectedVariant) {
          const itemVariantId =
            (item.product as any).variantId ||
            (item.product as any).selectedVariant?._id;
          const itemVariantTitle =
            (item.product as any).variantTitle || (item.product as any).pack;

          return (
            itemVariantId === selectedVariant._id ||
            itemVariantTitle === variantTitle ||
            (itemVariantId && itemVariantId === variantTitle)
          );
        }
        // If product has variations but none selected (shouldn't happen), don't match
        return false;
      }

      // If product has NO variations, any item with this product ID in cart is a match
      return true;
    })
    : null;
  const inCartQty = cartItem?.quantity || 0;

  if (loading && !product) {
    return null; // Let the global IconLoader handle this
  }

  if (error && !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center bg-white">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h3>
        <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors">
          Try Refreshing
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 md:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-lg md:text-xl font-semibold text-neutral-900 mb-4">
            Product not found
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Get category info - safe access
  const category =
    product.category && product.category.name
      ? { name: product.category.name, id: product.category._id }
      : null;

  const handleAddToCart = () => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      showToast('Login to continue', 'info');
      navigate('/login');
      return;
    }

    if (!isAvailableAtLocation) {
      // Show alert if trying to add item outside delivery area
      alert("This product is not available for delivery at your location.");
      return;
    }
    if (!isVariantAvailable && variantStock !== 0) {
      alert("This variant is currently out of stock.");
      return;
    }
    // Create product with selected variant info
    const productWithVariant = {
      ...product,
      price: variantPrice,
      mrp: variantMrp,
      pack: variantTitle,
      selectedVariant: selectedVariant,
      variantId: selectedVariant?._id,
      variantTitle: variantTitle,
    };
    addToCart(productWithVariant, addButtonRef.current);
  };

  return (
    <>
      <div className="min-h-screen bg-white pb-24">
      {/* Header with back button and action icons */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-12 py-3 md:py-6">
          {/* Back button - top left */}
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-lg border border-neutral-100/50 hover:bg-neutral-50 transition-all hover:scale-110 pointer-events-auto"
            aria-label="Go back">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
            </svg>
          </button>

          {/* Action icons - top right */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Heart icon */}
            {product?.id && (
              <WishlistButton
                productId={product.id}
                size="md"
                className="bg-white rounded-full shadow-lg border border-neutral-100/50 hover:scale-110 transition-transform"
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content Container - Centered and constrained on desktop */}
      <div className="max-w-6xl mx-auto md:px-8 pt-12 md:pt-16 lg:pt-20">
        <div className="md:flex md:gap-8 lg:gap-12">
          
          {/* Left Column: Image Gallery (Sticky on Desktop) */}
          <div className="md:w-1/2 lg:w-[450px] md:sticky md:top-20 h-fit">
        {/* Location Availability Banner */}
        {!isAvailableAtLocation && (
          <div className="bg-amber-50 border-l-4 border-amber-500 px-4 py-3 mx-4 mt-4 rounded-r-lg">
            <div className="flex items-start gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-shrink-0 mt-0.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#f59e0b" />
                <path
                  d="M2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Not available at your location
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  This product cannot be delivered to your current location. You
                  can browse but cannot add to cart.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Product Image Gallery */}
        <div className="relative w-full bg-white overflow-hidden">
          {/* Main Product Image - Swipeable on mobile */}
          <div
            className="w-full aspect-square relative overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              touchAction: allImages.length > 1 ? "pan-x" : "pan-y pinch-zoom",
              cursor: allImages.length > 1 ? "grab" : "default",
            }}>
            {/* Image Container with swipe animation - Mobile swipe carousel */}
            <div
              className="w-full h-full flex transition-transform duration-300 ease-out md:hidden"
              style={{
                transform: `translateX(-${selectedImageIndex * 100}%)`,
              }}>
              {allImages.map((image: string, index: number) => (
                  <div
                    key={index}
                    className="w-full h-full flex-shrink-0 flex items-center justify-center relative p-8"
                    style={{ minWidth: "100%" }}>
                    {image ? (
                      <img
                        src={image}
                        alt={`${product.name} - Image ${index + 1}`}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                        draggable={false}
                      />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-6xl">
                      {(product.name || product.productName || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: Single image display with zoom effect */}
            <div className="hidden md:flex w-full h-full items-center justify-center p-4">
              {currentImage ? (
                <div className="w-full h-full relative group/image overflow-hidden rounded-2xl bg-white shadow-sm border border-neutral-50">
                  <img
                    src={currentImage}
                    alt={product.name}
                    className="w-full h-full object-contain p-2 group-hover/image:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white rounded-3xl text-neutral-400 text-6xl shadow-inner italic font-serif">
                  {(product.name || product.productName || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            {/* Image Gallery Navigation - Only show if multiple images */}
            {allImages.length > 1 && (
              <>
                {/* Previous Image Button - Desktop only */}
                {selectedImageIndex > 0 && (
                  <button
                    onClick={() => {
                      setIsTransitioning(true);
                      setSelectedImageIndex(selectedImageIndex - 1);
                      setTimeout(() => setIsTransitioning(false), 300);
                    }}
                    className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 backdrop-blur-md rounded-full items-center justify-center shadow-xl border border-neutral-100 hover:bg-white hover:scale-110 transition-all z-10 text-neutral-900"
                    aria-label="Previous image">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                )}

                {/* Next Image Button - Desktop only */}
                {selectedImageIndex < allImages.length - 1 && (
                  <button
                    onClick={() => {
                      setIsTransitioning(true);
                      setSelectedImageIndex(selectedImageIndex + 1);
                      setTimeout(() => setIsTransitioning(false), 300);
                    }}
                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 backdrop-blur-md rounded-full items-center justify-center shadow-xl border border-neutral-100 hover:bg-white hover:scale-110 transition-all z-10 text-neutral-900"
                    aria-label="Next image">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                )}

                {/* Image Indicators - Show on both mobile and desktop */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 md:hidden">
                  {allImages.map((_: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        setIsTransitioning(true);
                        setSelectedImageIndex(index);
                        setTimeout(() => setIsTransitioning(false), 300);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${index === selectedImageIndex
                        ? "bg-white w-6"
                        : "bg-white/50 hover:bg-white/75"
                        }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop Thumbnail Gallery */}
          <div className="hidden md:flex gap-4 mt-8 px-4 overflow-x-auto scrollbar-hide pb-2">
            {allImages.map((image: string, index: number) => (
              <button
                key={index}
                onClick={() => {
                  setIsTransitioning(true);
                  setSelectedImageIndex(index);
                  setTimeout(() => setIsTransitioning(false), 300);
                }}
                className={`flex-shrink-0 w-24 h-24 rounded-[20px] overflow-hidden border-2 transition-all duration-300 ${index === selectedImageIndex
                  ? "border-green-600 shadow-xl shadow-green-100 scale-105"
                  : "border-neutral-100 hover:border-neutral-200 opacity-60 hover:opacity-100"
                  }`}>
                <img
                  src={image}
                  alt={`${product.name} - ${index + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

          {/* Right Column: Information Sections (Scrollable on Desktop) */}
          <div className="flex-1 md:bg-white md:rounded-[32px] md:shadow-sm md:border md:border-neutral-100 md:p-6 md:mb-10">
            
            {/* Location Availability Banner */}
            {!isAvailableAtLocation && (
              <div className="bg-amber-50 border-l-4 border-amber-500 px-4 py-3 md:mb-8 rounded-r-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 10-8-7-8 7V21h16V10z"/><path d="M12 22V12"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-amber-900 uppercase tracking-widest">Not available here</p>
                    <p className="text-xs text-amber-800 font-medium mt-1">This product cannot be delivered to your current location.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Product Details Header */}
            <div className="md:mb-5">
              {/* Desktop back-to-department breadcrumb breadcrumb */}
              <div className="hidden md:flex items-center gap-1.5 mb-3">
                <button onClick={() => navigate(-1)} className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-green-600 transition-colors">Catalog</button>
                <span className="text-neutral-200 text-[10px]">/</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-green-600 truncate">{category?.name || 'Department'}</span>
              </div>

              {/* Delivery time */}
              <div className="flex items-center gap-2 mb-2 bg-white md:w-fit md:px-3 md:py-1 md:rounded-full border border-neutral-100">
                <div className="w-4 h-4 bg-green-100/50 rounded-full flex items-center justify-center text-green-600">
                   <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <span className="text-[9px] md:text-[10px] text-neutral-600 font-black uppercase tracking-widest">17 MINS DELIVERY</span>
              </div>

              {/* Rating Summary (Reference look) */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-neutral-400">({reviews.length > 0 ? reviews.length : "120+"} reviews)</span>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-neutral-900 mb-1 leading-[1.1] tracking-tighter">
                {product.name}
              </h2>
              <p className="text-sm md:text-md text-neutral-400 font-bold mb-4 italic leading-tight">{variantTitle}</p>

              </div>
              
              {/* Variation Selection (Desktop) */}
              {product.variations && product.variations.length > 1 && (
                <div className="mb-6">
                  <span className="block text-[9px] font-black uppercase tracking-[0.4em] text-neutral-400 mb-3">{product.variationType || "Select Size"}</span>
                  <div className="grid grid-cols-1 gap-2">
                    {product.variations.map((variant: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedVariantIndex(index)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all border-2 ${index === selectedVariantIndex
                          ? "border-green-600 bg-white shadow-sm ring-1 ring-green-600/10"
                          : "border-neutral-100 bg-white hover:border-neutral-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${index === selectedVariantIndex ? 'border-green-600' : 'border-neutral-200'}`}>
                              {index === selectedVariantIndex && <div className="w-2 h-2 bg-green-600 rounded-full" />}
                           </div>
                           <span className={`text-[11px] font-black uppercase tracking-widest ${index === selectedVariantIndex ? 'text-neutral-900' : 'text-neutral-400'}`}>
                              {variant.title || variant.value}
                           </span>
                        </div>
                        <span className="text-[11px] font-black text-neutral-900">₹{variant.price?.toLocaleString("en-IN") || variantPrice}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector Group (Desktop) */}
              <div className="flex items-center gap-3 mb-6">
                {inCartQty === 0 ? (
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={!isAvailableAtLocation}
                    className="flex-1 bg-green-600 py-3 h-[48px] rounded-xl shadow-lg shadow-green-100/50 hover:shadow-green-200 transition-all font-black uppercase tracking-widest text-xs"
                  >
                    {!isAvailableAtLocation ? "Unavailable Nearby" : "Add to Shopping Bag"}
                  </Button>
                ) : (
                  <div className="flex-1 flex items-center justify-between bg-white border-2 border-green-600 rounded-xl p-0.5 h-[48px] shadow-sm">
                    <button onClick={() => updateQuantity(product.id || product._id, inCartQty - 1, selectedVariant?._id, variantTitle)} className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-black text-lg">−</button>
                    <span className="text-base font-black text-green-600">{inCartQty}</span>
                    <button onClick={() => updateQuantity(product.id || product._id, inCartQty + 1, selectedVariant?._id, variantTitle)} className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-black text-lg">+</button>
                  </div>
                )}
              </div>

              {/* Service Guarantees (Desktop Only - Moved below button) */}
              <div className="hidden md:grid grid-cols-3 gap-3 mb-8">
                {[
                  { label: '48 Hours', sub: 'Replacement', icon: <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3M20.49 15a9 9 0 0 1-14.85 3" /> },
                  { label: '24/7', sub: 'Support', icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
                  { label: 'Fast', sub: 'Delivery', icon: <path d="M5 17H2l1-7h18l1 7h-3M5 17l-1-5h20l-1 5M5 17v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /> },
                ].map((box, i) => (
                  <div key={i} className="bg-white border border-neutral-100 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs">
                    <div className="w-8 h-8 bg-white border border-neutral-50 rounded-xl flex items-center justify-center text-neutral-300 mb-1.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{box.icon}</svg>
                    </div>
                    <span className="block text-[8px] font-black text-neutral-900 uppercase tracking-widest">{box.label}</span>
                    <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-widest leading-none">{box.sub}</span>
                  </div>
                ))}
              </div>


            {/* Content Body - Mobile Card Wrapper */}
            <div className="md:px-0">
        {/* Mobile-only variant selection and basic info */}
        <div className="md:hidden">
          {/* Delivery time */}
          <div className="flex items-center gap-0.5 mb-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 6v6l4 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-sm text-neutral-700 font-medium">
              17 MINS
            </span>
          </div>

          {/* Product name */}
          <h2 className="text-lg md:text-2xl font-bold text-neutral-900 mb-0 leading-tight">
            {product.name}
          </h2>

          {/* Variant Selection - Only show if multiple variants */}
          {product.variations && product.variations.length > 1 && (
            <div className="mb-2">
              <label className="block text-xs md:text-sm font-medium text-neutral-700 mb-1.5">
                Select {product.variationType || "Variant"}:
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((variant: any, index: number) => {
                  const variantTitle =
                    variant.title || variant.value || `Variant ${index + 1}`;
                  const isOutOfStock =
                    variant.status === "Sold out" ||
                    (variant.stock === 0 &&
                      variant.stock !== undefined &&
                      variant.stock !== null);
                  const isSelected = index === selectedVariantIndex;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedVariantIndex(index)}
                      disabled={isOutOfStock}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2 ${isSelected
                        ? "border-green-600 bg-green-50 text-green-700"
                        : isOutOfStock
                          ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                          : "border-neutral-300 bg-white text-neutral-700 hover:border-green-500 hover:bg-green-50"
                        }`}>
                      {variantTitle}
                      {isOutOfStock && (
                        <span className="ml-1 text-xs">(Out of Stock)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity/Pack */}
          <p className="text-sm md:text-base text-neutral-600 mb-1">
            {variantTitle}
          </p>

          {/* Price section */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xl font-bold text-neutral-900">
              ₹{variantPrice.toLocaleString("en-IN")}
            </span>
            {hasDiscount && (
              <>
                <span className="text-sm text-neutral-500 line-through">
                  ₹{variantMrp.toLocaleString("en-IN")}
                </span>
                {discount > 0 && (
                  <Badge className="!bg-blue-500 !text-white !border-blue-500 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                    {discount}% OFF
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Stock Status */}
          {variantStock !== 0 &&
            variantStock !== undefined &&
            variantStock !== null && (
              <p className="text-sm text-neutral-600 mb-1">
                {variantStock > 0 ? `${variantStock} in stock` : "Out of stock"}
              </p>
            )}

          {/* Divider line */}
          <div className="border-t border-neutral-200 mb-1.5"></div>

          {/* View product details link */}
          <button
            onClick={() =>
              setIsProductDetailsExpanded(!isProductDetailsExpanded)
            }
            className="flex items-center gap-0.5 text-sm text-green-600 font-medium">
            View product details
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform ${isProductDetailsExpanded ? "rotate-180" : ""
                }`}>
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Expanded Product Details Section */}
        {isProductDetailsExpanded && (
          <div className="mt-1.5">
            {/* Service Guarantees Card */}
            <div className="bg-white rounded-lg p-3 mb-2">
              <div className="grid grid-cols-3 gap-2">
                {/* Replacement */}
                <div className="flex flex-col items-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mb-1">
                    <path
                      d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3M20.49 15a9 9 0 0 1-14.85 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-bold text-neutral-900">
                    48 hours
                  </span>
                  <span className="text-xs text-neutral-600">Replacement</span>
                </div>

                {/* Support */}
                <div className="flex flex-col items-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mb-1">
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13 8H7M17 12H7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-sm font-bold text-neutral-900">
                    24/7
                  </span>
                  <span className="text-xs text-neutral-600">Support</span>
                </div>

                {/* Delivery */}
                <div className="flex flex-col items-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mb-1">
                    <path
                      d="M5 17H2l1-7h18l1 7h-3M5 17l-1-5h20l-1 5M5 17v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5M9 22h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-bold text-neutral-900">
                    Fast
                  </span>
                  <span className="text-xs text-neutral-600">Delivery</span>
                </div>
              </div>
            </div>

            {/* Highlights Section */}
            <div className="bg-neutral-100 rounded-lg mb-2 overflow-hidden">
              <button
                onClick={() => setIsHighlightsExpanded(!isHighlightsExpanded)}
                className="w-full px-2 py-2.5 flex items-center justify-between bg-neutral-100">
                <span className="text-sm font-semibold text-neutral-700">
                  Highlights
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`transition-transform ${isHighlightsExpanded ? "rotate-180" : ""
                    }`}>
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isHighlightsExpanded && (
                <div className="bg-white px-2 py-2">
                  <div className="space-y-1.5">
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Key Features:
                        </span>
                        <span className="text-xs text-neutral-600">
                          {product.tags.map((tag: string, index: number) => (
                            <span key={tag}>
                              {tag
                                .replace(/-/g, " ")
                                .split(" ")
                                .map(
                                  (word: string) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ")}
                              {index < (product.tags?.length || 0) - 1
                                ? ", "
                                : ""}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Source:
                      </span>
                      <span className="text-xs text-neutral-600">
                        {product.madeIn || "From India"}
                      </span>
                    </div>
                    {category && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Category:
                        </span>
                        <span className="text-xs text-neutral-600">
                          {category.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="bg-neutral-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                className="w-full px-2 py-2.5 flex items-center justify-between bg-neutral-100">
                <span className="text-sm font-semibold text-neutral-700">
                  Info
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`transition-transform ${isInfoExpanded ? "rotate-180" : ""
                    }`}>
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isInfoExpanded && (
                <div className="bg-white px-2 py-2">
                  <div className="space-y-1.5">
                    {product.description && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Description:
                        </span>
                        <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                          {product.description}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Unit:
                      </span>
                      <span className="text-xs text-neutral-600">
                        {product.pack}
                      </span>
                    </div>
                    {product.fssaiLicNo && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          FSSAI License:
                        </span>
                        <span className="text-xs text-neutral-600">
                          {product.fssaiLicNo}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Shelf Life:
                      </span>
                      <span className="text-xs text-neutral-600">
                        Refer to package
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Disclaimer:
                      </span>
                      <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                        Every effort is made to maintain accuracy of all
                        Information. However, actual product packaging and
                        materials may contain more and/or different information.
                        It is recommended not to solely rely on the information
                        presented.
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Customer Care Details:
                      </span>
                      <span className="text-xs text-neutral-600">
                        Email: help@klydocart.com
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Country of Origin:
                      </span>
                      <span className="text-xs text-neutral-600">
                        {product.madeIn || "India"}
                      </span>
                    </div>
                    {product.manufacturer && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Manufacturer:
                        </span>
                        <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                          {product.manufacturer}
                        </span>
                      </div>
                    )}
                    {/* Marketer same as manufacturer if not present, or hidden */}

                    <div className="flex items-start">
                      <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                        Return Policy:
                      </span>
                      <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                        {product.isReturnable
                          ? `This product is returnable within ${product.maxReturnDays || 2
                          } days.`
                          : "This product is non-returnable."}
                      </span>
                    </div>
                    {product.sellerId && (
                      <div className="flex items-start">
                        <span className="text-xs font-semibold text-neutral-800 w-[180px] flex-shrink-0">
                          Seller:
                        </span>
                        <span className="text-xs text-neutral-600 leading-relaxed flex-1">
                          KlydoCart Partner (
                          {product.sellerId.slice(-6).toUpperCase()})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

        {/* Reviews Section */}
        <div className="bg-white px-4 md:px-6 lg:px-8 py-6 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900">
              Ratings & Reviews
            </h3>
            {reviews.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-neutral-900">
                  {product.rating || "4.5"}
                </span>
                <div className="flex text-yellow-500">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <span className="text-xs text-neutral-500">
                  ({reviews.length} reviews)
                </span>
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="border-b border-neutral-50 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-semibold text-neutral-900">
                      {review.customer?.name || "Customer"}
                    </span>
                    <div className="flex items-center gap-1 bg-green-100 px-1.5 py-0.5 rounded">
                      <span className="text-xs font-bold text-green-700">
                        {review.rating}
                      </span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="text-green-700">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed mb-1">
                    {review.comment}
                  </p>
                  <span className="text-xs text-neutral-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-neutral-500">
                No reviews yet. Be the first to review!
              </p>
            </div>
          )}
        </div>

              {/* Similar Products (Full Width Grid) */}
              {similarProducts.length > 0 && (
                <div className="mt-12 md:mt-16 mb-24 md:mb-12">
                   <h3 className="text-xl md:text-2xl font-black text-neutral-900 mb-6 px-1 md:px-0 tracking-tight">Recommended for you</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                      {similarProducts.map((similarProduct) => (
                        <div key={similarProduct.id} className="group bg-white rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-xl transition-all p-3 flex flex-col items-center text-center">
                           <div onClick={() => navigate(`/product/${similarProduct.id || similarProduct._id}`)} className="w-full aspect-square bg-neutral-50 rounded-[24px] mb-4 overflow-hidden cursor-pointer relative">
                              <img src={similarProduct.mainImage || similarProduct.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={similarProduct.name} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                           </div>
                           <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900 line-clamp-1 mb-2">{similarProduct.name || similarProduct.productName}</h4>
                           <span className="text-[10px] font-black text-green-600 tracking-tighter">₹{calculateProductPrice(similarProduct).displayPrice.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Sticky Footer (Contrained on Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] md:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left side - Product details */}
          <div className="flex-1">
            {/* First line - Pack size */}
            <div>
              <span className="text-sm text-neutral-900 font-medium">
                {variantTitle}
              </span>
            </div>
            {/* Second line - Price, MRP, and OFF */}
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-neutral-900">
                ₹{variantPrice.toLocaleString("en-IN")}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xs text-neutral-500 line-through">
                    MRP ₹{variantMrp.toLocaleString("en-IN")}
                  </span>
                  {discount > 0 && (
                    <Badge className="!bg-blue-500 !text-white !border-blue-500 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {discount}% OFF
                    </Badge>
                  )}
                </>
              )}
            </div>
            {/* Third line - Inclusive of all taxes */}
            <p className="text-[11px] text-neutral-500 leading-none">
              Inclusive of all taxes
            </p>
          </div>

          {/* Right side - Add to cart button or Quantity Stepper */}
          <div className="ml-3 flex items-center">
            <AnimatePresence mode="wait">
              {inCartQty === 0 ? (
                <motion.div
                  key="add-button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center">
                  <Button
                    ref={addButtonRef}
                    variant="default"
                    size="default"
                    onClick={handleAddToCart}
                    disabled={
                      !isAvailableAtLocation ||
                      (!isVariantAvailable && variantStock !== 0)
                    }
                    className={`px-6 py-2 text-sm font-semibold h-[36px] ${!isAvailableAtLocation ||
                      (!isVariantAvailable && variantStock !== 0)
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                      }`}
                    title={
                      !isAvailableAtLocation
                        ? "Not available at your location"
                        : !isVariantAvailable && variantStock !== 0
                          ? "This variant is out of stock"
                          : ""
                    }>
                    {!isAvailableAtLocation
                      ? "Unavailable"
                      : !isVariantAvailable && variantStock !== 0
                        ? "Out of Stock"
                        : "Add to cart"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="stepper"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 bg-white border-2 border-green-600 rounded-full px-2 py-1 h-[36px]">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (!isAuthenticated) {
                        showToast('Login to continue', 'info');
                        navigate('/login');
                        return;
                      }
                      const productId = product.id || product._id;
                      const variantId = selectedVariant?._id;
                      updateQuantity(
                        productId,
                        inCartQty - 1,
                        variantId,
                        variantTitle
                      );
                    }}
                    className="w-6 h-6 flex items-center justify-center text-green-600 font-bold hover:bg-green-50 rounded-full transition-colors border border-green-600 p-0 leading-none text-base"
                    style={{ lineHeight: 1 }}>
                    <span className="relative top-[-1px]">−</span>
                  </motion.button>
                  <motion.span
                    key={inCartQty}
                    initial={{ scale: 1.2, y: -2 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="text-sm font-bold text-green-600 min-w-[1.5rem] text-center">
                    {inCartQty}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (!isAuthenticated) {
                        showToast('Login to continue', 'info');
                        navigate('/login');
                        return;
                      }
                      const productId = product.id || product._id;
                      const variantId = selectedVariant?._id;
                      updateQuantity(
                        productId,
                        inCartQty + 1,
                        variantId,
                        variantTitle
                      );
                    }}
                    className="w-6 h-6 flex items-center justify-center text-green-600 font-bold hover:bg-green-50 rounded-full transition-colors border border-green-600 p-0 leading-none text-base"
                    style={{ lineHeight: 1 }}>
                    <span className="relative top-[-1px]">+</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      </div>
  </>
);
}
