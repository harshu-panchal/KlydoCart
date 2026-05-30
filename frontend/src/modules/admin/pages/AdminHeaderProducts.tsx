import { useState, useEffect, useCallback } from 'react';
import { getHeaderCategoriesAdmin, HeaderCategory, updateHeaderCategory } from '../../../services/api/headerCategoryService';
import { getProducts, bulkUpdateProducts, getCategories, Category } from '../../../services/api/admin/adminProductService';
import { getIconByName } from '../../../utils/iconLibrary';

export default function AdminHeaderProducts() {
  const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);
  const [selectedHeaderId, setSelectedHeaderId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Table states for currently assigned products
  const [assignedProducts, setAssignedProducts] = useState<any[]>([]);
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [assignedSelectedIds, setAssignedSelectedIds] = useState<string[]>([]);
  const [assignedLoading, setAssignedLoading] = useState(false);

  // Table states for unassigned products (available to assign)
  const [unassignedProducts, setUnassignedProducts] = useState<any[]>([]);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('');
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedTotal, setUnassignedTotal] = useState(0);
  const [unassignedSelectedIds, setUnassignedSelectedIds] = useState<string[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);

  const [categoriesCountMap, setCategoriesCountMap] = useState<Record<string, number>>({});
  const [loadingCats, setLoadingCats] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const itemsPerPage = 8;

  // Load header categories & product categories
  useEffect(() => {
    fetchHeaderCategories();
    fetchCategories();
  }, []);

  const fetchHeaderCategories = async () => {
    try {
      setLoadingCats(true);
      const data = await getHeaderCategoriesAdmin();
      setHeaderCategories(data);
      if (data.length > 0) {
        setSelectedHeaderId(data[0]._id);
      }
      
      // Fetch stats for each category to show counts
      const counts: Record<string, number> = {};
      for (const cat of data) {
        const res = await getProducts({ headerCategoryId: cat._id, limit: 1 });
        if (res.success && res.pagination) {
          counts[cat._id] = res.pagination.total;
        }
      }
      setCategoriesCountMap(counts);
    } catch (error) {
      console.error('Failed to fetch header categories', error);
    } finally {
      setLoadingCats(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories({ limit: 100 } as any);
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  // Fetch assigned products
  const fetchAssignedProducts = useCallback(async () => {
    if (!selectedHeaderId) return;
    try {
      setAssignedLoading(true);
      const res = await getProducts({
        headerCategoryId: selectedHeaderId,
        search: assignedSearch || undefined,
        page: assignedPage,
        limit: itemsPerPage,
      });
      if (res.success && res.data) {
        setAssignedProducts(res.data);
        setAssignedTotal(res.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch assigned products', error);
    } finally {
      setAssignedLoading(false);
    }
  }, [selectedHeaderId, assignedSearch, assignedPage]);

  // Fetch unassigned products
  const fetchUnassignedProducts = useCallback(async () => {
    try {
      setUnassignedLoading(true);
      const res = await getProducts({
        headerCategoryId: 'null', // Query parameter supported by updated backend controller
        search: unassignedSearch || undefined,
        category: selectedFilterCategory || undefined,
        page: unassignedPage,
        limit: itemsPerPage,
      });
      if (res.success && res.data) {
        setUnassignedProducts(res.data);
        setUnassignedTotal(res.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unassigned products', error);
    } finally {
      setUnassignedLoading(false);
    }
  }, [unassignedSearch, selectedFilterCategory, unassignedPage]);

  // Trigger loading when filters or selections change
  useEffect(() => {
    fetchAssignedProducts();
  }, [fetchAssignedProducts]);

  useEffect(() => {
    fetchUnassignedProducts();
  }, [fetchUnassignedProducts]);

  // Bulk Actions
  const handleAssignSelected = async () => {
    if (unassignedSelectedIds.length === 0) return alert('Please select products to assign');
    if (!selectedHeaderId) return alert('Please select a header category');

    try {
      setActionLoading(true);
      const res = await bulkUpdateProducts({
        productIds: unassignedSelectedIds,
        updateData: { headerCategoryId: selectedHeaderId } as any
      });
      
      if (res.success) {
        alert('Products assigned successfully!');
        unassignedSelectedIds.forEach(id => {
          setCategoriesCountMap(prev => ({
            ...prev,
            [selectedHeaderId]: (prev[selectedHeaderId] || 0) + 1
          }));
        });
        setUnassignedSelectedIds([]);
        fetchAssignedProducts();
        fetchUnassignedProducts();
      }
    } catch (error) {
      console.error(error);
      alert('Failed to assign products');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (assignedSelectedIds.length === 0) return alert('Please select products to remove');

    try {
      setActionLoading(true);
      const res = await bulkUpdateProducts({
        productIds: assignedSelectedIds,
        updateData: { headerCategoryId: null } as any
      });
      
      if (res.success) {
        alert('Products removed successfully!');
        assignedSelectedIds.forEach(id => {
          setCategoriesCountMap(prev => ({
            ...prev,
            [selectedHeaderId]: Math.max(0, (prev[selectedHeaderId] || 0) - 1)
          }));
        });
        setAssignedSelectedIds([]);
        fetchAssignedProducts();
        fetchUnassignedProducts();
      }
    } catch (error) {
      console.error(error);
      alert('Failed to remove products');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectAssigned = (id: string) => {
    setAssignedSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectUnassigned = (id: string) => {
    setUnassignedSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllAssigned = () => {
    if (assignedSelectedIds.length === assignedProducts.length) {
      setAssignedSelectedIds([]);
    } else {
      setAssignedSelectedIds(assignedProducts.map(p => p._id));
    }
  };

  const selectAllUnassigned = () => {
    if (unassignedSelectedIds.length === unassignedProducts.length) {
      setUnassignedSelectedIds([]);
    } else {
      setUnassignedSelectedIds(unassignedProducts.map(p => p._id));
    }
  };

  const activeCategory = headerCategories.find(c => c._id === selectedHeaderId);

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">Category Products Management</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Map products to header categories to display them in the customer app's All Products section.</p>
        </div>
        <div className="text-sm text-blue-500">
          <span className="text-blue-500 hover:underline cursor-pointer">Home</span>{' '}
          <span className="text-neutral-400">/</span> Category Products
        </div>
      </div>

      {/* Header Category Selector */}
      {loadingCats ? (
        <div className="flex justify-center items-center h-20 bg-white rounded-xl shadow-sm border border-neutral-200">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {headerCategories.map(cat => {
            const isSelected = selectedHeaderId === cat._id;
            const count = categoriesCountMap[cat._id] || 0;
            return (
              <div
                key={cat._id}
                onClick={() => {
                  setSelectedHeaderId(cat._id);
                  setAssignedPage(1);
                  setAssignedSelectedIds([]);
                }}
                className={`
                  cursor-pointer p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-200 shadow-sm
                  ${isSelected 
                    ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-800' 
                    : 'bg-white border-neutral-200 hover:border-teal-300 hover:bg-neutral-50 text-neutral-700'}
                `}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 mb-2 ${isSelected ? 'text-teal-600' : 'text-neutral-500'}`}>
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    getIconByName(cat.iconName)
                  )}
                </div>
                <span className="text-xs font-semibold leading-tight line-clamp-1 w-full">{cat.name}</span>
                <span className="text-[10px] text-neutral-400 mt-1 font-medium bg-neutral-50 px-2 py-0.5 rounded-full border border-neutral-100">
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer App Visibility Management — All Categories */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-800 text-sm">Customer App Visibility</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Control which header categories are visible in the customer / user app's product listing section.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-100 rounded-lg px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>{headerCategories.filter(c => c.showInHome).length} Visible</span>
            <span className="mx-1 text-neutral-300">|</span>
            <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
            <span>{headerCategories.filter(c => !c.showInHome).length} Hidden</span>
          </div>
        </div>

        {loadingCats ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : headerCategories.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-400">No header categories found. Create some from the Header Category page.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Products</th>
                  <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">App Visibility</th>
                  <th className="px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {headerCategories.map(cat => (
                  <tr
                    key={cat._id}
                    className={`transition hover:bg-neutral-50/70 ${selectedHeaderId === cat._id ? 'bg-teal-50/40' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-neutral-200">
                          {cat.image ? (
                            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-teal-600">{getIconByName(cat.iconName)}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-neutral-800">{cat.name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{cat.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" />
                        </svg>
                        {categoriesCountMap[cat._id] ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        cat.status === 'Published'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {cat.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cat.showInHome ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'}`}></div>
                        <span className={`text-xs font-semibold ${cat.showInHome ? 'text-green-700' : 'text-neutral-400'}`}>
                          {cat.showInHome ? 'Visible in App' : 'Hidden from App'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={async () => {
                          try {
                            setActionLoading(true);
                            const updated = await updateHeaderCategory(cat._id, { showInHome: !cat.showInHome });
                            setHeaderCategories(prev =>
                              prev.map(c => c._id === updated._id ? { ...c, showInHome: updated.showInHome } : c)
                            );
                          } catch (error) {
                            console.error(error);
                            alert('Failed to update visibility');
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        disabled={actionLoading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 flex items-center gap-1.5 mx-auto disabled:opacity-60
                          ${cat.showInHome
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                          }`}
                        title={cat.showInHome ? 'Hide from customer app' : 'Show on customer app'}
                      >
                        {cat.showInHome ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                            Hide on Customer
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Show on Customer App
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Dual-Panel View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Panel: Assigned Products */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h3 className="font-bold text-neutral-800 flex items-center gap-1.5 text-sm sm:text-base">
                <span>Products in</span>
                <span className="text-teal-600 font-semibold">{activeCategory?.name || 'Selected Category'}</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">{assignedTotal} products assigned</p>
            </div>
            
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search..."
                value={assignedSearch}
                onChange={(e) => {
                  setAssignedSearch(e.target.value);
                  setAssignedPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-neutral-200 rounded-lg w-full sm:w-40 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                onClick={handleRemoveSelected}
                disabled={assignedSelectedIds.length === 0 || actionLoading}
                className="bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 disabled:bg-neutral-100 disabled:text-neutral-400 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                Remove ({assignedSelectedIds.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={assignedProducts.length > 0 && assignedSelectedIds.length === assignedProducts.length}
                      onChange={selectAllAssigned}
                      className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 text-xs font-bold text-neutral-500 uppercase">Product</th>
                  <th className="p-3 text-xs font-bold text-neutral-500 uppercase">Category</th>
                  <th className="p-3 text-xs font-bold text-neutral-500 uppercase">Price</th>
                  <th className="p-3 text-xs font-bold text-neutral-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {assignedLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : assignedProducts.length > 0 ? (
                  assignedProducts.map(p => (
                    <tr key={p._id} className="hover:bg-neutral-50/50 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={assignedSelectedIds.includes(p._id)}
                          onChange={() => toggleSelectAssigned(p._id)}
                          className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <img src={p.mainImage || '/assets/no-image.png'} alt="" className="w-8 h-8 rounded object-cover border border-neutral-200 bg-neutral-100" />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-neutral-800 line-clamp-1">{p.productName}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">{p.sku || 'No SKU'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-neutral-500">{p.category?.name || 'N/A'}</td>
                      <td className="p-3 text-xs font-semibold text-neutral-700">₹{p.price}</td>
                      <td className="p-3">
                        <button
                          onClick={async () => {
                            if (window.confirm('Remove product from this header category?')) {
                              const res = await bulkUpdateProducts({ productIds: [p._id], updateData: { headerCategoryId: null } as any });
                              if (res.success) {
                                setCategoriesCountMap(prev => ({
                                  ...prev,
                                  [selectedHeaderId]: Math.max(0, (prev[selectedHeaderId] || 0) - 1)
                                }));
                                fetchAssignedProducts();
                                fetchUnassignedProducts();
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-neutral-500">
                      No products associated with this category yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <span className="text-[10px] text-neutral-400">Page {assignedPage} of {Math.ceil(assignedTotal / itemsPerPage) || 1}</span>
            <div className="flex gap-1.5">
              <button
                disabled={assignedPage === 1}
                onClick={() => setAssignedPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1 text-[10px] border border-neutral-200 bg-white rounded hover:bg-neutral-50 transition disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={assignedPage >= Math.ceil(assignedTotal / itemsPerPage)}
                onClick={() => setAssignedPage(prev => prev + 1)}
                className="px-2.5 py-1 text-[10px] border border-neutral-200 bg-white rounded hover:bg-neutral-50 transition disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Unassigned Products */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h3 className="font-bold text-neutral-800 text-sm sm:text-base">Unassigned Products</h3>
              <p className="text-xs text-neutral-400 mt-0.5">{unassignedTotal} products available to assign</p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={selectedFilterCategory}
                onChange={(e) => {
                  setSelectedFilterCategory(e.target.value);
                  setUnassignedPage(1);
                }}
                className="px-2 py-1 text-xs border border-neutral-200 rounded-lg focus:ring-teal-500 w-32 outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Search..."
                value={unassignedSearch}
                onChange={(e) => {
                  setUnassignedSearch(e.target.value);
                  setUnassignedPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-neutral-200 rounded-lg w-32 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />

              <button
                onClick={handleAssignSelected}
                disabled={unassignedSelectedIds.length === 0 || actionLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:bg-neutral-100 disabled:text-neutral-400 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                Assign ({unassignedSelectedIds.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={unassignedProducts.length > 0 && unassignedSelectedIds.length === unassignedProducts.length}
                      onChange={selectAllUnassigned}
                      className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 text-xs font-bold text-neutral-500 uppercase">Product</th>
                  <th className="p-3 text-xs font-bold text-neutral-500 uppercase">Category</th>
                  <th className="p-3 text-xs font-bold text-neutral-500 uppercase">Price</th>
                  <th className="p-3 text-xs font-bold text-neutral-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {unassignedLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : unassignedProducts.length > 0 ? (
                  unassignedProducts.map(p => (
                    <tr key={p._id} className="hover:bg-neutral-50/50 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={unassignedSelectedIds.includes(p._id)}
                          onChange={() => toggleSelectUnassigned(p._id)}
                          className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <img src={p.mainImage || '/assets/no-image.png'} alt="" className="w-8 h-8 rounded object-cover border border-neutral-200 bg-neutral-100" />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-neutral-800 line-clamp-1">{p.productName}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">{p.sku || 'No SKU'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-neutral-500">{p.category?.name || 'N/A'}</td>
                      <td className="p-3 text-xs font-semibold text-neutral-700">₹{p.price}</td>
                      <td className="p-3">
                        <button
                          onClick={async () => {
                            if (!selectedHeaderId) return alert('Please select a header category first');
                            const res = await bulkUpdateProducts({ productIds: [p._id], updateData: { headerCategoryId: selectedHeaderId } as any });
                            if (res.success) {
                              setCategoriesCountMap(prev => ({
                                ...prev,
                                [selectedHeaderId]: (prev[selectedHeaderId] || 0) + 1
                              }));
                              fetchAssignedProducts();
                              fetchUnassignedProducts();
                            }
                          }}
                          className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 p-1.5 rounded transition"
                          title="Assign to selected category"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-neutral-500">
                      All products are currently mapped to categories.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <span className="text-[10px] text-neutral-400">Page {unassignedPage} of {Math.ceil(unassignedTotal / itemsPerPage) || 1}</span>
            <div className="flex gap-1.5">
              <button
                disabled={unassignedPage === 1}
                onClick={() => setUnassignedPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1 text-[10px] border border-neutral-200 bg-white rounded hover:bg-neutral-50 transition disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={unassignedPage >= Math.ceil(unassignedTotal / itemsPerPage)}
                onClick={() => setUnassignedPage(prev => prev + 1)}
                className="px-2.5 py-1 text-[10px] border border-neutral-200 bg-white rounded hover:bg-neutral-50 transition disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
