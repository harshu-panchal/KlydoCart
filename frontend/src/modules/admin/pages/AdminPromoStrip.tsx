import { useState, useEffect, useMemo } from "react";
import {
  getPromoStrips,
  createPromoStrip,
  updatePromoStrip,
  deletePromoStrip,
  type PromoStrip,
  type PromoStripFormData,
  type CategoryCard,
} from "../../../services/api/admin/adminPromoStripService";
import { getCategories, type Category } from "../../../services/api/categoryService";
import { getHeaderCategoriesAdmin, type HeaderCategory } from "../../../services/api/headerCategoryService";
import { getProducts as getAdminProducts, type Product } from "../../../services/api/admin/adminProductService";

interface ExtendedCategory extends Category {
  productCount?: number;
  previewImages?: string[];
}

export default function AdminPromoStrip() {
  // Navigation & View mode
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");

  // Form states
  const [headerCategorySlug, setHeaderCategorySlug] = useState("all");
  const [heading, setHeading] = useState("HOUSEFULL");
  const [saleText, setSaleText] = useState("SALE");
  const [crazyDealsTitle, setCrazyDealsTitle] = useState("CRAZY DEALS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<string[]>([]);
  const [selectedProductMap, setSelectedProductMap] = useState<Record<string, Product>>({});
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState(1);

  // Data states
  const [promoStrips, setPromoStrips] = useState<PromoStrip[]>([]);
  const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  // Category details map (id -> details)
  const [categoryDetailsMap, setCategoryDetailsMap] = useState<Record<string, { productCount: number; images: string[] }>>({});

  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingPromoStrips, setLoadingPromoStrips] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Table Pagination & Filter
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [listFilterCategory, setListFilterCategory] = useState("all");
  const [tableSearch, setTableSearch] = useState("");

  // Load initial data
  useEffect(() => {
    fetchPromoStrips();
    fetchHeaderCategories();
    fetchCategoriesWithDetails();
    setDefaultDates();
  }, []);

  const setDefaultDates = () => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(nextMonth.toISOString().split("T")[0]);
  };

  const fetchPromoStrips = async () => {
    try {
      setLoadingPromoStrips(true);
      const data = await getPromoStrips();
      setPromoStrips(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch PromoStrips");
    } finally {
      setLoadingPromoStrips(false);
    }
  };

  const fetchHeaderCategories = async () => {
    try {
      const data = await getHeaderCategoriesAdmin();
      setHeaderCategories(data.filter((hc) => hc.status === "Published"));
    } catch (err: any) {
      console.error("Failed to fetch header categories:", err);
    }
  };

  const fetchCategoriesWithDetails = async () => {
    try {
      const response = await getCategories();
      if (response.success && response.data) {
        const catList = response.data.filter((c: any) => c.status === "Active" || c.isActive);
        setCategories(catList);

        // Fetch product count and thumbnails for each category
        const detailsMap: Record<string, { productCount: number; images: string[] }> = {};
        await Promise.all(
          catList.map(async (cat: any) => {
            try {
              const res = await getAdminProducts({ category: cat._id, limit: 4 });
              if (res.success && Array.isArray(res.data)) {
                const imgs = res.data
                  .map((p: any) => p.mainImage || p.image)
                  .filter((img: string) => Boolean(img && img.trim() !== ""));
                detailsMap[cat._id] = {
                  productCount: res.data.length,
                  images: imgs.slice(0, 4),
                };
              }
            } catch (e) {
              detailsMap[cat._id] = { productCount: 0, images: [] };
            }
          })
        );
        setCategoryDetailsMap(detailsMap);
      }
    } catch (err: any) {
      console.error("Failed to fetch categories:", err);
    }
  };

  // Search products for Crazy Deals
  useEffect(() => {
    if (productSearch.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchProducts(productSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (productSearch.length === 0) {
      fetchProducts("");
    }
  }, [productSearch]);

  const fetchProducts = async (search: string) => {
    try {
      const response = await getAdminProducts({ search, limit: 15 });
      if (response.success && Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch products:", err);
      setProducts([]);
    }
  };

  // Filtered Categories for dropdown
  const filteredCategoryList = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  // Featured Product selection
  const addFeaturedProduct = (product: Product) => {
    if (!featuredProducts.includes(product._id)) {
      setFeaturedProducts([...featuredProducts, product._id]);
      setSelectedProductMap((prev) => ({ ...prev, [product._id]: product }));
    }
    setProductSearch("");
  };

  const removeFeaturedProduct = (productId: string) => {
    setFeaturedProducts(featuredProducts.filter((id) => id !== productId));
  };

  // Category Cards selection
  const addCategoryCard = (cat: Category) => {
    const details = categoryDetailsMap[cat._id] || { productCount: 0, images: [] };
    if (details.productCount === 0) {
      setError(`Cannot add "${cat.name}" - it has 0 available products!`);
      return;
    }

    if (categoryCards.some((card) => card.categoryId === cat._id)) {
      setError(`"${cat.name}" is already added to category cards!`);
      return;
    }

    if (categoryCards.length >= 6) {
      setError("Maximum 6 category cards allowed per Promo Strip");
      return;
    }

    setError("");
    const newCard: CategoryCard = {
      categoryId: cat._id,
      title: cat.name,
      badge: "Up to 55% OFF",
      discountPercentage: 55,
      order: categoryCards.length,
    };
    setCategoryCards([...categoryCards, newCard]);
  };

  const removeCategoryCard = (index: number) => {
    setCategoryCards(categoryCards.filter((_, i) => i !== index));
  };

  const updateCategoryCard = (index: number, field: keyof CategoryCard, value: any) => {
    const updated = [...categoryCards];
    updated[index] = { ...updated[index], [field]: value };
    setCategoryCards(updated);
  };

  // Sync the 4 dynamic header categories into the form as category cards
  const syncFromHeaderCategories = () => {
    const dynamicCats = headerCategories
      .filter((hc) => hc.slug?.toLowerCase() !== "all" && hc.status === "Published")
      .slice(0, 4);

    // Match header category names to regular categories to get categoryId
    const newCards: CategoryCard[] = dynamicCats.map((hc, idx) => {
      // Try to find matching category by name or slug
      const matchedCat = categories.find(
        (cat) =>
          cat.name?.toLowerCase() === hc.name?.toLowerCase()
      );
      return {
        categoryId: matchedCat?._id || hc._id,
        title: hc.name,
        badge: "Up to 55% OFF",
        discountPercentage: 55,
        order: idx,
      };
    });

    if (newCards.length === 0) {
      setError("No published header categories found to sync!");
      return;
    }
    setCategoryCards(newCards);
    setError("");
    setSuccess(`Synced ${newCards.length} header categories as category cards!`);
  };


  const resetForm = () => {
    setHeaderCategorySlug("all");
    setHeading("HOUSEFULL SALE");
    setSaleText("SALE");
    setCrazyDealsTitle("CRAZY DEALS");
    setDefaultDates();
    setCategoryCards([]);
    setFeaturedProducts([]);
    setSelectedProductMap({});
    setIsActive(true);
    const nextOrd = Math.max(...promoStrips.map((ps) => ps.order || 0), 0) + 1;
    setOrder(nextOrd);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const handleEdit = (promoStrip: PromoStrip) => {
    setEditingId(promoStrip._id);
    setHeaderCategorySlug(promoStrip.headerCategorySlug);
    setHeading(promoStrip.heading);
    setSaleText(promoStrip.saleText);
    setCrazyDealsTitle(promoStrip.crazyDealsTitle || "CRAZY DEALS");
    setStartDate(promoStrip.startDate.split("T")[0]);
    setEndDate(promoStrip.endDate.split("T")[0]);
    setIsActive(promoStrip.isActive);
    setOrder(promoStrip.order);

    // Map Category Cards
    setCategoryCards(
      promoStrip.categoryCards.map((card) => {
        const catId = typeof card.categoryId === "string" ? card.categoryId : (card.categoryId as any)._id;
        const catObj = typeof card.categoryId === "object" ? (card.categoryId as any) : null;
        return {
          categoryId: catId,
          title: card.title || catObj?.name || "",
          badge: card.badge || "Up to 55% OFF",
          discountPercentage: card.discountPercentage || 55,
          order: card.order || 0,
        };
      })
    );

    // Map Featured Products
    const prodIds: string[] = [];
    const prodMap: Record<string, Product> = {};
    promoStrip.featuredProducts.forEach((p) => {
      if (typeof p === "string") {
        prodIds.push(p);
      } else if (p && p._id) {
        prodIds.push(p._id);
        prodMap[p._id] = p as any;
      }
    });
    setFeaturedProducts(prodIds);
    setSelectedProductMap(prodMap);

    setActiveTab("form");
    setError("");
    setSuccess("");
  };

  const handleToggleActive = async (promoStrip: PromoStrip) => {
    try {
      const updatedFormData: PromoStripFormData = {
        headerCategorySlug: promoStrip.headerCategorySlug,
        heading: promoStrip.heading,
        saleText: promoStrip.saleText,
        startDate: promoStrip.startDate.split("T")[0],
        endDate: promoStrip.endDate.split("T")[0],
        categoryCards: promoStrip.categoryCards.map((c) => ({
          categoryId: typeof c.categoryId === "string" ? c.categoryId : (c.categoryId as any)._id,
          title: c.title,
          badge: c.badge,
          discountPercentage: c.discountPercentage,
          order: c.order,
        })),
        featuredProducts: promoStrip.featuredProducts.map((p) => (typeof p === "string" ? p : p._id)),
        crazyDealsTitle: promoStrip.crazyDealsTitle,
        isActive: !promoStrip.isActive,
        order: promoStrip.order,
      };

      await updatePromoStrip(promoStrip._id, updatedFormData);
      setSuccess(`PromoStrip order #${promoStrip.order} is now ${!promoStrip.isActive ? "Active" : "Inactive"}`);
      fetchPromoStrips();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this PromoStrip?")) {
      try {
        await deletePromoStrip(id);
        setSuccess("PromoStrip deleted successfully!");
        fetchPromoStrips();
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to delete PromoStrip");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!headerCategorySlug || !heading || !saleText || !startDate || !endDate) {
      setError("Please fill in all required fields.");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be after start date.");
      return;
    }

    // Check duplicate order
    const duplicateOrder = promoStrips.some(
      (ps) => ps.order === order && ps._id !== editingId
    );
    if (duplicateOrder) {
      setError(`Display Order #${order} is already taken by another PromoStrip!`);
      return;
    }

    // Check featured products (minimum 4 for carousel)
    if (featuredProducts.length < 4) {
      setError("Please select at least 4 featured products for the CRAZY DEALS section.");
      return;
    }

    // Validate category cards
    for (const card of categoryCards) {
      const details = categoryDetailsMap[card.categoryId as string];
      if (details && details.productCount === 0) {
        setError(`Category "${card.title}" has 0 products and cannot be saved!`);
        return;
      }
    }

    const formData: PromoStripFormData = {
      headerCategorySlug,
      heading,
      saleText,
      startDate,
      endDate,
      categoryCards: categoryCards.map((c) => ({
        categoryId: c.categoryId,
        title: c.title,
        badge: c.badge,
        discountPercentage: c.discountPercentage,
        order: c.order,
      })),
      featuredProducts,
      crazyDealsTitle,
      isActive,
      order,
    };

    try {
      setLoading(true);
      if (editingId) {
        await updatePromoStrip(editingId, formData);
        setSuccess("PromoStrip updated successfully!");
      } else {
        await createPromoStrip(formData);
        setSuccess("PromoStrip created successfully!");
      }
      fetchPromoStrips();
      resetForm();
      setActiveTab("list");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save PromoStrip");
    } finally {
      setLoading(false);
    }
  };

  // Filtered PromoStrips for table list
  const filteredPromoStrips = useMemo(() => {
    return promoStrips.filter((ps) => {
      const matchesCategory =
        listFilterCategory === "all" || ps.headerCategorySlug.toLowerCase() === listFilterCategory.toLowerCase();
      const matchesSearch =
        ps.heading.toLowerCase().includes(tableSearch.toLowerCase()) ||
        ps.saleText.toLowerCase().includes(tableSearch.toLowerCase()) ||
        ps.headerCategorySlug.toLowerCase().includes(tableSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [promoStrips, listFilterCategory, tableSearch]);

  const totalPages = Math.ceil(filteredPromoStrips.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedPromoStrips = filteredPromoStrips.slice(startIndex, endIndex);

  // Live preview computations
  const previewFeaturedProduct = useMemo(() => {
    if (featuredProducts.length > 0) {
      const pId = featuredProducts[0];
      return selectedProductMap[pId] || null;
    }
    return null;
  }, [featuredProducts, selectedProductMap]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-800">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
            <span className="text-teal-600">⚡</span> Promo Strip Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure Housefull Sale banners, Crazy Deals & Top Header Category mappings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === "form") {
                resetForm();
                setActiveTab("list");
              } else {
                resetForm();
                setActiveTab("form");
              }
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
          >
            {activeTab === "list" ? (
              <>
                <span>+ Create New PromoStrip</span>
              </>
            ) : (
              <>
                <span>← Back to List View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {(success || error) && (
        <div className="px-6 pt-4">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-xs font-medium flex justify-between items-center">
              <span>✅ {success}</span>
              <button onClick={() => setSuccess("")} className="text-green-800 font-bold ml-2">×</button>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-xs font-medium flex justify-between items-center">
              <span>⚠️ {error}</span>
              <button onClick={() => setError("")} className="text-red-800 font-bold ml-2">×</button>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 p-6">
        {activeTab === "list" ? (
          /* ================= LIST VIEW ================= */
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            {/* Table Control Header */}
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search promo strips..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs w-full sm:w-60 focus:ring-1 focus:ring-teal-500 outline-none"
                />
                <select
                  value={listFilterCategory}
                  onChange={(e) => setListFilterCategory(e.target.value)}
                  className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">All Header Categories</option>
                  {headerCategories.map((hc) => (
                    <option key={hc._id} value={hc.slug}>
                      {hc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="px-2 py-1 border border-neutral-300 rounded bg-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            {loadingPromoStrips ? (
              <div className="py-16 text-center text-neutral-400 text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                Loading PromoStrips...
              </div>
            ) : displayedPromoStrips.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 text-sm">
                No PromoStrips match your filters. Click "+ Create New PromoStrip" to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-100/70 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Context</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Title & Sale Text</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Date Range</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase text-center">Featured Prods</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase text-center">Order</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase text-center">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {displayedPromoStrips.map((ps) => {
                      const isActiveDate = new Date() >= new Date(ps.startDate) && new Date() <= new Date(ps.endDate);

                      // Resolve category cards to display:
                      // 1. Use saved categoryCards titles if they exist
                      // 2. Otherwise fall back to first 4 published header categories (excluding "All")
                      const savedCards = (ps.categoryCards || []).filter((c) => c.title?.trim());
                      const dynamicCards = headerCategories
                        .filter((hc) => hc.slug?.toLowerCase() !== "all" && hc.status === "Published")
                        .slice(0, 4);

                      const displayCards: { name: string; badge?: string }[] =
                        savedCards.length > 0
                          ? savedCards.map((c) => ({ name: c.title, badge: c.badge }))
                          : dynamicCards.map((hc) => ({ name: hc.name }));

                      return (
                        <>
                          <tr key={ps._id} className="hover:bg-neutral-50/80 transition-colors">
                            <td className="px-4 py-3 text-xs font-semibold text-teal-700 capitalize">
                              <span className="bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                {ps.headerCategorySlug}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-800">
                              <div className="font-bold text-neutral-900">{ps.heading}</div>
                              <div className="text-[11px] text-neutral-500 font-mono">{ps.saleText} • {ps.crazyDealsTitle || "CRAZY DEALS"}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-600 font-mono">
                              <div>{new Date(ps.startDate).toLocaleDateString("en-GB")}</div>
                              <div className="text-[10px] text-neutral-400">to {new Date(ps.endDate).toLocaleDateString("en-GB")}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-center font-medium text-neutral-700">
                              <span className="bg-neutral-100 px-2 py-1 rounded text-neutral-800">
                                {ps.featuredProducts?.length || 0} products
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-center font-semibold text-neutral-800">
                              #{ps.order}
                            </td>
                            <td className="px-4 py-3 text-xs text-center">
                              <button
                                onClick={() => handleToggleActive(ps)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                                  ps.isActive && isActiveDate
                                    ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                                    : "bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200"
                                }`}
                                title="Click to toggle active status"
                              >
                                {ps.isActive && isActiveDate ? "● Active" : "○ Inactive"}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-xs text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(ps)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-medium transition"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(ps._id)}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded font-medium transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* Category Cards Sub-Row */}
                          {displayCards.length > 0 && (
                            <tr key={`${ps._id}-cards`} className="bg-gradient-to-r from-teal-50/60 to-neutral-50 border-b border-neutral-100">
                              <td colSpan={7} className="px-4 pb-3 pt-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mr-1">
                                    📦 Category Cards:
                                  </span>
                                  {displayCards.map((card, idx) => {
                                    const colors = [
                                      "bg-orange-100 text-orange-800 border-orange-200",
                                      "bg-blue-100 text-blue-800 border-blue-200",
                                      "bg-green-100 text-green-800 border-green-200",
                                      "bg-purple-100 text-purple-800 border-purple-200",
                                      "bg-pink-100 text-pink-800 border-pink-200",
                                      "bg-yellow-100 text-yellow-800 border-yellow-200",
                                    ];
                                    const color = colors[idx % colors.length];
                                    return (
                                      <span
                                        key={idx}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${color}`}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 inline-block"></span>
                                        {card.name}
                                        {card.badge && (
                                          <span className="ml-1 text-[9px] bg-white/70 px-1 py-0.5 rounded font-medium opacity-80">
                                            {card.badge}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })}
                                  {savedCards.length === 0 && (
                                    <span className="text-[10px] text-neutral-400 italic ml-1">(auto from header categories)</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50/50 flex justify-between items-center text-xs text-neutral-600">
              <div>
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPromoStrips.length)} of {filteredPromoStrips.length} PromoStrips
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-neutral-300 rounded disabled:opacity-40 hover:bg-white"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 border border-neutral-300 rounded disabled:opacity-40 hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= FORM & LIVE MOBILE PREVIEW VIEW ================= */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Controls (7 cols) */}
            <div className="xl:col-span-7 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="bg-teal-600 text-white px-5 py-3.5 flex justify-between items-center">
                <h2 className="text-base font-semibold">
                  {editingId ? "Edit PromoStrip & Real-Time Preview" : "Create New PromoStrip"}
                </h2>
                <span className="text-xs text-teal-100 bg-teal-700 px-2 py-0.5 rounded">
                  Live Sync Enabled
                </span>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Header Category & Order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Header Category Context <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={headerCategorySlug}
                      onChange={(e) => setHeaderCategorySlug(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                      required
                    >
                      <option value="all">All (Default Home Page)</option>
                      {headerCategories.map((hc) => (
                        <option key={hc._id} value={hc.slug}>
                          {hc.name} ({hc.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Display Order # <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={order}
                      onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-teal-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Heading & Sale Text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Heading Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={heading}
                      onChange={(e) => setHeading(e.target.value)}
                      placeholder="e.g., HOUSEFULL SALE"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Sub-heading / Sale Text <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={saleText}
                      onChange={(e) => setSaleText(e.target.value)}
                      placeholder="e.g., SALE"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Crazy Deals Featured Products Carousel */}
                <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800">
                        Crazy Deals Title & Products <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[11px] text-neutral-500">
                        Select at least 4 products for the Crazy Deals left banner box
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        featuredProducts.length >= 4 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {featuredProducts.length} / 4 minimum
                    </span>
                  </div>

                  <input
                    type="text"
                    value={crazyDealsTitle}
                    onChange={(e) => setCrazyDealsTitle(e.target.value)}
                    placeholder="Crazy Deals Section Title (e.g., CRAZY DEALS)"
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                  />

                  {/* Search Products */}
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search active products to add to Crazy Deals..."
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    />

                    {products.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 divide-y divide-neutral-100">
                        {products.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => addFeaturedProduct(p)}
                            className="p-2 hover:bg-teal-50 cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <img
                                src={p.mainImage || "/assets/placeholder.png"}
                                alt={p.productName}
                                className="w-7 h-7 object-contain rounded border border-neutral-200"
                              />
                              <span className="font-medium truncate">{p.productName}</span>
                            </div>
                            <span className="text-teal-600 font-bold shrink-0 ml-2">₹{p.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Products List */}
                  <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                    {featuredProducts.map((pId) => {
                      const p = selectedProductMap[pId];
                      return (
                        <div
                          key={pId}
                          className="flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-800 px-2 py-1 rounded-md text-xs shadow-xs"
                        >
                          {p?.mainImage && (
                            <img src={p.mainImage} alt="" className="w-5 h-5 object-contain rounded" />
                          )}
                          <span className="font-medium max-w-[120px] truncate">{p?.productName || pId}</span>
                          <button
                            type="button"
                            onClick={() => removeFeaturedProduct(pId)}
                            className="text-red-500 hover:text-red-700 font-bold ml-1"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category Cards Selection */}
                <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50 space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800">
                          Category Cards (Right Side 2x2 Grid)
                        </label>
                        <p className="text-[11px] text-neutral-500">
                          Select categories with active products. Cards automatically skip categories with 0 products.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={syncFromHeaderCategories}
                        className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 shrink-0"
                        title="Auto-fill cards from published Header Categories"
                      >
                        🔄 Sync from Header Categories
                      </button>
                    </div>

                    {/* Info: Currently showing dynamically on frontend */}
                    {categoryCards.length === 0 && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                          ⚡ Currently showing on frontend (auto from Header Categories):
                        </span>
                        {headerCategories
                          .filter((hc) => hc.slug?.toLowerCase() !== "all" && hc.status === "Published")
                          .slice(0, 4)
                          .map((hc, idx) => {
                            const chipColors = [
                              "bg-orange-100 text-orange-800 border-orange-200",
                              "bg-blue-100 text-blue-800 border-blue-200",
                              "bg-green-100 text-green-800 border-green-200",
                              "bg-purple-100 text-purple-800 border-purple-200",
                            ];
                            return (
                              <span
                                key={hc._id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${chipColors[idx]}`}
                              >
                                {hc.name}
                              </span>
                            );
                          })}
                        <span className="text-[10px] text-amber-600 italic">
                          — Click "🔄 Sync" to save these as editable cards
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Add Category Dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search active category to add card..."
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    />

                    {categorySearch.trim() && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 divide-y divide-neutral-100">
                        {filteredCategoryList.map((cat) => {
                          const details = categoryDetailsMap[cat._id] || { productCount: 0, images: [] };
                          return (
                            <div
                              key={cat._id}
                              onClick={() => {
                                addCategoryCard(cat);
                                setCategorySearch("");
                              }}
                              className={`p-2 cursor-pointer flex items-center justify-between text-xs transition ${
                                details.productCount === 0
                                  ? "bg-neutral-50 opacity-60 cursor-not-allowed"
                                  : "hover:bg-teal-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-neutral-800">{cat.name}</span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  details.productCount > 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {details.productCount} Products
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Category Cards List */}
                  <div className="space-y-2">
                    {categoryCards.map((card, idx) => {
                      const details = categoryDetailsMap[card.categoryId as string] || { productCount: 0, images: [] };
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-neutral-200 rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <input
                                type="text"
                                value={card.title}
                                onChange={(e) => updateCategoryCard(idx, "title", e.target.value)}
                                className="font-bold text-xs text-neutral-800 border border-neutral-200 rounded px-1.5 py-0.5 focus:border-teal-500 outline-none w-36"
                              />
                              <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                {details.productCount} Available Products
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={card.badge}
                                onChange={(e) => updateCategoryCard(idx, "badge", e.target.value)}
                                placeholder="Badge"
                                className="text-[10px] border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-600 w-28"
                              />
                              {/* 4 Preview thumbnails */}
                              <div className="flex gap-1 ml-auto">
                                {details.images.length > 0 ? (
                                  details.images.slice(0, 4).map((img, i) => (
                                    <img
                                      key={i}
                                      src={img}
                                      alt=""
                                      className="w-5 h-5 object-contain rounded border border-neutral-200 bg-neutral-50"
                                    />
                                  ))
                                ) : (
                                  <span className="text-[9px] text-neutral-400 italic">No thumbnails</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCategoryCard(idx)}
                            className="text-red-500 hover:text-red-700 font-bold text-sm px-1"
                            title="Remove card"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Toggle & Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    Enable PromoStrip in App
                  </label>

                  <div className="flex gap-2">
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
                    >
                      {loading ? "Saving..." : editingId ? "Update PromoStrip" : "Create PromoStrip"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column: Live Mobile Preview Panel (5 cols) */}
            <div className="xl:col-span-5 flex flex-col items-center sticky top-20">
              <div className="w-[325px] rounded-[36px] bg-emerald-500 text-white p-3 border-[6px] border-neutral-800 shadow-2xl overflow-hidden relative">
                {/* Smartphone Speaker notch */}
                <div className="w-20 h-3 bg-neutral-800 rounded-full mx-auto mb-2"></div>

                <div className="text-center font-bold text-[10px] uppercase text-emerald-100 tracking-wider mb-2">
                  Live Customer App Preview
                </div>

                {/* Mock Header Category Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-2 mb-1 scrollbar-none text-[9px] font-semibold text-white/90">
                  <div className="px-2 py-1 bg-white/30 rounded-full shrink-0">All</div>
                  <div className="px-2 py-1 bg-white/10 rounded-full shrink-0">Fast Food</div>
                  <div className="px-2 py-1 bg-white/10 rounded-full shrink-0">Restaurant</div>
                  <div className="px-2 py-1 bg-white/10 rounded-full shrink-0">Vegetable</div>
                </div>

                {/* Housefull Sale Banner Box */}
                <div className="text-center my-2">
                  <div className="text-xl font-black tracking-tight text-white drop-shadow-md">
                    ⚡ {heading || "HOUSEFULL SALE"} ⚡
                  </div>
                  <div className="text-xs font-extrabold text-amber-300 drop-shadow-xs">
                    {saleText || "SALE"}
                  </div>
                  <div className="text-[9px] font-medium text-emerald-100 mt-0.5">
                    {startDate ? new Date(startDate).toLocaleDateString("en-GB") : "TODAY"} - {endDate ? new Date(endDate).toLocaleDateString("en-GB") : "END DATE"}
                  </div>
                </div>

                {/* Main Content Layout Preview */}
                <div className="flex gap-1.5 my-2">
                  {/* Left Crazy Deals Box */}
                  <div className="w-[100px] shrink-0 bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-xl p-1.5 flex flex-col items-center justify-between text-center min-h-[140px] shadow-sm">
                    <div className="font-black text-[10px] leading-tight text-white">
                      {crazyDealsTitle || "CRAZY DEALS"}
                    </div>

                    <div className="my-1">
                      <span className="bg-neutral-700 text-white text-[7px] px-1 rounded line-through block">
                        ₹{(previewFeaturedProduct as any)?.mrp || (previewFeaturedProduct as any)?.compareAtPrice || 999}
                      </span>
                      <span className="bg-green-500 text-white text-[8px] font-bold px-1 rounded block">
                        ₹{previewFeaturedProduct?.price || 499}
                      </span>
                    </div>

                    <div className="text-[8px] font-bold truncate w-full text-white">
                      {previewFeaturedProduct?.productName || "Vegetable & Fruits"}
                    </div>

                    <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center overflow-hidden">
                      {previewFeaturedProduct?.mainImage ? (
                        <img src={previewFeaturedProduct.mainImage} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs">🍎</span>
                      )}
                    </div>
                  </div>

                  {/* Right Category Cards (2x2 Grid) */}
                  <div className="flex-1 grid grid-cols-2 gap-1">
                    {(categoryCards.length > 0 ? categoryCards.slice(0, 4) : [
                      { categoryId: "", title: "Fast Food", badge: "Up to 55% OFF" },
                      { categoryId: "", title: "Restaurant", badge: "Up to 55% OFF" },
                      { categoryId: "", title: "Stationery", badge: "Up to 55% OFF" },
                      { categoryId: "", title: "Dairy", badge: "Up to 55% OFF" }
                    ]).map((card, i) => {
                      const details = categoryDetailsMap[(card as any).categoryId as string] || { images: [] };
                      return (
                        <div
                          key={i}
                          className="bg-orange-50/95 rounded-xl p-1 text-center text-neutral-800 flex flex-col justify-between shadow-xs"
                        >
                          <div className="bg-green-600 text-white text-[7px] font-bold px-1 rounded-full w-max mx-auto">
                            {card.badge || "Up to 55% OFF"}
                          </div>

                          <div className="text-[8px] font-bold truncate px-0.5 leading-tight my-0.5">
                            {card.title || `Category ${i + 1}`}
                          </div>

                          {/* 2x2 Sub-boxes */}
                          <div className="grid grid-cols-2 gap-0.5 px-0.5 pb-0.5">
                            {[0, 1, 2, 3].map((idx) => {
                              const img = details.images[idx];
                              return (
                                <div key={idx} className="bg-white rounded aspect-square flex items-center justify-center overflow-hidden border border-black/5">
                                  {img ? (
                                    <img src={img} alt="" className="w-full h-full object-contain p-0.5" />
                                  ) : (
                                    <span className="text-[9px]">📦</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Smartphone Home Indicator bar */}
                <div className="w-24 h-1 bg-white/40 rounded-full mx-auto mt-3"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
