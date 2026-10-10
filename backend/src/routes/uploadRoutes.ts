import { Router, Request, Response } from "express";
import { authenticate, requireUserType } from "../middleware/auth";
import {
  uploadSingleImage,
  uploadMultipleImages,
  uploadDocument,
  uploadMultipleDocuments,
  handleUploadError,
} from "../middleware/upload";
import {
  saveDocumentFromBuffer,
  saveImageFromBuffer,
  StorageError,
} from "../services/storageService";
import { safeDeleteImage } from "../services/imageDeletion";
import { mapFolderToCategory } from "../config/storage";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

function sendStorageError(res: Response, err: unknown) {
  if (err instanceof StorageError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
  throw err;
}

/**
 * POST /api/v1/upload/image
 * Upload a single image → VPS storage (WebP)
 * Response shape unchanged: { success, data: UploadResult }
 */
router.post(
  "/image",
  authenticate,
  requireUserType("Admin", "Seller", "Delivery"),
  uploadSingleImage.single("image"),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    try {
      const folder = (req.body.folder as string) || undefined;
      const result = await saveImageFromBuffer(req.file.buffer, {
        folder,
        category: mapFolderToCategory(folder),
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return sendStorageError(res, err);
    }
  })
);

/**
 * POST /api/v1/upload/images
 * Upload multiple images
 */
router.post(
  "/images",
  authenticate,
  requireUserType("Admin", "Seller", "Delivery"),
  uploadMultipleImages.array("images", 10),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No image files provided",
      });
    }

    try {
      const folder = (req.body.folder as string) || undefined;
      const category = mapFolderToCategory(folder);
      const results = await Promise.all(
        files.map((file) =>
          saveImageFromBuffer(file.buffer, {
            folder,
            category,
            mimeType: file.mimetype,
            originalName: file.originalname,
          })
        )
      );

      return res.status(200).json({
        success: true,
        data: results,
      });
    } catch (err) {
      return sendStorageError(res, err);
    }
  })
);

/**
 * POST /api/v1/upload/document
 * Upload a document (image or PDF) — 10 MB limit
 * Unauthenticated to allow registration flows (unchanged).
 */
router.post(
  "/document",
  uploadDocument.single("document"),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No document file provided",
      });
    }

    try {
      let folder: string =
        (req.body.folder as string) || "klydocart/sellers/documents";
      const userType = (req as any).user?.userType;

      if (userType === "Delivery") {
        folder = (req.body.folder as string) || "klydocart/delivery/documents";
      } else if (userType === "Seller") {
        folder = (req.body.folder as string) || "klydocart/sellers/documents";
      }

      const result = await saveDocumentFromBuffer(req.file.buffer, {
        folder,
        category: mapFolderToCategory(folder),
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return sendStorageError(res, err);
    }
  })
);

/**
 * POST /api/v1/upload/documents
 * Upload multiple documents
 */
router.post(
  "/documents",
  uploadMultipleDocuments.array("documents", 5),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No document files provided",
      });
    }

    try {
      let folder: string =
        (req.body.folder as string) || "klydocart/sellers/documents";
      const userType = (req as any).user?.userType;

      if (userType === "Delivery") {
        folder = (req.body.folder as string) || "klydocart/delivery/documents";
      } else if (userType === "Seller") {
        folder = (req.body.folder as string) || "klydocart/sellers/documents";
      }

      const category = mapFolderToCategory(folder);
      const results = await Promise.all(
        files.map((file) =>
          saveDocumentFromBuffer(file.buffer, {
            folder,
            category,
            mimeType: file.mimetype,
            originalName: file.originalname,
          })
        )
      );

      return res.status(200).json({
        success: true,
        data: results,
      });
    } catch (err) {
      return sendStorageError(res, err);
    }
  })
);

/**
 * DELETE /api/v1/upload
 * Preferred delete: JSON body or query { publicId } (supports nested keys).
 */
router.delete(
  "/",
  authenticate,
  requireUserType("Admin", "Seller", "Delivery"),
  asyncHandler(async (req: Request, res: Response) => {
    const publicId =
      (req.body?.publicId as string) ||
      (req.query.publicId as string) ||
      (req.body?.url as string) ||
      (req.query.url as string);

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    try {
      const result = await safeDeleteImage(decodeURIComponent(publicId));
      if (result.skipped && result.reason?.includes("multiple")) {
        return res.status(409).json({
          success: false,
          message: result.reason,
          data: result,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.deleted
          ? "Image deleted successfully"
          : result.reason || "Nothing to delete",
        data: result,
      });
    } catch (err) {
      return sendStorageError(res, err);
    }
  })
);

/**
 * DELETE /api/v1/upload/:publicId
 * Legacy path-param delete (works for simple keys without slashes).
 * Prefer DELETE /upload?publicId=encoded/key.webp for nested keys.
 */
router.delete(
  "/:publicId",
  authenticate,
  requireUserType("Admin", "Seller", "Delivery"),
  asyncHandler(async (req: Request, res: Response) => {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    try {
      const result = await safeDeleteImage(decodeURIComponent(publicId));
      if (result.skipped && result.reason?.includes("multiple")) {
        return res.status(409).json({
          success: false,
          message: result.reason,
          data: result,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.deleted
          ? "Image deleted successfully"
          : result.reason || "Nothing to delete",
        data: result,
      });
    } catch (err) {
      return sendStorageError(res, err);
    }
  })
);

export default router;
