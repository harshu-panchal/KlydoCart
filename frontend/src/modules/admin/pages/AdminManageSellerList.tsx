import { useState, useEffect } from 'react';
import { getAllSellers, updateSellerStatus, deleteSeller, Seller as SellerType, updateSeller } from '../../../services/api/sellerService';
import SellerServiceMap from '../components/SellerServiceMap';
import { useToast } from '../../../context/ToastContext';

interface Seller {
    _id: string;
    id?: number; // For backward compatibility with existing code
    name: string;
    sellerName: string;
    storeName: string;
    phone: string;
    mobile: string;
    email: string;
    logo?: string;
    balance: number;
    commission: number;
    categories: string[];
    categoryCount: number;
    status: 'Approved' | 'Pending' | 'Rejected';
    needApproval: boolean;
    // Additional fields from signup
    category?: string;
    address?: string;
    city?: string;
    serviceableArea?: string;
    panCard?: string;
    taxName?: string;
    taxNumber?: string;
    searchLocation?: string;
    latitude?: string;
    longitude?: string;
    serviceRadiusKm?: number;
    accountName?: string;
    bankName?: string;
    branch?: string;
    accountNumber?: string;
    ifsc?: string;
    profile?: string;
    idProof?: string;
    addressProof?: string;
    requireProductApproval?: boolean;
    viewCustomerDetails?: boolean;
}

// Helper function to convert backend seller to frontend format
const mapSellerToFrontend = (seller: SellerType): Seller => {
    return {
        _id: seller._id,
        id: parseInt(seller._id.slice(-6), 16) || 0, // Generate a numeric ID from MongoDB _id
        name: seller.sellerName,
        sellerName: seller.sellerName,
        storeName: seller.storeName,
        phone: seller.mobile,
        mobile: seller.mobile,
        email: seller.email,
        logo: seller.logo || '/api/placeholder/40/40',
        balance: seller.balance || 0,
        commission: seller.commission || 0,
        categories: seller.categories || [],
        categoryCount: seller.categoryCount || 0,
        status: seller.status,
        needApproval: seller.status === 'Pending',
        category: seller.category,
        address: seller.address,
        city: seller.city,
        serviceableArea: seller.serviceableArea,
        panCard: seller.panCard,
        taxName: seller.taxName,
        taxNumber: seller.taxNumber,
        searchLocation: seller.searchLocation,
        latitude: seller.latitude,
        longitude: seller.longitude,
        serviceRadiusKm: seller.serviceRadiusKm,
        accountName: seller.accountName,
        bankName: seller.bankName,
        branch: seller.branch,
        accountNumber: seller.accountNumber,
        ifsc: seller.ifsc,
        profile: seller.profile,
        idProof: seller.idProof,
        addressProof: seller.addressProof,
        requireProductApproval: seller.requireProductApproval,
        viewCustomerDetails: seller.viewCustomerDetails,
    };
};

// Stable fallback logo to avoid endless reload loops when logo is missing
const FALLBACK_LOGO =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#E5F3F2"/>
            <path d="M20 19c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Zm0 2.5c-3.333 0-10 1.667-10 5v1.5c0 .552.448 1 1 1h18c.552 0 1-.448 1-1V26.5c0-3.333-6.667-5-10-5Z" fill="#0F766E"/>
        </svg>`
    );

export default function AdminManageSellerList() {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdatingRadius, setIsUpdatingRadius] = useState(false);
    const [newRadius, setNewRadius] = useState<number>(10);
    const [newCommission, setNewCommission] = useState<number>(0);
    const [isUpdatingCommission, setIsUpdatingCommission] = useState(false);
    const [requireProductApproval, setRequireProductApproval] = useState<boolean>(false);
    const [viewCustomerDetails, setViewCustomerDetails] = useState<boolean>(false);
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Seller>>({});
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Fetch sellers from backend
    useEffect(() => {
        const fetchSellers = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await getAllSellers();
                if (response.success && response.data) {
                    const mappedSellers = response.data.map(mapSellerToFrontend);
                    setSellers(mappedSellers);
                } else {
                    setError('Failed to fetch sellers');
                }
            } catch (err: any) {
                console.error('Error fetching sellers:', err);
                // Show a clear message when the admin is not authenticated/authorized
                if (err?.response?.status === 401 || err?.response?.status === 403) {
                    setError('Please login as admin to view sellers.');
                } else {
                    setError(err.response?.data?.message || 'Failed to fetch sellers. Please try again.');
                }
                // Show empty on error - no mock data fallback
                setSellers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSellers();
    }, []);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ column }: { column: string }) => (
        <span className="text-neutral-400 text-xs ml-1">
            {sortColumn === column ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
        </span>
    );

    // Filter sellers
    let filteredSellers = sellers.filter(seller =>
        seller.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        seller.storeName.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        seller.email.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        seller.phone.includes(searchTerm.trim()) ||
        seller.mobile.includes(searchTerm.trim())
    );

    // Sort sellers
    if (sortColumn) {
        filteredSellers = [...filteredSellers].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortColumn) {
                case 'id':
                    aValue = a._id;
                    bValue = b._id;
                    break;
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'storeName':
                    aValue = a.storeName;
                    bValue = b.storeName;
                    break;
                case 'balance':
                    aValue = a.balance;
                    bValue = b.balance;
                    break;
                case 'commission':
                    aValue = a.commission;
                    bValue = b.commission;
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const totalPages = Math.ceil(filteredSellers.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayedSellers = filteredSellers.slice(startIndex, endIndex);

    const handleExport = () => {
        const headers = ['Id', 'Name', 'Store Name', 'Contact', 'Balance', 'Commission', 'Status'];
        const csvContent = [
            headers.join(','),
            ...filteredSellers.map(seller => [
                seller.id,
                `"${seller.name}"`,
                `"${seller.storeName}"`,
                `"${seller.phone}, ${seller.email}"`,
                seller.balance,
                `${seller.commission}%`,
                seller.status
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sellers_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEdit = (id: number | string) => {
        const sellerId = typeof id === 'number' ? sellers.find(s => s.id === id)?._id : id;
        const seller = sellers.find(s => s._id === sellerId);
        if (seller) {
            setEditingSeller(seller);
            setEditFormData({
                sellerName: seller.sellerName,
                storeName: seller.storeName,
                email: seller.email,
                mobile: seller.mobile,
                phone: seller.phone,
                category: seller.category || '',
                address: seller.address || '',
                city: seller.city || '',
                serviceableArea: seller.serviceableArea || '',
                panCard: seller.panCard || '',
                taxName: seller.taxName || '',
                taxNumber: seller.taxNumber || '',
                accountName: seller.accountName || '',
                bankName: seller.bankName || '',
                branch: seller.branch || '',
                accountNumber: seller.accountNumber || '',
                ifsc: seller.ifsc || '',
                latitude: seller.latitude || '',
                longitude: seller.longitude || '',
            });
            setNewRadius(seller.serviceRadiusKm || 10);
            setNewCommission(seller.commission || 0);
            setRequireProductApproval(!!seller.requireProductApproval);
            setViewCustomerDetails(!!seller.viewCustomerDetails);
            setIsEditModalOpen(true);
        }
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'city') {
            // Remove numbers from city name
            newValue = value.replace(/[0-9]/g, '');
        } else if (name === 'panCard') {
            // Auto-capitalize and limit to 10 characters
            newValue = value.toUpperCase().slice(0, 10);
        } else if (name === 'taxNumber') {
            // Auto-capitalize and limit to 15 characters
            newValue = value.toUpperCase().slice(0, 15);
        } else if (name === 'taxName') {
            // Auto-capitalize tax name and remove non-alphabetic characters (allowing spaces)
            newValue = value.toUpperCase().replace(/[^A-Z\s]/g, '');
        }

        setEditFormData(prev => ({
            ...prev,
            [name]: newValue
        }));

        // Clear field error when user starts typing
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleUpdateProfile = async () => {
        if (!editingSeller) return;

        const newFieldErrors: Record<string, string> = {};

        // PAN Card Validation (5 Letters, 4 Digits, 1 Letter)
        if (editFormData.panCard && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editFormData.panCard)) {
            newFieldErrors.panCard = 'Invalid PAN Card format (Expected: ABCDE1234F)';
        }

        // GST Number Validation (15 characters)
        if (editFormData.taxNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(editFormData.taxNumber)) {
            newFieldErrors.taxNumber = 'Invalid GST Number format (Expected: 22AAAAA0000A1Z5)';
        }

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            showToast('Please correct the errors in the form', 'error');
            return;
        }

        try {
            setIsUpdatingProfile(true);
            const response = await updateSeller(editingSeller._id, editFormData);
            if (response.success) {
                const updatedSeller = mapSellerToFrontend(response.data);
                setEditingSeller(updatedSeller);
                setSellers(sellers.map(s => s._id === editingSeller._id ? updatedSeller : s));
                showToast('Seller information updated successfully', 'success');
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            const msg = error.response?.data?.message || 'Failed to update seller information';
            showToast(msg, 'error');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleUpdateRadius = async () => {
        if (!editingSeller) return;

        try {
            setIsUpdatingRadius(true);
            const response = await updateSeller(editingSeller._id, { serviceRadiusKm: newRadius });
            if (response.success) {
                setEditingSeller({ ...editingSeller, serviceRadiusKm: newRadius });
                // Also update the seller in the main list
                setSellers(sellers.map(s => s._id === editingSeller._id ? { ...s, serviceRadiusKm: newRadius } : s));
                showToast('Service radius updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error updating radius:', error);
            showToast('Failed to update service radius', 'error');
        } finally {
            setIsUpdatingRadius(false);
        }
    };

    const handleUpdateCommission = async () => {
        if (!editingSeller) return;

        try {
            setIsUpdatingCommission(true);
            const response = await updateSeller(editingSeller._id, { commission: newCommission });
            if (response.success) {
                setEditingSeller({ ...editingSeller, commission: newCommission });
                // Also update the seller in the main list
                setSellers(sellers.map(s => s._id === editingSeller._id ? { ...s, commission: newCommission } : s));
                showToast('Commission updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error updating commission:', error);
            showToast('Failed to update commission', 'error');
        } finally {
            setIsUpdatingCommission(false);
        }
    };

    const handleUpdateSettings = async () => {
        if (!editingSeller) return;

        try {
            setIsUpdatingSettings(true);
            const response = await updateSeller(editingSeller._id, { 
                requireProductApproval, 
                viewCustomerDetails 
            });
            if (response.success) {
                setEditingSeller({ 
                    ...editingSeller, 
                    requireProductApproval, 
                    viewCustomerDetails 
                });
                // Also update the seller in the main list
                setSellers(sellers.map(s => s._id === editingSeller._id ? { 
                    ...s, 
                    requireProductApproval, 
                    viewCustomerDetails 
                } : s));
                showToast('Seller settings updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            showToast('Failed to update seller settings', 'error');
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    const handleApprove = async (id: number | string) => {
        const sellerId = typeof id === 'number' ? sellers.find(s => s.id === id)?._id : id;
        if (!sellerId) return;

        try {
            const response = await updateSellerStatus(sellerId, 'Approved');
            if (response.success) {
                // Update local state
                setSellers(prevSellers =>
                    prevSellers.map(seller =>
                        seller._id === sellerId
                            ? { ...seller, status: 'Approved', needApproval: false }
                            : seller
                    )
                );
                showToast('Seller has been approved.', 'success');
                setIsEditModalOpen(false);
                setEditingSeller(null);
            } else {
                showToast('Failed to approve seller. Please try again.', 'error');
            }
        } catch (err: any) {
            console.error('Error approving seller:', err);
            showToast(err.response?.data?.message || 'Failed to approve seller. Please try again.', 'error');
        }
    };

    const handleReject = async (id: number | string) => {
        const sellerId = typeof id === 'number' ? sellers.find(s => s.id === id)?._id : id;
        if (!sellerId) return;

        try {
            const response = await updateSellerStatus(sellerId, 'Rejected');
            if (response.success) {
                // Update local state
                setSellers(prevSellers =>
                    prevSellers.map(seller =>
                        seller._id === sellerId
                            ? { ...seller, status: 'Rejected', needApproval: false }
                            : seller
                    )
                );
                showToast('Seller has been rejected.', 'success');
                setIsEditModalOpen(false);
                setEditingSeller(null);
            } else {
                showToast('Failed to reject seller. Please try again.', 'error');
            }
        } catch (err: any) {
            console.error('Error rejecting seller:', err);
            showToast(err.response?.data?.message || 'Failed to reject seller. Please try again.', 'error');
        }
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingSeller(null);
    };

    const handleDelete = async (id: number | string) => {
        const sellerId = typeof id === 'number' ? sellers.find(s => s.id === id)?._id : id;
        if (!sellerId) return;

        if (window.confirm('Are you sure you want to delete this seller?')) {
            try {
                const response = await deleteSeller(sellerId);
                if (response.success) {
                    // Remove from local state
                    setSellers(prevSellers => prevSellers.filter(seller => seller._id !== sellerId));
                    showToast('Seller deleted successfully.', 'success');
                } else {
                    showToast('Failed to delete seller. Please try again.', 'error');
                }
            } catch (err: any) {
                console.error('Error deleting seller:', err);
                showToast(err.response?.data?.message || 'Failed to delete seller. Please try again.', 'error');
            }
        }
    };

    const handleViewCategories = (seller: Seller) => {
        setSelectedSeller(seller);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSeller(null);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Page Content */}
            <div className="flex-1 p-6">
                {/* Main Panel */}
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
                    {/* Header */}
                    <div className="bg-teal-600 text-white px-6 py-4 rounded-t-lg">
                        <h2 className="text-lg font-semibold">View Seller List</h2>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center justify-between">
                            <p className="text-sm">{error}</p>
                            <button
                                onClick={() => setError('')}
                                className="text-red-700 hover:text-red-900 ml-4 text-lg font-bold"
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                    )}
                    {/* Success Message */}
                    {successMessage && (
                        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 flex items-center justify-between">
                            <p className="text-sm">{successMessage}</p>
                            <button
                                onClick={() => setSuccessMessage('')}
                                className="text-green-700 hover:text-green-900 ml-4 text-lg font-bold"
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="p-8 text-center">
                            <p className="text-neutral-600">Loading sellers...</p>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-600">Show</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExport}
                                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors"
                            >
                                Export
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">Search:</span>
                                <input
                                    type="text"
                                    className="pl-14 pr-3 py-1.5 bg-neutral-100 border-none rounded text-sm focus:ring-1 focus:ring-teal-500 w-72"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        // Ignore leading spaces as characters
                                        const val = e.target.value;
                                        setSearchTerm(val.startsWith(' ') ? val.trimStart() : val);
                                        setCurrentPage(1);
                                    }}
                                    placeholder=""
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {!loading && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50 text-xs font-bold text-neutral-800 border-b border-neutral-200">
                                        <th
                                            className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                            onClick={() => handleSort('id')}
                                        >
                                            <div className="flex items-center">
                                                Id <SortIcon column="id" />
                                            </div>
                                        </th>
                                        <th
                                            className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center">
                                                Name <SortIcon column="name" />
                                            </div>
                                        </th>
                                        <th
                                            className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                            onClick={() => handleSort('storeName')}
                                        >
                                            <div className="flex items-center">
                                                Store Name <SortIcon column="storeName" />
                                            </div>
                                        </th>
                                        <th className="p-4">
                                            Contact
                                        </th>
                                        <th className="p-4">
                                            Logo
                                        </th>
                                        <th
                                            className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                            onClick={() => handleSort('balance')}
                                        >
                                            <div className="flex items-center">
                                                Balance <SortIcon column="balance" />
                                            </div>
                                        </th>
                                        <th
                                            className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                            onClick={() => handleSort('commission')}
                                        >
                                            <div className="flex items-center">
                                                Commission <SortIcon column="commission" />
                                            </div>
                                        </th>
                                        <th className="p-4">
                                            Categories
                                        </th>
                                        <th
                                            className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                            onClick={() => handleSort('status')}
                                        >
                                            <div className="flex items-center">
                                                Status <SortIcon column="status" />
                                            </div>
                                        </th>
                                        <th className="p-4">
                                            Need Approval?
                                        </th>
                                        <th className="p-4">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedSellers.map((seller) => (
                                        <tr key={seller._id} className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700 border-b border-neutral-200">
                                            <td className="p-4 align-middle">{seller.id || seller._id.slice(-6)}</td>
                                            <td className="p-4 align-middle">{seller.name}</td>
                                            <td className="p-4 align-middle">{seller.storeName}</td>
                                            <td className="p-4 align-middle">
                                                <div className="text-xs">
                                                    <div>{seller.phone}</div>
                                                    <div className="text-neutral-500">{seller.email}</div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                 <img
                                                     src={(seller.logo && seller.logo.trim() !== '' && !seller.logo.includes('placeholder')) ? seller.logo : `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=random`}
                                                     alt={seller.storeName}
                                                     className="w-10 h-10 object-cover rounded-full border border-neutral-200"
                                                     loading="lazy"
                                                     onError={(e) => {
                                                         e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=random`;
                                                     }}
                                                 />
                                            </td>
                                            <td className="p-4 align-middle">{seller.balance.toFixed(2)}</td>
                                            <td className="p-4 align-middle">{seller.commission.toFixed(2)}%</td>
                                            <td className="p-4 align-middle">
                                                <button
                                                    onClick={() => handleViewCategories(seller)}
                                                    className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 group"
                                                >
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white font-bold group-hover:scale-110 transition-transform">
                                                        {seller.categoryCount || seller.categories.length}
                                                    </span>
                                                    <span>View Details</span>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                                                        <path d="M5 12h14"></path>
                                                        <path d="M12 5l7 7-7 7"></path>
                                                    </svg>
                                                </button>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.status === 'Approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : seller.status === 'Pending'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {seller.status}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.needApproval
                                                        ? 'bg-pink-100 text-pink-800'
                                                        : 'bg-pink-100 text-pink-800'
                                                    }`}>
                                                    {seller.needApproval ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(seller._id)}
                                                        className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(seller._id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {displayedSellers.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="p-8 text-center text-neutral-400">
                                                No sellers found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Footer */}
                    {!loading && (
                        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                            <div className="text-xs sm:text-sm text-neutral-700">
                                Showing {startIndex + 1} to {Math.min(endIndex, filteredSellers.length)} of {filteredSellers.length} entries
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-2 border border-teal-600 rounded ${currentPage === 1
                                            ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                                            : 'text-teal-600 hover:bg-teal-50'
                                        }`}
                                    aria-label="Previous page"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M15 18L9 12L15 6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                                <button
                                    className="px-3 py-1.5 border border-teal-600 bg-teal-600 text-white rounded font-medium text-sm"
                                >
                                    {currentPage}
                                </button>
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 border border-teal-600 rounded ${currentPage === totalPages
                                            ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                                            : 'text-teal-600 hover:bg-teal-50'
                                        }`}
                                    aria-label="Next page"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M9 18L15 12L9 6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-4 text-sm text-neutral-600 border-t border-neutral-200 bg-white">
                Copyright © 2026. Developed By{' '}
                <a href="#" className="text-blue-600 hover:underline">KlydoCart</a>
            </footer>

            {/* Categories Modal */}
            {isModalOpen && selectedSeller && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCloseModal}>
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-teal-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Categories</h3>
                                <p className="text-sm text-teal-100 mt-1">{selectedSeller.storeName} - {selectedSeller.name}</p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="text-white hover:text-teal-200 transition-colors p-1"
                                aria-label="Close modal"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {selectedSeller.categories.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedSeller.categories.map((category, index) => (
                                        <div
                                            key={index}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-full text-teal-700 text-xs font-bold shadow-sm"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                            {category}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-neutral-400">
                                    <p>No categories assigned to this seller.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-sm font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Seller Modal */}
            {isEditModalOpen && editingSeller && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCloseEditModal}>
                    <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-teal-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Edit Seller - {editingSeller.name}</h3>
                                <p className="text-sm text-teal-100 mt-1">View and manage seller details</p>
                            </div>
                            <button
                                onClick={handleCloseEditModal}
                                className="text-white hover:text-teal-200 transition-colors p-1"
                                aria-label="Close modal"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <style>{`
                                .edit-seller-modal::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>

                            <div className="space-y-6">
                                {/* Status Badge */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${editingSeller.status === 'Approved'
                                                ? 'bg-green-100 text-green-800'
                                                : editingSeller.status === 'Pending'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                            Status: {editingSeller.status}
                                        </span>
                                    </div>
                                    {editingSeller.status === 'Pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApprove(editingSeller._id)}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(editingSeller._id)}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Basic Information */}
                                <div className="bg-neutral-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-neutral-700">Basic Information</h4>

                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Seller Name</label>
                                            <input
                                                type="text"
                                                name="sellerName"
                                                value={editFormData.sellerName || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Store Name</label>
                                            <input
                                                type="text"
                                                name="storeName"
                                                value={editFormData.storeName || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Email</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={editFormData.email || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Phone</label>
                                            <input
                                                type="text"
                                                name="mobile"
                                                value={editFormData.mobile || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Category</label>
                                            <input
                                                type="text"
                                                name="category"
                                                value={editFormData.category || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block text-neutral-900 font-bold">Commission (%) (Static Update)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    value={newCommission}
                                                    onChange={(e) => setNewCommission(parseFloat(e.target.value))}
                                                    className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 font-medium text-neutral-900"
                                                />
                                                <button
                                                    onClick={handleUpdateCommission}
                                                    disabled={isUpdatingCommission || newCommission === editingSeller.commission}
                                                    className="px-3 py-1.5 bg-neutral-800 text-white rounded text-xs font-medium hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                                >
                                                    {isUpdatingCommission ? '...' : 'Set'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Address Information */}
                                <div className="bg-neutral-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-neutral-700">Address Information</h4>
                                        <button
                                            onClick={handleUpdateProfile}
                                            disabled={isUpdatingProfile}
                                            className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isUpdatingProfile ? 'Saving...' : 'Update Address'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-neutral-500 mb-1 block">Address</label>
                                            <input
                                                type="text"
                                                name="address"
                                                value={editFormData.address || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">City</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={editFormData.city || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                            />
                                            {fieldErrors.city && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.city}</p>}
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Serviceable Area</label>
                                            <input
                                                type="text"
                                                name="serviceableArea"
                                                value={editFormData.serviceableArea || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                            />
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-neutral-500 mb-1 block">Latitude</label>
                                                <input
                                                    type="text"
                                                    name="latitude"
                                                    value={editFormData.latitude || ''}
                                                    onChange={handleEditInputChange}
                                                    className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-neutral-500 mb-1 block">Longitude</label>
                                                <input
                                                    type="text"
                                                    name="longitude"
                                                    value={editFormData.longitude || ''}
                                                    onChange={handleEditInputChange}
                                                    className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Area Map */}
                                <div className="bg-neutral-50 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-neutral-700 mb-3">Service Area Visualization</h4>
                                    {editingSeller.latitude && editingSeller.longitude ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                                <div>
                                                    <label className="text-xs text-neutral-500 mb-1 block">Service Radius (km)</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            min="0.1"
                                                            max="100"
                                                            step="0.1"
                                                            value={newRadius}
                                                            onChange={(e) => setNewRadius(parseFloat(e.target.value))}
                                                            className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                                        />
                                                        <button
                                                            onClick={handleUpdateRadius}
                                                            disabled={isUpdatingRadius || newRadius === editingSeller.serviceRadiusKm}
                                                            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                                        >
                                                            {isUpdatingRadius ? 'Updating...' : 'Update Radius'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-[300px] w-full">
                                                <SellerServiceMap
                                                    latitude={parseFloat(editingSeller.latitude)}
                                                    longitude={parseFloat(editingSeller.longitude)}
                                                    radiusKm={newRadius}
                                                    storeName={editingSeller.storeName}
                                                />
                                            </div>
                                            <p className="text-xs text-neutral-500 italic">
                                                * Adjust the radius above to see the service area change dynamically.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center border-2 border-dashed border-neutral-200 rounded-lg">
                                            <p className="text-sm text-neutral-500">No coordinates available for this seller.</p>
                                            <p className="text-xs text-neutral-400 mt-1">Please update the seller's latitude and longitude to see the service map.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Tax Information */}
                                <div className="bg-neutral-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-neutral-700">Tax Information</h4>
                                        <button
                                            onClick={handleUpdateProfile}
                                            disabled={isUpdatingProfile}
                                            className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isUpdatingProfile ? 'Saving...' : 'Update Tax Info'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">PAN Card</label>
                                            <input
                                                type="text"
                                                name="panCard"
                                                value={editFormData.panCard || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                            />
                                            {fieldErrors.panCard && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.panCard}</p>}
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Tax Name (GST Name)</label>
                                            <input
                                                type="text"
                                                name="taxName"
                                                value={editFormData.taxName || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-neutral-500 mb-1 block">Tax Number (GST Number)</label>
                                            <input
                                                type="text"
                                                name="taxNumber"
                                                value={editFormData.taxNumber || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                            />
                                            {fieldErrors.taxNumber && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.taxNumber}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Information */}
                                <div className="bg-neutral-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-neutral-700">Bank Information</h4>

                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Account Name</label>
                                            <input
                                                type="text"
                                                name="accountName"
                                                value={editFormData.accountName || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Bank Name</label>
                                            <input
                                                type="text"
                                                name="bankName"
                                                value={editFormData.bankName || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Branch</label>
                                            <input
                                                type="text"
                                                name="branch"
                                                value={editFormData.branch || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">Account Number</label>
                                            <input
                                                type="text"
                                                name="accountNumber"
                                                value={editFormData.accountNumber || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 mb-1 block">IFSC Code</label>
                                            <input
                                                type="text"
                                                name="ifsc"
                                                value={editFormData.ifsc || ''}
                                                onChange={handleEditInputChange}
                                                className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 bg-neutral-100 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Settings */}
                                <div className="bg-neutral-50 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-neutral-700 mb-3">Settings</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-2 bg-white rounded border border-neutral-200">
                                            <label className="text-xs text-neutral-600 cursor-pointer flex-1" htmlFor="requireApproval">
                                                Require Product Approval
                                            </label>
                                            <input
                                                id="requireApproval"
                                                type="checkbox"
                                                checked={requireProductApproval}
                                                onChange={(e) => setRequireProductApproval(e.target.checked)}
                                                className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-neutral-300 rounded cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-white rounded border border-neutral-200">
                                            <label className="text-xs text-neutral-600 cursor-pointer flex-1" htmlFor="viewCustomer">
                                                View Customer Details
                                            </label>
                                            <input
                                                id="viewCustomer"
                                                type="checkbox"
                                                checked={viewCustomerDetails}
                                                onChange={(e) => setViewCustomerDetails(e.target.checked)}
                                                className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-neutral-300 rounded cursor-pointer"
                                            />
                                        </div>
                                        <div className="md:col-span-2 flex justify-end">
                                            <button
                                                onClick={handleUpdateSettings}
                                                disabled={isUpdatingSettings || (
                                                    requireProductApproval === editingSeller.requireProductApproval &&
                                                    viewCustomerDetails === editingSeller.viewCustomerDetails
                                                )}
                                                className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {isUpdatingSettings ? 'Updating...' : 'Save Settings'}
                                            </button>
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500">Balance</label>
                                            <p className="text-sm font-medium text-neutral-900">₹{editingSeller.balance.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500">Categories Count</label>
                                            <p className="text-sm font-medium text-neutral-900">{editingSeller.categories.length} categories</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Categories */}
                                {editingSeller.categories.length > 0 && (
                                    <div className="bg-neutral-50 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-3">Categories</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {editingSeller.categories.map((category, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
                                                >
                                                    {category}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
                            <button
                                onClick={handleCloseEditModal}
                                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded text-sm font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

