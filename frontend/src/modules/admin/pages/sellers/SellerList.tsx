import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSellersForManage } from '../../../../services/api/adminSellerManagementService';
import { Seller } from '../../../../services/api/sellerService';

export default function SellerList() {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSellers = async () => {
            try {
                setLoading(true);
                const response = await getAllSellersForManage();
                if (response.success) {
                    setSellers(response.data);
                } else {
                    setError(response.message || 'Failed to fetch sellers');
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Error fetching sellers');
            } finally {
                setLoading(false);
            }
        };

        fetchSellers();
    }, []);

    const filteredSellers = sellers.filter(seller =>
        seller.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="bg-teal-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Seller Management</h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search sellers..."
                            className="bg-teal-700 text-white placeholder-teal-200 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-white w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border-b border-red-100 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 text-xs font-bold text-neutral-600 uppercase tracking-wider">
                            <tr>
                                 <th className="px-6 py-4">Logo</th>
                                 <th className="px-6 py-4">Seller Info</th>
                                 <th className="px-6 py-4">Store Name</th>
                                 <th className="px-6 py-4">Status</th>
                                 <th className="px-6 py-4">Joined On</th>
                                 <th className="px-6 py-4 text-right">Actions</th>
                             </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                                        Loading sellers...
                                    </td>
                                </tr>
                            ) : filteredSellers.length > 0 ? (
                                filteredSellers.map((seller) => (
                                    <tr key={seller._id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <img
                                                src={seller.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.sellerName)}&background=random`}
                                                alt={seller.storeName}
                                                className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                                                onError={(e) => {
                                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.sellerName)}&background=random`;
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-semibold text-neutral-900">{seller.sellerName}</div>
                                                <div className="text-xs text-neutral-500">{seller.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-neutral-700">
                                            {seller.storeName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                seller.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                seller.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {seller.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-neutral-500">
                                            {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/admin/sellers/${seller._id}`)}
                                                className="text-teal-600 hover:text-teal-800 font-medium text-sm transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                                        No sellers found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
