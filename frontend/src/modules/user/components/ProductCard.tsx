import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import { Product } from '../../../types/domain';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from '../../../hooks/useLocation';
import { useToast } from '../../../context/ToastContext'; // Import useToast
import { addToWishlist, removeFromWishlist, getWishlist } from '../../../services/api/customerWishlistService';
import { subscribeToStockNotification, checkSubscription } from '../../../services/api/customerStockNotificationService';
import Button from '../../../components/ui/button';
import Badge from '../../../components/ui/badge';
import StarRating from '../../../components/ui/StarRating';
import { calculateProductPrice } from '../../../utils/priceUtils';

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
  badgeText?: string;
  showPackBadge?: boolean;
  showStockInfo?: boolean;
  showHeartIcon?: boolean;
  showRating?: boolean;
  showVegetarianIcon?: boolean;
  showOptionsText?: boolean;
  optionsCount?: number;
  compact?: boolean;
  categoryStyle?: boolean;
}

export default function ProductCard({
  product,
  showBadge = false,
  badgeText,
  showPackBadge = false,
  showStockInfo = false,
  showHeartIcon = false,
  showRating = false,
  showVegetarianIcon = false,
  showOptionsText = false,
  optionsCount = 2,
  compact = false,
  categoryStyle = false,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const { showToast } = useToast(); // Get toast function
  const imageRef = useRef<HTMLImageElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isNotifySubscribed, setIsNotifySubscribed] = useState(false);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  // Single ref to track any cart operation in progress for this product
  const isOperationPendingRef = useRef(false);

  useEffect(() => {
    // Only check wishlist if user is authenticated AND token is available
    if (!isAuthenticated) {
      setIsWishlisted(false);
      return;
    }

    const checkWishlist = async () => {
      try {
        // Check if token is actually available before making API call
        const token = localStorage.getItem('authToken');
        if (!token) {
          setIsWishlisted(false);
          return;
        }

        const res = await getWishlist({
          latitude: location?.latitude,
          longitude: location?.longitude
        });
        if (res.success && res.data && res.data.products) {
          const targetId = String((product as any).id || product._id);
          const exists = res.data.products.some(p => String(p._id || (p as any).id) === targetId);
          setIsWishlisted(exists);
        }
      } catch (e) {
        // Silently fail if not logged in or API error
        setIsWishlisted(false);
      }
    };
    checkWishlist();
  }, [product.id, product._id, isAuthenticated, location?.latitude, location?.longitude]);

  useEffect(() => {
    // Temporarily disable stock notification check to debug login issue
    // Check if user is subscribed to stock notifications
    // Only check if authenticated and product ID is available
    if (!isAuthenticated || !product?.id && !product?._id) {
      setIsNotifySubscribed(false);
      return;
    }

    // Temporarily commented out to debug login issue
    /*
    const checkNotificationSubscription = async () => {
      try {
        const productId = String((product as any).id || product._id);
        const variantId = (product as any)?.variations?.[0]?._id;
        const res = await checkSubscription(productId, variantId);
        if (res.success && res.data) {
          setIsNotifySubscribed(res.data.isSubscribed);
        }
      } catch (e) {
        // Silently fail - user might not be authenticated or API might be unavailable
        setIsNotifySubscribed(false);
      }
    };
    checkNotificationSubscription();
    */
  }, [product.id, product._id, isAuthenticated]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const targetId = String((product as any).id || product._id);
    const previousState = isWishlisted;

    try {
      if (isWishlisted) {
        // Optimistic update
        setIsWishlisted(false);
        await removeFromWishlist(targetId);
        showToast('Removed from wishlist');
      } else {
        if (!location?.latitude || !location?.longitude) {
           showToast('Location is required to add items to wishlist', 'error');
           return;
        }
        // Optimistic update
        setIsWishlisted(true);
        await addToWishlist(
          targetId,
          location?.latitude,
          location?.longitude
        );
        showToast('Added to wishlist');
      }
    } catch (e: any) {
      console.error('Failed to toggle wishlist:', e);
      setIsWishlisted(previousState);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to update wishlist';
      showToast(errorMessage, 'error');
    }
  };

  const handleNotifyMe = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check both isAuthenticated and token to debug
    const token = localStorage.getItem('authToken');
    console.log('[ProductCard] Notify Me clicked - isAuthenticated:', isAuthenticated, 'token:', !!token);

    // Redirect to login if not authenticated
    if (!isAuthenticated || !token) {
      showToast('Login to get notified', 'info');
      navigate('/login');
      return;
    }

    const productId = String((product as any).id || product._id);
    const variantId = (product as any)?.variations?.[0]?._id;

    try {
      const res = await subscribeToStockNotification(productId, variantId);
      if (res.success) {
        setIsNotifySubscribed(true);
        showToast('You will be notified when this product is back in stock!', 'success');
      } else {
        showToast(res.message || 'Failed to subscribe', 'error');
      }
    } catch (error: any) {
      console.error('Failed to subscribe to stock notification:', error);
      showToast('Failed to subscribe to notification', 'error');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareData = {
      title: product.name || product.productName || 'Product',
      text: product.description || `Check out this ${product.name || 'product'} on KlydoCart!`,
      url: `${window.location.origin}/product/${productId}`,
    };

    // If mobile/native share is available, use it
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
          showToast('Failed to share product', 'error');
        }
        return;
      }
    }

    // Otherwise (Desktop), toggle custom menu
    setActiveShareId(activeShareId === (product._id || product.id) ? null : (product._id || product.id || null));
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const productId = product._id || product.id;
    const url = `${window.location.origin}/product/${productId}`;
    const text = `Check out this ${product.name || 'product'} on KlydoCart: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setActiveShareId(null);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const productId = product._id || product.id;
    const url = `${window.location.origin}/product/${productId}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard', 'success');
    setActiveShareId(null);
  };
  const getProductId = (p: any): string | undefined => {
    if (!p) return undefined;
    return p._id || p.id;
  };

  const productId = getProductId(product);

  const cartItem = cart.items.find((item) => {
    if (!item?.product || !productId) return false;
    const itemPid = getProductId(item.product);
    return itemPid === productId;
  });

  const inCartQty = cartItem?.quantity || 0;

  // Get Price and MRP using utility
  const { displayPrice, mrp, discount } = calculateProductPrice(product);

  const handleCardClick = () => {
    if (productId) {
      navigate(`/product/${productId}`);
    }
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      showToast('Login to continue', 'info');
      navigate('/login');
      return;
    }

    // Check if product is out of stock
    const variantStatus = (product as any)?.variations?.[0]?.status;
    const productStatus = (product as any)?.status;
    const status = variantStatus !== undefined ? variantStatus : productStatus;
    const isOutOfStock = status === 'Sold out';
    
    if (isOutOfStock) {
      showToast('This product is out of stock. Added to wishlist!', 'info');
      if (!isWishlisted) {
        await toggleWishlist(e);
      }
      return;
    }

    // Check if product is available in user's location
    if (product.isAvailable === false) {
      return;
    }

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current) {
      return;
    }

    isOperationPendingRef.current = true;

    try {
      await addToCart(product, addButtonRef.current);
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  const handleDecrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      showToast('Login to continue', 'info');
      navigate('/login');
      return;
    }

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current || inCartQty <= 0) {
      return;
    }

    if (!productId) return;

    isOperationPendingRef.current = true;

    try {
      await updateQuantity(productId, inCartQty - 1);
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  const handleIncrease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      showToast('Login to continue', 'info');
      navigate('/login');
      return;
    }

    // Check if product is out of stock
    const variantStatus = (product as any)?.variations?.[0]?.status;
    const productStatus = (product as any)?.status;
    const status = variantStatus !== undefined ? variantStatus : productStatus;
    const isOutOfStock = status === 'Sold out';
    
    if (isOutOfStock) {
      showToast('This product is out of stock', 'error');
      return;
    }

    // Check if product is available in user's location
    if (product.isAvailable === false) {
      return;
    }

    // Prevent any operation while another is in progress
    if (isOperationPendingRef.current) {
      return;
    }

    if (!productId) return;

    isOperationPendingRef.current = true;

    try {
      if (inCartQty > 0) {
        await updateQuantity(productId, inCartQty + 1);
      } else {
        await addToCart(product, addButtonRef.current);
      }
    } finally {
      // Reset the flag after the operation truly completes
      isOperationPendingRef.current = false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`${categoryStyle ? 'bg-white' : 'bg-white'} rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col relative border border-neutral-100`}
    >
      <div
        onClick={handleCardClick}
        className="cursor-pointer flex-1 flex flex-col"
      >
        <div className={`w-full ${compact ? 'h-32 md:h-40' : categoryStyle ? 'h-32 md:h-40' : 'h-40 md:h-48'} bg-white flex items-center justify-center overflow-hidden relative border-b border-neutral-100`}>
          {product.imageUrl || product.mainImage ? (
            <img
              ref={imageRef}
              src={product.imageUrl || product.mainImage}
              alt={product.name || product.productName || 'Product'}
              className={`w-full h-full ${categoryStyle ? 'object-contain p-2' : 'object-cover'}`}
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Hide broken image and show fallback
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-icon')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center bg-neutral-100 fallback-icon';
                  fallback.innerHTML = `
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #d1d5db">
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                  `;
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </div>
          )}

          {categoryStyle && showBadge && discount > 0 && (
            <div className="absolute top-2 left-2 z-10 bg-green-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
              {discount}% off
            </div>
          )}

          {!categoryStyle && showBadge && (badgeText || discount > 0) && (
            <Badge
              variant="destructive"
              className="absolute top-2 left-2 z-10 text-xs px-2 py-1"
            >
              {badgeText || `${discount}% OFF`}
            </Badge>
          )}

          {/* Out of Stock Overlay */}
          {(() => {
            const variantStock = (product as any)?.variations?.[0]?.stock;
            const variantStatus = (product as any)?.variations?.[0]?.status;
            const productStock = (product as any)?.stock;
            const productStatus = (product as any)?.status;
            
            const status = variantStatus !== undefined ? variantStatus : productStatus;
            const isOutOfStock = status === 'Sold out';
            
            if (isOutOfStock) {
              return (
                <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-white/95 px-3 py-1.5 rounded-lg shadow-lg">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Out of Stock</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="absolute top-2 right-2 z-30 flex flex-col gap-2">
            {/* Always show wishlist icon */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(e);
              }}
              className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-md group/heart"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isWishlisted ? "#ef4444" : "none"}
                xmlns="http://www.w3.org/2000/svg"
                className={`transition-colors ${isWishlisted ? "text-red-500" : "text-neutral-400 group-hover/heart:text-red-400"}`}
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="relative">
              <button
                onClick={handleShare}
                className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-md group/share"
                aria-label="Share product"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-neutral-400 group-hover/share:text-blue-500 transition-colors"
                >
                  <path
                    d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {activeShareId === (product._id || product.id) && (
                <div 
                  className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-2xl border border-neutral-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={handleWhatsAppShare}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-neutral-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor"/></svg>
                    WhatsApp
                  </button>
                  <button 
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </div>

          {(product.variations?.length || 0) >= 2 && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="text-[10px] font-bold text-neutral-700 bg-white/95 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-neutral-200">
                {product.variations?.length} Options
              </span>
            </div>
          )}
        </div>

        <div className={`${compact ? 'p-2 md:p-3' : categoryStyle ? 'px-2 md:px-2.5 pt-1.5 md:pt-2 pb-2 md:pb-2.5' : 'p-4 md:p-5'} flex-1 flex flex-col`}>
          {categoryStyle ? (
            // Category Style Layout: Time -> Name -> Quantity -> [Price | ADD]
            <>
              {/* 1. Delivery Time */}
              <p className="text-[10px] font-bold text-amber-600 mb-1 flex items-center gap-1 leading-tight uppercase tracking-wide">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.1.8-1.2-4.5-2.7V7z" />
                </svg>
                <span>16 MINS</span>
              </p>

              {/* 2. Product Name */}
              <h3 className="text-[13px] font-bold text-neutral-900 mb-0.5 line-clamp-2 leading-[1.3] min-h-[2.1rem] max-h-[2.1rem] overflow-hidden">
                {product.name || product.productName || ''}
              </h3>

              {/* 3. Quantity / Weight */}
              <p className="text-[11px] font-medium text-neutral-400 mb-1 leading-tight">
                {product.variations?.[0]?.value || product.pack || '1 unit'}
              </p>

              {/* 4. Footer Row: Price and ADD Button */}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-y-1 gap-x-1.5">
                {/* Price Information */}
                <div className="flex flex-col">
                  <span className="text-[13px] font-black text-neutral-900 leading-none">
                    ₹{displayPrice.toLocaleString('en-IN')}
                  </span>
                  {mrp && mrp > displayPrice && (
                    <span className="text-[10px] text-neutral-400 line-through leading-none mt-1">
                      ₹{mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* ADD Button Section */}
                <div className="flex flex-col items-center flex-shrink-0 ml-auto">
                  {(() => {
                    const variantStock = (product as any)?.variations?.[0]?.stock;
                    const variantStatus = (product as any)?.variations?.[0]?.status;
                    const productStock = (product as any)?.stock;
                    const productStatus = (product as any)?.status;
                    
                    const status = variantStatus !== undefined ? variantStatus : productStatus;
                    const isOutOfStock = status === 'Sold out';

                    if (isOutOfStock) {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotifyMe(e);
                          }}
                          disabled={isNotifySubscribed}
                          className={`min-w-[64px] h-7 px-2 border rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center justify-center cursor-pointer transition-colors ${
                            isNotifySubscribed
                              ? 'border-green-300 bg-green-50 text-green-600 cursor-not-allowed'
                              : 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {isNotifySubscribed ? '🔔 Subscribed' : '🔔 Notify Me'}
                        </button>
                      );
                    }

                    return inCartQty === 0 ? (
                      <div className="flex flex-col items-center">
                        <Button
                          ref={addButtonRef}
                          variant="outline"
                          size="sm"
                          disabled={product.isAvailable === false && !showHeartIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (product.isAvailable === false) {
                              showToast('We will notify you when this product is available in your area!', 'info');
                              if (!isWishlisted) toggleWishlist(e);
                            } else {
                              handleAdd(e);
                            }
                          }}
                          className={`min-w-[64px] h-7 px-2 border rounded-lg font-bold text-[11px] uppercase tracking-wide transition-all shadow-sm ${
                            product.isAvailable === false
                            ? 'border-amber-600 text-amber-600 bg-amber-50 hover:bg-amber-100'
                            : 'border-green-600 text-green-600 bg-white hover:bg-green-50 active:scale-95'
                          }`}
                        >
                          {product.isAvailable === false ? 'NOTIFY' : 'ADD'}
                        </Button>
                        {product.isAvailable === false && (
                          <button
                            onClick={(e) => {
                               e.stopPropagation();
                               toggleWishlist(e);
                            }}
                            className="mt-1 text-[9px] text-red-500 font-bold flex items-center gap-0.5 hover:underline"
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                               <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {isWishlisted ? 'Wishlisted' : 'Wishlist'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-green-600 text-white rounded-lg h-7 px-1 min-w-[64px] shadow-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecrease(e);
                          }}
                          className="w-5 h-full flex items-center justify-center text-base font-bold hover:bg-green-700 rounded-l-lg transition-colors"
                        >
                          −
                        </button>
                        <span className="text-[10px] font-black px-0.5">
                          {inCartQty}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIncrease(e);
                          }}
                          className="w-5 h-full flex items-center justify-center text-base font-bold hover:bg-green-700 rounded-r-lg transition-colors"
                        >
                          +
                        </button>
                      </div>
                    );
                  })()}
                  
                  {/* Options Text below ADD button */}
                  {(product.variations?.length || 0) >= 2 && (
                    <span className="text-[9px] text-neutral-400 mt-1 font-medium">
                      {product.variations?.length} options
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Non-category style layout (original)
            <>
              {!showPackBadge && (
                <p className={`${compact ? 'text-[10px] md:text-xs' : 'text-xs md:text-sm'} text-neutral-500 mb-1`}>
                    {product.variations?.[0]?.value || product.pack}
                </p>
              )}

              <h3 className={`${compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'} font-semibold text-neutral-900 ${compact ? 'mb-1' : 'mb-2'} line-clamp-2 ${compact ? 'min-h-[2rem]' : 'min-h-[2.5rem]'}`}>
                {product.name || product.productName || ''}
              </h3>

              {/* Always show rating */}
              <div className={`${compact ? 'mb-1' : 'mb-2'}`}>
                <StarRating
                  rating={(product.rating || (product as any).rating) || 0}
                  reviewCount={(product.reviews || (product as any).reviewsCount) || 0}
                  size={compact ? 'sm' : 'md'}
                  showCount={true}
                />
              </div>

              {showStockInfo && (
                <p className="text-xs text-green-600 mb-2 font-medium">
                  Fast delivery
                </p>
              )}

              {showVegetarianIcon && (
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-xs text-neutral-600">Vegetarian</span>
                </div>
              )}

              <div className="mt-auto mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-base font-bold text-neutral-900">
                    ₹{displayPrice}
                  </span>
                  {mrp && mrp > displayPrice && (
                    <span className="text-xs text-neutral-500 line-through">
                      ₹{mrp}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!categoryStyle && (
        <div className={`${compact ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
          <div className="mt-auto">
            {(() => {
              const variantStock = (product as any)?.variations?.[0]?.stock;
              const variantStatus = (product as any)?.variations?.[0]?.status;
              const productStock = (product as any)?.stock;
              const productStatus = (product as any)?.status;
              
              const status = variantStatus !== undefined ? variantStatus : productStatus;
              const isOutOfStock = status === 'Sold out';

              if (isOutOfStock) {
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotifyMe(e);
                    }}
                    disabled={isNotifySubscribed}
                    className={`w-full h-8 text-xs font-bold uppercase ${
                      isNotifySubscribed
                        ? 'border-green-300 text-green-600 bg-green-50 cursor-not-allowed'
                        : 'border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    {isNotifySubscribed ? '🔔 Subscribed' : '🔔 Notify Me'}
                  </Button>
                );
              }

              return inCartQty === 0 ? (
                <div>
                  {product.isAvailable === false ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast('We will notify you when this product is available in your area!', 'info');
                        if (!isWishlisted) toggleWishlist(e);
                      }}
                      className="w-full border-amber-600 text-amber-600 hover:bg-amber-50 h-8 text-xs font-bold uppercase"
                    >
                      Notify Me
                    </Button>
                  ) : (
                    <Button
                      ref={addButtonRef}
                      variant="outline"
                      size="sm"
                      onClick={handleAdd}
                      className="w-full border-green-600 text-green-600 hover:bg-green-50 h-8 text-xs font-semibold uppercase tracking-wide"
                    >
                      Add
                    </Button>
                  )}
                  <div className="h-4 mt-1">
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 bg-white border border-green-600 rounded-full px-2 py-0.5 h-8">
                  <Button
                    variant="default"
                    size="icon"
                    onClick={handleDecrease}
                    className="w-6 h-6 p-0 bg-transparent text-green-600 hover:bg-green-50 shadow-none"
                    aria-label="Decrease quantity"
                  >
                    −
                  </Button>
                  <span className="text-xs font-bold text-green-600 min-w-[1.5rem] text-center">
                    {inCartQty}
                  </span>
                  <Button
                    variant="default"
                    size="icon"
                    disabled={product.isAvailable === false}
                    onClick={handleIncrease}
                    className={`w-6 h-6 p-0 bg-transparent text-green-600 shadow-none ${
                      product.isAvailable === false ? 'text-neutral-300 cursor-not-allowed' : 'hover:bg-green-50'
                    }`}
                    aria-label="Increase quantity"
                  >
                    +
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </motion.div>
  );
}
