import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import { OUTPUTS_DIR, safeJoinDataPath } from "@/lib/paths";
import { applyAllFilters } from "@/lib/presets/applyPreset";
import { ApiError, fail, ok, requestId } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rid = requestId(req.headers);
  try {
    const body = await req.json();
    const { imageId } = body;
    if (!imageId) throw new ApiError(400, "PRESET_MISSING_FIELDS", "Missing imageId.");

    const image = db.prepare("SELECT id, original_path FROM images WHERE id = ?").get(imageId) as { id: string; original_path: string } | undefined;
    if (!image) throw new ApiError(404, "PRESET_IMAGE_NOT_FOUND", "Image not found.");

    const sourceBuffer = await fs.readFile(safeJoinDataPath(image.original_path));
    const runId = randomUUID();
    db.prepare("INSERT INTO runs (id, image_id, mode) VALUES (?, ?, 'preset')").run(runId, imageId);

    const filterResults = await applyAllFilters(sourceBuffer);

    const resultAttempts = [];
    for (let i = 0; i < filterResults.length; i++) {
      const { filterId, outputBuffer, meta } = filterResults[i];
      const attemptId = randomUUID();
      const fileName = `${runId}-${filterId}.jpg`;
      const relativeOutput = path.posix.join("outputs", fileName);
      await fs.writeFile(path.resolve(OUTPUTS_DIR, fileName), outputBuffer);
      db.prepare(`INSERT INTO attempts (id, run_id, "index", output_path, meta_json) VALUES (?, ?, ?, ?, ?)`).run(attemptId, runId, i + 1, relativeOutput, JSON.stringify(meta));
      resultAttempts.push({ attemptId, url: `/api/file/${relativeOutput}`, meta });
    }
    return ok({ runId, attempts: resultAttempts }, rid);
  } catch (error) {
    return fail(rid, error, { status: 500, code: "PRESET_GENERATION_FAILED", message: "Filter generation failed." });
  }
}
