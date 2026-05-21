import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReturnRequests, updateReturnStatus, ReturnRequest, GetReturnRequestsParams } from '../../../services/api/returnService';

export default function SellerReturnRequest() {
    const navigate = useNavigate();
    const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchReturnRequests = async () => {
        setLoading(true);
        setError('');
        try {
            const params: GetReturnRequestsParams = {
                page: currentPage,
                limit: rowsPerPage,
                sortBy: sortColumn || 'returnDate',
                sortOrder: sortDirection,
            };

            // Parse date range
            if (fromDate) params.dateFrom = fromDate;
            if (toDate) params.dateTo = toDate;

            // Add status filter
            if (statusFilter !== 'All Status') {
                params.status = statusFilter;
            }

            // Add search
            const trimmedSearch = searchTerm.trim();
            if (trimmedSearch) {
                params.search = trimmedSearch;
            }

            const response = await getReturnRequests(params);
            if (response.success && response.data) {
                setReturnRequests(response.data);
            } else {
                setError(response.message || 'Failed to fetch return requests');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch return requests');
        } finally {
            setLoading(false);
        }
    };

    // Fetch return requests from API
    useEffect(() => {
        fetchReturnRequests();
    }, [fromDate, toDate, statusFilter, searchTerm, currentPage, rowsPerPage, sortColumn, sortDirection]);

    const handleUpdateStatus = async (id: string, status: 'Approved' | 'Rejected') => {
        if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this return request?`)) return;
        
        try {
            const response = await updateReturnStatus(id, { status });
            if (response.success) {
                alert(`Return request ${status.toLowerCase()} successfully.`);
                fetchReturnRequests();
            } else {
                alert(response.message || `Failed to update status.`);
            }
        } catch (err: any) {
            console.error('Error updating status:', err);
            alert(err.response?.data?.message || err.message || 'Failed to update return status');
        }
    };

    // Client-side pagination (can be moved to backend later)
    const totalPages = Math.ceil(returnRequests.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayedRequests = returnRequests.slice(startIndex, endIndex);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ column }: { column: string }) => (
        <span className="text-neutral-300 text-[10px]">
            {sortColumn === column ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
        </span>
    );

    const handleClearDates = () => {
        setFromDate('');
        setToDate('');
    };

    return (
        <div className="flex flex-col h-full min-h-screen bg-neutral-50">
            {/* Top Navigation/Header */}
            <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-semibold text-neutral-900">Return Request</h1>
                    <div className="flex items-center gap-2 text-sm">
                        <span onClick={() => navigate('/seller')} className="cursor-pointer text-blue-600 hover:text-blue-700 hover:underline font-medium">
                            Home
                        </span>
                        <span className="text-neutral-400">/</span>
                        <span className="text-neutral-900">Return Request</span>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="flex-1 p-4 sm:p-6">
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col">
                    {/* Section Header - Green Banner */}
                    <div className="bg-green-600 text-white px-4 sm:px-6 py-3 rounded-t-lg">
                        <h2 className="text-lg sm:text-xl font-semibold">View Return Request</h2>
                    </div>

                    {/* Controls Panel */}
                    <div className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-neutral-100">
                        {/* Left Side: Date Range and Status Filter */}
                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                             {/* Date Range Filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-neutral-600 whitespace-nowrap">From - To Date:</label>
                                <div className="flex items-center gap-1 sm:gap-2 bg-white border border-neutral-300 rounded px-2 py-1 w-full sm:w-auto">
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => {
                                            setFromDate(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="text-xs text-neutral-700 bg-transparent focus:outline-none cursor-pointer p-0 w-[105px] sm:w-[115px]"
                                    />
                                    <span className="text-neutral-400 text-xs">-</span>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => {
                                            setToDate(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="text-xs text-neutral-700 bg-transparent focus:outline-none cursor-pointer p-0 w-[105px] sm:w-[115px]"
                                    />
                                    {(fromDate || toDate) && (
                                        <button
                                            onClick={handleClearDates}
                                            className="ml-1 text-red-500 hover:text-red-700 p-1"
                                            title="Clear Dates"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-neutral-600 whitespace-nowrap">Filter by Status:</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 bg-white border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:outline-none cursor-pointer"
                                >
                                    <option value="All Status">All Status</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Side: Per Page, Export, Search */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            {/* Per Page */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-600">Per Page:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>

                             {/* Export Button */}
                            {returnRequests.length > 0 && (
                                <button
                                    onClick={() => {
                                        const headers = ['Order Item Id', 'Product', 'Variant', 'Price', 'Disc Price', 'Quantity', 'Total', 'Status', 'Date'];
                                        const csvContent = [
                                            headers.join(','),
                                            ...returnRequests.map(request => [
                                                request.orderItemId,
                                                `"${request.product}"`,
                                                `"${request.variant}"`,
                                                request.price,
                                                request.discPrice,
                                                request.quantity,
                                                request.total,
                                                `"${request.status}"`,
                                                request.date
                                            ].join(','))
                                        ].join('\n');
                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                        const link = document.createElement('a');
                                        const url = URL.createObjectURL(blob);
                                        link.setAttribute('href', url);
                                        link.setAttribute('download', `return_requests_${new Date().toISOString().split('T')[0]}.csv`);
                                        link.style.visibility = 'hidden';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    Export
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                            )}

                            {/* Search */}
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">Search:</span>
                                <input
                                    type="text"
                                    className="pl-14 pr-3 py-1.5 bg-neutral-100 border-none rounded text-sm focus:ring-1 focus:ring-green-500 w-full sm:w-48"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder=""
                                />
                            </div>
                        </div>
                    </div>

                    {/* Loading and Error States */}
                    {loading && (
                        <div className="flex items-center justify-center p-8">
                            <div className="text-neutral-500">Loading return requests...</div>
                        </div>
                    )}
                    {error && !loading && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg m-4">
                            {error}
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-neutral-200">
                            <thead>
                                <tr className="bg-neutral-50 text-xs font-bold text-neutral-800">
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('orderItemId')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Order Item Id
                                            <SortIcon column="orderItemId" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('product')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Product
                                            <SortIcon column="product" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('variant')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Variant
                                            <SortIcon column="variant" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('price')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Price
                                            <SortIcon column="price" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('discPrice')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Disc Price
                                            <SortIcon column="discPrice" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('quantity')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Quantity
                                            <SortIcon column="quantity" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('total')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Total
                                            <SortIcon column="total" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            <SortIcon column="status" />
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                        onClick={() => handleSort('date')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Date
                                            <SortIcon column="date" />
                                        </div>
                                    </th>
                                    <th className="p-4 border border-neutral-200">
                                        <div className="flex items-center gap-1">
                                            Action
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-neutral-500">
                                            No data available in table
                                        </td>
                                    </tr>
                                ) : (
                                    displayedRequests.map((request, index) => (
                                        <tr key={index} className="hover:bg-neutral-50">
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">{request.orderItemId}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">{request.product}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">{request.variant}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">₹{request.price.toFixed(2)}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">₹{request.discPrice.toFixed(2)}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">{request.quantity}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">₹{request.total.toFixed(2)}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">{request.status}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">{request.date}</td>
                                            <td className="p-4 border border-neutral-200 text-sm text-neutral-900">
                                                <div className="flex gap-2 items-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRequest(request);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                    {request.status === 'Pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStatus(request.id, 'Approved')}
                                                                className="text-green-600 hover:text-green-700 text-xs font-medium transition-colors bg-green-50 px-2 py-1 rounded"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(request.id, 'Rejected')}
                                                                className="text-red-600 hover:text-red-700 text-xs font-medium transition-colors bg-red-50 px-2 py-1 rounded"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    )}

                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-neutral-600">
                            Showing {returnRequests.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, returnRequests.length)} of {returnRequests.length} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1 || totalPages === 0}
                                className="w-8 h-8 flex items-center justify-center border border-green-300 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="w-8 h-8 flex items-center justify-center border border-green-300 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="px-4 sm:px-6 py-4 text-center bg-white border-t border-neutral-200">
                <p className="text-xs sm:text-sm text-neutral-600">
                    Copyright © 2026. Developed By{' '}
                    <span className="font-semibold text-teal-600">KlydoCart</span>
                </p>
            </footer>
            {/* Modal for viewing details */}
            {isModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-neutral-900">Return Request Details</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-neutral-500 font-medium">Order Item ID</p>
                                    <p className="text-sm text-neutral-900 font-semibold truncate">{selectedRequest.orderItemId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 font-medium">Date</p>
                                    <p className="text-sm text-neutral-900 font-semibold">{selectedRequest.date}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 font-medium">Product</p>
                                    <p className="text-sm text-neutral-900 font-semibold">{selectedRequest.product}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 font-medium">Variant</p>
                                    <p className="text-sm text-neutral-900 font-semibold">{selectedRequest.variant}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 font-medium">Quantity</p>
                                    <p className="text-sm text-neutral-900 font-semibold">{selectedRequest.quantity}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 font-medium">Status</p>
                                    <p className="text-sm text-neutral-900 font-semibold">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                            selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            selectedRequest.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {selectedRequest.status}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 font-medium">Unit Price</p>
                                    <p className="text-sm text-neutral-900 font-semibold">₹{(selectedRequest.price || 0).toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 font-medium">Total Amount</p>
                                    <p className="text-sm text-green-600 font-bold">₹{(selectedRequest.total || 0).toFixed(2)}</p>
                                </div>
                                <div className="col-span-2 border-t border-neutral-100 pt-3 space-y-2">
                                    <div>
                                        <p className="text-xs text-neutral-500 font-medium">Return Reason</p>
                                        <p className="text-sm text-neutral-900 font-semibold bg-orange-50 text-orange-850 p-2.5 rounded-lg border border-orange-100 mt-1">
                                            {selectedRequest.returnReason || 'Not Provided'}
                                        </p>
                                    </div>
                                    {selectedRequest.returnDescription && (
                                        <div>
                                            <p className="text-xs text-neutral-500 font-medium">Additional Description</p>
                                            <p className="text-sm text-neutral-700 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 mt-1 whitespace-pre-wrap">
                                                {selectedRequest.returnDescription}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-neutral-50 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-50 transition-colors text-sm font-medium"
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

