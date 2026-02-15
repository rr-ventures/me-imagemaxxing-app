import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/paths";
import { ApiError, fail, requestId } from "@/lib/api-response";

export const runtime = "nodejs";

function mimeFromExt(ext: string) {
  if ([".jpg", ".jpeg"].includes(ext.toLowerCase())) return "image/jpeg";
  if (ext.toLowerCase() === ".png") return "image/png";
  if (ext.toLowerCase() === ".webp") return "image/webp";
  return "application/octet-stream";
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const rid = requestId(req.headers);
  try {
    const rel = params.path.join("/");
    const absolute = path.resolve(DATA_DIR, rel);
    if (!absolute.startsWith(DATA_DIR)) throw new ApiError(400, "FILE_INVALID_PATH", "Invalid path.");
    const data = await fs.readFile(absolute);
    return new Response(data, { headers: { "Content-Type": mimeFromExt(path.extname(absolute)), "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    return fail(rid, error, { status: 404, code: "FILE_NOT_FOUND", message: "File not found." });
  }
}
