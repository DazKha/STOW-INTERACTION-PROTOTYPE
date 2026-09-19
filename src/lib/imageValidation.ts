import type { AnalysisError, AttachmentMeta } from "../domain/analysisTypes";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class ImageValidationException extends Error {
  readonly error: AnalysisError;

  constructor(error: AnalysisError) {
    super(error.message);
    this.name = "ImageValidationException";
    this.error = error;
  }
}

const validationError = (
  code: AnalysisError["code"],
  message: string,
): ImageValidationException =>
  new ImageValidationException({ stage: "validation", code, message, recoverable: true });

export async function validateImageFile(file: File): Promise<AttachmentMeta> {
  if (file.size === 0) {
    throw validationError("empty_file", "This image is empty. Choose a non-empty image file.");
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw validationError("unsupported_type", "This file type is not supported. Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw validationError("too_large", "This image is larger than the 10 MiB limit.");
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const { width, height } = await decodeImage(previewUrl);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      width,
      height,
      previewUrl,
    };
  } catch {
    URL.revokeObjectURL(previewUrl);
    throw validationError("decode_failed", "This image could not be decoded. Choose a readable image file.");
  }
}

function decodeImage(source: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("image decode failed"));
    image.src = source;
  });
}
