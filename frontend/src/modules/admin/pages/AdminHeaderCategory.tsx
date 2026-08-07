import { useState, useEffect, useMemo } from 'react';
import {
  getHeaderCategoriesAdmin,
  createHeaderCategory,
  updateHeaderCategory,
  deleteHeaderCategory,
  reorderHeaderCategories,
  HeaderCategory
} from '../../../services/api/headerCategoryService';
import { themes } from '../../../utils/themes';
import { ICON_LIBRARY, getIconByName, IconDef } from '../../../utils/iconLibrary';
import { uploadImage } from '../../../services/api/uploadService';
import { getCategories, Category } from '../../../services/api/categoryService';

function OrderInput({
  currentOrder,
  totalItems,
  onOrderChange,
  disabled
}: {
  currentOrder: number;
  totalItems: number;
  onOrderChange: (newOrder: number) => void;
  disabled?: boolean;
}) {
  const [val, setVal] = useState<string>(String(currentOrder));

  useEffect(() => {
    setVal(String(currentOrder));
  }, [currentOrder]);

  const handleCommit = () => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setVal(String(currentOrder));
      return;
    }
    const clamped = Math.max(1, Math.min(totalItems, num));
    setVal(String(clamped));
    if (clamped !== currentOrder) {
      onOrderChange(clamped);
    }
  };

  return (
    <input
      type="number"
      min={1}
      max={totalItems}
      value={val}
      disabled={disabled}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleCommit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-12 px-1 py-0.5 border border-neutral-300 rounded text-center text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-neutral-100 disabled:opacity-50"
      title={disabled ? "Clear search/sort to reorder" : "Type order number and press Enter or click outside"}
    />
  );
}

export default function AdminHeaderCategory() {
  const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [headerCategoryName, setHeaderCategoryName] = useState('');
  const [selectedIconLibrary, setSelectedIconLibrary] = useState('Custom'); // Default to Custom for SVG
  const [headerCategoryIcon, setHeaderCategoryIcon] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // This maps to relatedCategory
  const [selectedTheme, setSelectedTheme] = useState('grocery'); // This maps to slug
  const [selectedStatus, setSelectedStatus] = useState<'Published' | 'Unpublished'>('Published');
  const [headerCategoryOrder, setHeaderCategoryOrder] = useState<number>(1);
  const [headerCategoryImage, setHeaderCategoryImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Icon search state
  const [iconSearchTerm, setIconSearchTerm] = useState('');

  // Table states
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const themeOptions = Object.keys(themes).filter(key => key !== 'all');

  useEffect(() => {
    fetchCategories();
    fetchRegularCategories();
  }, []);

  const fetchRegularCategories = async () => {
    try {
      const response = await getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getHeaderCategoriesAdmin();
      // Ensure sorted by order
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setHeaderCategories(data);
      if (!editingId) {
        setHeaderCategoryOrder(data.length + 1);
      }
    } catch (error) {
      console.error('Failed to fetch header categories', error);
      alert('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  // Smart Icon Suggestions
  useEffect(() => {
    if (headerCategoryName && !editingId) {
      // Logic handled in useMemo
    }
  }, [headerCategoryName]);

  const filteredIcons = useMemo(() => {
    const term = iconSearchTerm || headerCategoryName || '';
    if (!term.trim()) return ICON_LIBRARY;

    const lowerTerm = term.toLowerCase();

    return [...ICON_LIBRARY].sort((a, b) => {
      const aScore = getMatchScore(a, lowerTerm);
      const bScore = getMatchScore(b, lowerTerm);
      return bScore - aScore;
    });
  }, [iconSearchTerm, headerCategoryName]);

  function getMatchScore(icon: IconDef, term: string) {
    let score = 0;
    if (icon.name.includes(term)) score += 10;
    if (icon.label.toLowerCase().includes(term)) score += 10;
    if (icon.tags.some(t => t.includes(term))) score += 5;
    if (icon.tags.some(t => term.includes(t))) score += 5;
    return score;
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredCategories = headerCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.relatedCategory || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (sortColumn) {
    filteredCategories.sort((a: any, b: any) => {
      let valA = a[sortColumn] || '';
      let valB = b[sortColumn] || '';
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleOrderChange = async (fromIndex: number, newOrder: number) => {
    if (searchTerm || sortColumn) {
      alert("Please clear search and sorting to reorder items.");
      fetchCategories();
      return;
    }

    const toIndex = Math.max(0, Math.min(headerCategories.length - 1, newOrder - 1));
    if (fromIndex === toIndex) return;

    const newCategories = [...headerCategories];
    // Swap the two items with each other
    const temp = newCategories[fromIndex];
    newCategories[fromIndex] = newCategories[toIndex];
    newCategories[toIndex] = temp;

    setHeaderCategories(newCategories);

    try {
      await reorderHeaderCategories(newCategories.map(c => c._id));
    } catch (error) {
      console.error("Failed to reorder", error);
      alert("Failed to save new order");
      fetchCategories();
    }
  };

  const totalPages = Math.ceil(filteredCategories.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const displayedCategories = filteredCategories.slice(startIndex, endIndex);

  const resetForm = () => {
    setHeaderCategoryName('');
    setSelectedIconLibrary('Custom');
    setHeaderCategoryIcon('');
    setSelectedCategory('');
    setSelectedTheme('grocery');
    setSelectedStatus('Published');
    setHeaderCategoryImage('');
    setEditingId(null);
    setIconSearchTerm('');
    setHeaderCategoryOrder(headerCategories.length + 1);
  };

  const handleAddOrUpdate = async () => {
    if (!headerCategoryName.trim()) return alert('Please enter a header category name');
    if (!headerCategoryIcon.trim()) return alert('Please select an icon. If your category is unique, try searching for a generic icon.');
    if (!selectedTheme) return alert('Please select a theme');

    try {
      const generatedSlug = headerCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const payload = {
        name: headerCategoryName,
        iconLibrary: selectedIconLibrary,
        iconName: headerCategoryIcon,
        slug: selectedTheme, // Use theme as slug for color mapping
        relatedCategory: editingId ? selectedCategory : generatedSlug, // Auto-generate slug on creation
        image: headerCategoryImage,
        status: selectedStatus,
      };

      if (editingId) {
        await updateHeaderCategory(editingId, payload);

        // Handle order swap if order position was changed in form
        const fromIndex = headerCategories.findIndex(c => c._id === editingId);
        const toIndex = Math.max(0, Math.min(headerCategories.length - 1, headerCategoryOrder - 1));

        if (fromIndex !== -1 && fromIndex !== toIndex) {
          const newCategories = [...headerCategories];
          const temp = newCategories[fromIndex];
          newCategories[fromIndex] = newCategories[toIndex];
          newCategories[toIndex] = temp;
          setHeaderCategories(newCategories);
          await reorderHeaderCategories(newCategories.map(c => c._id));
        }

        alert('Header Category updated successfully!');
      } else {
        const newCat = await createHeaderCategory(payload);

        // Handle target order swap for new category
        const data = await getHeaderCategoriesAdmin();
        data.sort((a, b) => (a.order || 0) - (b.order || 0));

        const createdIndex = data.findIndex(c => c._id === newCat._id);
        const toIndex = Math.max(0, Math.min(data.length - 1, headerCategoryOrder - 1));

        if (createdIndex !== -1 && createdIndex !== toIndex) {
          const temp = data[createdIndex];
          data[createdIndex] = data[toIndex];
          data[toIndex] = temp;
          await reorderHeaderCategories(data.map(c => c._id));
        }

        alert('Header Category added successfully!');
      }

      fetchCategories();
      resetForm();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (category: HeaderCategory) => {
    setEditingId(category._id);
    setHeaderCategoryName(category.name);
    setSelectedIconLibrary(category.iconLibrary);
    setHeaderCategoryIcon(category.iconName);
    setSelectedCategory(category.relatedCategory || '');
    setSelectedTheme(category.slug);
    setSelectedStatus(category.status);
    setHeaderCategoryImage(category.image || '');
    setIconSearchTerm('');

    const index = headerCategories.findIndex(c => c._id === category._id);
    setHeaderCategoryOrder(index !== -1 ? index + 1 : 1);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this header category?')) {
      try {
        await deleteHeaderCategory(id);
        alert('Header Category deleted successfully!');
        fetchCategories();
      } catch (error) {
        console.error(error);
        alert('Failed to delete category');
      }
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const result = await uploadImage(file, 'klydocart/categories');
      setHeaderCategoryImage(result.secureUrl);
    } catch (error) {
      console.error('Image upload failed', error);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl font-semibold text-neutral-800">Header Category</h1>
        <div className="text-sm text-blue-500">
          <span className="text-blue-500 hover:underline cursor-pointer">Home</span>{' '}
          <span className="text-neutral-400">/</span> Dashboard
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Panel - Add Header Category */}
        <div className="xl:col-span-4 bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div className="bg-teal-600 text-white px-4 sm:px-6 py-3">
            <h2 className="text-base sm:text-lg font-semibold">
              {editingId ? 'Edit Header Category' : 'Add Header Category'}
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {/* Header Category Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Header Category Name:
              </label>
              <input
                type="text"
                value={headerCategoryName}
                onChange={(e) => setHeaderCategoryName(e.target.value)}
                placeholder="Enter Category Name (e.g. Dairy, Books)"
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Select Icon Visual Grid */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-neutral-700">
                  Select Icon:
                </label>
                <input
                  type="text"
                  placeholder="Auto-match or type..."
                  value={iconSearchTerm}
                  onChange={(e) => setIconSearchTerm(e.target.value)}
                  className="px-2 py-1 text-xs border rounded border-neutral-300 w-32 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-neutral-50 p-2 rounded border border-neutral-200 h-48 overflow-y-auto custom-scrollbar">
                {filteredIcons.length > 0 ? filteredIcons.map((option) => {
                  const isSelected = headerCategoryIcon === option.name;
                  return (
                    <div
                      key={option.name}
                      onClick={() => {
                        setHeaderCategoryIcon(option.name);
                        setSelectedIconLibrary('Custom');
                      }}
                      className={`
                        cursor-pointer flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all
                        ${isSelected
                          ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500 text-teal-700'
                          : 'bg-white border-neutral-200 hover:border-teal-300 hover:shadow-sm text-neutral-600'}
                      `}
                    >
                      <div className={`${isSelected ? 'text-teal-600' : 'text-neutral-500'}`}>
                        {option.svg}
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight truncate w-full">
                        {option.label}
                      </span>
                    </div>
                  );
                }) : (
                  <div className="col-span-full py-8 text-center text-neutral-500 text-sm">
                    No icons found matching "{iconSearchTerm || headerCategoryName}"
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Icons are automatically suggested based on category name.
              </p>
            </div>

            {/* Custom Image Upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Header Category Image (Optional):
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-100 rounded-lg border-2 border-dashed border-neutral-300 flex items-center justify-center overflow-hidden">
                  {headerCategoryImage ? (
                    <img src={headerCategoryImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-neutral-400 text-[10px] text-center px-1">No Image</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="header-category-image"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  <label
                    htmlFor="header-category-image"
                    className={`
                      inline-flex items-center px-4 py-2 border border-neutral-300 rounded text-sm font-medium cursor-pointer
                      ${isUploading ? 'bg-neutral-50 text-neutral-400' : 'bg-white text-neutral-700 hover:bg-neutral-50'}
                    `}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </label>
                  {headerCategoryImage && (
                    <button
                      onClick={() => setHeaderCategoryImage('')}
                      className="ml-2 text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  )}
                  <p className="mt-1 text-[10px] text-neutral-500">
                    If uploaded, image will be shown instead of the selected icon.
                  </p>
                </div>
              </div>
            </div>

            {/* Theme / Color Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Select Theme Color:
              </label>
              <div className="grid grid-cols-4 gap-3 bg-neutral-50 p-3 rounded border border-neutral-200">
                {themeOptions.map(themeKey => {
                  const themeObj = themes[themeKey];
                  const color = themeObj.primary[0];
                  const isSelected = selectedTheme === themeKey;

                  // Map theme keys to user-friendly color names
                  const colorNames: Record<string, string> = {
                    all: 'Green',
                    wedding: 'Red',
                    winter: 'Sky Blue',
                    electronics: 'Yellow',
                    beauty: 'Pink',
                    grocery: 'Light Green',
                    fashion: 'Purple',
                    sports: 'Blue',
                    orange: 'Orange',
                    violet: 'Violet',
                    teal: 'Teal',
                    dark: 'Dark',
                    hotpink: 'Hot Pink',
                    gold: 'Gold'
                  };

                  const displayColor = colorNames[themeKey] || themeKey;

                  return (
                    <div
                      key={themeKey}
                      onClick={() => setSelectedTheme(themeKey)}
                      title={displayColor}
                      className={`
                                cursor-pointer flex flex-col items-center gap-1 p-2 rounded transition-all
                                ${isSelected ? 'ring-2 ring-teal-500 bg-white shadow-sm' : 'hover:bg-neutral-200'}
                            `}
                    >
                      <div
                        className="w-8 h-8 rounded-full shadow-sm border border-black/10"
                        style={{ background: color }}
                      />
                      <span className="text-[10px] text-neutral-600 font-medium capitalize text-center leading-tight">
                        {displayColor}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Related Category */}
            <div className="hidden">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Related Category (Slug):
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => {
                  const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  return (
                    <option key={cat._id} value={slug}>
                      {cat.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status & Order Position */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Status:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Published">Published</option>
                  <option value="Unpublished">Unpublished</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Order Position:
                </label>
                <input
                  type="number"
                  min={1}
                  max={headerCategories.length + (editingId ? 0 : 1)}
                  value={headerCategoryOrder}
                  onChange={(e) => setHeaderCategoryOrder(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddOrUpdate}
                className="flex-1 bg-teal-600 text-white py-2 rounded text-sm font-medium hover:bg-teal-700 transition"
              >
                {editingId ? 'Update Category' : 'Add Category'}
              </button>
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 bg-neutral-200 text-neutral-700 py-2 rounded text-sm font-medium hover:bg-neutral-300 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - List & Search */}
        <div className="xl:col-span-8 bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col h-full overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
            <h3 className="font-semibold text-neutral-700 text-sm sm:text-base">Category List</h3>

            <div className="relative">
              <input
                type="text"
                placeholder="Search category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs sm:text-sm border border-neutral-300 rounded-full w-40 sm:w-48 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <svg
                className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-50 sticky top-0 z-10">
                <tr>
                  {['Name', 'Icon', 'Theme', 'Status', 'Order', 'Actions'].map((header) => (
                    <th
                      key={header}
                      onClick={() => handleSort(header.toLowerCase())}
                      className={`px-3 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors border-b border-neutral-200 ${
                        header === 'Order' || header === 'Actions' ? 'text-center' : ''
                      }`}
                    >
                      {header} {sortColumn === header.toLowerCase() && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {displayedCategories.length > 0 ? (
                  displayedCategories.map((category, i) => {
                    // Global index for reordering
                    const globalIndex = startIndex + i;
                    
                    return (
                    <tr key={category._id} className="hover:bg-neutral-50 transition-colors group">
                      <td className="px-3 py-2 text-xs sm:text-sm font-medium text-neutral-800">
                        {category.name}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-600">
                        <div className="flex items-center gap-2">
                          <div className="text-teal-600 w-8 h-8 flex items-center justify-center bg-neutral-100 rounded shrink-0">
                            {category.image ? (
                              <img src={category.image} alt={category.name} className="w-full h-full object-contain" />
                            ) : (
                              getIconByName(category.iconName)
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] text-neutral-500 font-mono">
                              {category.iconName}
                            </span>
                            {category.image && (
                              <span className="text-[9px] text-teal-600 font-medium">Custom Image</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-600">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-800 capitalize border border-neutral-200">
                          <div
                            className="w-1.5 h-1.5 rounded-full mr-1.5"
                            style={{ background: themes[category.slug]?.primary[0] || '#ccc' }}
                          />
                          {category.slug}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`
                            px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full
                            ${category.status === 'Published'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'}
                          `}
                        >
                          {category.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-center">
                        <OrderInput
                          currentOrder={globalIndex + 1}
                          totalItems={headerCategories.length}
                          onOrderChange={(newOrder) => handleOrderChange(globalIndex, newOrder)}
                          disabled={!!searchTerm || !!sortColumn}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(category._id)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-neutral-500">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-10 h-10 text-neutral-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No categories found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600 hidden sm:block">
                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredCategories.length)}</span> of <span className="font-medium">{filteredCategories.length}</span> results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-neutral-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 border border-neutral-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
