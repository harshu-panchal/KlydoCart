import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  StorageCategory,
  buildYearMonthSegments,
  isStorageCategory,
  mapFolderToCategory,
  storageConfig,
} from "../config/storage";
import {
  validateDocumentSignature,
  validateImageSignature,
} from "../utils/fileSignature";
import {
  ImageProcessingError,
  processImageBuffer,
} from "../utils/imageProcessor";

/** Mirrors cloudinaryService.UploadResult for frontend compatibility. */
export type UploadResult = {
  url: string;
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
};

export type SaveImageOptions = {
  folder?: string;
  category?: StorageCategory;
  originalName?: string;
  mimeType?: string;
};

export type SaveDocumentOptions = SaveImageOptions & {
  resourceType?: "image" | "raw" | "auto";
};

export class StorageError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "StorageError";
    this.statusCode = statusCode;
  }
}

function ensureStorageRootExists(): void {
  if (!fsSync.existsSync(storageConfig.root)) {
    fsSync.mkdirSync(storageConfig.root, { recursive: true, mode: 0o755 });
  }
}

/**
 * Resolve a relative storage key to an absolute path under STORAGE_ROOT.
 * Rejects path traversal and absolute paths.
 */
export function resolveStoragePath(relativeKey: string): string {
  if (!relativeKey || typeof relativeKey !== "string") {
    throw new StorageError("Storage key is required", 400);
  }

  const raw = relativeKey.replace(/\\/g, "/");
  // Reject traversal / absolute keys before any stripping
  if (
    raw.includes("\0") ||
    raw.includes("..") ||
    raw.startsWith("/") ||
    raw.startsWith("~") ||
    /^[a-zA-Z]:/.test(raw) ||
    path.isAbsolute(relativeKey)
  ) {
    throw new StorageError("Invalid storage path", 400);
  }

  const normalized = raw.replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((p) => p === "" || p === ".")) {
    throw new StorageError("Invalid storage path", 400);
  }

  const absolute = path.resolve(storageConfig.root, ...normalized.split("/"));
  const rootWithSep = storageConfig.root.endsWith(path.sep)
    ? storageConfig.root
    : storageConfig.root + path.sep;

  if (absolute !== storageConfig.root && !absolute.startsWith(rootWithSep)) {
    throw new StorageError("Path escapes storage root", 400);
  }

  return absolute;
}

export function publicUrlForKey(relativeKey: string): string {
  const key = relativeKey.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${storageConfig.publicBaseUrl}/${key}`;
}

/**
 * Extract relative storage key from a public URL or raw publicId.
 */
export function extractStorageKeyFromUrlOrId(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  // Already a relative key: products/2026/10/uuid.webp
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("data:") &&
    isStorageCategory(trimmed.split("/")[0] || "")
  ) {
    return trimmed.replace(/^\/+/, "");
  }

  const base = storageConfig.publicBaseUrl;
  if (trimmed.startsWith(base + "/")) {
    return trimmed.slice(base.length + 1).split("?")[0];
  }

  // /images/products/...
  const imagesIdx = trimmed.indexOf("/images/");
  if (imagesIdx >= 0) {
    return trimmed.slice(imagesIdx + "/images/".length).split("?")[0];
  }

  return null;
}

async function writeFileAtomically(
  absolutePath: string,
  data: Buffer
): Promise<void> {
  const dir = path.dirname(absolutePath);
  await fs.mkdir(dir, { recursive: true, mode: 0o755 });
  const tmp = `${absolutePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmp, data, { mode: 0o644 });
    await fs.rename(tmp, absolutePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

function buildRelativeKey(
  category: StorageCategory,
  extension: string,
  date = new Date()
): string {
  const { year, month } = buildYearMonthSegments(date);
  const filename = `${randomUUID()}.${extension.replace(/^\./, "")}`;
  return path.posix.join(category, year, month, filename);
}

/**
 * Save and process an image upload (JPG/PNG/WebP → WebP).
 */
export async function saveImageFromBuffer(
  buffer: Buffer,
  options: SaveImageOptions = {}
): Promise<UploadResult> {
  ensureStorageRootExists();

  if (!buffer?.length) {
    throw new StorageError("Empty file buffer", 400);
  }
  if (buffer.length > storageConfig.maxImageBytes) {
    throw new StorageError("File size exceeds the 5 MB image limit", 400);
  }

  const signature = validateImageSignature(buffer, options.mimeType);
  if (!signature.ok) {
    throw new StorageError(signature.reason || "Invalid image file", 400);
  }

  const category =
    options.category || mapFolderToCategory(options.folder);

  let processed;
  try {
    processed = await processImageBuffer(buffer, category);
  } catch (err) {
    if (err instanceof ImageProcessingError) {
      throw new StorageError(err.message, 400);
    }
    throw new StorageError(
      `Failed to process image: ${(err as Error).message}`,
      400
    );
  }

  const relativeKey = buildRelativeKey(category, "webp");
  const absolutePath = resolveStoragePath(relativeKey);

  if (fsSync.existsSync(absolutePath)) {
    // Extremely unlikely with UUID; do not overwrite.
    throw new StorageError("Generated filename collision; retry upload", 409);
  }

  await writeFileAtomically(absolutePath, processed.buffer);

  const url = publicUrlForKey(relativeKey);
  return {
    url,
    secureUrl: url,
    publicId: relativeKey,
    width: processed.width,
    height: processed.height,
    format: processed.format,
    bytes: processed.bytes,
  };
}

/**
 * Save a document (image or PDF). Images are processed to WebP; PDFs stored as-is.
 */
export async function saveDocumentFromBuffer(
  buffer: Buffer,
  options: SaveDocumentOptions = {}
): Promise<UploadResult> {
  ensureStorageRootExists();

  if (!buffer?.length) {
    throw new StorageError("Empty file buffer", 400);
  }
  if (buffer.length > storageConfig.maxDocumentBytes) {
    throw new StorageError("File size exceeds the 10 MB document limit", 400);
  }

  const signature = validateDocumentSignature(buffer, options.mimeType);
  if (!signature.ok) {
    throw new StorageError(signature.reason || "Invalid document file", 400);
  }

  const category =
    options.category ||
    mapFolderToCategory(options.folder || "documents");

  // PDF or non-processable heic: store original bytes
  if (signature.kind === "pdf" || signature.extension === "heic" || signature.extension === "heif") {
    const ext = signature.extension || "bin";
    const relativeKey = buildRelativeKey(
      category === "products" ? "documents" : category,
      ext
    );
    const absolutePath = resolveStoragePath(relativeKey);
    if (fsSync.existsSync(absolutePath)) {
      throw new StorageError("Generated filename collision; retry upload", 409);
    }
    await writeFileAtomically(absolutePath, buffer);
    const url = publicUrlForKey(relativeKey);
    return {
      url,
      secureUrl: url,
      publicId: relativeKey,
      format: ext,
      bytes: buffer.length,
    };
  }

  // Image documents → WebP pipeline
  return saveImageFromBuffer(buffer, {
    ...options,
    category: category === "products" ? "documents" : category,
    mimeType: signature.mimeType || options.mimeType,
  });
}

/**
 * Delete a file under STORAGE_ROOT by relative key. Missing files are ignored.
 */
export async function deleteStoredFile(relativeKey: string): Promise<boolean> {
  const absolute = resolveStoragePath(relativeKey);
  try {
    await fs.unlink(absolute);
    return true;
  } catch (err: any) {
    if (err?.code === "ENOENT") return false;
    throw new StorageError(
      `Failed to delete stored file: ${err?.message || "unknown error"}`,
      500
    );
  }
}

export function fileExistsInStorage(relativeKey: string): boolean {
  try {
    const absolute = resolveStoragePath(relativeKey);
    return fsSync.existsSync(absolute);
  } catch {
    return false;
  }
}

export async function copyLocalFileIntoStorage(
  sourceAbsolutePath: string,
  category: StorageCategory,
  extension: string,
  date = new Date()
): Promise<UploadResult> {
  ensureStorageRootExists();
  const resolvedSource = path.resolve(sourceAbsolutePath);
  if (!fsSync.existsSync(resolvedSource)) {
    throw new StorageError(`Source file not found: ${sourceAbsolutePath}`, 404);
  }

  const data = await fs.readFile(resolvedSource);
  const relativeKey = buildRelativeKey(category, extension, date);
  const dest = resolveStoragePath(relativeKey);
  if (fsSync.existsSync(dest)) {
    throw new StorageError("Destination already exists", 409);
  }
  await writeFileAtomically(dest, data);
  const url = publicUrlForKey(relativeKey);
  return {
    url,
    secureUrl: url,
    publicId: relativeKey,
    format: extension,
    bytes: data.length,
  };
}
