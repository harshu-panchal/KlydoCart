import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, getCategories, Category } from '../../../services/api/customerProductService';
import { Product } from '../../../types/domain';
import ProductCard from './ProductCard';
import { useLocation } from '../../../hooks/useLocation';

interface CategorySection {
    title: string;
    icon: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    products: Product[];
    loading: boolean;
    categoryId?: string;
}

export default function HomeCategoryProducts() {
    const { location } = useLocation();
    const [sections, setSections] = useState<CategorySection[]>([
        { title: 'Vegetables', icon: '🥬', bgColor: 'bg-green-50', borderColor: 'border-green-500', textColor: 'text-green-800', products: [], loading: true },
        { title: 'Fruits', icon: '🍎', bgColor: 'bg-amber-50', borderColor: 'border-amber-500', textColor: 'text-amber-800', products: [], loading: true },
        { title: 'Restaurant Food', icon: '🍲', bgColor: 'bg-purple-50', borderColor: 'border-purple-500', textColor: 'text-purple-800', products: [], loading: true },
        { title: 'Fast Food', icon: '🍔', bgColor: 'bg-orange-50', borderColor: 'border-orange-500', textColor: 'text-orange-800', products: [], loading: true },
        { title: 'Non Veg', icon: '🍗', bgColor: 'bg-rose-50', borderColor: 'border-rose-500', textColor: 'text-rose-800', products: [], loading: true },
        { title: 'Cake', icon: '🎂', bgColor: 'bg-pink-50', borderColor: 'border-pink-500', textColor: 'text-pink-800', products: [], loading: true },
        { title: 'Wedding & Bridal', icon: '👰', bgColor: 'bg-teal-50', borderColor: 'border-teal-500', textColor: 'text-teal-800', products: [], loading: true }
    ]);

    useEffect(() => {
        const fetchCategoryProducts = async () => {
            try {
                // Fetch all categories
                const catRes = await getCategories();
                if (!catRes.success || !catRes.data) return;

                const allCategories = catRes.data;

                // Match categories based on keywords
                const matchCategory = (keywords: string[]): Category | undefined => {
                    return allCategories.find(c => 
                        keywords.some(keyword => c.name.toLowerCase().includes(keyword))
                    );
                };

                const matchedCategories = {
                    'Vegetables': matchCategory(['fresh vegetables', 'vegetables', 'vegtable']),
                    'Fruits': matchCategory(['fresh fruits']),
                    'Restaurant Food': matchCategory(['ready food', 'restaurant', 'biryani']),
                    'Fast Food': matchCategory(['fast food']),
                    'Non Veg': matchCategory(['chicken, meat & fish', 'chicken-meat-and-fish', 'non veg', 'non-veg']),
                    'Cake': matchCategory(['cakes']),
                    'Wedding & Bridal': matchCategory(['bridal wear', 'wedding & bridal', 'wedding'])
                };

                // Fetch products for each matched category
                const updatedSections = await Promise.all(
                    sections.map(async (sec) => {
                        const targetCategory = matchedCategories[sec.title as keyof typeof matchedCategories];
                        if (!targetCategory) {
                            return { ...sec, loading: false };
                        }

                        try {
                            const queryParams: any = {
                                latitude: location?.latitude,
                                longitude: location?.longitude,
                                limit: 6 // Show top 6 products per category
                            };

                            // If the category has a parentId, query as subcategory for correct backend lookup
                            if (targetCategory.parentId) {
                                queryParams.subcategory = targetCategory._id;
                            } else {
                                queryParams.category = targetCategory._id;
                            }

                            const prodRes = await getProducts(queryParams);

                            if (prodRes.success && prodRes.data) {
                                return {
                                    ...sec,
                                    categoryId: targetCategory._id,
                                    products: prodRes.data as any,
                                    loading: false
                                };
                            }
                        } catch (e) {
                            console.error(`Error fetching products for category: ${sec.title}`, e);
                        }

                        return { ...sec, categoryId: targetCategory._id, loading: false };
                    })
                );

                setSections(updatedSections);
            } catch (error) {
                console.error('Error fetching categories or products:', error);
            }
        };

        fetchCategoryProducts();
    }, [location?.latitude, location?.longitude]);

    // Render nothing if all sections are loading and have no products
    const hasAnyProducts = sections.some(sec => sec.products.length > 0);
    if (!hasAnyProducts && sections.every(sec => !sec.loading)) return null;

    return (
        <div className="space-y-6 md:space-y-8 px-4 md:px-6 lg:px-8 pb-10">
            {sections.map((sec) => {
                if (!sec.loading && sec.products.length === 0) return null;

                return (
                    <div key={sec.title} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
                        {/* Header Bar */}
                        <div className={`flex items-center justify-between px-4 py-3 border-l-4 ${sec.borderColor} ${sec.bgColor}`}>
                            <div className="flex items-center gap-2.5">
                                <span className="text-xl md:text-2xl">{sec.icon}</span>
                                <h3 className={`text-base md:text-lg font-bold tracking-tight uppercase ${sec.textColor}`}>
                                    {sec.title}
                                </h3>
                            </div>
                            {sec.categoryId && (
                                <Link
                                    to={`/category/${sec.categoryId}`}
                                    className="text-xs md:text-sm font-bold text-green-700 hover:text-green-800 hover:underline flex items-center gap-0.5"
                                >
                                    + More
                                </Link>
                            )}
                        </div>

                         {/* Product Grid */}
                        <div className="p-3 md:p-5">
                            {sec.loading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-3 animate-pulse">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="aspect-[3/4] bg-neutral-100 rounded-lg"></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-3">
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
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
