import React, { useState, useEffect } from 'react';
import { AdminProduct, addSellerProduct, updateSellerProduct } from '../../../../services/api/adminSellerManagementService';
import { Category, SubCategory, getSubcategories } from '../../../../services/api/categoryService';
import { uploadImage } from '../../../../services/api/uploadService';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    sellerId: string;
    product: AdminProduct | null;
    categories: Category[];
    onSuccess: (message: string) => void;
}

export default function ProductModal({ isOpen, onClose, sellerId, product, categories, onSuccess }: ProductModalProps) {
    const [formData, setFormData] = useState({
        productName: '',
        category: '',
        subcategory: '',
        price: '',
        discPrice: '',
        stock: '',
        description: '',
        mainImage: ''
    });
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        if (product) {
            setFormData({
                productName: product.productName,
                category: product.category?._id || '',
                subcategory: (product as any).subcategory?._id || '',
                price: product.price.toString(),
                discPrice: product.discPrice?.toString() || '',
                stock: product.stock.toString(),
                description: (product as any).description || '',
                mainImage: product.mainImage || ''
            });
            setImagePreview(product.mainImage || '');
        } else {
            setFormData({
                productName: '',
                category: '',
                subcategory: '',
                price: '',
                discPrice: '',
                stock: '',
                description: '',
                mainImage: ''
            });
            setImagePreview('');
        }
    }, [product, isOpen]);

    useEffect(() => {
        const fetchSubs = async () => {
            if (formData.category) {
                try {
                    const res = await getSubcategories(formData.category);
                    if (res.success) setSubcategories(res.data);
                } catch (err) {
                    console.error("Error fetching subcategories:", err);
                }
            } else {
                setSubcategories([]);
            }
        };
        fetchSubs();
    }, [formData.category]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
            
            const result = await uploadImage(file, 'products');
            setFormData(prev => ({ ...prev, mainImage: result.secureUrl }));
        } catch (err) {
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = {
                ...formData,
                category: formData.category || undefined,
                subcategory: formData.subcategory || undefined,
                price: parseFloat(formData.price),
                discPrice: formData.discPrice ? parseFloat(formData.discPrice) : undefined,
                stock: parseInt(formData.stock),
            };

            let response;
            if (product) {
                response = await updateSellerProduct(product._id, payload);
            } else {
                response = await addSellerProduct(sellerId, payload);
            }

            if (response.success) {
                onSuccess(product ? 'Product updated successfully' : 'Product added successfully');
                onClose();
            } else {
                setError(response.message || 'Operation failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-teal-600 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">
                        {product ? 'Edit Product' : 'Add New Product'}
                    </h3>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-1">Product Name</label>
                                <input
                                    required
                                    name="productName"
                                    value={formData.productName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    placeholder="Enter product name"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Category</label>
                                    <select
                                        required
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white transition-all"
                                    >
                                        <option value="">Select</option>
                                        {categories.map(cat => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Subcategory</label>
                                    <select
                                        name="subcategory"
                                        value={formData.subcategory}
                                        onChange={handleChange}
                                        disabled={!formData.category}
                                        className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white transition-all disabled:bg-neutral-50"
                                    >
                                        <option value="">Select</option>
                                        {subcategories && subcategories.length > 0 ? (
                                            subcategories.map(sub => (
                                                <option key={sub._id || (sub as any).id} value={sub._id || (sub as any).id}>
                                                    {sub.subcategoryName || (sub as any).name || 'Unnamed Subcategory'}
                                                </option>
                                            ))
                                        ) : (
                                            <option disabled>No subcategories available</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Price</label>
                                    <input
                                        required
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Stock</label>
                                    <input
                                        required
                                        type="number"
                                        name="stock"
                                        value={formData.stock}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-1">Product Image</label>
                                <div className="relative group aspect-video bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 overflow-hidden flex items-center justify-center">
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className="cursor-pointer bg-white text-neutral-900 px-4 py-2 rounded-lg text-sm font-bold">
                                                    Change Image
                                                    <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                                </label>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="cursor-pointer text-center p-4">
                                            <div className="text-teal-600 mb-2">
                                                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                </svg>
                                            </div>
                                            <span className="text-sm text-neutral-500">Upload Image</span>
                                            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                        </label>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none"
                                    placeholder="Brief description..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-neutral-100 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 transition-colors font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={loading || uploading}
                            className="px-8 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-teal-300 transition-colors font-bold shadow-lg shadow-teal-600/20"
                        >
                            {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
