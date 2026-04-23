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
      <div className="min-h-screen bg-white pb-24 md:pb-12">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-neutral-600"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-4">
            {product?.id && (
              <WishlistButton
                productId={product.id}
                size="md"
                className="text-neutral-600"
              />
            )}
            <button className="text-neutral-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </button>
          </div>
        </div>

        {/* Desktop Breadcrumbs */}
        <div className="hidden md:block max-w-[1200px] mx-auto px-6 pt-6">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <button onClick={() => navigate('/')} className="hover:text-green-600">Home</button>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            <button onClick={() => category && navigate(`/category/${category.id}`)} className="hover:text-green-600">{category?.name || 'Products'}</button>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            <span className="text-neutral-400 truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-[1200px] mx-auto px-0 md:px-6 mt-14 md:mt-8">
          <div className="md:flex md:gap-12">
            
            {/* Left Column: Image Gallery */}
            <div className="md:w-[45%] md:sticky md:top-8 h-fit">
              <div className="relative bg-white md:rounded-2xl md:border md:border-neutral-100 overflow-hidden">
                {/* Main Image */}
                <div 
                  className="w-full aspect-square relative flex items-center justify-center p-6 md:p-12 overflow-hidden"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <motion.img
                    key={currentImage}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    src={currentImage}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                      {discount}% OFF
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {allImages.length > 1 && (
                  <div className="flex gap-3 px-4 pb-6 overflow-x-auto scrollbar-hide">
                    {allImages.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 transition-all overflow-hidden ${
                          index === selectedImageIndex ? "border-green-600" : "border-neutral-100"
                        }`}
                      >
                        <img src={image} className="w-full h-full object-contain p-1" alt="thumbnail" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Details - Desktop (Below Image) */}
              <div className="hidden md:block mt-8 border-t border-neutral-100 pt-8">
                <h3 className="text-lg font-bold text-neutral-900 mb-6">Product Details</h3>
                <div className="space-y-6">
                  {/* Specific fields from Blinkit look */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Description</p>
                    <p className="text-sm text-neutral-600 leading-relaxed">{product.description || "Fresh and high quality product delivered to your doorstep."}</p>
                  </div>
                  
                  {product.manufacturer && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Manufacturer Details</p>
                      <p className="text-sm text-neutral-600 leading-relaxed">{product.manufacturer}</p>
                    </div>
                  )}

                  <button 
                    onClick={() => setIsProductDetailsExpanded(!isProductDetailsExpanded)}
                    className="text-green-600 text-sm font-bold flex items-center gap-1 mt-4"
                  >
                    View more details
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`${isProductDetailsExpanded ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                  </button>

                  <AnimatePresence>
                    {isProductDetailsExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4 pt-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] text-neutral-400 font-bold uppercase">Unit</p>
                            <p className="text-sm text-neutral-700">{variantTitle}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-neutral-400 font-bold uppercase">Shelf Life</p>
                            <p className="text-sm text-neutral-700">Refer to package</p>
                          </div>
                          {product.fssaiLicNo && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-neutral-400 font-bold uppercase">FSSAI License</p>
                              <p className="text-sm text-neutral-700">{product.fssaiLicNo}</p>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-[10px] text-neutral-400 font-bold uppercase">Country of Origin</p>
                            <p className="text-sm text-neutral-700">{product.madeIn || "India"}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Right Column: Info & Actions */}
            <div className="flex-1 px-4 md:px-0 py-6 md:py-0">
              {/* Product Info */}
              <div className="mb-8">
                <h1 className="text-xl md:text-2xl font-bold text-neutral-900 mb-1 leading-tight">
                  {product.name}
                </h1>
                
                {/* Delivery Indicator */}
                <div className="flex items-center gap-1 mb-6">
                  <div className="bg-neutral-100 rounded-md p-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">17 MINS DELIVERY</span>
                </div>

                {/* Variant Selection (Blinkit Style) */}
                {product.variations && product.variations.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Select Unit</p>
                    <div className="flex flex-wrap gap-3">
                      {product.variations.map((variant: any, index: number) => {
                        const isSelected = index === selectedVariantIndex;
                        const vPrice = calculateProductPrice(product, index).displayPrice;
                        return (
                          <button
                            key={index}
                            onClick={() => setSelectedVariantIndex(index)}
                            className={`flex flex-col items-center justify-center min-w-[80px] p-3 rounded-xl border-2 transition-all ${
                              isSelected 
                              ? "border-green-600 bg-green-50/30" 
                              : "border-neutral-100 hover:border-neutral-200"
                            }`}
                          >
                            <span className={`text-xs font-bold ${isSelected ? 'text-green-700' : 'text-neutral-900'}`}>
                              {variant.title || variant.value}
                            </span>
                            <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-green-600' : 'text-neutral-500'}`}>
                              ₹{vPrice}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Price & Add to Cart (Desktop only, mobile is sticky footer) */}
                <div className="hidden md:flex items-center gap-8 mb-10 pb-10 border-b border-neutral-100">
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500 font-medium mb-1">{variantTitle}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-neutral-900">₹{variantPrice}</span>
                      {hasDiscount && (
                        <span className="text-sm text-neutral-400 line-through">₹{variantMrp}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">(Inclusive of all taxes)</p>
                  </div>

                  <div className="flex-1 max-w-[200px]">
                    {inCartQty === 0 ? (
                      <button
                        onClick={handleAddToCart}
                        className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-green-100"
                      >
                        Add to cart
                      </button>
                    ) : (
                      <div className="flex items-center justify-between bg-green-700 rounded-xl px-4 py-2 text-white">
                        <button onClick={() => updateQuantity(product.id || product._id, inCartQty - 1, selectedVariant?._id, variantTitle)} className="p-1 hover:bg-white/10 rounded-lg text-xl font-bold">−</button>
                        <span className="font-bold">{inCartQty}</span>
                        <button onClick={() => updateQuantity(product.id || product._id, inCartQty + 1, selectedVariant?._id, variantTitle)} className="p-1 hover:bg-white/10 rounded-lg text-xl font-bold">+</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Why shop from us section (Blinkit style) */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">Why shop from Klydocart?</h3>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">Round The Clock Delivery</h4>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Get items delivered to your doorstep from dark stores near you, whenever you need them.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">Best Prices & Offers</h4>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Best price destination with offers directly from the manufacturers.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">Wide Assortment</h4>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Choose from 30,000+ products across food, personal care, household & other categories.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Similar Products Section */}
          {similarProducts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-neutral-100">
              <h3 className="text-xl font-bold text-neutral-900 mb-8 px-4 md:px-0">Similar products</h3>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-0 pb-4">
                {similarProducts.map((p) => (
                  <div 
                    key={p.id || p._id} 
                    onClick={() => navigate(`/product/${p.id || p._id}`)}
                    className="flex-shrink-0 w-[160px] md:w-[180px] bg-white rounded-2xl border border-neutral-100 p-3 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="w-full aspect-square mb-3">
                      <img src={p.mainImage || p.imageUrl} className="w-full h-full object-contain" alt={p.name} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 mb-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase">17 MINS</span>
                      </div>
                      <h4 className="text-xs font-bold text-neutral-800 line-clamp-2 min-h-[32px]">{p.name || p.productName}</h4>
                      <p className="text-[10px] text-neutral-500">{p.pack || "Standard"}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-bold text-neutral-900">₹{p.price}</span>
                        <button className="bg-white border border-green-600 text-green-600 text-[10px] font-bold px-3 py-1 rounded-md hover:bg-green-50">ADD</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section - Simplified for Blinkit feel */}
          <div className="mt-16 pt-12 border-t border-neutral-100 mb-12">
            <h3 className="text-xl font-bold text-neutral-900 mb-8 px-4 md:px-0">Ratings & Reviews</h3>
            <div className="px-4 md:px-0 max-w-2xl">
              {reviews.length > 0 ? (
                <div className="space-y-8">
                  {reviews.map((review) => (
                    <div key={review._id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-400">
                            {review.customer?.name?.[0] || 'C'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900">{review.customer?.name || "Customer"}</p>
                            <p className="text-[10px] text-neutral-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-green-700 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                          {review.rating} <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 leading-relaxed pl-10">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No reviews yet for this product.</p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sticky Footer */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 p-4 z-50">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-neutral-900">₹{variantPrice}</span>
                {hasDiscount && (
                  <span className="text-xs text-neutral-400 line-through">₹{variantMrp}</span>
                )}
              </div>
              <p className="text-[10px] text-neutral-500 font-medium">Inclusive of all taxes</p>
            </div>
            
            <div className="flex-1">
              {inCartQty === 0 ? (
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-100"
                >
                  Add to cart
                </button>
              ) : (
                <div className="flex items-center justify-between bg-green-700 rounded-xl px-4 py-3 text-white">
                  <button onClick={() => updateQuantity(product.id || product._id, inCartQty - 1, selectedVariant?._id, variantTitle)} className="text-xl font-bold">−</button>
                  <span className="font-bold">{inCartQty}</span>
                  <button onClick={() => updateQuantity(product.id || product._id, inCartQty + 1, selectedVariant?._id, variantTitle)} className="text-xl font-bold">+</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
