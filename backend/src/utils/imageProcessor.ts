import sharp from "sharp";
import {
  CATEGORY_DIMENSIONS,
  StorageCategory,
  storageConfig,
} from "../config/storage";

export type ProcessedImage = {
  buffer: Buffer;
  width: number;
  height: number;
  format: "webp";
  bytes: number;
};

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

/**
 * Convert to WebP, correct orientation, strip metadata, resize without upscaling.
 */
export async function processImageBuffer(
  input: Buffer,
  category: StorageCategory
): Promise<ProcessedImage> {
  let pipeline = sharp(input, {
    failOn: "error",
    limitInputPixels: storageConfig.maxImagePixels,
  }).rotate(); // apply EXIF orientation

  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) {
    throw new ImageProcessingError("Unable to read image dimensions");
  }

  const pixels = meta.width * meta.height;
  if (pixels > storageConfig.maxImagePixels) {
    throw new ImageProcessingError(
      `Image dimensions too large (${meta.width}x${meta.height})`
    );
  }

  const dims = CATEGORY_DIMENSIONS[category];
  pipeline = sharp(input, {
    failOn: "error",
    limitInputPixels: storageConfig.maxImagePixels,
  })
    .rotate()
    .resize({
      width: dims.maxWidth,
      height: dims.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: dims.quality, effort: 4 });

  const output = await pipeline.toBuffer({ resolveWithObject: true });
  const { data, info } = output;

  if (!info.width || !info.height) {
    throw new ImageProcessingError("Processed image missing dimensions");
  }

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    format: "webp",
    bytes: info.size || data.length,
  };
}
