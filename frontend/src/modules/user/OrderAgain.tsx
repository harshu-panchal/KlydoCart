import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../../hooks/useOrders';
import { useCart } from '../../context/CartContext';
import { getProducts } from '../../services/api/customerProductService';
import WishlistButton from '../../components/WishlistButton';
import { calculateProductPrice } from '../../utils/priceUtils';
import { useThemeContext } from '../../context/ThemeContext';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Delivered':
      return 'bg-green-100 text-green-700';
    case 'On the way':
      return 'bg-blue-100 text-blue-700';
    case 'Accepted':
      return 'bg-yellow-100 text-yellow-700';
    case 'Placed':
      return 'bg-neutral-100 text-neutral-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
};

export default function OrderAgain() {
  const { orders } = useOrders();
  const { currentTheme } = useThemeContext();
  const { cart, addToCart, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [addedOrders, setAddedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [orderQuery, setOrderQuery] = useState('');
  const rowsPerPage = 10;

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!orderQuery.trim()) return orders;
    
    return orders.filter(order => {
      const shortId = order.id.split('-').slice(-1)[0].toLowerCase();
      return shortId.includes(orderQuery.toLowerCase()) || 
             order.status.toLowerCase().includes(orderQuery.toLowerCase());
    });
  }, [orders, orderQuery]);

  // Handle "Order Again" - Add all items from an order to cart
  const handleOrderAgain = (order: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Mark this order as added
    setAddedOrders(prev => new Set(prev).add(order.id));

    // Add each item from the order to the cart
    order.items
      .filter((item: any) => item?.product) // Filter out items with null/undefined products
      .forEach((item: any) => {
        // Check if product is already in cart
        const existingCartItem = cart.items.find(cartItem => cartItem?.product && cartItem.product.id === item.product.id);

        if (existingCartItem) {
          // If already in cart, add the order quantity to existing quantity
          updateQuantity(item.product.id, existingCartItem.quantity + item.quantity);
        } else {
          // If not in cart, add it first (adds 1)
          addToCart(item.product);
          // Then update to the correct quantity if needed
          if (item.quantity > 1) {
            // Use setTimeout to ensure the item is added first
            setTimeout(() => {
              updateQuantity(item.product.id, item.quantity);
            }, 10);
          }
        }
      });
  };

  // Get bestseller products
  const [bestsellerProducts, setBestsellerProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchBestsellers = async () => {
      try {
        const response = await getProducts({ sort: 'popular', limit: 6 });
        if (response.success && response.data) {
        const mapped = (response.data as any[]).map(p => {
          // Clean product name - remove description suffixes
          let productName = p.productName || p.name || '';
          productName = productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();

          return {
            ...p,
            id: p._id || p.id,
            name: productName,
            imageUrl: p.mainImage || p.imageUrl,
            mrp: p.mrp || p.price,
            pack: p.variations?.[0]?.title || p.smallDescription || 'Standard'
          };
        });
          setBestsellerProducts(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch bestsellers:', error);
      }
    };
    fetchBestsellers();
  }, []);

  const hasOrders = orders && orders.length > 0;

  // Pagination Logic
  const totalOrders = filteredOrders?.length || 0;
  const displayTotalPages = Math.ceil(totalOrders / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalOrders);
  const displayedOrders = filteredOrders?.slice(startIndex, endIndex) || [];

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(displayTotalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pb-4 md:pb-12 max-w-[1600px] mx-auto min-h-screen bg-stone-50 md:bg-white">
      {/* BESSELLERS SECTION REMOVED - If you see this comment, new code is loaded */}
      {/* Global Theme Context */}
      <div 
        className="pb-2 pt-6 md:pt-10 md:pb-6 shadow-md md:shadow-none relative overflow-hidden md:overflow-visible md:rounded-none md:mx-0 md:mt-0"
        style={{
          background: 'var(--header-bg)',
        } as any}
      >
        <style>{`
          :root {
            --header-bg: linear-gradient(135deg, ${currentTheme?.primary?.[0] || '#0d9488'}, ${currentTheme?.primary?.[1] || '#0f766e'});
          }
          @media (min-width: 768px) {
            :root {
              --header-bg: none;
            }
          }
        `}</style>
        {/* Decorative background element */}
        {/* Decorative background element - Hidden on desktop */}
        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 md:hidden bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 md:hidden bg-black/5 rounded-full blur-3xl" />

        <div className="px-4 md:px-8 lg:px-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4 md:gap-8">
              <button
                onClick={() => navigate(-1)}
                className="text-white md:text-green-600 hover:bg-white/20 md:hover:bg-green-50 p-2 md:p-3 rounded-xl md:rounded-2xl transition-all active:scale-95 flex-shrink-0 bg-white/10 md:bg-green-50 backdrop-blur-sm shadow-sm md:shadow-none border md:border-green-100"
                aria-label="Back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6">
                  <path d="M15 18L9 12L15 6" />
                </svg>
              </button>
              <div className="flex flex-col">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white md:text-green-600 tracking-tighter uppercase leading-none">Reorder Portal</h1>
                <p className="text-white/70 md:text-neutral-400 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] mt-1">Quickly buy your regulars again</p>
              </div>
            </div>

            {/* Desktop Order Search */}
            <div className="hidden md:block relative w-full max-w-sm">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600/50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search orders (ID or Status)..."
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-green-50 border-2 border-green-100 rounded-xl text-sm text-green-900 placeholder:text-green-600/40 focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-green-600 transition-all font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section - Show when orders exist */}
      {hasOrders && (
        <div className="px-4 mt-2 mb-2 md:mt-12 md:mb-12 md:px-12">
          {/* Section Header for Desktop */}
          <div className="hidden md:flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-8 bg-green-600 rounded-full" />
               <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">Recent Orders</h2>
             </div>
             <div className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
               {totalOrders} {totalOrders === 1 ? 'Record' : 'Records'} Found
             </div>
          </div>

          <div className="space-y-1.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 md:gap-8">
            {displayedOrders.map((order) => {
              const shortId = order.id.split('-').slice(-1)[0];
              const previewItems = order.items.slice(0, 3);

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="bg-white rounded-lg border border-neutral-200 p-2 md:p-6 hover:shadow-xl hover:border-green-100 transition-all md:hover:-translate-y-1 md:hover:rotate-1 md:rounded-3xl cursor-pointer flex flex-col justify-between h-full group"
                >
                  <div className="flex items-start justify-between gap-2 md:gap-4 h-full">
                    <div className="flex-1 min-w-0 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-0.5 md:mb-1.5">
                        <div className="text-xs md:text-sm font-semibold text-neutral-900">
                          Order #{shortId}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="text-[10px] md:text-xs text-neutral-500 mb-1 md:mb-3">{formatDate(order.createdAt)}</div>

                      {/* Product Images Preview - Compact */}
                      <div className="flex items-center mt-auto md:mt-2">
                        {previewItems
                          .filter(item => item?.product) // Filter out items with null/undefined products
                          .map((item, idx) => (
                            <div
                              key={item.product.id}
                              className={`w-6 h-6 md:w-12 md:h-12 bg-neutral-100 rounded md:rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden md:border md:border-neutral-200 ${idx > 0 ? '-ml-1 md:-ml-3' : ''}`}
                            >
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <span className="text-[8px] md:text-xs font-bold text-neutral-400">
                                  {(item.product.name || item.product.productName || '?').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ))}
                        {order.items.length > 3 && (
                          <div className={`w-6 h-6 md:w-12 md:h-12 bg-neutral-200 rounded md:rounded-lg flex items-center justify-center text-[8px] md:text-sm font-bold text-neutral-600 md:border md:border-neutral-300 md:z-10 ${previewItems.length > 0 ? '-ml-1 md:-ml-3' : ''}`}>
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0 h-full justify-between">
                      <div className="flex flex-col items-end gap-0.5 md:gap-1">
                        <div className="text-xs md:text-lg font-bold text-neutral-900">
                          ₹{order.totalAmount.toFixed(0)}
                        </div>
                        <div className="text-[10px] md:text-sm text-neutral-500 font-medium">
                          {order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                      {/* Order Again Button */}
                      <button
                        onClick={(e) => handleOrderAgain(order, e)}
                        disabled={addedOrders.has(order.id)}
                        className={`mt-1 md:mt-4 text-[10px] md:text-sm font-semibold px-3 py-1 md:px-5 md:py-2.5 rounded-md md:rounded-lg transition-all shadow-sm md:shadow hover:shadow-md ${addedOrders.has(order.id)
                          ? 'bg-orange-200 text-neutral-600 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700 md:hover:-translate-y-0.5 cursor-pointer'
                          }`}
                      >
                        {addedOrders.has(order.id) ? (
                            <span className="flex items-center gap-2">✓ Added</span>
                        ) : (
                          <span className="flex items-center gap-2">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hidden md:block">
                               <path d="M12 5v14M5 12h14"/>
                             </svg>
                             Order Again
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          {displayTotalPages > 1 && (
            <div className="mt-4 px-2 py-4 border-t border-neutral-100 flex flex-col items-center gap-4">
              <div className="text-[11px] text-neutral-500 font-medium">
                Showing {startIndex + 1} to {endIndex} of {totalOrders} entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-0.5 px-2 py-1.5 rounded transition-all duration-200 ${
                    currentPage === 1
                      ? "text-neutral-300 cursor-not-allowed bg-transparent"
                      : "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                  aria-label="Previous page">
                  <span className="text-lg leading-none">←</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Previous</span>
                </button>
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page) => (
                    <button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`min-w-[28px] h-7 flex items-center justify-center rounded font-black text-[11px] transition-all duration-200 ${
                        currentPage === page
                          ? "bg-[#E24C4C] text-white shadow-md scale-110"
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}>
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(displayTotalPages, prev + 1))
                  }
                  disabled={currentPage >= displayTotalPages}
                  className={`flex items-center gap-0.5 px-2 py-1.5 rounded transition-all duration-200 ${
                    currentPage >= displayTotalPages
                      ? "text-neutral-300 cursor-not-allowed bg-transparent"
                      : "text-neutral-900 bg-neutral-100 hover:bg-neutral-200 font-bold uppercase tracking-wider"
                  }`}
                  aria-label="Next page">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Next</span>
                  <span className="text-lg leading-none">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bestsellers Section - Desktop Grid */}
      <div className="px-4 py-2.5 border-b border-neutral-200 md:px-12 md:py-16 md:bg-neutral-50 md:rounded-[40px] md:mx-8 md:mb-12 md:shadow-inner md:border-none">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-10 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-orange-500 rounded-full" />
            <h2 className="text-sm font-semibold text-neutral-900 md:text-2xl md:font-black md:tracking-tight md:uppercase">Frequently Bought Together</h2>
          </div>
          <p className="hidden md:block text-neutral-400 text-sm font-medium">Bestsellers based on your recent orders</p>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8 md:pb-0" style={{ scrollSnapType: 'x mandatory' }}>
          {bestsellerProducts.map((product) => {
            // Get Price and MRP using utility
            const { displayPrice, mrp, discount, hasDiscount } = calculateProductPrice(product);

            // Get quantity in cart
            const cartItem = cart.items.find(item => item?.product && item.product.id === product.id);
            const inCartQty = cartItem?.quantity || 0;

            return (
              <div
                key={product.id}
                className="flex-shrink-0 w-[140px] md:w-[220px]"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className="bg-white rounded-lg md:rounded-xl overflow-hidden flex flex-col relative h-full md:border md:border-neutral-100 md:hover:shadow-xl transition-all duration-300 md:hover:-translate-y-1" style={{ boxShadow: '0 1px 1px rgba(0, 0, 0, 0.03)' }}>
                  {/* Product Image Area */}
                  <div
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="relative block cursor-pointer group"
                  >
                    <div className="w-full h-28 md:h-44 bg-neutral-100 flex items-center justify-center overflow-hidden relative">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-4xl">
                          {(product.name || product.productName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Red Discount Badge - Top Left */}
                      {discount > 0 && (
                        <div className="absolute top-1 left-1 z-10 bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 rounded">
                          {discount}% OFF
                        </div>
                      )}

                      {/* Heart Icon - Top Right */}
                      <WishlistButton
                        productId={product.id}
                        size="sm"
                        className="top-1 right-1 shadow-sm"
                      />

                      {/* ADD Button or Quantity Stepper - Overlaid on bottom right of image */}
                      <div className="absolute bottom-1.5 right-1.5 md:bottom-3 md:right-3 z-10">
                        <AnimatePresence mode="wait">
                          {inCartQty === 0 ? (
                            <motion.button
                              key="add-button"
                              type="button"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2 }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart(product, e.currentTarget);
                              }}
                              className="bg-white/95 backdrop-blur-sm text-green-600 border-2 border-green-600 text-[10px] md:text-sm md:font-bold md:px-4 md:py-1.5 font-semibold px-2 py-1 rounded md:rounded-lg shadow-md hover:bg-green-50 transition-colors"
                            >
                              ADD
                            </motion.button>
                          ) : (
                            <motion.div
                              key="stepper"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-1 md:gap-3 bg-green-600 rounded md:rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 shadow-md"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateQuantity(product.id, inCartQty - 1);
                                }}
                                className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center text-white font-bold hover:bg-green-700 rounded transition-colors p-0 leading-none"
                                style={{ lineHeight: 1, fontSize: '14px' }}
                              >
                                <span className="relative top-[-1px]">−</span>
                              </motion.button>
                              <motion.span
                                key={inCartQty}
                                initial={{ scale: 1.2, y: -2 }}
                                animate={{ scale: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                className="text-white font-bold min-w-[0.75rem] md:min-w-[1rem] md:text-sm text-center"
                                style={{ fontSize: '12px' }}
                              >
                                {inCartQty}
                              </motion.span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateQuantity(product.id, inCartQty + 1);
                                }}
                                className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center text-white font-bold hover:bg-green-700 rounded transition-colors p-0 leading-none"
                                style={{ lineHeight: 1, fontSize: '14px' }}
                              >
                                <span className="relative top-[-1px]">+</span>
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-1.5 md:p-4 flex-1 flex flex-col bg-white">
                    {/* Product Name */}
                    <div
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="mb-0.5 md:mb-2 cursor-pointer"
                    >
                      <h3 className="text-[10px] md:text-[13px] md:leading-snug md:font-black md:text-neutral-800 font-bold text-neutral-900 line-clamp-2 leading-tight md:hover:text-green-600 transition-colors">
                        {(() => {
                          // Remove description suffixes like " - Fresh & Quality Assured", " - Premium Quality", etc.
                          const productName = product.name || product.productName || '';
                          return productName.replace(/\s*-\s*(Fresh|Quality|Assured|Premium|Best|Top|Hygienic|Carefully|Selected).*$/i, '').trim();
                        })()}
                      </h3>
                    </div>

                    {/* Rating and Reviews */}
                    <div className="flex items-center gap-0.5 md:gap-1 mb-0.5 md:mb-1.5">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className="w-2 h-2 md:w-3.5 md:h-3.5"
                            viewBox="0 0 24 24"
                            fill={i < 4 ? '#fbbf24' : '#e5e7eb'}
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-[8px] md:text-[11px] text-neutral-500 font-medium">(85)</span>
                    </div>

                    {/* Delivery Time */}
                    <div className="text-[9px] md:text-[10px] text-neutral-600 mb-0.5 md:mb-2 font-bold bg-neutral-100 w-fit px-1 md:px-2 py-0.5 rounded text-center">
                      20 MINS
                    </div>

                    {/* Discount - Blue Text */}
                    {discount > 0 && (
                      <div className="text-[9px] md:text-xs text-blue-600 font-bold mb-0.5 md:mb-1">
                        {discount}% OFF
                      </div>
                    )}

                    {/* Price */}
                    <div className="mb-1 md:mb-3">
                      <div className="flex items-baseline gap-1 md:gap-2">
                        <span className="text-[13px] md:text-[1.1rem] font-black text-neutral-900">
                          ₹{displayPrice.toLocaleString('en-IN')}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] md:text-sm text-neutral-400 line-through font-medium">
                            ₹{mrp.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Link */}
                    <div
                      onClick={() => navigate(`/category/${product.categoryId || 'all'}`)}
                      className="w-full bg-green-100 text-green-700 text-[8px] md:text-xs md:font-semibold py-0.5 md:py-2 md:mt-2 rounded-lg md:rounded-xl flex items-center justify-between px-1 md:px-3 hover:bg-green-200 md:hover:bg-green-100 transition-colors mt-auto cursor-pointer border border-transparent md:border-green-100"
                    >
                      <span>See more like this</span>
                      <div className="flex items-center gap-0.5 md:gap-2">
                        <div className="w-px h-2 md:h-3 bg-green-300"></div>
                        <svg className="w-1.5 h-1.5 md:w-2.5 md:h-2.5" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M0 0L8 4L0 8Z" fill="#16a34a" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State Illustration - Show when no orders */}
      {!hasOrders && (
        <div className="bg-stone-50 py-12 px-4 md:py-32 md:my-16 md:mx-12 md:rounded-[50px] md:bg-white md:shadow-2xl md:shadow-neutral-200/50 md:border md:border-neutral-100 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center max-w-md md:max-w-2xl mx-auto">
            {/* Grocery Illustration */}
            <div className="relative w-full max-w-xs md:max-w-sm mb-8 md:mb-16">
              <div className="relative flex items-center justify-center md:scale-150 transition-transform duration-500 hover:scale-[1.55]">
                {/* Yellow Shopping Bag with Premium Gradient */}
                <div className="relative w-40 h-48 bg-gradient-to-br from-yellow-400 via-orange-400 to-yellow-600 rounded-b-[2rem] rounded-t-xl shadow-2xl border-2 border-white/20 flex items-center justify-center overflow-hidden">
                  {/* Glass highlight */}
                  <div className="absolute top-0 right-0 w-full h-1/2 bg-white/20 -skew-y-12 translate-y--4" />
                  
                  {/* Enhanced bag handle */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-10 border-[6px] border-orange-600 rounded-full border-b-transparent shadow-lg" />

                  {/* KLYDO CART text inside basket */}
                  <div className="relative z-10 text-center px-4">
                    <span className="text-2xl font-black text-white tracking-tighter drop-shadow-lg uppercase leading-none">KLYDO<br/>CART</span>
                    <div className="w-12 h-1.5 bg-white mx-auto mt-2 rounded-full opacity-50" />
                  </div>
                </div>
                
                {/* Floating elements for depth */}
                <div className="absolute -top-10 -right-10 w-16 h-16 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl animate-pulse" />
              </div>
            </div>

            {/* Reordering Message */}
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-5xl font-black text-neutral-900 tracking-tighter uppercase leading-tight">
                No orders yet,<br/><span className="text-green-600">Start filling your cart!</span>
              </h2>
              <p className="text-sm md:text-lg text-neutral-500 font-medium max-w-md mx-auto leading-relaxed">
                Your previous orders will appear here so you can reorder your favorites in a single tap.
              </p>
              <button 
                onClick={() => navigate('/')}
                className="hidden md:inline-flex mt-8 px-10 py-4 bg-neutral-900 text-white font-black rounded-2xl hover:bg-neutral-800 hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl uppercase tracking-widest text-sm"
              >
                Go Shopping
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
