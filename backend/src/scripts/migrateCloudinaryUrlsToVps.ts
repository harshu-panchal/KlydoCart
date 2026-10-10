/**
 * Migrate Cloudinary image URLs in MongoDB to VPS storage URLs.
 *
 * Defaults to DRY-RUN.
 * Execute requires BOTH:
 *   --execute
 *   ALLOW_IMAGE_URL_MIGRATION=true
 *
 * Does NOT re-download from Cloudinary.
 * Does NOT delete files under CLOUDINARY_IMPORT_DIR.
 *
 * Usage:
 *   npx tsx src/scripts/migrateCloudinaryUrlsToVps.ts
 *   ALLOW_IMAGE_URL_MIGRATION=true npx tsx src/scripts/migrateCloudinaryUrlsToVps.ts --execute
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { mapFolderToCategory, storageConfig } from "../config/storage";

dotenv.config();

const REPO_ROOT = path.resolve(__dirname, "../../..");
const IMPORT_ROOT = path.resolve(
  process.env.CLOUDINARY_IMPORT_DIR ||
    path.join(REPO_ROOT, "frontend/assets/cloudinary")
);
const MAPPING_PATH = path.join(IMPORT_ROOT, "_metadata/url-mapping.json");
const REPORT_DIR = path.join(IMPORT_ROOT, "_metadata/migration-reports");
const MANIFEST_PATH = path.join(REPORT_DIR, "execute-manifest.json");

type MappingItem = {
  asset_id?: string;
  public_id: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  created_at?: string;
  secure_url?: string;
  local_path?: string;
  local_file?: string;
};

type ManifestEntry = {
  oldUrl: string;
  newUrl: string;
  storageKey: string;
  sourceFile: string;
  collection?: string;
  field?: string;
};

type WorkRow = {
  collection: string;
  field: string;
  docId: string;
  oldUrl: string;
  matched: boolean;
  localExists: boolean;
  category?: string;
  sourceFile?: string;
  storageKey?: string;
  newUrl?: string;
  skipReason?: string;
  updated?: boolean;
};

function parseArgs(argv: string[]) {
  const execute = argv.includes("--execute");
  const batchArg = argv.find((a) => a.startsWith("--batch="));
  const batch = batchArg ? Number(batchArg.split("=")[1]) : 200;
  return { execute, batch: Number.isFinite(batch) && batch > 0 ? batch : 200 };
}

function loadMapping(): Map<string, MappingItem> {
  if (!fs.existsSync(MAPPING_PATH)) {
    throw new Error(`Mapping file not found: ${MAPPING_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(MAPPING_PATH, "utf8"));
  const items: MappingItem[] = raw.items || [];
  const map = new Map<string, MappingItem>();
  for (const item of items) {
    if (item.secure_url) map.set(item.secure_url, item);
    if (item.secure_url?.startsWith("https://")) {
      map.set(item.secure_url.replace("https://", "http://"), item);
    }
  }
  return map;
}

function loadManifest(): Map<string, ManifestEntry> {
  const map = new Map<string, ManifestEntry>();
  if (!fs.existsSync(MANIFEST_PATH)) return map;
  const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  for (const entry of raw.entries || []) {
    if (entry?.oldUrl && entry?.newUrl) map.set(entry.oldUrl, entry);
  }
  return map;
}

function resolveSourceFile(item: MappingItem): string | null {
  if (item.local_file && fs.existsSync(item.local_file)) return item.local_file;

  if (item.local_path) {
    const rel = item.local_path
      .replace(/\\/g, "/")
      .replace(/^\/?assets\/cloudinary\//, "");
    const underImport = path.join(IMPORT_ROOT, rel);
    if (fs.existsSync(underImport)) return underImport;

    const underRepo = path.join(
      REPO_ROOT,
      "frontend",
      item.local_path.replace(/^\//, "")
    );
    if (fs.existsSync(underRepo)) return underRepo;
  }

  if (item.public_id && item.format) {
    const p = path.join(IMPORT_ROOT, `${item.public_id}.${item.format}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function yearMonthFromItem(item: MappingItem): { year: string; month: string } {
  if (item.created_at) {
    const d = new Date(item.created_at);
    if (!Number.isNaN(d.getTime())) {
      return {
        year: String(d.getUTCFullYear()),
        month: String(d.getUTCMonth() + 1).padStart(2, "0"),
      };
    }
  }
  const now = new Date();
  return {
    year: String(now.getUTCFullYear()),
    month: String(now.getUTCMonth() + 1).padStart(2, "0"),
  };
}

function stableId(item: MappingItem): string {
  if (item.asset_id) return item.asset_id;
  return crypto
    .createHash("sha1")
    .update(item.public_id || item.secure_url || "")
    .digest("hex")
    .slice(0, 32);
}

function buildStorageKey(item: MappingItem, sourceFile: string): string {
  const category = mapFolderToCategory(
    item.public_id.split("/").slice(0, -1).join("/")
  );
  const { year, month } = yearMonthFromItem(item);
  const ext =
    (item.format || path.extname(sourceFile).replace(/^\./, "") || "bin")
      .toLowerCase()
      .replace(/jpeg/, "jpg");
  return path.posix.join(category, year, month, `${stableId(item)}.${ext}`);
}

function publicUrlForKey(storageKey: string): string {
  return `${storageConfig.publicBaseUrl}/${storageKey}`;
}

function copyFileNoOverwrite(source: string, destAbs: string): void {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  if (fs.existsSync(destAbs)) {
    const srcSize = fs.statSync(source).size;
    const dstSize = fs.statSync(destAbs).size;
    if (srcSize === dstSize) return;
    throw new Error(`Destination exists with different size: ${destAbs}`);
  }
  fs.copyFileSync(source, destAbs);
}

const FIELD_SPECS: Array<{ collection: string; fields: string[] }> = [
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

function isCloudinaryUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.includes("res.cloudinary.com") || value.includes("cloudinary.com"))
  );
}

async function updateDocField(
  col: any,
  docId: any,
  field: string,
  oldUrl: string,
  newUrl: string
): Promise<boolean> {
  const doc = await col.findOne(
    { _id: docId },
    { projection: { [field]: 1 } }
  );
  if (!doc) return false;
  const value = doc[field];

  if (typeof value === "string") {
    if (value !== oldUrl) return false;
    const res = await col.updateOne(
      { _id: docId, [field]: oldUrl },
      { $set: { [field]: newUrl } }
    );
    return res.modifiedCount > 0;
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      if (v === oldUrl) {
        changed = true;
        return newUrl;
      }
      return v;
    });
    if (!changed) return false;
    const res = await col.updateOne(
      { _id: docId },
      { $set: { [field]: next } }
    );
    return res.modifiedCount > 0;
  }

  return false;
}

async function main() {
  const { execute, batch } = parseArgs(process.argv.slice(2));
  const allowExecute =
    execute && process.env.ALLOW_IMAGE_URL_MIGRATION === "true";

  if (execute && !allowExecute) {
    console.error(
      "\nRefusing --execute without ALLOW_IMAGE_URL_MIGRATION=true\n"
    );
    process.exit(2);
  }

  console.log(
    allowExecute
      ? "Mode: EXECUTE (will copy files + update MongoDB)"
      : "Mode: DRY-RUN (no MongoDB writes, no file copies)"
  );
  console.log(`Batch hint: ${batch}`);
  console.log(`Import root: ${IMPORT_ROOT}`);
  console.log(`Mapping: ${MAPPING_PATH}`);
  console.log(`STORAGE_ROOT: ${storageConfig.root}`);
  console.log(`PUBLIC_IMAGE_BASE_URL: ${storageConfig.publicBaseUrl}`);

  const mapping = loadMapping();
  const manifest = loadManifest();
  console.log(`Loaded ${mapping.size} Cloudinary URL mappings`);
  console.log(`Existing manifest entries: ${manifest.size}`);

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no db handle");

  const rows: WorkRow[] = [];
  let cloudinaryFieldValues = 0;
  let matched = 0;
  let unmatched = 0;
  let missingLocal = 0;
  let copied = 0;
  let updated = 0;
  let skippedAlreadyVps = 0;

  for (const spec of FIELD_SPECS) {
    const col = db.collection(spec.collection);
    for (const field of spec.fields) {
      const cursor = col.find(
        { [field]: { $regex: "cloudinary\\.com" } },
        { projection: { [field]: 1 } }
      );

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) break;
        const value = (doc as any)[field];
        const values: string[] = Array.isArray(value)
          ? value.filter(isCloudinaryUrl)
          : isCloudinaryUrl(value)
            ? [value]
            : [];

        for (const oldUrl of values) {
          cloudinaryFieldValues++;

          if (oldUrl.startsWith(storageConfig.publicBaseUrl + "/")) {
            skippedAlreadyVps++;
            continue;
          }

          const item = mapping.get(oldUrl);
          if (!item) {
            unmatched++;
            rows.push({
              collection: spec.collection,
              field,
              docId: String(doc._id),
              oldUrl,
              matched: false,
              localExists: false,
              skipReason: "No entry in url-mapping.json (will not guess)",
            });
            continue;
          }

          const sourceFile = resolveSourceFile(item);
          if (!sourceFile) {
            missingLocal++;
            rows.push({
              collection: spec.collection,
              field,
              docId: String(doc._id),
              oldUrl,
              matched: true,
              localExists: false,
              skipReason: "Mapped but local downloaded file missing",
            });
            continue;
          }

          matched++;
          const existing = manifest.get(oldUrl);
          const storageKey =
            existing?.storageKey || buildStorageKey(item, sourceFile);
          const newUrl = existing?.newUrl || publicUrlForKey(storageKey);

          const row: WorkRow = {
            collection: spec.collection,
            field,
            docId: String(doc._id),
            oldUrl,
            matched: true,
            localExists: true,
            category: storageKey.split("/")[0],
            sourceFile,
            storageKey,
            newUrl,
          };

          if (allowExecute) {
            const destAbs = path.join(
              storageConfig.root,
              ...storageKey.split("/")
            );
            copyFileNoOverwrite(sourceFile, destAbs);
            if (!existing) {
              copied++;
              manifest.set(oldUrl, {
                oldUrl,
                newUrl,
                storageKey,
                sourceFile,
                collection: spec.collection,
                field,
              });
            }

            const didUpdate = await updateDocField(
              col,
              doc._id,
              field,
              oldUrl,
              newUrl
            );
            row.updated = didUpdate;
            if (didUpdate) updated++;
          }

          rows.push(row);
        }
      }
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(
    REPORT_DIR,
    `${allowExecute ? "execute" : "dry-run"}-${stamp}.json`
  );

  if (allowExecute) {
    const entries = [...manifest.values()];
    fs.writeFileSync(
      MANIFEST_PATH,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          publicBaseUrl: storageConfig.publicBaseUrl,
          storageRoot: storageConfig.root,
          entries,
        },
        null,
        2
      )
    );
  }

  const summary = {
    mode: allowExecute ? "execute" : "dry-run",
    exportedAt: new Date().toISOString(),
    mappingEntries: mapping.size,
    cloudinaryFieldValues,
    matchedWithLocalFile: matched,
    unmatchedInMapping: unmatched,
    mappedButMissingLocal: missingLocal,
    skippedAlreadyVps,
    filesCopied: allowExecute ? copied : 0,
    mongoFieldsUpdated: allowExecute ? updated : 0,
    note: allowExecute
      ? "MongoDB URLs updated for matched local files. Import originals preserved. Unmatched Cloudinary URLs left unchanged."
      : "No MongoDB documents were modified.",
    manifestPath: allowExecute ? MANIFEST_PATH : undefined,
    sample: rows.filter((r) => r.matched && r.localExists).slice(0, 30),
    allRowsPath: reportPath,
  };

  fs.writeFileSync(reportPath, JSON.stringify({ summary, rows }, null, 2));
  console.log("\nSummary:");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nFull report: ${reportPath}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
