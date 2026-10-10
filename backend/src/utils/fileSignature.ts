export type DetectedFileKind =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "pdf"
  | "unknown";

export type SignatureValidationResult = {
  ok: boolean;
  kind: DetectedFileKind;
  mimeType: string | null;
  extension: string | null;
  reason?: string;
};

function bufferStartsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((b, i) => buffer[i] === b);
}

/**
 * Detect actual file type from magic bytes (not client-declared MIME).
 */
export function detectFileKind(buffer: Buffer): DetectedFileKind {
  if (!buffer || buffer.length < 12) return "unknown";

  // JPEG
  if (bufferStartsWith(buffer, [0xff, 0xd8, 0xff])) return "jpeg";

  // PNG
  if (
    bufferStartsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "png";
  }

  // GIF (rejected for new image uploads; still detectable)
  if (
    bufferStartsWith(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) ||
    bufferStartsWith(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
  ) {
    return "gif";
  }

  // WEBP: RIFF....WEBP
  if (
    bufferStartsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // PDF
  if (bufferStartsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return "pdf";

  return "unknown";
}

export function kindToMime(kind: DetectedFileKind): string | null {
  switch (kind) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    default:
      return null;
  }
}

export function kindToExtension(kind: DetectedFileKind): string | null {
  switch (kind) {
    case "jpeg":
      return "jpg";
    case "png":
      return "png";
    case "webp":
      return "webp";
    case "gif":
      return "gif";
    case "pdf":
      return "pdf";
    default:
      return null;
  }
}

/**
 * Validate MIME claim against magic bytes for image uploads (jpg/png/webp only).
 */
export function validateImageSignature(
  buffer: Buffer,
  claimedMime?: string
): SignatureValidationResult {
  const kind = detectFileKind(buffer);
  if (kind !== "jpeg" && kind !== "png" && kind !== "webp") {
    return {
      ok: false,
      kind,
      mimeType: kindToMime(kind),
      extension: kindToExtension(kind),
      reason: `Unsupported or invalid image file signature (${kind})`,
    };
  }

  const mimeType = kindToMime(kind)!;
  if (claimedMime) {
    const normalized = claimedMime.toLowerCase();
    const aliases =
      kind === "jpeg"
        ? ["image/jpeg", "image/jpg"]
        : [mimeType];
    if (!aliases.includes(normalized)) {
      return {
        ok: false,
        kind,
        mimeType,
        extension: kindToExtension(kind),
        reason: `MIME type mismatch: claimed ${claimedMime}, detected ${mimeType}`,
      };
    }
  }

  return {
    ok: true,
    kind,
    mimeType,
    extension: kindToExtension(kind),
  };
}

/**
 * Validate document uploads (images + PDF). HEIC is accepted by MIME only when
 * signature cannot be detected here; callers should still size-limit.
 */
export function validateDocumentSignature(
  buffer: Buffer,
  claimedMime?: string
): SignatureValidationResult {
  const kind = detectFileKind(buffer);

  if (kind === "jpeg" || kind === "png" || kind === "webp" || kind === "pdf") {
    return validateImageOrPdf(kind, claimedMime);
  }

  // HEIC/HEIF: allow when client claims heic/heif (signature not always stable)
  const claimed = (claimedMime || "").toLowerCase();
  if (claimed === "image/heic" || claimed === "image/heif") {
    return {
      ok: true,
      kind: "unknown",
      mimeType: claimed,
      extension: claimed === "image/heic" ? "heic" : "heif",
    };
  }

  return {
    ok: false,
    kind,
    mimeType: kindToMime(kind),
    extension: kindToExtension(kind),
    reason: `Unsupported or invalid document file signature (${kind})`,
  };
}

function validateImageOrPdf(
  kind: "jpeg" | "png" | "webp" | "pdf",
  claimedMime?: string
): SignatureValidationResult {
  const mimeType = kindToMime(kind)!;
  if (claimedMime) {
    const normalized = claimedMime.toLowerCase();
    if (kind === "jpeg") {
      if (normalized !== "image/jpeg" && normalized !== "image/jpg") {
        return {
          ok: false,
          kind,
          mimeType,
          extension: kindToExtension(kind),
          reason: `MIME type mismatch: claimed ${claimedMime}, detected ${mimeType}`,
        };
      }
    } else if (normalized !== mimeType) {
      return {
        ok: false,
        kind,
        mimeType,
        extension: kindToExtension(kind),
        reason: `MIME type mismatch: claimed ${claimedMime}, detected ${mimeType}`,
      };
    }
  }

  return {
    ok: true,
    kind,
    mimeType,
    extension: kindToExtension(kind),
  };
}
