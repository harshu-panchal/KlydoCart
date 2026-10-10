/**
 * Migrate Cloudinary image URLs in MongoDB to VPS storage URLs.
 *
 * SAFETY (Phase A–B):
 * - Defaults to DRY-RUN only.
 * - Does NOT download from Cloudinary.
 * - Does NOT delete downloaded source files under frontend/assets/cloudinary.
 * - Does NOT modify MongoDB unless BOTH --execute AND ALLOW_IMAGE_URL_MIGRATION=true
 *   are set. Until product approval, --execute is refused.
 *
 * Usage (from backend/):
 *   npx tsx src/scripts/migrateCloudinaryUrlsToVps.ts
 *   npx tsx src/scripts/migrateCloudinaryUrlsToVps.ts --batch=100
 *
 * Mapping source:
 *   frontend/assets/cloudinary/_metadata/url-mapping.json
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { mapFolderToCategory } from "../config/storage";

dotenv.config();

const REPO_ROOT = path.resolve(__dirname, "../../..");
const MAPPING_PATH = path.join(
  REPO_ROOT,
  "frontend/assets/cloudinary/_metadata/url-mapping.json"
);
const REPORT_DIR = path.join(
  REPO_ROOT,
  "frontend/assets/cloudinary/_metadata/migration-reports"
);

type MappingItem = {
  asset_id?: string;
  public_id: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  secure_url?: string;
  local_path?: string;
  local_file?: string;
};

type DryRunRow = {
  collection: string;
  field: string;
  oldUrl: string;
  matched: boolean;
  localExists: boolean;
  category?: string;
  proposedPublicId?: string;
  skipReason?: string;
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

function localFileExists(item: MappingItem): boolean {
  if (item.local_file && fs.existsSync(item.local_file)) return true;
  if (item.local_path) {
    const candidate = path.join(
      REPO_ROOT,
      "frontend",
      item.local_path.replace(/^\//, "")
    );
    if (fs.existsSync(candidate)) return true;
  }
  // fallback: public_id under assets/cloudinary
  if (item.public_id && item.format) {
    const p = path.join(
      REPO_ROOT,
      "frontend/assets/cloudinary",
      `${item.public_id}.${item.format}`
    );
    if (fs.existsSync(p)) return true;
  }
  return false;
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

async function main() {
  const { execute, batch } = parseArgs(process.argv.slice(2));

  if (execute) {
    console.error(
      "\nRefusing --execute: MongoDB URL migration is locked until explicit approval.\n" +
        "Re-run without --execute for dry-run only.\n"
    );
    process.exit(2);
  }

  if (process.env.ALLOW_IMAGE_URL_MIGRATION === "true") {
    console.warn(
      "ALLOW_IMAGE_URL_MIGRATION is set, but execute mode remains locked in this build."
    );
  }

  console.log("Mode: DRY-RUN (no MongoDB writes, no file moves)");
  console.log(`Batch hint: ${batch}`);
  console.log(`Mapping: ${MAPPING_PATH}`);

  const mapping = loadMapping();
  console.log(`Loaded ${mapping.size} Cloudinary URL mappings`);

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required to inspect collections");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no db handle");

  const rows: DryRunRow[] = [];
  let cloudinaryFieldValues = 0;
  let matched = 0;
  let unmatched = 0;
  let missingLocal = 0;

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
          const item = mapping.get(oldUrl);
          if (!item) {
            unmatched++;
            rows.push({
              collection: spec.collection,
              field,
              oldUrl,
              matched: false,
              localExists: false,
              skipReason: "No entry in url-mapping.json (will not guess)",
            });
            continue;
          }

          const exists = localFileExists(item);
          if (!exists) {
            missingLocal++;
            rows.push({
              collection: spec.collection,
              field,
              oldUrl,
              matched: true,
              localExists: false,
              skipReason: "Mapped but local downloaded file missing",
            });
            continue;
          }

          matched++;
          const category = mapFolderToCategory(
            item.public_id.split("/").slice(0, -1).join("/")
          );
          rows.push({
            collection: spec.collection,
            field,
            oldUrl,
            matched: true,
            localExists: true,
            category,
            proposedPublicId: `${category}/YYYY/MM/<uuid>.${item.format || "webp"}`,
          });
        }
      }
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(REPORT_DIR, `dry-run-${stamp}.json`);
  const summary = {
    mode: "dry-run",
    exportedAt: new Date().toISOString(),
    mappingEntries: mapping.size,
    cloudinaryFieldValues,
    matchedWithLocalFile: matched,
    unmatchedInMapping: unmatched,
    mappedButMissingLocal: missingLocal,
    note:
      "No MongoDB documents were modified. Execute mode is locked until approval.",
    sample: rows.slice(0, 50),
    allRowsPath: reportPath,
  };

  fs.writeFileSync(reportPath, JSON.stringify({ summary, rows }, null, 2));
  console.log("\nDry-run summary:");
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
