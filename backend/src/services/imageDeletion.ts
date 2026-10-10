import mongoose from "mongoose";
import {
  deleteStoredFile,
  extractStorageKeyFromUrlOrId,
  publicUrlForKey,
  resolveStoragePath,
} from "./storageService";
import { StorageError } from "./storageService";

export type ImageReferenceHit = {
  collection: string;
  field: string;
  count: number;
};

export type SafeDeleteResult = {
  deleted: boolean;
  skipped: boolean;
  reason?: string;
  storageKey?: string;
  references?: ImageReferenceHit[];
};

type FieldSpec = {
  collection: string;
  fields: string[];
};

/**
 * Collections / fields that may store image URLs or storage keys.
 */
const IMAGE_FIELD_SPECS: FieldSpec[] = [
  { collection: "products", fields: ["mainImage", "galleryImages"] },
  { collection: "categories", fields: ["image"] },
  { collection: "subcategories", fields: ["image"] },
  { collection: "headercategories", fields: ["image"] },
  { collection: "banners", fields: ["image"] },
  { collection: "brands", fields: ["image"] },
  { collection: "shops", fields: ["image"] },
  {
    collection: "sellers",
    fields: ["logo", "storeBanner", "profile", "idProof", "addressProof"],
  },
  {
    collection: "deliveries",
    fields: [
      "profilePic",
      "drivingLicense",
      "nationalIdentityCard",
      "marksheet",
      "signature",
    ],
  },
  {
    collection: "returns",
    fields: ["images", "pickupImages", "dropoffImages"],
  },
  { collection: "reviews", fields: ["images"] },
  { collection: "orderitems", fields: ["productImage"] },
  { collection: "appsettings", fields: ["appLogo", "appFavicon"] },
  { collection: "paymentmethods", fields: ["icon"] },
];

function buildMatchValues(storageKey: string, publicUrl: string): string[] {
  const values = new Set<string>([
    storageKey,
    publicUrl,
    `/images/${storageKey}`,
  ]);
  return [...values];
}

/**
 * Count how many DB documents reference this image (URL or storage key).
 * Safe when Mongo is disconnected: returns empty and lets caller decide.
 */
export async function findImageReferences(
  storageKey: string
): Promise<ImageReferenceHit[]> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return [];
  }

  const publicUrl = publicUrlForKey(storageKey);
  const values = buildMatchValues(storageKey, publicUrl);
  const hits: ImageReferenceHit[] = [];

  for (const spec of IMAGE_FIELD_SPECS) {
    for (const field of spec.fields) {
      // Works for both string fields and arrays-of-strings
      const filter = { [field]: { $in: values } };

      try {
        const count = await mongoose.connection.db
          .collection(spec.collection)
          .countDocuments(filter);
        if (count > 0) {
          hits.push({
            collection: spec.collection,
            field,
            count,
          });
        }
      } catch (err) {
        console.error(
          `[imageDeletion] reference check failed for ${spec.collection}.${field}:`,
          (err as Error).message
        );
      }
    }
  }

  return hits;
}

/**
 * Delete an application-owned image only when:
 * - path resolves inside STORAGE_ROOT
 * - fewer than 2 DB references (shared images are kept)
 *
 * `allowOrphanDelete` skips the reference gate when the caller already
 * removed the last DB pointer and wants filesystem cleanup.
 */
export async function safeDeleteImage(
  urlOrPublicId: string,
  options: { allowOrphanDelete?: boolean; ignoreMissingDb?: boolean } = {}
): Promise<SafeDeleteResult> {
  const storageKey = extractStorageKeyFromUrlOrId(urlOrPublicId);
  if (!storageKey) {
    // Legacy Cloudinary public IDs / URLs are not local storage keys.
    return {
      deleted: false,
      skipped: true,
      reason:
        "Not a VPS storage key/URL; Cloudinary assets are left untouched",
    };
  }

  // Path validation (throws StorageError on traversal)
  resolveStoragePath(storageKey);

  const references = await findImageReferences(storageKey);
  const totalRefs = references.reduce((sum, r) => sum + r.count, 0);

  if (!options.allowOrphanDelete && totalRefs > 1) {
    return {
      deleted: false,
      skipped: true,
      reason: "Image is referenced by multiple database records",
      storageKey,
      references,
    };
  }

  if (
    !options.allowOrphanDelete &&
    !options.ignoreMissingDb &&
    mongoose.connection.readyState === 1 &&
    totalRefs === 0
  ) {
    // Still allow delete of unused uploads (temp files) — totalRefs === 0 is OK.
  }

  try {
    const removed = await deleteStoredFile(storageKey);
    return {
      deleted: removed,
      skipped: !removed,
      reason: removed ? undefined : "File already missing",
      storageKey,
      references,
    };
  } catch (err) {
    if (err instanceof StorageError) throw err;
    console.error("[imageDeletion] delete failed:", (err as Error).message);
    throw new StorageError(
      `Image deletion failed: ${(err as Error).message}`,
      500
    );
  }
}

/**
 * After a successful image replacement: delete the previous file only if
 * it is a VPS path and not shared with other records.
 */
export async function deleteReplacedImage(
  previousUrl: string | undefined | null
): Promise<SafeDeleteResult | null> {
  if (!previousUrl) return null;
  return safeDeleteImage(previousUrl, { allowOrphanDelete: false });
}
