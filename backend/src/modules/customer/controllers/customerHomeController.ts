import { Request, Response } from "express";
import Product from "../../../models/Product";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import Shop from "../../../models/Shop";
import HeaderCategory from "../../../models/HeaderCategory";
import HomeSection from "../../../models/HomeSection";
import BestsellerCard from "../../../models/BestsellerCard";
import LowestPricesProduct from "../../../models/LowestPricesProduct";
import PromoStrip from "../../../models/PromoStrip";
import Banner from "../../../models/Banner";
import mongoose from "mongoose";
import { cache } from "../../../utils/cache";
import { findSellersWithinRange } from "../../../utils/locationHelper";

// Helper function to fetch data for a home section based on its configuration
async function fetchSectionData(
  section: any,
  nearbySellerIds?: mongoose.Types.ObjectId[],
): Promise<any[]> {
  try {
    const { categories, subCategories, displayType, limit } = section;

    // If displayType is "subcategories", fetch subcategories
    if (displayType === "subcategories") {
      const categoryIds = (categories || [])
        .map((cat: any) => (cat ? cat._id || cat : null))
        .filter((id: any) => id);
      const subCategoryIds = (subCategories || [])
        .map((sub: any) => (sub ? sub._id || sub : null))
        .filter((id: any) => id);

      console.log(`[fetchSectionData] Fetching subcategories for section "${section.title}"`, {
        categoryIds,
        subCategoryIds
      });

      // Query Category model instead of SubCategory, as subcategories were migrated to Category
      const query: any = { status: "Active" };

      if (categoryIds.length > 0 && subCategoryIds.length > 0) {
        query.$or = [{ parentId: { $in: categoryIds } }, { _id: { $in: subCategoryIds } }];
      } else if (categoryIds.length > 0) {
        query.parentId = { $in: categoryIds };
      } else if (subCategoryIds.length > 0) {
        query._id = { $in: subCategoryIds };
      } else {
        return [];
      }

      const subcategoryDocs = await Category.find(query)
        .select("name image order slug parentId")
        .sort({ order: 1 })
        .limit(limit || 12)
        .lean();

      console.log(`[fetchSectionData] Found ${subcategoryDocs.length} subcategories in Category model`);

      if (subcategoryDocs.length > 0) {
        return subcategoryDocs.map((sub: any) => ({
          id: sub._id.toString(),
          subcategoryId: sub._id.toString(),
          categoryId: sub.parentId?.toString() || "",
          name: sub.name,
          image: sub.image || "",
          slug: sub.slug || sub.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          type: "subcategory",
        }));
      }

      // Fallback: Try fetching from SubCategory model (legacy)
      const legacySubcategories = await SubCategory.find({
        category: { $in: categoryIds },
      })
        .select("name image order category")
        .sort({ order: 1 })
        .limit(limit || 10)
        .lean();

      return legacySubcategories.map((sub: any) => ({
        id: sub._id.toString(),
        subcategoryId: sub._id.toString(),
        categoryId: sub.category?.toString() || "",
        name: sub.name,
        image: sub.image || "",
        slug: sub.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        type: "subcategory",
      }));
    }

    // If displayType is "products", fetch products
    if (displayType === "products") {
      const query: any = {
        status: "Active",
        publish: true,
        // Exclude shop-by-store-only products from home sections
        $or: [
          { isShopByStoreOnly: { $ne: true } },
          { isShopByStoreOnly: { $exists: false } },
        ],
      };

      if (nearbySellerIds) {
        query.seller = { $in: nearbySellerIds };
      }

      if (categories && categories.length > 0) {
        const categoryIds = categories
          .map((cat: any) => (cat ? cat._id || cat : null))
          .filter((id: any) => id);

        if (categoryIds.length > 0) {
          query.category = { $in: categoryIds };
        }
      }

      if (subCategories && subCategories.length > 0) {
        const subCategoryIds = subCategories
          .map((sub: any) => (sub ? sub._id || sub : null))
          .filter((id: any) => id);

        if (subCategoryIds.length > 0) {
          query.subcategory = { $in: subCategoryIds };
        }
      }

      const products = await Product.find(query)
        .sort({ createdAt: -1 }) // Show newest items first
        .limit(limit || 8)
        .select(
          "productName mainImage price mrp discount rating reviewsCount pack seller",
        )
        .lean();

      return products.map((p: any) => {
        // Check if the product's seller is within range
        const isAvailable =
          nearbySellerIds && nearbySellerIds.length > 0 && p.seller
            ? nearbySellerIds.some(
              (id) => id.toString() === p.seller.toString(),
            )
            : false;

        return {
          id: p._id.toString(),
          productId: p._id.toString(),
          name: p.productName,
          productName: p.productName,
          image: p.mainImage,
          mainImage: p.mainImage,
          price: p.price,
          discount:
            p.discount ||
            (p.mrp && p.price
              ? Math.round(((p.mrp - p.price) / p.mrp) * 100)
              : 0),
          productImages: p.mainImage ? [p.mainImage] : [],
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          reviews: p.reviewsCount || 0,
          pack: p.pack || "",
          type: "product",
          isAvailable,
          seller: p.seller,
        };
      });
    }

    // If displayType is "categories", fetch the selected categories themselves
    if (displayType === "categories") {
      // If categories are specified, fetch those specific categories
      if (categories && categories.length > 0) {
        const categoryIds = categories.map((cat: any) => cat._id || cat);

        const fetchedCategories = await Category.find({
          _id: { $in: categoryIds },
          status: "Active",
        })
          .select("name image slug")
          .sort({ order: 1 })
          .limit(limit || 8)
          .lean();

        return fetchedCategories.map((c: any) => ({
          id: c._id.toString(),
          categoryId: c.slug || c._id.toString(), // Use slug for SEO-friendly URLs, fallback to _id
          name: c.name,
          image: c.image,
          slug: c.slug,
          type: "category",
        }));
      } else {
        // If no categories specified, return empty array
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error("Error fetching section data:", error);
    return [];
  }
}

// Get Home Page Content
export const getHomeContent = async (req: Request, res: Response) => {
  const { headerCategorySlug, latitude, longitude } = req.query; // Get header category slug and location from query params

  try {
    // Find sellers within user's location range
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    let nearbySellerIds: mongoose.Types.ObjectId[] = [];
    if (userLat !== null && userLng !== null) {
      nearbySellerIds = await findSellersWithinRange(userLat, userLng);
    } else {
      // If no location provided, return empty sellers list to enforce filtering
      nearbySellerIds = [];
    }

    // 1. Featured / Bestsellers - Get bestseller cards filtered by Customer Location & Product Availability
    let bestsellers: any[] = [];

    if (nearbySellerIds.length > 0) {
      const bestsellerCards = await BestsellerCard.find({
        isActive: true,
      })
        .populate("category", "name slug image status")
        .sort({ order: 1 })
        .limit(6)
        .lean();

      // Filter out cards whose category is missing or inactive
      const activeBestsellerCards = bestsellerCards.filter(
        (card: any) => card.category && (card.category.status === undefined || card.category.status === "Active")
      );

      // For each bestseller card, fetch location-valid products from nearby sellers
      const resolvedBestsellers = await Promise.all(
        activeBestsellerCards.map(async (card: any) => {
          const categoryId = card.category?._id || card.category;

          // Product query MUST include nearbySellerIds for current customer location
          const productQuery: any = {
            category: categoryId,
            status: "Active",
            publish: true,
            seller: { $in: nearbySellerIds },
            stock: { $gt: 0 },
            $or: [
              { isShopByStoreOnly: { $ne: true } },
              { isShopByStoreOnly: { $exists: false } },
            ],
          };

          // Fetch up to 4 active products available in this location for preview images
          const categoryProducts = await Product.find(productQuery)
            .select("productName mainImage galleryImages stock")
            .sort({ createdAt: -1 })
            .limit(4)
            .lean();

          // IF NO valid products exist for this location -> HIDE CARD COMPLETELY
          if (!categoryProducts || categoryProducts.length === 0) {
            return null;
          }

          // Count total location-valid products for this category
          const totalCount = await Product.countDocuments(productQuery);

          // Extract product images from location-valid products only
          const productImages: string[] = [];
          categoryProducts.forEach((product: any) => {
            if (productImages.length < 4 && product.mainImage) {
              productImages.push(product.mainImage);
            }
          });

          if (productImages.length < 4) {
            categoryProducts.forEach((product: any) => {
              if (
                productImages.length < 4 &&
                product.galleryImages &&
                product.galleryImages.length > 0
              ) {
                productImages.push(product.galleryImages[0]);
              }
            });
          }

          // Ensure 4 preview slots if at least one image exists
          while (productImages.length < 4 && productImages[0]) {
            productImages.push(productImages[0]);
          }

          return {
            id: card._id.toString(),
            categoryId: categoryId.toString(),
            name: card.name,
            productImages: productImages.slice(0, 4),
            productCount: totalCount,
          };
        }),
      );

      // Filter out null cards (cards with 0 location-valid products)
      bestsellers = resolvedBestsellers.filter((card) => card !== null);
    }

    // 2. Lowest Prices Products - Get admin-selected products
    // We fetch these irrespective of location radius to show preview on home page
    const lowestPricesProductsQuery: any = {
      isActive: true,
    };

    const lowestPricesProducts = await LowestPricesProduct.find(
      lowestPricesProductsQuery,
    )
      .populate({
        path: "product",
        select:
          "productName mainImage price mrp discount status publish category subcategory seller",
        match: {
          status: "Active",
          publish: true,
          // Removed location filter to show preview images irrespective of radius
        },
      })
      .sort({ order: 1 })
      .lean();

    // Filter out only null products, keep out-of-range ones
    const validLowestPricesProducts = lowestPricesProducts
      .filter((item: any) => item.product !== null)
      .map((item: any) => {
        const product = item.product;
        // Check if the product's seller is within range
        const isAvailable =
          nearbySellerIds && nearbySellerIds.length > 0 && product.seller
            ? nearbySellerIds.some(
              (id) => id.toString() === product.seller.toString(),
            )
            : false;
 
        return {
          id: product._id.toString(),
          _id: product._id.toString(),
          productName: product.productName,
          name: product.productName,
          mainImage: product.mainImage,
          imageUrl: product.mainImage,
          price: product.price,
          mrp: product.mrp || product.price,
          discount:
            product.discount ||
            (product.mrp && product.price
              ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
              : 0),
          categoryId: product.category?.toString() || "",
          subcategory: product.subcategory?.toString() || "",
          status: product.status,
          publish: product.publish,
          isAvailable,
          seller: product.seller,
        };
      });

    // 3. Categories for Tiles (Grocery, Snacks, etc)
    const categories = await Category.find({
      status: "Active",
    })
      .select("name image icon color slug")
      .sort({ order: 1 });

    // 4. Shop By Store - Fetch from database
    const shopDocuments = await Shop.find({ isActive: true })
      .populate("category", "name slug")
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // Transform shop data to match frontend expected format and include preview images
    const shops = await Promise.all(
      shopDocuments.map(async (shop: any) => {
        let productImages: string[] = [];

        if (shop.products && shop.products.length > 0) {
          const shopProducts = await Product.find({
            _id: { $in: shop.products.slice(0, 4) },
            status: "Active",
            publish: true,
          })
            .select("mainImage")
            .lean();

          productImages = shopProducts
            .map((p: any) => p.mainImage)
            .filter(Boolean);
        }

        return {
          id: shop.storeId || shop._id.toString(),
          name: shop.name,
          image: shop.image,
          productImages, // Include preview images irrespective of location
          slug: shop.storeId || shop._id.toString(),
          category: shop.category,
          productIds: shop.products?.map((p: any) => p.toString()) || [],
          bgColor: shop.bgColor || "bg-neutral-50",
        };
      }),
    );

    // 5. Trending Items (Fetch some popular categories or products)
    const trendingCategories = await Category.find({
      status: "Active",
    })
      .limit(5)
      .select("name image slug");

    const trending = trendingCategories.map((c) => ({
      id: c._id,
      name: c.name,
      image: c.image || `/assets/categories/${c.slug}.jpg`,
      type: "category",
    }));

    // 6. Personal Care Subcategories - Now handled by dynamic sections

    // 7. Cooking Ideas (Fetch some products from 'Food' or 'Grocery' categories)
    // We fetch these irrespective of location radius to show preview images
    const foodProductsQuery: any = {
      status: "Active",
      publish: true,
    };

    const foodProducts = await Product.find(foodProductsQuery)
      .limit(3)
      .select("productName mainImage");

    const cookingIdeas = foodProducts.map((p) => ({
      id: p._id,
      title: p.productName,
      image: p.mainImage,
      productId: p._id,
    }));

    // 8. Promo Cards (Dynamic - Categories with headerCategoryId)
    // Fetch root categories (parentId: null) that have a headerCategoryId assigned and are Active
    // If headerCategorySlug is provided, filter by that specific header category
    // Include their child categories (subcategories) with images

    // Build query for categories
    const categoryQuery: any = {
      headerCategoryId: { $exists: true, $ne: null },
      status: "Active",
      parentId: null, // Only root categories (not subcategories themselves)
    };

    // If headerCategorySlug is provided, find the header category and filter by it
    if (headerCategorySlug && headerCategorySlug !== "all") {
      const headerCategory = await HeaderCategory.findOne({
        slug: headerCategorySlug,
        status: "Published",
      }).lean();

      if (headerCategory) {
        categoryQuery.headerCategoryId = headerCategory._id;
      } else {
        // If header category not found, return empty promo cards for this header category
        // The query will still work but won't match any categories
        console.log(
          `Header category with slug "${headerCategorySlug}" not found`,
        );
      }
    }

    const categoriesWithHeaderCategory = await Category.find(categoryQuery)
      .populate("headerCategoryId", "name status")
      .sort({ order: 1 })
      .limit(4) // Limit to 4 promo cards
      .lean();

    const promoCards = await Promise.all(
      categoriesWithHeaderCategory.map(async (category: any) => {
        // Get child categories (subcategories) for this category
        const childCategories = await Category.find({
          parentId: category._id,
          status: "Active",
        })
          .select("name image _id")
          .sort({ order: 1 })
          .limit(4) // Limit to 4 subcategory images
          .lean();

        // Extract subcategory images
        const subcategoryImages = childCategories
          .map((child: any) => child.image)
          .filter((img: string) => img && img.trim() !== "");

        return {
          id: category._id.toString(),
          badge: "Up to 55% OFF", // Default badge, can be customized later
          title: category.name,
          categoryId: category._id.toString(),
          slug: category.slug || category._id.toString(),
          bgColor: "bg-yellow-50",
          subcategoryImages: subcategoryImages.slice(0, 4), // Max 4 images
        };
      }),
    );

    // Fallback to hardcoded cards if no categories with headerCategoryId exist
    const finalPromoCards =
      promoCards.length > 0
        ? promoCards
        : [
          {
            id: "self-care",
            badge: "Up to 55% OFF",
            title: "Self Care & Wellness",
            categoryId: "personal-care",
            bgColor: "bg-yellow-50",
            subcategoryImages: [],
          },
          {
            id: "hot-meals",
            badge: "Up to 55% OFF",
            title: "Hot Meals & Drinks",
            categoryId: "breakfast-instant",
            bgColor: "bg-yellow-50",
            subcategoryImages: [],
          },
          {
            id: "kitchen-essentials",
            badge: "Up to 55% OFF",
            title: "Kitchen Essentials",
            categoryId: "atta-rice",
            bgColor: "bg-yellow-50",
            subcategoryImages: [],
          },
          {
            id: "cleaning-home",
            badge: "Up to 75% OFF",
            title: "Cleaning & Home Needs",
            categoryId: "household",
            bgColor: "bg-yellow-50",
            subcategoryImages: [],
          },
        ];

    // 9. Dynamic Home Sections - Fetch from database
    // Filter by pageLocation: "home" if we are on the main home page
    const homeSectionQuery: any = { isActive: true };

    if (headerCategorySlug && headerCategorySlug !== "all") {
      // If we are on a header category page, find the header category ID
      const headerCategory = await HeaderCategory.findOne({
        slug: headerCategorySlug,
        status: "Published",
      }).lean();

      if (headerCategory) {
        homeSectionQuery.pageLocation = "header_category";
        homeSectionQuery.headerCategoryId = headerCategory._id;
      } else {
        // Fallback to home page sections if header category not found
        homeSectionQuery.pageLocation = "home";
      }
    } else {
      homeSectionQuery.pageLocation = "home";
    }

    const homeSections = await HomeSection.find(homeSectionQuery)
      .populate("categories", "name slug image")
      .populate("subCategories", "name")
      .populate("headerCategoryId", "name")
      .sort({ order: 1 })
      .lean();

    // Fetch data for each section
    const dynamicSections = await Promise.all(
      homeSections.map(async (section: any) => {
        const sectionData = await fetchSectionData(section, nearbySellerIds);
        return {
          id: section._id.toString(),
          title: section.title,
          slug: section.slug,
          displayType: section.displayType,
          columns: section.columns,
          data: sectionData,
        };
      }),
    );

    // 10. Fetch PromoStrip for the current header category (location-aware caching)
    const currentHeaderCategorySlug = (headerCategorySlug as string) || "all";
    const locationCacheKey = nearbySellerIds && nearbySellerIds.length > 0
      ? nearbySellerIds.map((id) => id.toString()).sort().join(",")
      : "all-locs";
    const promoStripCacheKey = `promoStrip-${currentHeaderCategorySlug.toLowerCase()}-${locationCacheKey}`;

    // Try to get from cache first
    let promoStrip = cache.get(promoStripCacheKey) as any;

    if (!promoStrip) {
      const now = new Date();
      let promoStripDoc = await PromoStrip.findOne({
        headerCategorySlug: currentHeaderCategorySlug.toLowerCase(),
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .populate("categoryCards.categoryId", "name slug image")
        .populate(
          "featuredProducts",
          "productName mainImage mainImageUrl galleryImageUrls galleryImages price mrp compareAtPrice discount rating reviewsCount seller",
        )
        .populate(
          "secondaryFeaturedProducts",
          "productName mainImage mainImageUrl galleryImageUrls galleryImages price mrp compareAtPrice discount rating reviewsCount seller",
        )
        .sort({ order: 1 })
        .lean();

      // If no active PromoStrip document in DB, build dynamic fallback promoStrip object
      if (!promoStripDoc) {
        promoStripDoc = {
          _id: "dynamic-promostrip",
          headerCategorySlug: currentHeaderCategorySlug.toLowerCase(),
          heading: "HOUSEFULL",
          saleText: "SALE",
          startDate: now,
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          categoryCards: [],
          featuredProducts: [],
          crazyDealsTitle: "CRAZY DEALS",
          isActive: true,
          order: 1,
        } as any;
      }

      promoStrip = promoStripDoc;

      // If we have promoStrip, add availability flag to featured products
      if (promoStrip && (promoStrip as any).featuredProducts) {
        (promoStrip as any).featuredProducts = (
          promoStrip as any
        ).featuredProducts.map((p: any) => {
          const isAvailable =
            nearbySellerIds && nearbySellerIds.length > 0 && p.seller
              ? nearbySellerIds.some(
                (id) => id.toString() === p.seller.toString(),
              )
              : false;
          return { ...p, isAvailable };
        });
      }

      // Populate categoryCards for the 4 Housefull Sale right-side boxes:
      // Priority 1: Use explicitly saved housefullCategorySlots from DB if available
      // Priority 2: Fall back to dynamic matching of target Header Categories (Fast Food, Restaurant, Vegetable, Cake & Bakery)
      if (promoStrip) {
        let selectedHeaderCats: any[] = [];

        if (
          promoStrip.housefullCategorySlots &&
          Array.isArray(promoStrip.housefullCategorySlots) &&
          promoStrip.housefullCategorySlots.length > 0
        ) {
          // Sort slots by slotIndex 0-3
          const sortedSlots = [...promoStrip.housefullCategorySlots].sort(
            (a: any, b: any) => (a.slotIndex || 0) - (b.slotIndex || 0)
          );

          // Fetch full HeaderCategory & Category objects for the saved slot IDs
          const slotIds = sortedSlots.map((s: any) => s.headerCategoryId);
          const headerCatDocs = await HeaderCategory.find({ _id: { $in: slotIds } }).lean();
          const categoryDocs = await Category.find({ _id: { $in: slotIds } }).lean();

          const docMap = new Map<string, any>();
          headerCatDocs.forEach((hc: any) => docMap.set(hc._id.toString(), { ...hc, isHeaderCat: true }));
          categoryDocs.forEach((c: any) => docMap.set(c._id.toString(), { ...c, isHeaderCat: false }));

          for (const slot of sortedSlots) {
            const doc = docMap.get(slot.headerCategoryId?.toString());
            if (doc) {
              selectedHeaderCats.push({
                ...doc,
                displayCount: slot.displayCount || 4,
                selectedProductIds: slot.selectedProductIds || [],
              });
            } else if (slot.headerCategoryName) {
              selectedHeaderCats.push({
                _id: slot.headerCategoryId,
                name: slot.headerCategoryName,
                slug: slot.headerCategorySlug || "all",
                isHeaderCat: false,
                displayCount: slot.displayCount || 4,
                selectedProductIds: slot.selectedProductIds || [],
              });
            }
          }
        }

        // Fallback to dynamic matching if no saved slots exist or fewer than 4
        if (selectedHeaderCats.length < 4) {
          const targetCategoryQueries = [
            ["fast food", "fast-food"],
            ["restaurant", "restaurant-food"],
            ["vagitable", "vegetable", "fruits-veg"],
            ["cake", "bakery", "cake-bakery"],
          ];

          // Fetch all Published Header Categories
          const allHeaderCats = await HeaderCategory.find({
            status: "Published",
            slug: { $ne: "all" },
          })
            .sort({ order: 1 })
            .lean();

          for (const queries of targetCategoryQueries) {
            const found = allHeaderCats.find((hc: any) =>
              queries.some(
                (q) =>
                  (hc.slug || "").toLowerCase().includes(q) ||
                  (hc.name || "").toLowerCase().includes(q)
              )
            );
            if (found && !selectedHeaderCats.some((sc) => sc._id.toString() === found._id.toString())) {
              selectedHeaderCats.push({ ...found, isHeaderCat: true, displayCount: 4 });
            }
          }

          // Fill remaining slots up to 4 if any target category wasn't found by keyword match
          for (const hc of allHeaderCats) {
            if (selectedHeaderCats.length >= 4) break;
            if (!selectedHeaderCats.some((sc) => sc._id.toString() === hc._id.toString())) {
              selectedHeaderCats.push({ ...hc, isHeaderCat: true, displayCount: 4 });
            }
          }
        }

        // Build cards for selected header/main categories
        const validCategoryCards = await Promise.all(
          selectedHeaderCats.slice(0, 4).map(async (item: any, idx: number) => {
            const reqCount = item.displayCount || 4;
            let categoryProducts: any[] = [];

            if (item.selectedProductIds && item.selectedProductIds.length > 0) {
              // Fetch specifically selected products first
              const specificProducts = await Product.find({
                _id: { $in: item.selectedProductIds },
                status: "Active",
                publish: true,
              })
                .select("mainImage productName price mrp")
                .lean();

              categoryProducts = specificProducts;
            }

            if (categoryProducts.length < reqCount) {
              let additionalProducts: any[] = [];
              const excludeIds = categoryProducts.map((p: any) => p._id);

              if (item.isHeaderCat !== false) {
                // Header Category Logic
                const linkedCats = await Category.find({
                  $or: [
                    { headerCategoryId: item._id },
                    { slug: item.slug },
                    { name: { $regex: new RegExp(item.name, "i") } },
                  ],
                })
                  .select("_id image")
                  .lean();

                const linkedCatIds = linkedCats.map((c: any) => c._id);

                additionalProducts = await Product.find({
                  _id: { $nin: excludeIds },
                  $or: [
                    { headerCategoryId: item._id },
                    { category: { $in: [item._id, ...linkedCatIds] } },
                  ],
                  status: "Active",
                  publish: true,
                  mainImage: { $exists: true, $ne: "" },
                })
                  .select("mainImage productName price mrp")
                  .sort({ createdAt: -1 })
                  .limit(reqCount - categoryProducts.length)
                  .lean();
              } else {
                // Main Category Logic
                additionalProducts = await Product.find({
                  _id: { $nin: excludeIds },
                  category: item._id,
                  status: "Active",
                  publish: true,
                  mainImage: { $exists: true, $ne: "" },
                })
                  .select("mainImage productName price mrp")
                  .sort({ createdAt: -1 })
                  .limit(reqCount - categoryProducts.length)
                  .lean();
              }

              categoryProducts = [...categoryProducts, ...additionalProducts];
            }

            let images = categoryProducts
              .map((p: any) => p.mainImage)
              .filter((img: string) => Boolean(img && img.trim() !== ""));

            // If fewer than reqCount product images, fetch category/subcategory images
            if (images.length < reqCount) {
              const subcatDocs = await Category.find({
                parentId: item._id,
                image: { $exists: true, $ne: "" },
              })
                .select("image")
                .limit(reqCount - images.length)
                .lean();

              const subcatImgs = subcatDocs
                .map((s: any) => s.image)
                .filter((img: string) => Boolean(img && img.trim() !== ""));

              images = [...images, ...subcatImgs];
            }

            // If still fewer than reqCount, pad available images
            if (images.length > 0) {
              while (images.length < reqCount) {
                images.push(images[images.length % images.length]);
              }
            }

            // Fallback: If NO product/subcategory images at all, use the category's own image
            // This ensures the frontend always has something to display instead of empty boxes
            if (images.length === 0 && item.image && item.image.trim() !== "") {
              images = [item.image];
            }

            return {
              _id: item._id.toString(),
              id: item._id.toString(),
              categoryId: {
                _id: item._id.toString(),
                name: item.name,
                slug: item.slug,
                image: item.image || "",
              },
              title: item.name,
              badge: "Up to 55% OFF",
              discountPercentage: 55,
              order: idx,
              slug: item.slug,
              productCount: categoryProducts.length,
              displayCount: reqCount,
              subcategoryImages: images.slice(0, reqCount),
              products: categoryProducts.slice(0, reqCount),
            };
          })
        );

        (promoStrip as any).categoryCards = validCategoryCards;
      }

      // Cache for 1 minute for faster response
      if (promoStrip) {
        cache.set(promoStripCacheKey, promoStrip, 60 * 1000);
      }
    }

    // Fetch banners from database
    const banners = await Banner.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        bestsellers,
        lowestPrices: validLowestPricesProducts, // Admin-selected products for LowestPricesEver section
        categories,
        // Dynamic sections created by admin
        homeSections: dynamicSections,
        shops,
        promoBanners:
          banners.length > 0
            ? banners
            : [
              {
                id: 1,
                image:
                  "https://img.freepik.com/free-vector/horizontal-banner-template-grocery-sales_23-2149432421.jpg",
                link: "/category/grocery",
              },
              {
                id: 2,
                image:
                  "https://img.freepik.com/free-vector/flat-supermarket-social-media-cover-template_23-2149363385.jpg",
                link: "/category/snacks",
              },
            ],
        trending,
        cookingIdeas,
        promoCards: finalPromoCards, // Return dynamic or fallback cards
        promoStrip: promoStrip || null, // PromoStrip data for the current header category
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching home content",
      error: error.message,
    });
  }
};

// Check if user's location is within any seller's service radius
export const checkServiceArea = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.query;
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    if (
      userLat == null ||
      userLng == null ||
      isNaN(userLat) ||
      isNaN(userLng) ||
      userLat < -90 ||
      userLat > 90 ||
      userLng < -180 ||
      userLng > 180
    ) {
      return res.status(200).json({
        success: true,
        hasSellersInRange: false,
      });
    }

    const nearbySellerIds = await findSellersWithinRange(userLat, userLng);
    return res.status(200).json({
      success: true,
      hasSellersInRange: nearbySellerIds.length > 0,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error checking service area",
      error: error.message,
    });
  }
};

// Get Products for a specific "Store" (Campaign/Collection)
// Fetch products based on store configuration from database
export const getStoreProducts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { latitude, longitude } = req.query; // User location for filtering
    let query: any = {
      status: "Active",
      publish: true,
    };

    console.log(`[getStoreProducts] Looking for shop with storeId: ${storeId}`);

    // Build shop query - only include _id if storeId is a valid ObjectId
    const shopQuery: any = { isActive: true };
    if (mongoose.Types.ObjectId.isValid(storeId)) {
      shopQuery.$or = [
        { storeId: storeId.toLowerCase() },
        { _id: new mongoose.Types.ObjectId(storeId) },
      ];
    } else {
      shopQuery.storeId = storeId.toLowerCase();
    }

    // Find the shop by storeId or _id
    const shop = await Shop.findOne(shopQuery)
      .populate("category", "_id name slug image")
      .populate("subCategory", "_id name")
      .lean();

    console.log(
      `[getStoreProducts] Shop found:`,
      shop
        ? {
          name: shop.name,
          productsCount: shop.products?.length || 0,
          category: shop.category,
          image: shop.image,
        }
        : "NOT FOUND",
    );

    let shopData: any = null;

    if (shop) {
      shopData = {
        name: shop.name,
        image: shop.image,
        description: shop.description || "",
        category: shop.category,
      };

      // Convert products array to ObjectIds if needed
      // When using .lean(), products array contains ObjectIds directly
      let productIds: mongoose.Types.ObjectId[] = [];
      if (shop.products && shop.products.length > 0) {
        productIds = shop.products
          .map((p: any) => {
            // Handle different formats: ObjectId, string, or object with _id
            if (mongoose.Types.ObjectId.isValid(p)) {
              return typeof p === "string" ? new mongoose.Types.ObjectId(p) : p;
            }
            return p._id
              ? typeof p._id === "string"
                ? new mongoose.Types.ObjectId(p._id)
                : p._id
              : p;
          })
          .filter(Boolean);
      }

      console.log(
        `[getStoreProducts] Shop has ${productIds.length} products assigned`,
      );

      const shopId = (shop as any)._id;

      // Build conditions for finding products for this shop
      const orConditions: any[] = [];

      // 1. Products assigned to this shop by seller
      orConditions.push({ shopId: shopId });

      // 2. Products explicitly assigned by admin
      if (productIds.length > 0) {
        orConditions.push({ _id: { $in: productIds } });
      }

      // 3. Products matching shop's category/subcategory
      if (shop.category) {
        const categoryId = (shop.category as any)._id || (shop.category as any);
        if (shop.subCategory) {
          const subCategoryId = (shop.subCategory as any)._id || (shop.subCategory as any);
          orConditions.push({ category: categoryId, subcategory: subCategoryId });
        } else {
          orConditions.push({ category: categoryId });
        }
      }

      // Combine conditions
      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    } else {
      // Fallback: try to match by category name (legacy support)
      const categoryId = await getCategoryIdByName(storeId);
      if (categoryId) {
        query.category = categoryId;
        // Try to get category details for shop data
        const category = await Category.findById(categoryId)
          .select("name slug image")
          .lean();
        if (category) {
          shopData = {
            name: category.name,
            image: category.image || "",
            description: "",
            category: category,
          };
        }
      } else {
        // No matching shop or category found
        return res.status(200).json({
          success: true,
          data: [],
          shop: null,
          message: "Store not found",
        });
      }
    }

    // Location: mark products as available or "Coming Soon" based on seller radius
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    console.log(
      `[getStoreProducts] User location: lat=${userLat}, lng=${userLng}`,
    );

    let nearbySellerIds: mongoose.Types.ObjectId[] = [];
    if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng)) {
      nearbySellerIds = await findSellersWithinRange(userLat, userLng);
      console.log(
        `[getStoreProducts] Found ${nearbySellerIds.length} sellers within range`,
      );
    }
    
    // Always filter by nearby sellers. If no location, this will be an empty array.
    query.seller = { $in: nearbySellerIds };

    console.log(
      `[getStoreProducts] Final query:`,
      JSON.stringify(query, null, 2),
    );

    const products = await Product.find(query)
      .populate("category", "name icon image")
      .populate("subcategory", "name")
      .populate("brand", "name")
      .populate("seller", "storeName")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean({ virtuals: true });

    const total = await Product.countDocuments(query);

    const sellerIdFrom = (p: any) =>
      p.seller?._id?.toString() ?? p.seller?.toString() ?? "";

    console.log(
      `[getStoreProducts] Found ${total} products matching query, returning ${products.length}`,
    );

    return res.status(200).json({
      success: true,
      data: products.map((p: any) => ({
        ...p,
        isAvailable: nearbySellerIds.some(
          (id) => id.toString() === sellerIdFrom(p)
        ),
      })),
      shop: shopData,
      pagination: {
        page: 1,
        limit: 50,
        total,
        pages: Math.ceil(total / 50),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error fetching store products",
      error: error.message,
    });
  }
};

// Helper
async function getCategoryIdByName(name: string) {
  const cat = await Category.findOne({
    name: { $regex: new RegExp(name, "i") },
  });
  return cat ? cat._id : null;
}
