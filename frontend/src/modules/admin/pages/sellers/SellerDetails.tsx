import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSellerDetailsForManage, deleteSellerProduct, AdminProduct } from '../../../../services/api/adminSellerManagementService';
import { Seller } from '../../../../services/api/sellerService';
import ProductModal from './ProductModal';

export default function SellerDetails() {
    const { sellerId } = useParams<{ sellerId: string }>();
    const navigate = useNavigate();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

    const fetchData = async () => {
        if (!sellerId) return;
        try {
            setLoading(true);
            const response = await getSellerDetailsForManage(sellerId);
            if (response.success) {
                setSeller(response.data.seller);
                setProducts(response.data.products);
                setCategories(response.data.categories);
            } else {
                setError(response.message || 'Failed to fetch details');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error fetching details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [sellerId]);

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            const response = await deleteSellerProduct(id);
            if (response.success) {
                setSuccessMessage('Product deleted successfully');
                setProducts(products.filter(p => p._id !== id));
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err: any) {
            setError('Failed to delete product');
        }
    };

    const handleEditProduct = (product: AdminProduct) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleModalSuccess = (message: string) => {
        setSuccessMessage(message);
        fetchData();
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    if (loading) return <div className="p-12 text-center text-neutral-500">Loading details...</div>;
    if (!seller) return <div className="p-12 text-center text-red-500">Seller not found</div>;

    const uniqueCategories = Array.from(new Set(products.map(p => p.category?.name))).filter(Boolean);
    const filteredProducts = activeTab === 'all' 
        ? products 
        : products.filter(p => p.category?.name === activeTab);

    return (
        <div className="p-4 bg-neutral-50 min-h-screen pb-24 font-sans">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button 
                    onClick={() => navigate('/admin/sellers')}
                    className="p-1.5 bg-white rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-all shadow-sm hover:shadow-md cursor-pointer"
                >
                    <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-neutral-900 tracking-tight">{seller.storeName}</h2>
                    <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Seller Management / {seller.sellerName}</p>
                </div>
            </div>

            {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm font-medium rounded animate-in fade-in slide-in-from-top-2 duration-300">
                    {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
                {/* Seller Mini Profile */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 text-2xl font-bold mb-3 ring-2 ring-teal-100/50">
                        {seller.sellerName[0].toUpperCase()}
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 line-clamp-1">{seller.sellerName}</h3>
                    <p className="text-xs text-neutral-500 mb-4 truncate w-full text-center">{seller.email}</p>
                    <div className="w-full space-y-2 pt-3 border-t border-neutral-50">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-neutral-400 font-bold uppercase tracking-widest">Mobile</span>
                            <span className="text-neutral-700 font-bold">{seller.mobile}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-neutral-400 font-bold uppercase tracking-widest">Status</span>
                            <span className={`font-bold ${seller.status === 'Approved' ? 'text-green-600' : 'text-amber-600'}`}>
                                {seller.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Compact Shop Details */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-teal-50 rounded-lg">
                            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-neutral-900">Shop Overview</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-widest">Business Type</p>
                            <p className="text-sm text-neutral-800 font-bold">{seller.category || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-widest">Area / Radius</p>
                            <p className="text-sm text-neutral-800 font-bold line-clamp-1">{seller.city} {seller.serviceRadiusKm ? `(${seller.serviceRadiusKm}km)` : ''}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-widest">Tax info</p>
                            <p className="text-sm text-neutral-800 font-bold">{seller.taxNumber || 'None'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-widest">Joined</p>
                            <p className="text-sm text-neutral-800 font-bold">{seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-neutral-50">
                         <p className="text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-widest">Address</p>
                         <p className="text-sm text-neutral-600 line-clamp-1 italic">{seller.address || 'No address provided'}</p>
                    </div>
                </div>
            </div>

            {/* Compact Products Section */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-teal-50 rounded-lg">
                            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-neutral-900">Inventory Control</h3>
                    </div>
                    <button 
                        onClick={handleAddProduct}
                        className="bg-teal-600 text-white px-4 py-1.5 rounded-lg hover:bg-teal-700 transition-all text-sm font-bold shadow-sm active:scale-95"
                    >
                        + Add Product
                    </button>
                </div>

                {/* Mini Category Tabs */}
                <div className="px-5 py-2 bg-neutral-50/30 border-b border-neutral-100 overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                                activeTab === 'all' 
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                                : 'bg-white text-neutral-500 border-neutral-200 hover:border-teal-200'
                            }`}
                        >
                            All ({products.length})
                        </button>
                        {uniqueCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                                    activeTab === cat 
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                                    : 'bg-white text-neutral-500 border-neutral-200 hover:border-teal-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map(product => (
                                <div key={product._id} className="group bg-white rounded-xl border border-neutral-100 hover:border-teal-100 hover:shadow-lg transition-all p-2.5 flex flex-col relative">
                                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-neutral-50 mb-3">
                                        <img 
                                            src={product.mainImage || '/api/placeholder/150/110'} 
                                            alt={product.productName}
                                            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-110"
                                        />
                                        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEditProduct(product)}
                                                className="p-1.5 bg-white/95 backdrop-blur rounded-md text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                                                title="Edit"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteProduct(product._id)}
                                                className="p-1.5 bg-white/95 backdrop-blur rounded-md text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                title="Delete"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v2m3 3h4" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-[13px] font-bold text-neutral-800 line-clamp-1 mb-1 tracking-tight">{product.productName}</h4>
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="text-sm font-black text-teal-600 tracking-tight">₹{product.price}</div>
                                            <div className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${product.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                                {product.stock > 0 ? `${product.stock}` : 'OUT'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center">
                                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-300">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <h5 className="text-xl font-bold text-neutral-900 mb-2">No products found</h5>
                                <p className="text-neutral-500">This seller hasn't added any products to this category yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ProductModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                sellerId={sellerId || ''}
                product={editingProduct}
                categories={categories}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
}
