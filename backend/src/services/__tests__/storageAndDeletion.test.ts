/**
 * Storage / validation / deletion safety tests.
 * Run: npx tsx --test src/services/__tests__/storageAndDeletion.test.ts
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import sharp from "sharp";

// Force isolated storage root before modules read env
const TEST_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "klydo-storage-"));
process.env.STORAGE_ROOT = TEST_ROOT;
process.env.PUBLIC_IMAGE_BASE_URL = "http://localhost:5000/images";

import {
  detectFileKind,
  validateImageSignature,
  validateDocumentSignature,
} from "../../utils/fileSignature";
import { processImageBuffer } from "../../utils/imageProcessor";
import {
  saveImageFromBuffer,
  saveDocumentFromBuffer,
  resolveStoragePath,
  publicUrlForKey,
  extractStorageKeyFromUrlOrId,
  deleteStoredFile,
  StorageError,
} from "../storageService";
import { safeDeleteImage } from "../imageDeletion";
import { mapFolderToCategory } from "../../config/storage";

async function makeJpeg(width = 200, height = 100): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 120, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();
}

async function makePng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 80,
      height: 80,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

describe("file signature validation", () => {
  it("detects jpeg/png/webp/pdf magic bytes", async () => {
    const jpeg = await makeJpeg();
    const png = await makePng();
    const webp = await sharp(jpeg).webp().toBuffer();
    const pdf = Buffer.from("%PDF-1.4 mock");

    assert.equal(detectFileKind(jpeg), "jpeg");
    assert.equal(detectFileKind(png), "png");
    assert.equal(detectFileKind(webp), "webp");
    assert.equal(detectFileKind(pdf), "pdf");
    assert.equal(detectFileKind(Buffer.from("not-a-file")), "unknown");
  });

  it("rejects MIME mismatch and unsupported image signatures", async () => {
    const jpeg = await makeJpeg();
    const bad = validateImageSignature(jpeg, "image/png");
    assert.equal(bad.ok, false);

    const good = validateImageSignature(jpeg, "image/jpeg");
    assert.equal(good.ok, true);

    const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    assert.equal(validateImageSignature(gifHeader).ok, false);
  });

  it("accepts PDF documents by signature", () => {
    const pdf = Buffer.from("%PDF-1.7\n%âãÏÓ\n");
    const result = validateDocumentSignature(pdf, "application/pdf");
    assert.equal(result.ok, true);
    assert.equal(result.kind, "pdf");
  });
});

describe("folder → category mapping", () => {
  it("maps Cloudinary-style folders to KlydoCart categories", () => {
    assert.equal(mapFolderToCategory("klydocart/products/gallery"), "products");
    assert.equal(mapFolderToCategory("klydocart/banners"), "banners");
    assert.equal(mapFolderToCategory("klydocart/categories"), "categories");
    assert.equal(mapFolderToCategory("klydocart/delivery/documents"), "delivery");
    assert.equal(mapFolderToCategory("klydocart/sellers/documents"), "sellers");
    assert.equal(mapFolderToCategory("klydocart/stores"), "stores");
    assert.equal(mapFolderToCategory("return-pickups"), "returns");
  });
});

describe("URL generation and path safety", () => {
  it("builds public URLs and extracts storage keys", () => {
    const key = "products/2026/10/abc.webp";
    assert.equal(
      publicUrlForKey(key),
      "http://localhost:5000/images/products/2026/10/abc.webp"
    );
    assert.equal(
      extractStorageKeyFromUrlOrId(publicUrlForKey(key)),
      key
    );
    assert.equal(extractStorageKeyFromUrlOrId(key), key);
  });

  it("rejects path traversal", () => {
    const isStorageErr = (err: unknown) => err instanceof StorageError;
    assert.throws(() => resolveStoragePath("../etc/passwd"), isStorageErr);
    assert.throws(
      () => resolveStoragePath("products/../../secret"),
      isStorageErr
    );
    assert.throws(() => resolveStoragePath("/absolute/path"), isStorageErr);
    assert.throws(() => resolveStoragePath("C:/Windows/System32"), isStorageErr);
  });
});

describe("image upload processing", () => {
  it("converts uploads to webp and returns UploadResult shape", async () => {
    const jpeg = await makeJpeg(640, 480);
    const result = await saveImageFromBuffer(jpeg, {
      folder: "klydocart/products",
      mimeType: "image/jpeg",
    });

    assert.equal(result.format, "webp");
    assert.ok(result.secureUrl.startsWith("http://localhost:5000/images/products/"));
    assert.equal(result.url, result.secureUrl);
    assert.ok(result.publicId.startsWith("products/"));
    assert.ok(result.publicId.endsWith(".webp"));
    assert.ok((result.width || 0) <= 1600);
    assert.ok((result.height || 0) <= 1600);
    assert.ok(fs.existsSync(resolveStoragePath(result.publicId)));
  });

  it("does not upscale small images beyond source size", async () => {
    const tiny = await makeJpeg(40, 30);
    const processed = await processImageBuffer(tiny, "banners");
    assert.ok(processed.width <= 40);
    assert.ok(processed.height <= 30);
  });

  it("rejects oversized image buffers (>5MB)", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 0xff);
    // Pretend jpeg header so signature might fail first — either way must reject
    big[0] = 0xff;
    big[1] = 0xd8;
    big[2] = 0xff;
    await assert.rejects(
      () => saveImageFromBuffer(big, { mimeType: "image/jpeg" }),
      (err: any) => err instanceof StorageError
    );
  });

  it("stores PDF documents under documents/sellers mapping without webp", async () => {
    const pdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.alloc(100, 0x20),
    ]);
    const result = await saveDocumentFromBuffer(pdf, {
      folder: "klydocart/sellers/documents",
      mimeType: "application/pdf",
    });
    assert.equal(result.format, "pdf");
    assert.ok(result.publicId.includes("sellers/") || result.publicId.includes("documents/"));
    assert.ok(result.publicId.endsWith(".pdf"));
  });
});

describe("deletion safety", () => {
  it("deletes VPS files and ignores Cloudinary IDs", async () => {
    const jpeg = await makeJpeg();
    const uploaded = await saveImageFromBuffer(jpeg, {
      folder: "klydocart/banners",
      mimeType: "image/jpeg",
    });

    const removed = await deleteStoredFile(uploaded.publicId);
    assert.equal(removed, true);
    assert.equal(fs.existsSync(resolveStoragePath(uploaded.publicId)), false);

    const cloudinarySkip = await safeDeleteImage(
      "klydocart/products/abc123"
    );
    assert.equal(cloudinarySkip.skipped, true);
    assert.equal(cloudinarySkip.deleted, false);
  });

  it("blocks deletion outside storage root", async () => {
    await assert.rejects(
      () => safeDeleteImage("products/../../etc/passwd"),
      StorageError
    );
  });
});

after(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});

before(() => {
  assert.ok(TEST_ROOT.includes("klydo-storage-"));
});
