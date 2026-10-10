import path from "path";
import dotenv from "dotenv";

dotenv.config();

/**
 * Storage categories for KlydoCart VPS image layout.
 * Production root should be outside the app deploy directory (e.g. /var/storage).
 */
export const STORAGE_CATEGORIES = [
  "products",
  "categories",
  "sellers",
  "delivery",
  "banners",
  "stores",
  "returns",
  "users",
  "documents",
] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];

export type ImageDimensionConfig = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
};

/** Resize ceilings per category — never upscale. */
export const CATEGORY_DIMENSIONS: Record<StorageCategory, ImageDimensionConfig> =
  {
    products: { maxWidth: 1600, maxHeight: 1600, quality: 82 },
    categories: { maxWidth: 800, maxHeight: 800, quality: 80 },
    sellers: { maxWidth: 1200, maxHeight: 1200, quality: 82 },
    delivery: { maxWidth: 1600, maxHeight: 1600, quality: 85 },
    banners: { maxWidth: 1920, maxHeight: 1080, quality: 82 },
    stores: { maxWidth: 1200, maxHeight: 1200, quality: 82 },
    returns: { maxWidth: 1600, maxHeight: 1600, quality: 80 },
    users: { maxWidth: 512, maxHeight: 512, quality: 80 },
    documents: { maxWidth: 2000, maxHeight: 2000, quality: 85 },
  };

const MAX_IMAGE_PIXELS = 40_000_000; // decompression bomb guard
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function defaultStorageRoot(): string {
  // Local/dev default stays outside dist/ and persists across restarts.
  // Production MUST set STORAGE_ROOT=/var/storage (or similar).
  return path.resolve(process.cwd(), ".storage");
}

function defaultPublicBaseUrl(): string {
  const port = process.env.PORT || "5000";
  return `http://localhost:${port}/images`;
}

/**
 * Lazy config so tests can set STORAGE_ROOT / PUBLIC_IMAGE_BASE_URL
 * before first access (import hoisting would otherwise freeze defaults).
 */
export const storageConfig = {
  get root(): string {
    return path.resolve(process.env.STORAGE_ROOT || defaultStorageRoot());
  },
  get publicBaseUrl(): string {
    return (
      process.env.PUBLIC_IMAGE_BASE_URL || defaultPublicBaseUrl()
    ).replace(/\/$/, "");
  },
  maxImageBytes: MAX_IMAGE_BYTES,
  maxDocumentBytes: MAX_DOCUMENT_BYTES,
  maxImagePixels: MAX_IMAGE_PIXELS,
  allowedImageMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
  allowedDocumentMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
  ] as const,
};

/**
 * Map legacy Cloudinary / frontend folder strings to storage categories.
 */
export function mapFolderToCategory(folder?: string): StorageCategory {
  const f = (folder || "").toLowerCase().replace(/\\/g, "/");

  if (!f) return "products";
  if (f.includes("banner")) return "banners";
  if (f.includes("return")) return "returns";
  if (
    f.includes("deliver") ||
    f.includes("nationalidentity") ||
    f.includes("drivinglicense") ||
    f.includes("marksheet") ||
    f.includes("signature") ||
    f.includes("profilepic")
  ) {
    return "delivery";
  }
  if (
    f.includes("seller") ||
    f.includes("logo") ||
    f.includes("storebanner") ||
    f.includes("idproof") ||
    f.includes("addressproof")
  ) {
    return "sellers";
  }
  if (f.includes("store") || f.includes("shop")) return "stores";
  if (
    f.includes("categor") ||
    f.includes("subcategor") ||
    f.includes("brand") ||
    f.includes("header")
  ) {
    return "categories";
  }
  if (f.includes("user") || f.includes("favicon") || f.includes("applogo")) {
    return "users";
  }
  if (
    f.includes("document") ||
    f.includes("coupon") ||
    f.endsWith("/raw") ||
    f.includes("pdf")
  ) {
    return "documents";
  }
  if (f.includes("product") || f.includes("gallery")) return "products";

  return "products";
}

export function isStorageCategory(value: string): value is StorageCategory {
  return (STORAGE_CATEGORIES as readonly string[]).includes(value);
}

export function buildYearMonthSegments(date = new Date()): {
  year: string;
  month: string;
} {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return { year, month };
}
