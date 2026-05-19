import { useState, useEffect } from "react";
import {
  getReturnRequests,
  updateReturnRequest,
  type MiscReturnRequest as ReturnRequest,
} from "../../../services/api/admin/adminMiscService";
import { useAuth } from "../../../context/AuthContext";

export default function AdminReturnRequest() {
  const { isAuthenticated, token } = useAuth();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);

  // Fetch return requests on component mount
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    const fetchReturnRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {
          page: currentPage,
          limit: entriesPerPage,
        };

        if (selectedStatus !== "all") {
          params.status = selectedStatus;
        }

        if (searchTerm) {
          params.search = searchTerm;
        }

        const response = await getReturnRequests(params);

        if (response.success) {
          setReturnRequests(response.data);
        } else {
          setError("Failed to load return requests");
        }
      } catch (err: any) {
        console.error("Error fetching return requests:", err);
        setError(
          err.response?.data?.message ||
          "Failed to load return requests. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReturnRequests();
  }, [
    isAuthenticated,
    token,
    currentPage,
    entriesPerPage,
    selectedStatus,
    searchTerm,
  ]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Note: Filtering is done server-side, so we just use the returnRequests as is
  const displayedRequests = returnRequests;

  // For pagination display (simplified - in real app, this would come from API)
  const totalPages = Math.ceil(displayedRequests.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;

  const handleApproveReturn = async (requestId: string) => {
    try {
      setUpdating(requestId);
      const response = await updateReturnRequest(requestId, {
        status: "Approved",
      });

      if (response.success) {
        // Update local state
        setReturnRequests((requests) =>
          requests.map((req) =>
            req._id === requestId ? { ...req, status: "Approved" } : req
          )
        );
        alert("Return request approved successfully!");
      } else {
        alert(
          "Failed to approve return request: " +
          (response.message || "Unknown error")
        );
      }
    } catch (err: any) {
      console.error("Error approving return request:", err);
      alert(
        "Failed to approve return request: " +
        (err.response?.data?.message || "Please try again.")
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleCompleteReturn = async (requestId: string) => {
    try {
      setUpdating(requestId);
      const response = await updateReturnRequest(requestId, {
        status: "Completed",
      });

      if (response.success) {
        // Update local state
        setReturnRequests((requests) =>
          requests.map((req) =>
            req._id === requestId ? { ...req, status: "Completed" } : req
          )
        );
        alert("Return request completed and refunded to customer wallet successfully!");
      } else {
        alert(
          "Failed to complete return request: " +
          (response.message || "Unknown error")
        );
      }
    } catch (err: any) {
      console.error("Error completing return request:", err);
      alert(
        "Failed to complete return request: " +
        (err.response?.data?.message || "Please try again.")
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectReturn = async (requestId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      setUpdating(requestId);
      const response = await updateReturnRequest(requestId, {
        status: "Rejected",
        adminNotes: reason,
      });

      if (response.success) {
        // Update local state
        setReturnRequests((requests) =>
          requests.map((req) =>
            req._id === requestId ? { ...req, status: "Rejected" } : req
          )
        );
        alert("Return request rejected successfully!");
      } else {
        alert(
          "Failed to reject return request: " +
          (response.message || "Unknown error")
        );
      }
    } catch (err: any) {
      console.error("Error rejecting return request:", err);
      alert(
        "Failed to reject return request: " +
        (err.response?.data?.message || "Please try again.")
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = () => {
    alert("Export functionality will be implemented here");
  };

  const handleClearDate = () => {
    setFromDate("");
    setToDate("");
  };

  const sellers = ["All Seller", "Seller 1", "Seller 2", "Seller 3"];

  const statuses = [
    "All Status",
    "Pending",
    "Approved",
    "Rejected",
    "Completed",
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl font-semibold text-neutral-800">
          Return Request
        </h1>
        <div className="text-sm text-neutral-600">
          <span className="text-teal-600 hover:text-teal-700 cursor-pointer">
            Home
          </span>
          <span className="mx-2">/</span>
          <span className="text-neutral-800">Return Request</span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {/* Green Header Bar */}
        <div className="bg-green-500 px-4 sm:px-6 py-3">
          <h2 className="text-white text-lg font-semibold">
            View Return Request
          </h2>
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-neutral-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Left Side Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
              {/* From - To Date */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  From - To Date:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="text"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[140px]"
                    />
                  </div>
                  <span className="text-neutral-500">-</span>
                  <div className="relative">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="text"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[140px]"
                    />
                  </div>
                  <button
                    onClick={handleClearDate}
                    className="px-3 py-2 bg-neutral-700 hover:bg-neutral-800 text-white rounded text-sm transition-colors">
                    Clear
                  </button>
                </div>
              </div>

              {/* Filter by Seller */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  Filter by Seller:
                </label>
                <select
                  value={selectedSeller}
                  onChange={(e) => {
                    setSelectedSeller(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[130px]">
                  {sellers.map((seller) => (
                    <option
                      key={seller}
                      value={seller === "All Seller" ? "all" : seller}>
                      {seller}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Status */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  Filter by Status:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[130px]">
                  {statuses.map((status) => (
                    <option
                      key={status}
                      value={status === "All Status" ? "all" : status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Side Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Per Page */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-700">Per Page:</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Search */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700">Search:</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search:"
                  className="px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[150px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("orderItemId")}>
                  <div className="flex items-center gap-2">
                    Order Item Id
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("user")}>
                  <div className="flex items-center gap-2">
                    User
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Seller
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("product")}>
                  <div className="flex items-center gap-2">
                    Product
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("variant")}>
                  <div className="flex items-center gap-2">
                    Variant
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("price")}>
                  <div className="flex items-center gap-2">
                    Price
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("discPrice")}>
                  <div className="flex items-center gap-2">
                    Disc Price
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("quantity")}>
                  <div className="flex items-center gap-2">
                    Quantity
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("total")}>
                  <div className="flex items-center gap-2">
                    Total
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-2">
                    Status
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("date")}>
                  <div className="flex items-center gap-2">
                    Date
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
               {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 sm:px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mr-2"></div>
                      Loading return requests...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 sm:px-6 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : displayedRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                    No return requests found
                  </td>
                </tr>
              ) : (
                displayedRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-neutral-50">
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 max-w-[120px] truncate" title={request.orderItemId}>
                      {request.orderItemId}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">
                      {request.userName}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-teal-800 font-semibold">
                      {request.sellerName}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600 max-w-[180px] truncate" title={request.productName}>
                      {request.productName}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600 max-w-[120px] truncate" title={request.variant}>
                      {request.variant || "-"}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900">
                      ₹{request.price.toFixed(2)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900">
                      ₹{(request.discountedPrice || request.price).toFixed(2)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {request.quantity}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">
                      ₹{request.total.toFixed(2)}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${request.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : request.status === "Approved"
                            ? "bg-teal-100 text-teal-800"
                            : request.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : request.status === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                          }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          title="View Proof & Details">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        {request.status === "Pending" ? (
                          <>
                            <button
                              onClick={() => handleApproveReturn(request._id)}
                              disabled={updating === request._id}
                              className="p-1.5 bg-teal-50 hover:bg-teal-100 disabled:bg-neutral-100 disabled:text-neutral-400 text-teal-700 rounded transition-colors"
                              title="Approve Pickup">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRejectReturn(request._id)}
                              disabled={updating === request._id}
                              className="p-1.5 bg-red-50 hover:bg-red-100 disabled:bg-neutral-100 disabled:text-neutral-400 text-red-700 rounded transition-colors"
                              title="Reject">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </>
                        ) : request.status === "Processing" ? (
                          <>
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to COMPLETE this return request and REFUND ₹${request.total.toFixed(2)} to the customer's wallet?`)) {
                                  handleCompleteReturn(request._id);
                                }
                              }}
                              disabled={updating === request._id}
                              className="p-1.5 bg-green-600 hover:bg-green-700 disabled:bg-neutral-100 disabled:text-neutral-400 text-white rounded transition-colors"
                              title="Approve & Refund">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRejectReturn(request._id)}
                              disabled={updating === request._id}
                              className="p-1.5 bg-red-50 hover:bg-red-100 disabled:bg-neutral-100 disabled:text-neutral-400 text-red-700 rounded transition-colors"
                              title="Reject">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                            {request.status}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-neutral-700">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, displayedRequests.length)} of{" "}
            {displayedRequests.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`p-2 border border-green-300 rounded bg-white ${currentPage === 1 || totalPages === 0
                ? "text-neutral-400 cursor-not-allowed"
                : "text-neutral-700 hover:bg-green-50"
                }`}
              aria-label="Previous page">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 border border-green-300 rounded bg-white ${currentPage === totalPages || totalPages === 0
                ? "text-neutral-400 cursor-not-allowed"
                : "text-neutral-700 hover:bg-green-50"
                }`}
              aria-label="Next page">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
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
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-neutral-500 py-4">
        Copyright © 2026. Developed By{" "}
        <a href="#" className="text-teal-600 hover:text-teal-700">
          KlydoCart
        </a>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-100 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg text-neutral-900">Return Request Proof & Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors p-1.5 rounded-full hover:bg-neutral-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Customer Details</p>
                  <p className="font-semibold text-neutral-800">{selectedRequest.userName}</p>
                  <p className="text-xs text-neutral-500">ID: {selectedRequest.userId}</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Seller Store (Returned To)</p>
                  <p className="font-semibold text-neutral-800">{selectedRequest.sellerName}</p>
                  <p className="text-xs text-neutral-500">ID: {selectedRequest.sellerId}</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Product Details</p>
                  <p className="font-semibold text-neutral-800">{selectedRequest.productName}</p>
                  <p className="text-sm text-neutral-600">Qty: {selectedRequest.quantity} | Total: ₹{selectedRequest.total.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Status Details</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedRequest.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : selectedRequest.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedRequest.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                    }`}>
                      Return: {selectedRequest.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700">
                      Pickup: {selectedRequest.pickupStatus || "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Return Reason */}
              <div className="p-4 border border-neutral-100 rounded-xl bg-orange-50/50">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">Reason for Return</p>
                <p className="text-sm text-neutral-700 leading-relaxed font-medium">{selectedRequest.reason}</p>
              </div>

              {/* Delivery Proof Photos */}
              <div className="space-y-4">
                <h4 className="font-bold text-neutral-800 text-sm border-b border-neutral-100 pb-2 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  Delivery Partner Verification Proof
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Return Pickup Photo */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">1. Customer Pickup Proof</p>
                    {selectedRequest.pickupImages && selectedRequest.pickupImages.length > 0 ? (
                      <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 h-48">
                        <img
                          src={selectedRequest.pickupImages[0]}
                          alt="Return Pickup Proof"
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(selectedRequest.pickupImages?.[0], "_blank")}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl h-48 bg-neutral-50 text-neutral-400">
                        <p className="text-xs font-medium">No pickup image uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Seller Drop-off Photo */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">2. Seller Drop-off Proof (Proof of Delivery)</p>
                    {selectedRequest.dropoffImages && selectedRequest.dropoffImages.length > 0 ? (
                      <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 h-48">
                        <img
                          src={selectedRequest.dropoffImages[0]}
                          alt="Seller Drop-off Proof"
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(selectedRequest.dropoffImages?.[0], "_blank")}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl h-48 bg-neutral-50 text-neutral-400">
                        <p className="text-xs font-medium">No drop-off image uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 font-semibold hover:bg-neutral-100 transition-colors">
                Close
              </button>
              {selectedRequest.status === "Pending" && (
                <>
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to REJECT this return request?")) {
                        const reqId = selectedRequest._id;
                        setSelectedRequest(null);
                        await handleRejectReturn(reqId);
                      }
                    }}
                    disabled={updating === selectedRequest._id}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold transition-colors">
                    Reject
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to APPROVE this return request for pickup?`)) {
                        const reqId = selectedRequest._id;
                        setSelectedRequest(null);
                        await handleApproveReturn(reqId);
                      }
                    }}
                    disabled={updating === selectedRequest._id}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition-colors">
                    Approve Pickup
                  </button>
                </>
              )}
              {selectedRequest.status === "Processing" && (
                <>
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to REJECT this return request?")) {
                        const reqId = selectedRequest._id;
                        setSelectedRequest(null);
                        await handleRejectReturn(reqId);
                      }
                    }}
                    disabled={updating === selectedRequest._id}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold transition-colors">
                    Reject
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to COMPLETE this return request and REFUND ₹${selectedRequest.total.toFixed(2)} to the customer's wallet?`)) {
                        const reqId = selectedRequest._id;
                        setSelectedRequest(null);
                        await handleCompleteReturn(reqId);
                      }
                    }}
                    disabled={updating === selectedRequest._id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-colors">
                    Approve & Refund
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
