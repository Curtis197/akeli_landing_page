import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export async function uploadImage(
  file: File,
  storagePath: string,
  bucket: string = "recipe-images"
): Promise<string> {
  const supabase = createClient();
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  const ext = file.type === "image/png" ? "png" : "jpg";
  const finalPath = storagePath.endsWith(".webp")
    ? storagePath.replace(/.webp$/, "." + ext)
    : storagePath + "." + ext;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(finalPath, compressed, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(finalPath);

  return data.publicUrl;
}
