import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCEPTED_IMAGE_TYPES,
  ImageValidationException,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from "./imageValidation";

class MockImage {
  naturalWidth = 1200;
  naturalHeight = 800;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

const createFile = (name: string, type: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type });

describe("validateImageFile", () => {
  beforeEach(() => {
    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "attachment-1") });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:attachment-1");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  it("rejects a zero-byte image as empty_file", async () => {
    await expect(validateImageFile(createFile("empty.png", "image/png", 0))).rejects.toMatchObject({
      error: expect.objectContaining({ code: "empty_file" }),
    });
  });

  it("rejects a PDF as unsupported_type", async () => {
    await expect(validateImageFile(createFile("document.pdf", "application/pdf"))).rejects.toMatchObject({
      error: expect.objectContaining({ code: "unsupported_type" }),
    });
    expect(ACCEPTED_IMAGE_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });

  it("rejects an image larger than 10 MiB as too_large", async () => {
    await expect(validateImageFile(createFile("large.png", "image/png", MAX_IMAGE_BYTES + 1))).rejects.toMatchObject({
      error: expect.objectContaining({ code: "too_large" }),
    });
  });

  it("revokes the object URL when image decoding fails", async () => {
    class FailingImage extends MockImage {
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", FailingImage);

    await expect(validateImageFile(createFile("broken.png", "image/png"))).rejects.toMatchObject({
      error: expect.objectContaining({ code: "decode_failed" }),
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:attachment-1");
  });

  it("returns filename, dimensions, size, type, id, and preview URL for a valid image", async () => {
    const file = createFile("bike.png", "image/png", 2048);
    const result = await validateImageFile(file);

    expect(result).toEqual({
      id: "attachment-1",
      name: "bike.png",
      type: "image/png",
      size: 2048,
      width: 1200,
      height: 800,
      previewUrl: "blob:attachment-1",
    });
  });

  it("exposes the typed validation error", async () => {
    await expect(validateImageFile(createFile("empty.png", "image/png", 0))).rejects.toBeInstanceOf(
      ImageValidationException,
    );
  });
});
