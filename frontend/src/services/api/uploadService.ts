import api from "./config";

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface UploadResponse {
  success: boolean;
  data: UploadResult | UploadResult[];
  message?: string;
}

/**
 * Upload a single image via backend (VPS storage; response shape unchanged)
 */
export async function uploadImage(
  file: File,
  folder?: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("image", file);
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await api.post<UploadResponse>("/upload/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data[0]
      : response.data.data;
  }

  throw new Error(response.data.message || "Failed to upload image");
}

/**
 * Upload multiple images via backend (VPS storage)
 */
export async function uploadImages(
  files: File[],
  folder?: string
): Promise<UploadResult[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await api.post<UploadResponse>("/upload/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data
      : [response.data.data];
  }

  throw new Error(response.data.message || "Failed to upload images");
}

/**
 * Upload a document (image or PDF) via backend (VPS storage)
 */
export async function uploadDocument(
  file: File,
  folder?: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("document", file);
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await api.post<UploadResponse>(
    "/upload/document",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data[0]
      : response.data.data;
  }

  throw new Error(response.data.message || "Failed to upload document");
}

/**
 * Upload multiple documents via backend (VPS storage)
 */
export async function uploadDocuments(
  files: File[],
  folder?: string
): Promise<UploadResult[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("documents", file);
  });
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await api.post<UploadResponse>(
    "/upload/documents",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  if (response.data.success && response.data.data) {
    return Array.isArray(response.data.data)
      ? response.data.data
      : [response.data.data];
  }

  throw new Error(response.data.message || "Failed to upload documents");
}

/**
 * Delete an image from VPS storage by publicId (relative storage key).
 * Uses query param so nested keys like products/2026/10/uuid.webp work.
 */
export async function deleteImage(publicId: string): Promise<void> {
  const response = await api.delete<{ success: boolean; message?: string }>(
    `/upload`,
    { params: { publicId } }
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete image");
  }
}
