import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getWishlist, removeFromWishlist } from '../../services/api/customerWishlistService';
import { Product } from '../../types/domain';
import { useCart } from '../../context/CartContext';
import { useLocation } from '../../hooks/useLocation';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateProductPrice } from '../../utils/priceUtils';
import { useThemeContext } from '../../context/ThemeContext';

export default function Wishlist() {
  const navigate = useNavigate();
  const { currentTheme } = useThemeContext();
  const { location } = useLocation();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await getWishlist({
        latitude: location?.latitude,
        longitude: location?.longitude
      });
      if (res.success && res.data && res.data.products) {
        setProducts(res.data.products.filter(Boolean).map(p => ({
          ...p,
          id: p._id || (p as any).id,
          name: p.productName || (p as any).name,
          imageUrl: p.mainImageUrl || p.mainImage || (p as any).imageUrl,
          price: (p as any).price || (p as any).variations?.[0]?.price || 0,
          pack: (p as any).pack || (p as any).variations?.[0]?.name || 'Standard'
        })) as any);
      }
    } catch (error: any) {
      console.error('Failed to fetch wishlist:', error);
      showToast(error.message || 'Failed to fetch wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [location?.latitude, location?.longitude]);

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      setProducts(products.filter(p => (p.id !== productId && p._id !== productId)));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  const handleShare = async (product: any) => {
    const url = `${window.location.origin}/product/${product.id}`;
    const shareData = {
      title: product.name,
      text: `Check out this ${product.name} on KlydoCart!`,
      url: url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          showToast('Failed to share product', 'error');
        }
        return;
      }
    }

    setActiveShareId(activeShareId === product.id ? null : product.id);
  };

  const handleWhatsAppShare = (product: any) => {
    const url = `${window.location.origin}/product/${product.id}`;
    const text = `Check out this ${product.name} on KlydoCart: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setActiveShareId(null);
  };

  const handleCopyLink = (product: any) => {
    const url = `${window.location.origin}/product/${product.id}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard', 'success');
    setActiveShareId(null);
  };

  return (
    <div className="pb-24 md:pb-8 bg-white min-h-screen">
      <div 
        className="px-4 py-4 mb-4 sticky top-0 z-10 flex items-center relative shadow-md"
        style={{
          background: `linear-gradient(to right, ${currentTheme.primary[0]}, ${currentTheme.primary[1]})`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 md:left-6 text-white hover:bg-white/20 p-1.5 rounded-full transition-colors flex-shrink-0 z-10"
          aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="w-full text-center text-xl font-bold text-white">My Wishlist</h1>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col relative"
              >
                <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 shadow-sm"
                    title="Remove from wishlist"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => handleShare(product)}
                      className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-neutral-500 shadow-sm"
                      title="Share product"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    </button>
                    {activeShareId === product.id && (
                      <div className="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-2xl border border-neutral-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <button 
                          onClick={() => handleWhatsAppShare(product)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-neutral-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor"/></svg>
                          WhatsApp
                        </button>
                        <button 
                          onClick={() => handleCopyLink(product)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          Copy Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Link to={`/product/${product.id}`} className="aspect-square bg-neutral-50 flex items-center justify-center p-4">
                  {product.imageUrl || product.mainImage ? (
                    <img src={product.imageUrl || product.mainImage} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-4xl">📦</span>
                  )}
                </Link>

                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-2 mb-1">{product.name}</h3>
                  <div className="text-[10px] text-neutral-500 mb-2">{product.pack}</div>
                  <div className="mt-auto flex flex-col gap-2">
                    {(() => {
                      const { displayPrice, mrp, hasDiscount } = calculateProductPrice(product);
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-neutral-900">₹{displayPrice.toLocaleString('en-IN')}</span>
                          {hasDiscount && (
                            <span className="text-xs text-neutral-500 line-through">₹{mrp.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      );
                    })()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToCart(product)}
                      className="w-full border-green-600 text-green-600 hover:bg-green-50 rounded-lg h-8 text-xs font-bold"
                    >
                      ADD TO CART
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-neutral-500">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Your wishlist is empty</h2>
            <p className="text-sm mb-6">Explore more and shortlist some items</p>
            <Button onClick={() => navigate('/')} className="bg-green-600 text-white rounded-full px-8">
              Start Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
