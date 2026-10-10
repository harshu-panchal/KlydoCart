/**
 * Export Cloudinary resource metadata and download originals into
 * frontend/assets/cloudinary/, preserving public_id folder structure.
 *
 * Usage (from backend/):
 *   npx tsx src/scripts/downloadCloudinaryAssets.ts
 */
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { URL } from "url";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const ROOT = path.resolve(__dirname, "../../../frontend/assets/cloudinary");
const META_DIR = path.join(ROOT, "_metadata");
const CONCURRENCY = 6;
const MAX_RETRIES = 4;

type CloudResource = {
  asset_id?: string;
  public_id: string;
  format?: string;
  version?: number;
  resource_type: string;
  type?: string;
  created_at?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  asset_folder?: string;
  folder?: string;
  display_name?: string;
  url?: string;
  secure_url?: string;
  tags?: string[];
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function localPathFor(resource: CloudResource): string {
  const format = resource.format ? `.${resource.format}` : "";
  // public_id may already include nested folders; never put files under _metadata
  const relative = `${resource.public_id}${format}`.replace(/\\/g, "/");
  return path.join(ROOT, ...relative.split("/"));
}

function downloadUrlFor(resource: CloudResource): string {
  if (resource.secure_url) return resource.secure_url;
  if (resource.url) return resource.url.replace(/^http:/, "https:");
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const version = resource.version ? `v${resource.version}/` : "";
  const format = resource.format ? `.${resource.format}` : "";
  return `https://res.cloudinary.com/${cloud}/${resource.resource_type}/upload/${version}${resource.public_id}${format}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadFile(url: string, dest: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const tmp = `${dest}.partial`;
    const file = fs.createWriteStream(tmp);
    const parsed = new URL(url);
    const lib = parsed.protocol === "http:" ? http : https;

    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "KlydoCart-Cloudinary-Export/1.0",
          Accept: "*/*",
        },
        timeout: 120_000,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          fs.unlink(tmp, () => undefined);
          downloadFile(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (!res.statusCode || res.statusCode >= 400) {
          file.close();
          fs.unlink(tmp, () => undefined);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            try {
              fs.renameSync(tmp, dest);
              const size = fs.statSync(dest).size;
              resolve(size);
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Timeout downloading ${url}`));
    });
    req.on("error", (err) => {
      file.close();
      fs.unlink(tmp, () => undefined);
      reject(err);
    });
  });
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = attempt * 1500;
      console.warn(
        `  retry ${attempt}/${MAX_RETRIES} ${label}: ${(err as Error).message}`
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function fetchAllResources(resourceType: "image" | "video" | "raw") {
  const all: CloudResource[] = [];
  let nextCursor: string | undefined;
  do {
    const page = await withRetry(
      () =>
        cloudinary.api.resources({
          type: "upload",
          resource_type: resourceType,
          max_results: 500,
          next_cursor: nextCursor,
          context: true,
          tags: true,
          metadata: true,
        }) as Promise<{
          resources: CloudResource[];
          next_cursor?: string;
        }>,
      `list ${resourceType}`
    );
    all.push(...page.resources);
    nextCursor = page.next_cursor;
    console.log(`  listed ${resourceType}: ${all.length}`);
  } while (nextCursor);
  return all;
}

async function fetchFolderTree(startPath = "") {
  const folders: Array<{ name: string; path: string; external_id?: string }> =
    [];

  async function walk(current: string) {
    const result = current
      ? await cloudinary.api.sub_folders(current)
      : await cloudinary.api.root_folders();
    for (const folder of result.folders || []) {
      folders.push(folder);
      await walk(folder.path);
    }
  }

  await walk(startPath);
  return folders;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run())
  );
  return results;
}

async function main() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary credentials missing in backend/.env");
  }

  ensureDir(META_DIR);
  console.log(`Output directory: ${ROOT}`);

  console.log("\n1) Fetching folder tree metadata...");
  const folders = await fetchFolderTree();
  fs.writeFileSync(
    path.join(META_DIR, "folders.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), folders }, null, 2)
  );
  console.log(`   folders: ${folders.length}`);

  console.log("\n2) Fetching resource metadata...");
  const images = await fetchAllResources("image");
  const videos = await fetchAllResources("video");
  const raw = await fetchAllResources("raw");
  const resources = [...images, ...videos, ...raw];

  const usage = await cloudinary.api.usage().catch(() => null);

  const metadataPayload = {
    exportedAt: new Date().toISOString(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    counts: {
      image: images.length,
      video: videos.length,
      raw: raw.length,
      total: resources.length,
    },
    usage,
    resources,
  };

  fs.writeFileSync(
    path.join(META_DIR, "resources.json"),
    JSON.stringify(metadataPayload, null, 2)
  );

  // Compact mapping for later local URL rewrites
  const mapping = resources.map((r) => {
    const localRel = path
      .relative(path.join(ROOT, ".."), localPathFor(r))
      .split(path.sep)
      .join("/");
    return {
      asset_id: r.asset_id,
      public_id: r.public_id,
      resource_type: r.resource_type,
      format: r.format,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
      created_at: r.created_at,
      asset_folder: r.asset_folder || r.folder,
      tags: r.tags || [],
      secure_url: r.secure_url,
      local_path: `/assets/${localRel}`,
      local_file: localPathFor(r),
    };
  });

  fs.writeFileSync(
    path.join(META_DIR, "url-mapping.json"),
    JSON.stringify(
      { exportedAt: new Date().toISOString(), items: mapping },
      null,
      2
    )
  );
  console.log(`   resources metadata saved: ${resources.length}`);

  console.log("\n3) Downloading originals...");
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Array<{ public_id: string; error: string }> = [];

  await mapPool(resources, CONCURRENCY, async (resource, index) => {
    const dest = localPathFor(resource);
    const label = `[${index + 1}/${resources.length}] ${resource.public_id}`;

    try {
      if (fs.existsSync(dest)) {
        const size = fs.statSync(dest).size;
        if (resource.bytes && size === resource.bytes) {
          skipped++;
          if ((index + 1) % 50 === 0 || index === 0) {
            console.log(`  skip (exists) ${label}`);
          }
          return;
        }
      }

      const url = downloadUrlFor(resource);
      const size = await withRetry(
        () => downloadFile(url, dest),
        resource.public_id
      );

      if (resource.bytes && size !== resource.bytes) {
        // Keep file but flag mismatch — sometimes CDN reports differ slightly for derived; originals should match
        throw new Error(
          `size mismatch: expected ${resource.bytes}, got ${size}`
        );
      }

      downloaded++;
      if (downloaded % 25 === 0 || index === 0) {
        console.log(`  saved ${label} (${size} bytes)`);
      }
    } catch (err) {
      failed++;
      failures.push({
        public_id: resource.public_id,
        error: (err as Error).message,
      });
      console.error(`  FAIL ${label}: ${(err as Error).message}`);
    }
  });

  const report = {
    exportedAt: new Date().toISOString(),
    outputDir: ROOT,
    counts: metadataPayload.counts,
    downloaded,
    skipped,
    failed,
    failures,
  };

  fs.writeFileSync(
    path.join(META_DIR, "download-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log("\nDone.");
  console.log(`  downloaded: ${downloaded}`);
  console.log(`  skipped:    ${skipped}`);
  console.log(`  failed:     ${failed}`);
  console.log(`  metadata:   ${META_DIR}`);

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
