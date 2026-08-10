import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  getPromoStrips,
  createPromoStrip,
  updatePromoStrip,
  deletePromoStrip,
  type PromoStrip,
  type PromoStripFormData,
  type CategoryCard,
  type HousefullCategorySlot,
} from "../../../services/api/admin/adminPromoStripService";
import { getCategories, type Category } from "../../../services/api/categoryService";
import { getHeaderCategoriesAdmin, type HeaderCategory } from "../../../services/api/headerCategoryService";
import { getProducts as getAdminProducts, type Product, getCategories as getAdminCategories } from "../../../services/api/admin/adminProductService";

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
  const [secondaryBoxTitle, setSecondaryBoxTitle] = useState("RESTAURANT & FAST FOOD");
  const [secondaryFeaturedProducts, setSecondaryFeaturedProducts] = useState<string[]>([]);
  const [selectedSecondaryProductMap, setSelectedSecondaryProductMap] = useState<Record<string, Product>>({});
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
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [secondaryProductSearch, setSecondaryProductSearch] = useState("");
  const [isSecondaryProductDropdownOpen, setIsSecondaryProductDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const productSearchRef = useRef<HTMLDivElement>(null);
  const secondaryProductSearchRef = useRef<HTMLDivElement>(null);

  // Housefull Sale Category Mapping slots (4 boxes)
  const [housefullSlots, setHousefullSlots] = useState<{
    [slotIndex: number]: {
      headerCategoryId: string;
      headerCategoryName: string;
      headerCategorySlug: string;
      displayCount?: number;
      selectedProductIds?: string[];
    };
  }>({});

  // Header category details map (hcId -> { productCount: number; images: string[] })
  const [headerCatDetailsMap, setHeaderCatDetailsMap] = useState<
    Record<string, { productCount: number; images: string[] }>
  >({});

  // Category details map (id -> details)
  const [categoryDetailsMap, setCategoryDetailsMap] = useState<Record<string, { productCount: number; images: string[] }>>({}); 

  // Child categories per header category: hcId -> Category[]
  const [childCategoriesMap, setChildCategoriesMap] = useState<Record<string, any[]>>({});

  // Child category details: categoryId -> { productCount, images }
  const [childCategoryDetailsMap, setChildCategoryDetailsMap] = useState<Record<string, { productCount: number; images: string[] }>>({}); 

  // Per-slot loading state
  const [slotLoadingMap, setSlotLoadingMap] = useState<Record<number, boolean>>({});

  // Track which header category IDs have been fetched (to avoid redundant calls)
  const fetchedHeaderCatIds = useRef<Set<string>>(new Set());

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

  // Click outside to close product search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (secondaryProductSearchRef.current && !secondaryProductSearchRef.current.contains(event.target as Node)) {
        setIsSecondaryProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      const published = data.filter((hc) => hc.status === "Published" && hc.slug?.toLowerCase() !== "all");
      setHeaderCategories(published);

      // Fetch details (product count + thumbnails) for each header category
      const detailsMap: Record<string, { productCount: number; images: string[] }> = {};
      await Promise.all(
        published.map(async (hc) => {
          try {
            const res = await getAdminProducts({ headerCategoryId: hc._id, limit: 4 });
            if (res.success && Array.isArray(res.data)) {
              const imgs = res.data
                .map((p: any) => p.mainImage || p.image)
                .filter((img: string) => Boolean(img && img.trim() !== ""));
              detailsMap[hc._id] = {
                productCount: res.data.length,
                images: imgs.slice(0, 4),
              };
            }
          } catch (e) {
            detailsMap[hc._id] = { productCount: 0, images: [] };
          }
        })
      );
      setHeaderCatDetailsMap(detailsMap);
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

  /**
   * Fetch child categories belonging to a header category from the DB
   * and their product counts/images. Cached by hcId to avoid redundant calls.
   */
  const fetchChildCategoriesForHeader = useCallback(async (hcId: string) => {
    if (fetchedHeaderCatIds.current.has(hcId)) return;
    fetchedHeaderCatIds.current.add(hcId);
    try {
      const res = await getAdminCategories({ headerCategoryId: hcId, status: "Active" });
      const childCats = (res.success && Array.isArray(res.data)) ? res.data : [];

      setChildCategoriesMap(prev => ({ ...prev, [hcId]: childCats }));

      // Fetch product count + thumbnails for each child category
      const detailsMap: Record<string, { productCount: number; images: string[] }> = {};
      await Promise.all(
        childCats.map(async (cat: any) => {
          try {
            const prodRes = await getAdminProducts({ category: cat._id, limit: 4 });
            if (prodRes.success && Array.isArray(prodRes.data)) {
              const imgs = prodRes.data
                .map((p: any) => p.mainImage || p.image)
                .filter((img: string) => Boolean(img && img.trim() !== ""));
              detailsMap[cat._id] = {
                productCount: prodRes.data.length,
                images: imgs.slice(0, 4),
              };
            } else {
              detailsMap[cat._id] = { productCount: 0, images: [] };
            }
          } catch {
            detailsMap[cat._id] = { productCount: 0, images: [] };
          }
        })
      );
      setChildCategoryDetailsMap(prev => ({ ...prev, ...detailsMap }));
    } catch (err: any) {
      console.error("Failed to fetch child categories for header:", err);
    }
  }, []);

  /**
   * Fetch product details for a single category (for per-slot on-demand loading)
   */
  const fetchCategoryDetails = useCallback(async (catId: string, slotIdx: number) => {
    if (childCategoryDetailsMap[catId]) return; // already cached
    setSlotLoadingMap(prev => ({ ...prev, [slotIdx]: true }));
    try {
      const prodRes = await getAdminProducts({ category: catId, limit: 4 });
      if (prodRes.success && Array.isArray(prodRes.data)) {
        const imgs = prodRes.data
          .map((p: any) => p.mainImage || p.image)
          .filter((img: string) => Boolean(img && img.trim() !== ""));
        setChildCategoryDetailsMap(prev => ({
          ...prev,
          [catId]: { productCount: prodRes.data.length, images: imgs.slice(0, 4) },
        }));
      }
    } catch {
      setChildCategoryDetailsMap(prev => ({ ...prev, [catId]: { productCount: 0, images: [] } }));
    } finally {
      setSlotLoadingMap(prev => ({ ...prev, [slotIdx]: false }));
    }
  }, [childCategoryDetailsMap]);

  // Search products for Crazy Deals & Secondary Box
  useEffect(() => {
    const activeSearch = secondaryProductSearch || productSearch;
    if (activeSearch.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchProducts(activeSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (!productSearch && !secondaryProductSearch) {
      fetchProducts("");
    }
  }, [productSearch, secondaryProductSearch]);

  const fetchProducts = async (search: string) => {
    try {
      const response = await getAdminProducts({ search, limit: 25 });
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

  // Filtered Products for Crazy Deals & Secondary Box dropdowns
  const filteredCrazyDealsProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const query = productSearch.toLowerCase();
    return products.filter((p) =>
      (p.productName || "").toLowerCase().includes(query)
    );
  }, [products, productSearch]);

  const filteredSecondaryProducts = useMemo(() => {
    if (!secondaryProductSearch.trim()) return products;
    const query = secondaryProductSearch.toLowerCase();
    return products.filter((p) =>
      (p.productName || "").toLowerCase().includes(query)
    );
  }, [products, secondaryProductSearch]);

  // Context-Aware Category Mapping Options for Box 1-4
  const isAllContext = headerCategorySlug.toLowerCase() === "all";

  const currentHeaderCatObj = useMemo(() => {
    if (isAllContext) return null;
    return headerCategories.find((hc) => hc.slug.toLowerCase() === headerCategorySlug.toLowerCase()) || null;
  }, [headerCategories, headerCategorySlug, isAllContext]);

  // Trigger fetch of child categories whenever the selected header category changes
  useEffect(() => {
    if (!currentHeaderCatObj) return;
    fetchChildCategoriesForHeader(String(currentHeaderCatObj._id));
  }, [currentHeaderCatObj, fetchChildCategoriesForHeader]);

  // When header category changes and child categories are loaded, clear any stale slot selections
  useEffect(() => {
    if (!currentHeaderCatObj || isAllContext) return;
    const hcId = String(currentHeaderCatObj._id);
    const loadedChildren = childCategoriesMap[hcId];
    if (!loadedChildren || loadedChildren.length === 0) return;
    const validIds = new Set(loadedChildren.map((c: any) => String(c._id)));
    setHousefullSlots(prev => {
      const updated = { ...prev };
      let changed = false;
      [0, 1, 2, 3].forEach(idx => {
        const slot = updated[idx];
        if (slot && slot.headerCategoryId && !validIds.has(slot.headerCategoryId)) {
          delete updated[idx];
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [childCategoriesMap, currentHeaderCatObj, isAllContext]);

  const boxCategoryOptions = useMemo(() => {
    if (isAllContext || !currentHeaderCatObj) {
      // HeaderCategories for "all" tab — keep existing behavior
      return headerCategories
        .filter((hc) => hc.slug?.toLowerCase() !== "all" && hc.status === "Published")
        .map((hc) => ({
          _id: hc._id,
          name: hc.name,
          slug: hc.slug,
          isHeaderCategory: true,
        }));
    }

    // For a specific Header Category context: show child Categories (from Category collection)
    // that are linked to this Header Category via headerCategoryId field
    const hcId = String(currentHeaderCatObj._id);
    const loadedChildren = childCategoriesMap[hcId];

    if (loadedChildren && loadedChildren.length > 0) {
      // Return child categories fetched directly from the backend
      return loadedChildren.map((cat: any) => ({
        _id: cat._id,
        name: cat.name,
        slug: cat.slug || String(cat._id),
        isHeaderCategory: false,
      }));
    }

    // Fallback: filter from locally loaded categories while async fetch is in progress
    const headerName = (currentHeaderCatObj.name || "").toLowerCase();
    const headerSlug = (currentHeaderCatObj.slug || "").toLowerCase();
    const matchedCats = categories.filter((cat) => {
      const catHeaderId = typeof cat.headerCategoryId === "object"
        ? (cat.headerCategoryId as any)?._id
        : cat.headerCategoryId;
      if (catHeaderId && String(catHeaderId) === hcId) return true;
      const catName = (cat.name || "").toLowerCase();
      const catSlug = ((cat as any).slug || "").toLowerCase();
      return catName.includes(headerName) || headerName.includes(catName) || catSlug.includes(headerSlug);
    });
    const finalCatList = matchedCats.length >= 1 ? matchedCats : categories;
    return finalCatList.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      slug: (cat as any).slug || String(cat._id),
      isHeaderCategory: false,
    }));
  }, [headerCategories, categories, currentHeaderCatObj, childCategoriesMap, isAllContext]);

  const getBoxDetails = (id: string, isHeaderCat: boolean) => {
    if (isHeaderCat) {
      return headerCatDetailsMap[id] || { productCount: 0, images: [] };
    } else {
      // Check child category details first (fetched per header category), then fallback to general map
      return childCategoryDetailsMap[id] || categoryDetailsMap[id] || { productCount: 0, images: [] };
    }
  };

  // Featured Product selection
  const addFeaturedProduct = (product: Product) => {
    if (!featuredProducts.includes(product._id)) {
      setFeaturedProducts([...featuredProducts, product._id]);
      setSelectedProductMap((prev) => ({ ...prev, [product._id]: product }));
    }
    setProductSearch("");
    setIsProductDropdownOpen(false);
  };

  const removeFeaturedProduct = (productId: string) => {
    setFeaturedProducts(featuredProducts.filter((id) => id !== productId));
  };

  // Secondary Featured Product selection (Bottom-Left Banner Box)
  const addSecondaryFeaturedProduct = (product: Product) => {
    if (!secondaryFeaturedProducts.includes(product._id)) {
      setSecondaryFeaturedProducts([...secondaryFeaturedProducts, product._id]);
      setSelectedSecondaryProductMap((prev) => ({ ...prev, [product._id]: product }));
    }
    setSecondaryProductSearch("");
    setIsSecondaryProductDropdownOpen(false);
  };

  const removeSecondaryFeaturedProduct = (productId: string) => {
    setSecondaryFeaturedProducts(secondaryFeaturedProducts.filter((id) => id !== productId));
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
    setHeading("HOUSEFULL");
    setSaleText("SALE");
    setCrazyDealsTitle("CRAZY DEALS");
    setSecondaryBoxTitle("RESTAURANT & FAST FOOD");
    setDefaultDates();
    setCategoryCards([]);
    setHousefullSlots({});
    setFeaturedProducts([]);
    setSelectedProductMap({});
    setSecondaryFeaturedProducts([]);
    setSelectedSecondaryProductMap({});
    setIsActive(true);
    const nextOrd = Math.max(...promoStrips.map((ps) => ps.order || 0), 0) + 1;
    setOrder(nextOrd);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const handleCreateOrEditForCategory = (slug: string, name?: string) => {
    const existing = promoStrips.find(
      (ps) => ps.headerCategorySlug.toLowerCase() === slug.toLowerCase()
    );
    if (existing) {
      handleEdit(existing);
    } else {
      resetForm();
      setHeaderCategorySlug(slug);
      const cleanName = name ? name.replace(/\(.*\)/, "").trim().toUpperCase() : slug.toUpperCase();
      const suggestedHeading = slug === "all" ? "HOUSEFULL" : `${cleanName} SALE`;
      setHeading(suggestedHeading);
      setActiveTab("form");
    }
  };

  const handleEdit = (promoStrip: PromoStrip) => {
    setEditingId(promoStrip._id);
    setHeaderCategorySlug(promoStrip.headerCategorySlug);
    setHeading(promoStrip.heading);
    setSaleText(promoStrip.saleText);
    setCrazyDealsTitle(promoStrip.crazyDealsTitle || "CRAZY DEALS");
    setSecondaryBoxTitle(promoStrip.secondaryBoxTitle || "RESTAURANT & FAST FOOD");
    setStartDate(promoStrip.startDate.split("T")[0]);
    setEndDate(promoStrip.endDate.split("T")[0]);
    setIsActive(promoStrip.isActive);
    setOrder(promoStrip.order);

    // Map Housefull Category Slots (Box 1-4)
    // For "all" context: fall back to keyword-matched header categories
    // For specific header category context: only use explicitly saved slot data
    const isEditingAllContext = promoStrip.headerCategorySlug.toLowerCase() === "all";
    const targetQueries = [
      ["fast food", "fast-food"],
      ["restaurant", "restaurant-food"],
      ["vagitable", "vegetable", "fruits-veg", "fruits"],
      ["cake", "bakery", "cake-bakery"],
    ];
    const slotMap: Record<number, { headerCategoryId: string; headerCategoryName: string; headerCategorySlug: string; displayCount?: number; selectedProductIds?: string[] }> = {};
    const existingSlotMap = new Map((promoStrip.housefullCategorySlots || []).map((s) => [s.slotIndex, s]));

    [0, 1, 2, 3].forEach((slotIdx) => {
      const saved = existingSlotMap.get(slotIdx);
      if (saved && saved.headerCategoryId) {
        slotMap[slotIdx] = {
          headerCategoryId: saved.headerCategoryId,
          headerCategoryName: saved.headerCategoryName,
          headerCategorySlug: saved.headerCategorySlug,
          displayCount: saved.displayCount || 4,
          selectedProductIds: saved.selectedProductIds || [],
        };
      } else if (isEditingAllContext) {
        // For "all" context only: fall back to keyword-matched header categories
        const queries = targetQueries[slotIdx] || [];
        const defaultHc = headerCategories.find((hc) => {
          const name = (hc.name || "").toLowerCase();
          const slug = (hc.slug || "").toLowerCase();
          return queries.some((q) => name.includes(q) || slug.includes(q));
        }) || headerCategories[slotIdx];

        if (defaultHc) {
          slotMap[slotIdx] = {
            headerCategoryId: defaultHc._id,
            headerCategoryName: defaultHc.name,
            headerCategorySlug: defaultHc.slug,
            displayCount: 4,
            selectedProductIds: [],
          };
        }
      }
      // For specific header category context with no saved data: leave slot empty so admin picks a child category
    });
    setHousefullSlots(slotMap);

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

    // Map Featured Products (Crazy Deals)
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

    // Map Secondary Featured Products (Bottom Left Box)
    const secProdIds: string[] = [];
    const secProdMap: Record<string, Product> = {};
    (promoStrip.secondaryFeaturedProducts || []).forEach((p) => {
      if (typeof p === "string") {
        secProdIds.push(p);
      } else if (p && p._id) {
        secProdIds.push(p._id);
        secProdMap[p._id] = p as any;
      }
    });
    setSecondaryFeaturedProducts(secProdIds);
    setSelectedSecondaryProductMap(secProdMap);

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
        secondaryBoxTitle: promoStrip.secondaryBoxTitle,
        secondaryFeaturedProducts: (promoStrip.secondaryFeaturedProducts || []).map((p) => (typeof p === "string" ? p : p._id)),
        housefullCategorySlots: promoStrip.housefullCategorySlots,
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

    // Format housefullCategorySlots array for all 4 slots
    // For "all" context: fall back to keyword-matched header categories for empty slots
    // For specific header category context: only save explicitly selected slots
    const isAllCtx = headerCategorySlug.toLowerCase() === "all";
    const targetQueries = [
      ["fast food", "fast-food"],
      ["restaurant", "restaurant-food"],
      ["vagitable", "vegetable", "fruits-veg", "fruits"],
      ["cake", "bakery", "cake-bakery"],
    ];

    const housefullCategorySlots: HousefullCategorySlot[] = [0, 1, 2, 3]
      .map((slotIdx) => {
        const slotData = housefullSlots[slotIdx];
        if (slotData && slotData.headerCategoryId) {
          return {
            slotIndex: slotIdx,
            headerCategoryId: slotData.headerCategoryId,
            headerCategoryName: slotData.headerCategoryName,
            headerCategorySlug: slotData.headerCategorySlug,
            displayCount: slotData.displayCount || 4,
            selectedProductIds: slotData.selectedProductIds || [],
          } as HousefullCategorySlot;
        }
        // For "all" context only: assign fallback header category
        if (isAllCtx) {
          const queries = targetQueries[slotIdx] || [];
          const defaultHc = headerCategories.find((hc) => {
            const name = (hc.name || "").toLowerCase();
            const slug = (hc.slug || "").toLowerCase();
            return queries.some((q) => name.includes(q) || slug.includes(q));
          }) || headerCategories[slotIdx];
          if (defaultHc) {
            return {
              slotIndex: slotIdx,
              headerCategoryId: defaultHc._id,
              headerCategoryName: defaultHc.name,
              headerCategorySlug: defaultHc.slug,
              displayCount: 4,
              selectedProductIds: [],
            } as HousefullCategorySlot;
          }
        }
        return null;
      })
      .filter(Boolean) as HousefullCategorySlot[];

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
      secondaryBoxTitle,
      secondaryFeaturedProducts,
      housefullCategorySlots,
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

  const previewSecondaryProduct = useMemo(() => {
    if (secondaryFeaturedProducts.length > 0) {
      const pId = secondaryFeaturedProducts[0];
      return selectedSecondaryProductMap[pId] || null;
    }
    return null;
  }, [secondaryFeaturedProducts, selectedSecondaryProductMap]);

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
          <div className="space-y-6">
            {/* Header Category Sales Quick Manager */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-neutral-100">
                <div>
                  <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                    <span className="text-teal-600">🏷️</span> Manage Sales Per Header Category
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select any Header Category below to create or edit its custom Sale Banner (e.g. HOUSEFULL SALE, PINK SALE, RESTAURANT SALE)
                  </p>
                </div>
                <span className="text-xs font-semibold bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-200">
                  {headerCategories.length + 1} Total Header Categories
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {/* All Category (Default) */}
                {(() => {
                  const existing = promoStrips.find((ps) => ps.headerCategorySlug === "all");
                  return (
                    <div
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                        existing?.isActive ? "bg-emerald-50/60 border-emerald-200 shadow-2xs" : "bg-neutral-50 border-neutral-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                            <span>🏠</span> All (Default Home)
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              existing?.isActive
                                ? "bg-green-100 text-green-800"
                                : existing
                                ? "bg-gray-100 text-gray-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {existing?.isActive ? "● Active" : existing ? "○ Inactive" : "+ Not Created"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-teal-700">
                          {existing ? `${existing.heading} ${existing.saleText}` : "HOUSEFULL SALE (Default)"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCreateOrEditForCategory("all", "All (Default Home Page)")}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          existing
                            ? "bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
                            : "bg-neutral-800 hover:bg-black text-white"
                        }`}
                      >
                        {existing ? "✏️ Edit Sale" : "+ Create Sale"}
                      </button>
                    </div>
                  );
                })()}

                {/* Dynamic Header Categories */}
                {headerCategories.map((hc) => {
                  const existing = promoStrips.find(
                    (ps) => ps.headerCategorySlug.toLowerCase() === hc.slug.toLowerCase()
                  );
                  return (
                    <div
                      key={hc._id}
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                        existing?.isActive ? "bg-emerald-50/60 border-emerald-200 shadow-2xs" : "bg-neutral-50 border-neutral-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5 truncate">
                            <span>🛍️</span> {hc.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              existing?.isActive
                                ? "bg-green-100 text-green-800"
                                : existing
                                ? "bg-gray-100 text-gray-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {existing?.isActive ? "● Active" : existing ? "○ Inactive" : "+ Not Created"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-teal-700 truncate">
                          {existing ? `${existing.heading} ${existing.saleText}` : `${hc.name.toUpperCase()} SALE`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCreateOrEditForCategory(hc.slug, hc.name)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          existing
                            ? "bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
                            : "bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100"
                        }`}
                      >
                        {existing ? `✏️ Edit ${hc.name} Sale` : `+ Create ${hc.name} Sale`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

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

                      // Resolve category cards & housefull slots to display in table:
                      const savedSlots = ps.housefullCategorySlots || [];
                      const savedCards = (ps.categoryCards || []).filter((c) => c.title?.trim());
                      const dynamicCards = headerCategories
                        .filter((hc) => hc.slug?.toLowerCase() !== "all" && hc.status === "Published")
                        .slice(0, 4);

                      const displayCards: { name: string; badge?: string }[] =
                        savedSlots.length > 0
                          ? savedSlots.map((s) => ({ name: s.headerCategoryName }))
                          : savedCards.length > 0
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
                                    📦 Housefull Categories:
                                  </span>
                                  {displayCards.map((card, idx) => {
                                    const colors = [
                                      "bg-orange-100 text-orange-800 border-orange-200",
                                      "bg-blue-100 text-blue-800 border-blue-200",
                                      "bg-green-100 text-green-800 border-green-200",
                                      "bg-purple-100 text-purple-800 border-purple-200",
                                    ];
                                    const color = colors[idx % colors.length];
                                    return (
                                      <span
                                        key={idx}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${color}`}
                                      >
                                        <span className="text-[9px] font-bold opacity-60">Box {idx + 1}:</span>
                                        {card.name}
                                        {card.badge && (
                                          <span className="ml-1 text-[9px] bg-white/70 px-1 py-0.5 rounded font-medium opacity-80">
                                            {card.badge}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })}
                                  {savedSlots.length === 0 && savedCards.length === 0 && (
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
                      onChange={(e) => {
                        const newSlug = e.target.value;
                        setHeaderCategorySlug(newSlug);
                        // Clear box selections when header category changes (stale data from previous context)
                        setHousefullSlots({});
                        if (!editingId) {
                          const selectedHc = headerCategories.find((hc) => hc.slug === newSlug);
                          const cleanName = selectedHc ? selectedHc.name.toUpperCase() : newSlug.toUpperCase();
                          setHeading(newSlug === "all" ? "HOUSEFULL" : `${cleanName} SALE`);
                        }
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none font-medium"
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

                {/* Context-Aware Category Mapping (4 Fixed Right-side Boxes) */}
                <div className="border border-teal-200 rounded-xl p-4 bg-gradient-to-br from-teal-50/40 to-emerald-50/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <span>📦</span> {isAllContext ? "Housefull Sale Category Mapping (4 Right-side Boxes)" : `Category Mapping for ${currentHeaderCatObj?.name || headerCategorySlug} (4 Right-side Boxes)`}
                      </h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {isAllContext
                          ? "Select which Header Category feeds each of the 4 boxes on the Customer Home Page (All Tab)"
                          : `Select which Main Categories under ${currentHeaderCatObj?.name || headerCategorySlug} feed each of the 4 boxes (Main Categories only, no Subcategories)`}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
                      4 Boxes Configured
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {[0, 1, 2, 3].map((slotIdx) => {
                      const currentSlot = housefullSlots[slotIdx];
                      const selectedId = currentSlot?.headerCategoryId || "";
                      const isSlotLoading = slotLoadingMap[slotIdx] || false;

                      // For "all" context: use header categories (existing behavior)
                      // For specific header category context: use child categories fetched from DB
                      const activeId = selectedId;
                      const activeOption = boxCategoryOptions.find((opt) => opt._id === activeId);
                      const activeDetails = activeId
                        ? getBoxDetails(activeId, isAllContext)
                        : null;

                      // Determine max display count based on available products (capped at 4)
                      const availableProductCount = activeDetails?.productCount ?? 0;
                      const maxDisplayCount = Math.min(Math.max(availableProductCount, 1), 4);
                      const allProductOptions = [
                        { value: 1, label: "1 Product (Full Hero Card Cover - Fill Box)" },
                        { value: 2, label: "2 Products (Side-by-Side Split)" },
                        { value: 3, label: "3 Products" },
                        { value: 4, label: "4 Products (2x2 Grid)" },
                      ];
                      // Only show options up to the max available (always show at least 1 if category is selected)
                      const displayOptions = activeId
                        ? allProductOptions.filter(opt => opt.value <= maxDisplayCount)
                        : allProductOptions;

                      return (
                        <div
                          key={slotIdx}
                          className="bg-white border border-teal-100 rounded-lg p-3 shadow-2xs space-y-2 relative hover:border-teal-300 transition"
                        >
                          <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                            <span className="text-[11px] font-extrabold text-teal-700 uppercase tracking-wider flex items-center gap-1">
                              <span>Box {slotIdx + 1}</span>
                              {selectedId && (
                                <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                  Saved in DB
                                </span>
                              )}
                            </span>
                            {isSlotLoading ? (
                              <span className="text-[10px] text-teal-600 flex items-center gap-1">
                                <span className="w-2.5 h-2.5 border border-teal-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                                Loading...
                              </span>
                            ) : activeId ? (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  (activeDetails?.productCount ?? 0) > 0
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {activeDetails?.productCount ?? 0} Products Found
                              </span>
                            ) : null}
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-neutral-600 mb-1">
                              {isAllContext ? "Header Category:" : "Category (Main Only):"}
                            </label>
                            {!isAllContext && !currentHeaderCatObj ? (
                              <div className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md text-xs text-neutral-400 bg-neutral-50">
                                Select a Header Category first
                              </div>
                            ) : boxCategoryOptions.length === 0 && !isAllContext ? (
                              <div className="w-full px-2.5 py-1.5 border border-amber-200 rounded-md text-xs text-amber-700 bg-amber-50">
                                ⚠️ No categories found under this Header Category
                              </div>
                            ) : (
                              <select
                                value={activeId}
                                onChange={(e) => {
                                  const selId = e.target.value;
                                  const selObj = boxCategoryOptions.find((opt) => opt._id === selId);
                                  setHousefullSlots((prev) => ({
                                    ...prev,
                                    [slotIdx]: {
                                      headerCategoryId: selId,
                                      headerCategoryName: selObj?.name || "",
                                      headerCategorySlug: selObj?.slug || "",
                                      displayCount: prev[slotIdx]?.displayCount || 4,
                                      selectedProductIds: prev[slotIdx]?.selectedProductIds || [],
                                    },
                                  }));
                                  // Eagerly fetch details for this category if not cached
                                  if (selId && !isAllContext) {
                                    fetchCategoryDetails(selId, slotIdx);
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-xs font-semibold text-neutral-800 bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                              >
                                <option value="">{isAllContext ? "-- Select Header Category --" : "-- Select Category --"}</option>
                                {boxCategoryOptions.map((opt) => {
                                  const details = getBoxDetails(opt._id, isAllContext);
                                  const count = details?.productCount ?? 0;
                                  return (
                                    <option key={opt._id} value={opt._id}>
                                      {opt.name} — ({count} Products)
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>

                          {/* Preview Thumbnail (Always Category Image) */}
                          <div>
                            <div className="flex items-center justify-between mb-1 mt-3">
                              <span className="text-[9px] font-semibold text-neutral-500">
                                Live Box Preview (Category Image):
                              </span>
                              <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                1 Hero Cover
                              </span>
                            </div>

                            {/* Render thumbnail layout - always category image */}
                            {isSlotLoading ? (
                              <div className="w-full h-16 bg-neutral-50 rounded border border-teal-100 flex items-center justify-center">
                                <span className="text-[10px] text-neutral-400">Loading preview...</span>
                              </div>
                            ) : !activeId ? (
                              <div className="w-full h-16 bg-neutral-50 rounded border border-dashed border-neutral-200 flex items-center justify-center">
                                <span className="text-[10px] text-neutral-400">Select a category to preview</span>
                              </div>
                            ) : (() => {
                              // Always show the category's own image as preview
                              const hcId = currentHeaderCatObj ? String(currentHeaderCatObj._id) : '';
                              const childCats = childCategoriesMap[hcId] || [];
                              const matchedCat = childCats.find((c: any) => String(c._id) === activeId);
                              const catImage = matchedCat?.image || categories.find((c: any) => String(c._id) === activeId)?.image;
                              return catImage ? (
                                <div className="w-full h-20 bg-white rounded border border-teal-200 flex items-center justify-center overflow-hidden p-1 relative">
                                  <img src={catImage} alt="Category image" className="w-full h-full object-cover rounded" />
                                  <div className="absolute bottom-1 right-1 text-[8px] bg-white/90 text-teal-800 px-1 rounded-sm font-bold shadow-sm">
                                    Category Image
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-16 bg-amber-50 rounded border border-amber-200 flex items-center justify-center">
                                  <span className="text-[10px] text-amber-600">No category image found</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
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
                  <div className="relative" ref={productSearchRef}>
                    <input
                      type="text"
                      value={productSearch}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setIsProductDropdownOpen(true);
                      }}
                      placeholder="Search active products to add to Crazy Deals..."
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    />

                    {isProductDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 divide-y divide-neutral-100">
                        {filteredCrazyDealsProducts.length > 0 ? (
                          filteredCrazyDealsProducts.map((p) => (
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
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-neutral-500">
                            {productSearch ? `No active products found matching "${productSearch}"` : "No active products available"}
                          </div>
                        )}
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

                {/* Secondary Left Box (Restaurant & Fast Food Box) */}
                <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800">
                        Secondary Left Banner Box (e.g., RESTAURANT & FAST FOOD)
                      </label>
                      <p className="text-[11px] text-neutral-500">
                        Customize the title & products for the bottom-left banner box on the home page
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        secondaryFeaturedProducts.length > 0 ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {secondaryFeaturedProducts.length} Selected
                    </span>
                  </div>

                  <input
                    type="text"
                    value={secondaryBoxTitle}
                    onChange={(e) => setSecondaryBoxTitle(e.target.value)}
                    placeholder="Secondary Box Title (e.g., RESTAURANT & FAST FOOD)"
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                  />

                  {/* Search Products for Secondary Box */}
                  <div className="relative" ref={secondaryProductSearchRef}>
                    <input
                      type="text"
                      value={secondaryProductSearch}
                      onFocus={() => setIsSecondaryProductDropdownOpen(true)}
                      onChange={(e) => {
                        setSecondaryProductSearch(e.target.value);
                        setIsSecondaryProductDropdownOpen(true);
                      }}
                      placeholder="Search active products for secondary banner box..."
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                    />

                    {isSecondaryProductDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 divide-y divide-neutral-100">
                        {filteredSecondaryProducts.length > 0 ? (
                          filteredSecondaryProducts.map((p) => (
                            <div
                              key={p._id}
                              onClick={() => addSecondaryFeaturedProduct(p)}
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
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-neutral-500">
                            {secondaryProductSearch ? `No active products found matching "${secondaryProductSearch}"` : "No active products available"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Secondary Products List */}
                  <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                    {secondaryFeaturedProducts.map((pId) => {
                      const p = selectedSecondaryProductMap[pId];
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
                            onClick={() => removeSecondaryFeaturedProduct(pId)}
                            className="text-red-500 hover:text-red-700 font-bold ml-1"
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
                  {/* Left Column (Crazy Deals + Secondary Box Stacked) */}
                  <div className="w-[100px] shrink-0 flex flex-col gap-1.5">
                    {/* Top Crazy Deals Box */}
                    <div className="bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-xl p-1 flex flex-col items-center justify-between text-center min-h-[105px] shadow-sm">
                      <div className="font-black text-[9px] leading-tight text-white">
                        {crazyDealsTitle || "CRAZY DEALS"}
                      </div>

                      <div className="my-0.5">
                        <span className="bg-neutral-700 text-white text-[6px] px-1 rounded line-through block">
                          ₹{(previewFeaturedProduct as any)?.mrp || (previewFeaturedProduct as any)?.compareAtPrice || 999}
                        </span>
                        <span className="bg-green-500 text-white text-[7px] font-bold px-1 rounded block">
                          ₹{previewFeaturedProduct?.price || 499}
                        </span>
                      </div>

                      <div className="text-[7px] font-bold truncate w-full text-white">
                        {previewFeaturedProduct?.productName || "Vegetable & Fruits"}
                      </div>

                      <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center overflow-hidden">
                        {previewFeaturedProduct?.mainImage ? (
                          <img src={previewFeaturedProduct.mainImage} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs">🍎</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Secondary Banner Box */}
                    <div className="bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-xl p-1 flex flex-col items-center justify-between text-center min-h-[105px] shadow-sm">
                      <div className="font-black text-[8px] leading-tight text-white uppercase">
                        {secondaryBoxTitle || "RESTAURANT & FAST FOOD"}
                      </div>

                      <div className="my-0.5">
                        <span className="bg-neutral-700 text-white text-[6px] px-1 rounded line-through block">
                          ₹{(previewSecondaryProduct as any)?.mrp || (previewSecondaryProduct as any)?.compareAtPrice || 199}
                        </span>
                        <span className="bg-green-500 text-white text-[7px] font-bold px-1 rounded block">
                          ₹{previewSecondaryProduct?.price || 129}
                        </span>
                      </div>

                      <div className="text-[7px] font-bold truncate w-full text-white">
                        {previewSecondaryProduct?.productName || "Pasta Bowl"}
                      </div>

                      <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center overflow-hidden">
                        {previewSecondaryProduct?.mainImage ? (
                          <img src={previewSecondaryProduct.mainImage} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs">🍝</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Category Cards (2x2 Grid) */}
                  <div className="flex-1 grid grid-cols-2 gap-1">
                    {[0, 1, 2, 3].map((slotIdx) => {
                      const slotData = housefullSlots[slotIdx];
                      // For "all" context: show default header category as fallback
                      // For specific header category context: use selected child category data
                      const targetCategoryQueries = [
                        ["fast food", "fast-food"],
                        ["restaurant", "restaurant-food"],
                        ["vagitable", "vegetable", "fruits-veg", "fruits"],
                        ["cake", "bakery", "cake-bakery"],
                      ];
                      const queries = targetCategoryQueries[slotIdx] || [];
                      const defaultHc = isAllContext
                        ? (headerCategories.find((hc) => {
                            const name = (hc.name || "").toLowerCase();
                            const slug = (hc.slug || "").toLowerCase();
                            return queries.some((q) => name.includes(q) || slug.includes(q));
                          }) || headerCategories[slotIdx])
                        : null;

                      const title = slotData?.headerCategoryName || defaultHc?.name || `Box ${slotIdx + 1}`;
                      const entityId = slotData?.headerCategoryId || (isAllContext ? defaultHc?._id : "") || "";
                      // Use getBoxDetails so child category images are used for non-all context
                      const details = entityId ? getBoxDetails(entityId, isAllContext) : { images: [] };

                      return (
                        <div
                          key={slotIdx}
                          className="bg-orange-50/95 rounded-xl p-1 text-center text-neutral-800 flex flex-col justify-between shadow-xs"
                        >
                          <div className="bg-green-600 text-white text-[7px] font-bold px-1 rounded-full w-max mx-auto">
                            Up to 55% OFF
                          </div>

                          <div className="text-[8px] font-bold truncate px-0.5 leading-tight my-0.5">
                            {title}
                          </div>

                          {/* 2x2 Sub-boxes or Category Image Fallback */}
                          {details.images.length > 0 ? (
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
                          ) : (() => {
                            // Fallback: show category's own image when 0 products
                            const hcId = currentHeaderCatObj ? String(currentHeaderCatObj._id) : '';
                            const childCats = childCategoriesMap[hcId] || [];
                            const matchedCat = childCats.find((c: any) => String(c._id) === entityId);
                            const catImage = matchedCat?.image || categories.find((c: any) => String(c._id) === entityId)?.image;
                            return catImage ? (
                              <div className="px-0.5 pb-0.5">
                                <div className="bg-white rounded overflow-hidden border border-black/5">
                                  <img src={catImage} alt={title} className="w-full h-full object-cover" style={{ aspectRatio: '1' }} />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-0.5 px-0.5 pb-0.5">
                                {[0, 1, 2, 3].map((idx) => (
                                  <div key={idx} className="bg-white rounded aspect-square flex items-center justify-center overflow-hidden border border-black/5">
                                    <span className="text-[9px]">📦</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
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
