import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as taxService from '../../../services/api/taxService';

export default function SellerTaxes() {
    const navigate = useNavigate();
    const [taxes, setTaxes] = useState<taxService.Tax[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTax, setNewTax] = useState({
        name: '',
        percentage: '',
        description: '',
        status: 'Active'
    });
    const [error, setError] = useState<string | null>(null);

    const fetchTaxes = async () => {
        setLoading(true);
        try {
            const response = await taxService.getTaxes();
            if (response.success) {
                setTaxes(response.data);
            }
        } catch (err) {
            console.error('Error fetching taxes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaxes();
    }, []);

    const handleAddTax = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newTax.name || !newTax.percentage) {
            setError('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await taxService.createTax({
                name: newTax.name,
                percentage: Number(newTax.percentage),
                description: newTax.description,
                status: newTax.status,
                type: 'Percentage' // Default type
            });

            if (response.success) {
                setIsModalOpen(false);
                setNewTax({ name: '', percentage: '', description: '', status: 'Active' });
                fetchTaxes();
            } else {
                setError(response.message || 'Failed to add tax');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error creating tax');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredTaxes = taxes.filter(tax =>
        tax.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    const totalPages = Math.ceil(filteredTaxes.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayedTaxes = filteredTaxes.slice(startIndex, endIndex);

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

    // Helper to generate pagination numbers with a sliding window of 5
    const getPageNumbers = () => {
        const pages = [];
        const displayTotalPages = totalPages;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(displayTotalPages, start + 4);

        if (end - start < 4) {
            start = Math.max(1, end - 4);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex flex-col h-full max-w-full overflow-hidden">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-800">Tax</h1>
                    <div className="flex items-center gap-2 text-sm mt-1">
                        <span 
                            onClick={() => navigate('/seller')} 
                            className="cursor-pointer text-blue-600 hover:text-blue-700 hover:underline font-medium"
                        >
                            Home
                        </span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-600">Tax</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add New Tax
                </button>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 flex-1 flex flex-col">
                {/* Controls */}
                <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-600">Show</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
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
                            onClick={() => {
                                const headers = ['ID', 'Name', 'Rate (%)', 'Status'];
                                const csvContent = [
                                    headers.join(','),
                                    ...filteredTaxes.map(tax => [
                                        tax._id,
                                        `"${tax.name}"`,
                                        tax.percentage,
                                        tax.status
                                    ].join(','))
                                ].join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                const url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', `taxes_${new Date().toISOString().split('T')[0]}.csv`);
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors"
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
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">Search:</span>
                            <input
                                type="text"
                                className="pl-14 pr-3 py-1.5 bg-neutral-100 border-none rounded text-sm focus:ring-1 focus:ring-teal-500 w-48"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder=""
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse border border-neutral-200">
                        <thead>
                            <tr className="bg-neutral-50 text-xs font-bold text-neutral-800">
                                <th
                                    className="p-4 w-16 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('id')}
                                >
                                    <div className="flex items-center justify-between">
                                        ID <SortIcon column="id" />
                                    </div>
                                </th>
                                <th
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center justify-between">
                                        Tax Name <SortIcon column="name" />
                                    </div>
                                </th>
                                <th
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('percentage')}
                                >
                                    <div className="flex items-center justify-between">
                                        Tax Rate (%) <SortIcon column="percentage" />
                                    </div>
                                </th>
                                <th
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center justify-between">
                                        Status <SortIcon column="status" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-neutral-400 border border-neutral-200">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                                            <span>Loading tax data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : displayedTaxes.map((tax, index) => (
                                <tr key={tax._id} className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700">
                                    <td className="p-4 align-middle border border-neutral-200">{startIndex + index + 1}</td>
                                    <td className="p-4 align-middle border border-neutral-200 font-medium">{tax.name}</td>
                                    <td className="p-4 align-middle border border-neutral-200">{tax.percentage}%</td>
                                    <td className="p-4 align-middle border border-neutral-200">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tax.status === 'Active'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-rose-100 text-rose-800'
                                            }`}>
                                            {tax.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {!loading && displayedTaxes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-neutral-400 border border-neutral-200">
                                        No taxes found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-neutral-700">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredTaxes.length)} of {filteredTaxes.length} entries
                    </div>
                    <div className="flex items-center gap-1 sm:gap-4 p-1">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all duration-200 ${
                                currentPage === 1
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
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage >= totalPages || totalPages === 0}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all duration-200 ${
                                currentPage >= totalPages || totalPages === 0
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

            {/* Add Tax Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-teal-600 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-white font-bold text-lg">Add New Tax</h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddTax} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-lg text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider ml-1">Tax Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newTax.name}
                                    onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
                                    placeholder="e.g. GST 18%, VAT"
                                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider ml-1">Tax Rate (%) *</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    value={newTax.percentage}
                                    onChange={(e) => setNewTax({ ...newTax, percentage: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider ml-1">Description</label>
                                <textarea
                                    value={newTax.description}
                                    onChange={(e) => setNewTax({ ...newTax, description: e.target.value })}
                                    placeholder="Enter tax details..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider ml-1">Status</label>
                                <select
                                    value={newTax.status}
                                    onChange={(e) => setNewTax({ ...newTax, status: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-neutral-200 text-neutral-600 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    {isSubmitting ? 'Adding...' : 'Save Tax'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

