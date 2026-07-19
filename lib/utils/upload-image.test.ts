import { describe, it, expect, vi, beforeEach } from "vitest";

const { uploadMock, getPublicUrlMock, fromMock } = vi.hoisted(() => {
  const uploadMock = vi.fn().mockResolvedValue({ error: null });
  const getPublicUrlMock = vi.fn().mockReturnValue({
    data: { publicUrl: "https://example.test/img.jpg" },
  });
  const fromMock = vi.fn().mockReturnValue({
    upload: uploadMock,
    getPublicUrl: getPublicUrlMock,
  });
  return { uploadMock, getPublicUrlMock, fromMock };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ storage: { from: fromMock } }),
}));

vi.mock("browser-image-compression", () => ({
  default: vi.fn(async (file: File) => file),
}));

import { uploadImage } from "@/lib/utils/upload-image";

function makeFile(type: string) {
  return new File(["data"], "photo", { type });
}

describe("uploadImage", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockClear();
    getPublicUrlMock.mockClear();
  });

  it("uploads to the recipe-images bucket by default", async () => {
    await uploadImage(makeFile("image/jpeg"), "abc/cover.webp");
    expect(fromMock).toHaveBeenCalledWith("recipe-images");
  });

  it("uploads to a caller-specified bucket", async () => {
    await uploadImage(makeFile("image/jpeg"), "abc/cover.webp", "post-images");
    expect(fromMock).toHaveBeenCalledWith("post-images");
  });

  it("normalizes the extension based on file type", async () => {
    await uploadImage(makeFile("image/png"), "abc/cover.webp", "post-images");
    expect(uploadMock).toHaveBeenCalledWith(
      "abc/cover.png",
      expect.anything(),
      { upsert: true, contentType: "image/png" }
    );
  });
});
