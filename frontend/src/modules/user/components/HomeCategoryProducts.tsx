import { useEffect, useState, useCallback } from 'react';
import { getProducts } from '../../../services/api/customerProductService';
import { getHeaderCategoriesPublic, HeaderCategory } from '../../../services/api/headerCategoryService';
import { Product } from '../../../types/domain';
import ProductCard from './ProductCard';
import { useLocation } from '../../../hooks/useLocation';
import { getIconByName } from '../../../utils/iconLibrary';
import { useToast } from '../../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 6;

interface CategorySection {
    title: string;
    icon?: string;
    iconName?: string;
    image?: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    products: Product[];
    loading: boolean;
    loadingMore: boolean;
    headerCategoryId: string;
    page: number;
    hasMore: boolean;
    slug: string;
}

export default function HomeCategoryProducts() {
    const { location } = useLocation();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [sections, setSections] = useState<CategorySection[]>([]);
    const [loading, setLoading] = useState(true);

    const themeColorMap: Record<string, { bgColor: string, borderColor: string, textColor: string }> = {
        all: { bgColor: 'bg-green-50', borderColor: 'border-green-500', textColor: 'text-green-800' },
        wedding: { bgColor: 'bg-red-50', borderColor: 'border-red-500', textColor: 'text-red-800' },
        winter: { bgColor: 'bg-sky-50', borderColor: 'border-sky-500', textColor: 'text-sky-800' },
        electronics: { bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500', textColor: 'text-yellow-800' },
        beauty: { bgColor: 'bg-pink-50', borderColor: 'border-pink-500', textColor: 'text-pink-800' },
        grocery: { bgColor: 'bg-emerald-50', borderColor: 'border-emerald-500', textColor: 'text-emerald-800' },
        fashion: { bgColor: 'bg-purple-50', borderColor: 'border-purple-500', textColor: 'text-purple-800' },
        sports: { bgColor: 'bg-blue-50', borderColor: 'border-blue-500', textColor: 'text-blue-800' },
        orange: { bgColor: 'bg-orange-50', borderColor: 'border-orange-500', textColor: 'text-orange-800' },
        violet: { bgColor: 'bg-violet-50', borderColor: 'border-violet-500', textColor: 'text-violet-800' },
        teal: { bgColor: 'bg-teal-50', borderColor: 'border-teal-500', textColor: 'text-teal-800' },
        dark: { bgColor: 'bg-neutral-50', borderColor: 'border-neutral-500', textColor: 'text-neutral-800' },
        hotpink: { bgColor: 'bg-pink-50', borderColor: 'border-pink-500', textColor: 'text-pink-800' },
        gold: { bgColor: 'bg-amber-50', borderColor: 'border-amber-500', textColor: 'text-amber-800' }
    };

    useEffect(() => {
        const fetchHeaderCategoryProducts = async () => {
            try {
                const headerCats = await getHeaderCategoriesPublic();
                if (!headerCats || headerCats.length === 0) {
                    setLoading(false);
                    return;
                }

                const visibleCats = headerCats.filter((cat: HeaderCategory) => cat.showInHome === true);
                if (visibleCats.length === 0) {
                    setSections([]);
                    setLoading(false);
                    return;
                }

                const desiredOrder = ["fruits", "fast food", "restaurant & food", "vagitable", "cake", "wedding"];
                visibleCats.sort((a, b) => {
                    const nameA = (a.name || '').toLowerCase().trim();
                    const nameB = (b.name || '').toLowerCase().trim();
                    const indexA = desiredOrder.indexOf(nameA);
                    const indexB = desiredOrder.indexOf(nameB);
                    
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return 0;
                });

                const initialSections: CategorySection[] = visibleCats.map((cat: HeaderCategory) => {
                    const colors = themeColorMap[cat.slug] || {
                        bgColor: 'bg-neutral-50',
                        borderColor: 'border-neutral-300',
                        textColor: 'text-neutral-700'
                    };

                    return {
                        title: cat.name,
                        iconName: cat.iconName,
                        image: cat.image,
                        bgColor: colors.bgColor,
                        borderColor: colors.borderColor,
                        textColor: colors.textColor,
                        products: [],
                        loading: true,
                        loadingMore: false,
                        headerCategoryId: cat._id,
                        page: 1,
                        hasMore: false,
                        slug: cat.slug,
                    };
                });

                setSections(initialSections);
                setLoading(false);

                // Fetch first page of products for each section in parallel
                const updatedSections = await Promise.all(
                    initialSections.map(async (sec) => {
                        try {
                            const queryParams: any = {
                                latitude: location?.latitude,
                                longitude: location?.longitude,
                                limit: PAGE_SIZE,
                                page: 1,
                                headerCategoryId: sec.headerCategoryId
                            };

                            const prodRes = await getProducts(queryParams);

                            if (prodRes.success && prodRes.data) {
                                const fetched = prodRes.data.length;
                                const total = prodRes.pagination?.total ?? 0;
                                // hasMore: either pagination says there's more, or we got a full page
                                const hasMore = total > PAGE_SIZE || fetched >= PAGE_SIZE;
                                return {
                                    ...sec,
                                    products: prodRes.data as any,
                                    loading: false,
                                    hasMore,
                                };
                            }
                        } catch (e) {
                            console.error(`Error fetching products for header category: ${sec.title}`, e);
                        }
                        return { ...sec, loading: false };
                    })
                );

                setSections(updatedSections);
            } catch (error) {
                console.error('Error fetching dynamic header category products:', error);
                setLoading(false);
            }
        };

        fetchHeaderCategoryProducts();
    }, [location?.latitude, location?.longitude]);

    // Load more products for a specific section
    const handleLoadMore = useCallback(async (headerCategoryId: string) => {
        setSections(prev =>
            prev.map(sec =>
                sec.headerCategoryId === headerCategoryId
                    ? { ...sec, loadingMore: true }
                    : sec
            )
        );

        const sec = sections.find(s => s.headerCategoryId === headerCategoryId);
        if (!sec) return;

        const nextPage = sec.page + 1;

        try {
            const queryParams: any = {
                latitude: location?.latitude,
                longitude: location?.longitude,
                limit: PAGE_SIZE,
                page: nextPage,
                headerCategoryId,
            };

            const prodRes = await getProducts(queryParams);

            if (prodRes.success && prodRes.data) {
                const newProducts = prodRes.data as any[];
                const total = prodRes.pagination?.total ?? 0;
                // No more products if we got fewer than a full page
                const hasMore = newProducts.length >= PAGE_SIZE
                    ? (total > 0 ? (sec.products.length + newProducts.length) < total : true)
                    : false;
                setSections(prev =>
                    prev.map(s =>
                        s.headerCategoryId === headerCategoryId
                            ? {
                                ...s,
                                products: [...s.products, ...newProducts],
                                page: nextPage,
                                loadingMore: false,
                                hasMore,
                            }
                            : s
                    )
                );
            } else {
                setSections(prev =>
                    prev.map(s =>
                        s.headerCategoryId === headerCategoryId
                            ? { ...s, loadingMore: false, hasMore: false }
                            : s
                    )
                );
            }
        } catch (e) {
            console.error('Error loading more products:', e);
            setSections(prev =>
                prev.map(s =>
                    s.headerCategoryId === headerCategoryId
                        ? { ...s, loadingMore: false }
                        : s
                )
            );
        }
    }, [sections, location?.latitude, location?.longitude]);

    if (loading) {
        return (
            <div className="space-y-4 md:space-y-6 px-3 md:px-6 lg:px-8 pb-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden animate-pulse">
                        <div className="h-10 bg-neutral-100 w-full"></div>
                        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {[...Array(6)].map((_, j) => (
                                <div key={j} className="aspect-[3/4] bg-neutral-50 rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const hasAnyProducts = sections.some(sec => sec.products.length > 0);
    if (!hasAnyProducts && sections.every(sec => !sec.loading)) return null;

    return (
        <div className="space-y-4 md:space-y-6 px-3 md:px-6 lg:px-8 pb-8">
            {sections.map((sec) => {
                if (!sec.loading && sec.products.length === 0) return null;

                // Extract color name from border class (e.g. 'border-green-500' -> 'bg-green-500')
                const accentBgClass = sec.borderColor.replace('border-', 'bg-');

                return (
                    <div key={sec.headerCategoryId} className="bg-white rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.03] overflow-hidden">
                        {/* Header Bar */}
                        <div className={`flex items-center justify-between py-2.5 pr-4 relative ${sec.bgColor}`}>
                            <div 
                                className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => navigate(`/category/${sec.slug}`)}
                            >
                                <div className={`absolute left-0 w-1.5 h-6 rounded-r-md ${accentBgClass}`}></div>
                                <div className="flex items-center gap-2 pl-3.5">
                                    <span className={`w-5 h-5 flex items-center justify-center ${sec.textColor}`}>
                                        {sec.image ? (
                                            <img src={sec.image} alt={sec.title} className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            sec.iconName ? getIconByName(sec.iconName) : '📦'
                                        )}
                                    </span>
                                    <h3 className={`text-[15px] md:text-base font-extrabold tracking-wide uppercase ${sec.textColor}`}>
                                        {sec.title}
                                    </h3>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => navigate(`/category/${sec.slug}`)}
                                className="text-[12px] md:text-[14px] font-bold text-green-600 hover:text-green-700 transition-colors flex items-center justify-center gap-1 bg-transparent border-none p-0"
                            >
                                +more
                            </button>
                        </div>

                        {/* Product Grid */}
                        <div className="p-2 md:p-4">
                            {sec.loading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 animate-pulse">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="aspect-[3/4] bg-neutral-100 rounded-lg"></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                                    {sec.products.map((product) => (
                                        <ProductCard
                                            key={product.id || product._id}
                                            product={product}
                                            categoryStyle={true}
                                            showBadge={true}
                                            showPackBadge={false}
                                            showStockInfo={false}
                                            compact={true}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Loading More Skeleton */}
                            {sec.loadingMore && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 mt-2 animate-pulse">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="aspect-[3/4] bg-neutral-100 rounded-lg"></div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* More Button — always visible at the BOTTOM of the section */}
                        {!sec.loading && (
                            <div className="flex items-center justify-end px-3 py-2 md:py-2.5 bg-white">
                                <button
                                    onClick={() => sec.hasMore && !sec.loadingMore && handleLoadMore(sec.headerCategoryId)}
                                    disabled={sec.loadingMore || !sec.hasMore}
                                    className={`
                                        flex items-center justify-center gap-1.5 text-[11px] md:text-xs font-bold px-6 py-1.5 rounded-full
                                        transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.03)]
                                        ${sec.hasMore
                                            ? `bg-white ${sec.textColor} hover:shadow-md active:scale-95 cursor-pointer border border-transparent`
                                            : 'bg-white/80 text-neutral-400 cursor-not-allowed border border-transparent'
                                        }
                                        disabled:opacity-80
                                    `}
                                >
                                    {sec.loadingMore ? (
                                        <>
                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                            </svg>
                                            Loading...
                                        </>
                                    ) : sec.hasMore ? (
                                        <span>+ More</span>
                                    ) : (
                                        <span>No More</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
