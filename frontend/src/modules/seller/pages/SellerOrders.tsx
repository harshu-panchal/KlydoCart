import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrders, Order, GetOrdersParams } from '../../../services/api/orderService';
import { useSellerSocket, SellerNotification } from '../hooks/useSellerSocket';


type SortField = 'orderId' | 'deliveryDate' | 'orderDate' | 'status' | 'amount';
type SortDirection = 'asc' | 'desc';

export default function SellerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('All Status');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<SortField | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const params: GetOrdersParams = {
          page: currentPage,
          limit: parseInt(entriesPerPage),
          status: status === 'All Status' ? undefined : status,
          search: debouncedSearch.trim() || undefined,
          sortBy: sortField || undefined,
          sortOrder: sortDirection,
        };

        if (startDate && endDate) {
            params.dateFrom = startDate;
            params.dateTo = endDate;
        } else if (startDate) {
            params.dateFrom = startDate;
        } else if (endDate) {
            params.dateTo = endDate;
        }

        const response = await getOrders(params);
        if (response.success && response.data) {
          setOrders(response.data);
          setTotalCount(response.pagination?.total || response.data.length);
        } else {
          setError(response.message || 'Failed to fetch orders');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Error loading orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [startDate, endDate, status, entriesPerPage, debouncedSearch, currentPage, sortField, sortDirection]);

  // Listen for real-time status updates from socket
  const handleNotification = useCallback((notification: SellerNotification) => {
    if (notification.type === 'STATUS_UPDATE') {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          (order._id === notification.orderId || order.id === notification.orderId)
            ? { ...order, status: notification.status }
            : order
        )
      );
    } else if (notification.type === 'NEW_ORDER') {
      const fetchLatestOrders = async () => {
        try {
          const params: GetOrdersParams = {
            page: currentPage,
            limit: parseInt(entriesPerPage),
            status: status === 'All Status' ? undefined : status,
            search: debouncedSearch,
            sortBy: sortField || 'orderDate',
            sortOrder: sortDirection,
          };
          const response = await getOrders(params);
          if (response.success && response.data) {
            setOrders(response.data);
            setTotalCount(response.pagination?.total || response.data.length);
          }
        } catch (err) {
          console.error('Error refreshing orders:', err);
        }
      };
      fetchLatestOrders();
    }
  }, [currentPage, entriesPerPage, status, searchQuery, sortField, sortDirection]);

  useSellerSocket(handleNotification);

  const handleClearDate = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Order ID', 'Delivery Date', 'Order Date', 'Status', 'Amount'];
    
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
      } catch {
        return dateStr;
      }
    };

    const csvContent = [
      headers.join(','),
      ...orders.map(order => {
        const row = [
          order.orderId,
          formatDate(order.deliveryDate),
          formatDate(order.orderDate),
          order.status,
          order.amount
        ];
        // Wrap each field in quotes to handle commas and ensure better Excel compatibility
        return row.map(val => `"${val}"`).join(',');
      })
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination (client-side for now, can be moved to backend later)
  const entriesPerPageNum = parseInt(entriesPerPage);
  // When using API pagination, we don't slice the results if they are already paginated by the backend
  // But the current implementation seems to fetch all then slice, or fetch paginated and then slice.
  // Given the useEffect uses currentPage/entriesPerPage, the API response is already paginated.
  // So we should NOT slice it again if it only contains the current page's data.
  const paginatedOrders = orders; 
  const totalPages = Math.ceil(totalCount / entriesPerPageNum);
  const startIndex = (currentPage - 1) * entriesPerPageNum;
  const endIndex = Math.min(startIndex + orders.length, totalCount);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Helper to generate pagination numbers with a sliding window of 5
  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    return pages;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Accepted':
      case 'Received':
        return 'bg-blue-100 text-blue-800';
      case 'On the way':
        return 'bg-purple-100 text-purple-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6 max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="bg-white border-b border-neutral-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          {/* Page Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Orders List</h1>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Link to="/seller" className="text-blue-600 hover:text-blue-700">
              Home
            </Link>
            <span className="text-neutral-500">/</span>
            <span className="text-neutral-700">Orders</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6">
        {/* White Card Container */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          {/* Green Banner */}
          <div className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-t-lg">
            <h2 className="text-base sm:text-lg font-semibold">View Order List</h2>
          </div>

          {/* Filter and Action Bar */}
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-neutral-200">
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
              {/* Date Range Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-neutral-700 whitespace-nowrap">
                  From - To Order Date
                </label>
                <div className="flex items-center gap-1 sm:gap-2 bg-neutral-100 border border-neutral-300 rounded px-2 py-1 sm:py-1.5 w-full sm:w-auto">
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="text-[10px] sm:text-xs text-neutral-700 bg-transparent focus:outline-none cursor-pointer p-0 w-[100px] sm:w-[110px]"
                    />
                    <span className="text-neutral-400 text-xs">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="text-[10px] sm:text-xs text-neutral-700 bg-transparent focus:outline-none cursor-pointer p-0 w-[100px] sm:w-[110px]"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={handleClearDate}
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-neutral-700 whitespace-nowrap">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto px-3 py-2 border border-neutral-300 rounded text-xs sm:text-sm text-neutral-900 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                >
                  <option>All Status</option>
                  <option>Pending</option>
                  <option>Accepted</option>
                  <option>On the way</option>
                  <option>Delivered</option>
                  <option>Cancelled</option>
                </select>
              </div>

              {/* Entries Per Page */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto px-3 py-2 border border-neutral-300 rounded text-xs sm:text-sm text-neutral-900 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                >
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto sm:flex-1">
                <label className="text-xs sm:text-sm font-medium text-neutral-700 whitespace-nowrap">
                  Search:
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 w-full sm:w-auto px-3 py-2 border border-neutral-300 rounded text-xs sm:text-sm text-neutral-900 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="Search by Order ID, Status, or Amount"
                />
              </div>

              {/* Export Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-shrink-0"
                  >
                    <path
                      d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M7 10L12 15M12 15L17 10M12 15V3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">Export</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="hidden sm:block flex-shrink-0"
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Loading and Error States */}
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="text-neutral-500">Loading orders...</div>
            </div>
          )}
          {error && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg m-4">
              {error}
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
              <table className="w-full min-w-[600px]">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('orderId')}
                        className="flex items-center gap-2 hover:text-neutral-900 transition-colors"
                      >
                        O. Id
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`cursor-pointer ${sortField === 'orderId' ? 'text-green-600' : 'text-neutral-400'
                            }`}
                        >
                          <path
                            d={sortField === 'orderId' && sortDirection === 'asc'
                              ? "M7 14L12 9L17 14"
                              : sortField === 'orderId' && sortDirection === 'desc'
                                ? "M7 10L12 15L17 10"
                                : "M7 10L12 5L17 10M7 14L12 19L17 14"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('deliveryDate')}
                        className="flex items-center gap-2 hover:text-neutral-900 transition-colors"
                      >
                        D. Date
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`cursor-pointer ${sortField === 'deliveryDate' ? 'text-green-600' : 'text-neutral-400'
                            }`}
                        >
                          <path
                            d={sortField === 'deliveryDate' && sortDirection === 'asc'
                              ? "M7 14L12 9L17 14"
                              : sortField === 'deliveryDate' && sortDirection === 'desc'
                                ? "M7 10L12 15L17 10"
                                : "M7 10L12 5L17 10M7 14L12 19L17 14"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('orderDate')}
                        className="flex items-center gap-2 hover:text-neutral-900 transition-colors"
                      >
                        O. Date
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`cursor-pointer ${sortField === 'orderDate' ? 'text-green-600' : 'text-neutral-400'
                            }`}
                        >
                          <path
                            d={sortField === 'orderDate' && sortDirection === 'asc'
                              ? "M7 14L12 9L17 14"
                              : sortField === 'orderDate' && sortDirection === 'desc'
                                ? "M7 10L12 15L17 10"
                                : "M7 10L12 5L17 10M7 14L12 19L17 14"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-2 hover:text-neutral-900 transition-colors"
                      >
                        Status
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`cursor-pointer ${sortField === 'status' ? 'text-green-600' : 'text-neutral-400'
                            }`}
                        >
                          <path
                            d={sortField === 'status' && sortDirection === 'asc'
                              ? "M7 14L12 9L17 14"
                              : sortField === 'status' && sortDirection === 'desc'
                                ? "M7 10L12 15L17 10"
                                : "M7 10L12 5L17 10M7 14L12 19L17 14"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center gap-2 hover:text-neutral-900 transition-colors"
                      >
                        Amount
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={`cursor-pointer ${sortField === 'amount' ? 'text-green-600' : 'text-neutral-400'
                            }`}
                        >
                          <path
                            d={sortField === 'amount' && sortDirection === 'asc'
                              ? "M7 14L12 9L17 14"
                              : sortField === 'amount' && sortDirection === 'desc'
                                ? "M7 10L12 15L17 10"
                                : "M7 10L12 5L17 10M7 14L12 19L17 14"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 sm:px-4 md:px-6 py-8 sm:py-12 text-center text-xs sm:text-sm text-neutral-500">
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => (
                      <tr key={order._id || order.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-3 sm:px-4 md:px-6 py-3 text-xs sm:text-sm text-neutral-900">
                          {order.orderId}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 text-xs sm:text-sm text-neutral-700">
                          {formatDateDisplay(order.deliveryDate)}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 text-xs sm:text-sm text-neutral-700">
                          {formatDateDisplay(order.orderDate)}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 text-xs sm:text-sm text-neutral-900 font-medium">
                          ₹{order.amount.toFixed(2)}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const targetId = order._id || order.id;
                              console.log('Navigating to order:', targetId);
                              navigate(`/seller/orders/${targetId}`);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-neutral-700">
              Showing {orders.length === 0 ? 0 : startIndex + 1} to {endIndex} of {totalCount} entries
            </div>
            <div className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-4">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all duration-200 ${currentPage === 1
                  ? 'text-neutral-300 cursor-not-allowed bg-transparent'
                  : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                aria-label="Previous page"
              >
                <span className="text-xl leading-none">←</span>
                <span className="text-sm font-medium">Previous</span>
              </button>
              <div className="flex items-center">
                {getPageNumbers().map((page) => (
                    <button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`min-w-[32px] h-8 sm:h-9 flex items-center justify-center rounded font-bold text-xs sm:text-sm transition-all duration-200 ${
                        currentPage === page
                          ? "bg-[#E24C4C] text-white shadow-sm"
                          : "text-neutral-800 hover:bg-neutral-100"
                      }`}
                    >
                      {page}
                    </button>
                ))}
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || totalPages === 0}
                className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all duration-200 ${currentPage >= totalPages || totalPages === 0
                  ? 'text-neutral-300 cursor-not-allowed bg-transparent'
                  : 'text-neutral-900 bg-neutral-100 hover:bg-neutral-200 font-medium'
                  }`}
                aria-label="Next page"
              >
                <span className="text-sm font-medium">Next</span>
                <span className="text-xl leading-none">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-3 sm:px-4 md:px-6 text-center py-4 sm:py-6">
        <p className="text-xs sm:text-sm text-neutral-600">
          Copyright © 2026. Developed By{' '}
          <Link to="/seller" className="text-blue-600 hover:text-blue-700">
            KlydoCart
          </Link>
        </p>
      </footer>
    </div>
  );
}

