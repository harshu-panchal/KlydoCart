import { useNavigate, useParams, Link } from 'react-router-dom';
import { Product } from '../../types/domain';
import { useEffect, useState, useMemo } from 'react';
import { getStoreProducts } from '../../services/api/customerHomeService';
import { getCategoryById } from '../../services/api/customerProductService';
import { useLocation } from '../../hooks/useLocation';
import ProductCard from './components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function StorePage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { location } = useLocation();
    const [products, setProducts] = useState<any[]>([]);
    const [shopData, setShopData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [subcategories, setSubcategories] = useState<any[]>([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState("all");

    useEffect(() => {
        const fetchData = async () => {
            if (!slug) return;
            try {
                setLoading(true);

                // Fetch shop data and products using the shop API endpoint
                const storeResponse = await getStoreProducts(
                    slug,
                    location?.latitude,
                    location?.longitude
                );

                if (storeResponse.success) {
                    setProducts((storeResponse.data || []).filter((p: any) => p.isAvailable !== false));
                    setShopData(storeResponse.shop || null);

                    // Try to fetch category details to get subcategories
                    try {
                        // Use the slug or categoryId if available in shopData
                        const catId = storeResponse.shop?.categoryId || slug;
                        const catResponse = await getCategoryById(catId);
                        if (catResponse.success && catResponse.data) {
                            const subs = catResponse.data.subcategories || [];
                            setSubcategories([
                                {
                                    _id: "all",
                                    id: "all",
                                    name: "All",
                                    icon: "📦",
                                    image: null
                                },
                                ...subs
                            ]);
                        } else {
                            // If no subcategories from API, group products by subcategory name if possible
                            const uniqueSubs = Array.from(new Set(storeResponse.data?.map((p: any) => p.subcategory?.name).filter(Boolean)));
                            if (uniqueSubs.length > 0) {
                                setSubcategories([
                                    { _id: "all", id: "all", name: "All", icon: "📦" },
                                    ...uniqueSubs.map(name => ({ _id: name, id: name, name, icon: "🏷️" }))
                                ]);
                            }
                        }
                    } catch (catError) {
                        console.error('Failed to fetch category details for store:', catError);
                    }
                } else {
                    setProducts([]);
                    setShopData(null);
                }
            } catch (error: any) {
                console.error('Failed to fetch store data:', error);
                setProducts([]);
                setShopData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug, location]);

    const storeName = shopData?.name || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', ' ') : 'Store');

    const filteredProducts = useMemo(() => {
        if (selectedSubcategory === "all") return products;
        return products.filter(p => 
            (p.subcategory?._id === selectedSubcategory) || 
            (p.subcategory?.id === selectedSubcategory) ||
            (p.subcategory?.name === selectedSubcategory)
        );
    }, [products, selectedSubcategory]);

    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    // Determine banner image source
    useEffect(() => {
        if (shopData?.image) {
            setBannerImage(shopData.image);
            setImageError(false);
        } else if (slug) {
            const possiblePaths = [
                `/assets/shopbystore/${slug}/${slug}header.png`,
                `/assets/shopbystore/${slug}/header.png`,
                `/assets/shopbystore/${slug}.png`,
                `/assets/shopbystore/${slug}.jpg`,
            ];
            setBannerImage(possiblePaths[0]);
            setImageError(false);
        }
    }, [shopData, slug]);

    if (loading && !products.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="flex bg-white h-screen overflow-hidden">
            {/* Left Sidebar for Subcategories */}
            {subcategories.length > 1 && (
                <div className="w-24 bg-white border-r border-neutral-100 overflow-y-auto scrollbar-hide flex-shrink-0 py-2">
                    <div className="space-y-1">
                        {subcategories.map((subcat) => {
                            const subId = subcat.id || subcat._id;
                            const isSelected = selectedSubcategory === subId;
                            return (
                                <button
                                    key={subId}
                                    type="button"
                                    onClick={() => setSelectedSubcategory(subId)}
                                    className={`w-full flex flex-col items-center justify-center py-2 relative transition-all duration-200 group ${
                                        isSelected ? "bg-green-50" : "hover:bg-neutral-50"
                                    }`}
                                    style={{ minHeight: "80px" }}
                                >
                                    {/* Active Indicator */}
                                    {isSelected && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-green-600 rounded-r-full"></div>
                                    )}

                                    {/* Image Container */}
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl mb-1.5 flex-shrink-0 overflow-hidden transition-all duration-200 shadow-sm ${
                                        isSelected ? "ring-2 ring-green-600 ring-offset-2 bg-white" : "bg-neutral-50 border border-neutral-100 group-hover:shadow-md"
                                    }`}>
                                        {subcat.image || subcat.imageUrl ? (
                                            <img src={subcat.image || subcat.imageUrl} alt={subcat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl">{subcat.icon || "📦"}</span>
                                        )}
                                    </div>

                                    {/* Text Label */}
                                    <span className={`text-[10px] text-center leading-tight px-1 transition-colors ${
                                        isSelected ? "font-bold text-green-700" : "text-neutral-500 group-hover:text-neutral-900"
                                    } line-clamp-2`}>
                                        {subcat.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/30">
                {/* Header Overlay */}
                <div className="bg-white border-b border-neutral-100 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-50 hover:bg-neutral-100 transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M15 18L9 12L15 6" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <h1 className="text-base md:text-xl font-bold text-neutral-900">{storeName}</h1>
                    </div>
                    <button
                        onClick={() => navigate('/search')}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-50 hover:bg-neutral-100 transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="8" stroke="#000000" strokeWidth="2" />
                            <path d="m21 21-4.35-4.35" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {/* Store Banner - Optional if available */}
                    {bannerImage && !imageError && (
                        <div className="relative w-full aspect-[4/1] md:aspect-[5/1] overflow-hidden mb-4">
                            <img src={bannerImage} alt={storeName} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-50/50 to-transparent" />
                        </div>
                    )}

                    {/* Products Grid */}
                    <div className="px-4 py-4 md:px-8 md:py-6">
                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                                {filteredProducts.map((product) => (
                                    <ProductCard
                                        key={product._id || product.id}
                                        product={product}
                                        categoryStyle={true}
                                        showBadge={true}
                                        showPackBadge={false}
                                        showStockInfo={false}
                                        showOptionsText={true}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-neutral-500">
                                <p>No products found in this section.</p>
                                {selectedSubcategory !== "all" && (
                                    <button onClick={() => setSelectedSubcategory("all")} className="text-green-600 font-medium mt-2">
                                        View all products
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
