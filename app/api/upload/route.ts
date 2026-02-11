import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import { UPLOADS_DIR, ensureDataDirs } from "@/lib/paths";
import { ApiError, fail, ok, requestId } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rid = requestId(req.headers);
  try {
    ensureDataDirs();
    const formData = await req.formData();
    const input = formData.get("file");
    if (!(input instanceof File)) throw new ApiError(400, "UPLOAD_MISSING_FILE", "No file uploaded.");
    if (!["image/jpeg", "image/png"].includes(input.type)) {
      throw new ApiError(400, "UPLOAD_UNSUPPORTED_FORMAT", "Only JPG/PNG supported. Convert HEIC to JPG first.", { mimeType: input.type });
    }
    const imageId = randomUUID();
    const ext = input.type === "image/png" ? "png" : "jpg";
    const filename = `${imageId}.${ext}`;
    const relativePath = path.posix.join("uploads", filename);
    await fs.writeFile(path.resolve(UPLOADS_DIR, filename), Buffer.from(await input.arrayBuffer()));
    db.prepare("INSERT INTO images (id, original_path) VALUES (?, ?)").run(imageId, relativePath);
    return ok({ imageId, originalUrl: `/api/file/${relativePath}` }, rid);
  } catch (error) {
    return fail(rid, error, { status: 500, code: "UPLOAD_FAILED", message: "Upload failed." });
  }
}
