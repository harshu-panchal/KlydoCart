import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubcategories, SubCategory } from '../../../services/api/categoryService';

export default function SellerSubCategory() {
    const navigate = useNavigate();
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [totalPages, setTotalPages] = useState(1);

    // Fetch subcategories from API
    useEffect(() => {
        const fetchSubcategories = async () => {
            setLoading(true);
            setError('');
            try {
                const params: any = {
                    page: currentPage,
                    limit: rowsPerPage,
                    sortBy: sortColumn || 'subcategoryName',
                    sortOrder: sortDirection,
                };

                const response = await getAllSubcategories(params);
                if (response.success && response.data) {
                    setSubcategories(response.data);
                    // Extract pagination info if available
                    if ((response as any).pagination) {
                        setTotalPages((response as any).pagination.pages);
                    }
                } else {
                    setError(response.message || 'Failed to fetch subcategories');
                }
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch subcategories');
            } finally {
                setLoading(false);
            }
        };

        fetchSubcategories();
    }, [currentPage, rowsPerPage, sortColumn, sortDirection]);

    // Client-side sorting (if API doesn't handle it)
    let sortedSubcategories = [...subcategories];
    if (sortColumn && !sortColumn.includes('.')) {
        sortedSubcategories.sort((a, b) => {
            let aVal: any = a[sortColumn as keyof typeof a];
            let bVal: any = b[sortColumn as keyof typeof b];
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    // Pagination (client-side if API doesn't handle it)
    const displayTotalPages = totalPages > 1 ? totalPages : Math.ceil(sortedSubcategories.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayedSubcategories = sortedSubcategories.slice(startIndex, endIndex);

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
                <h1 className="text-2xl font-semibold text-neutral-800">View SubCategory</h1>
                <div className="text-sm text-blue-500">
                    <span onClick={() => navigate('/seller')} className="cursor-pointer hover:underline text-blue-600 font-medium">Home</span> <span className="text-neutral-400 mx-1">/</span> <span className="text-neutral-600">SubCategory</span>
                </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 flex-1 flex flex-col">
                <div className="p-4 border-b border-neutral-100 font-medium text-neutral-700">
                    View SubCategory
                </div>

                {/* Controls */}
                <div className="p-4 flex justify-between items-center border-b border-neutral-100">
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
                            <option value={10}>10 entries</option>
                            <option value={20}>20 entries</option>
                            <option value={50}>50 entries</option>
                            <option value={100}>100 entries</option>
                        </select>
                    </div>
                </div>

                {/* Pagination Footer */}
                <div className="px-4 py-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-sm text-neutral-700">
                        Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, sortedSubcategories.length)} of {sortedSubcategories.length} entries
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-4">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                            onClick={() => setCurrentPage(prev => Math.min(displayTotalPages, prev + 1))}
                            disabled={currentPage === displayTotalPages || displayTotalPages === 0}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all duration-200 ${
                                currentPage === displayTotalPages || displayTotalPages === 0
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

                {/* Loading and Error States */}
                {loading && (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-neutral-500">Loading subcategories...</div>
                    </div>
                )}
                {error && !loading && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg m-4">
                        {error}
                    </div>
                )}

                {/* Table */}
                {!loading && !error && (
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
                                    onClick={() => handleSort('categoryName')}
                                >
                                    <div className="flex items-center justify-between">
                                        Category Name <SortIcon column="categoryName" />
                                    </div>
                                </th>
                                <th 
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('subcategoryName')}
                                >
                                    <div className="flex items-center justify-between">
                                        Subcategory Name <SortIcon column="subcategoryName" />
                                    </div>
                                </th>
                                <th 
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('subcategoryImage')}
                                >
                                    <div className="flex items-center justify-between">
                                        Subcategory Image <SortIcon column="subcategoryImage" />
                                    </div>
                                </th>
                                <th 
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('totalProduct')}
                                >
                                    <div className="flex items-center justify-between">
                                        Total Product <SortIcon column="totalProduct" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedSubcategories.map((subcategory) => (
                                <tr key={subcategory._id || subcategory.id} className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700">
                                    <td className="p-4 align-middle border border-neutral-200">{subcategory._id || subcategory.id}</td>
                                    <td className="p-4 align-middle border border-neutral-200">{subcategory.categoryName}</td>
                                    <td className="p-4 align-middle border border-neutral-200">{subcategory.subcategoryName}</td>
                                    <td className="p-4 border border-neutral-200">
                                        <div className="w-16 h-12 bg-white border border-neutral-200 rounded p-1 flex items-center justify-center mx-auto">
                                            <img
                                                src={subcategory.subcategoryImage || '/assets/category-placeholder.png'}
                                                alt={subcategory.subcategoryName}
                                                className="max-w-full max-h-full object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/60x40?text=Img';
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle border border-neutral-200">{subcategory.totalProduct || 0}</td>
                                </tr>
                            ))}
                            {displayedSubcategories.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-neutral-400 border border-neutral-200">
                                        No subcategories found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
        </div>
    );
}

