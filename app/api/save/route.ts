import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import { OUTPUTS_DIR, safeJoinDataPath } from "@/lib/paths";
import { ApiError, fail, ok, requestId } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rid = requestId(req.headers);
  try {
    const { attemptId } = await req.json();
    if (!attemptId) throw new ApiError(400, "SAVE_MISSING_ID", "attemptId is required.");
    const attempt = db.prepare("SELECT id, output_path FROM attempts WHERE id = ?").get(attemptId) as { id: string; output_path: string } | undefined;
    if (!attempt) throw new ApiError(404, "SAVE_NOT_FOUND", "Attempt not found.");
    const sourcePath = safeJoinDataPath(attempt.output_path);
    const ext = path.extname(sourcePath) || ".jpg";
    const savedFileName = `saved-${attempt.id}-${Date.now()}${ext}`;
    const savedRelative = path.posix.join("outputs", savedFileName);
    await fs.copyFile(sourcePath, path.resolve(OUTPUTS_DIR, savedFileName));
    db.prepare("INSERT INTO saved_outputs (id, attempt_id, saved_path) VALUES (?, ?, ?)").run(randomUUID(), attempt.id, savedRelative);
    return ok({ downloadUrl: `/api/file/${savedRelative}`, fileName: savedFileName }, rid);
  } catch (error) {
    return fail(rid, error, { status: 500, code: "SAVE_FAILED", message: "Failed to save output." });
  }
}
