import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import db from "@/lib/db";
import { OUTPUTS_DIR, safeJoinDataPath } from "@/lib/paths";
import { generatePresetEdits } from "@/lib/providers/nanobanana";
import { ApiError, fail, ok, requestId } from "@/lib/api-response";
import { requireAuthAndLimit, incrementGenerationCount } from "@/lib/auth-guard";

export const runtime = "nodejs";

function mimeFromPath(p: string) {
  if (p.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

export async function POST(req: Request) {
  const rid = requestId(req.headers);
  try {
    // Auth + rate limit check
    const authUser = await requireAuthAndLimit();

    const body = await req.json();
    const { imageId } = body;
    if (!imageId) throw new ApiError(400, "PRESET_MISSING_FIELDS", "Missing imageId.");

    const image = db.prepare("SELECT id, original_path FROM images WHERE id = ?").get(imageId) as { id: string; original_path: string } | undefined;
    if (!image) throw new ApiError(404, "PRESET_IMAGE_NOT_FOUND", "Image not found.");

    const sourceBuffer = await fs.readFile(safeJoinDataPath(image.original_path));
    const imageMimeType = mimeFromPath(image.original_path);
    const runId = randomUUID();
    db.prepare("INSERT INTO runs (id, image_id, mode) VALUES (?, ?, 'preset')").run(runId, imageId);

    // 4 professional dating photographer edits via Gemini 3 Pro
    const presetResults = await generatePresetEdits({ imageBuffer: sourceBuffer, imageMimeType });

    const resultAttempts = [];
    for (let i = 0; i < presetResults.length; i++) {
      const item = presetResults[i];
      const attemptId = randomUUID();
      // Compress to progressive JPEG for fast loading
      const rawBuffer = Buffer.from(item.imageBase64, "base64");
      const compressed = await sharp(rawBuffer).jpeg({ quality: 85, progressive: true }).toBuffer();
      const fileName = `${runId}-${item.presetId}.jpg`;
      const relativeOutput = path.posix.join("outputs", fileName);
      await fs.writeFile(path.resolve(OUTPUTS_DIR, fileName), compressed);
      db.prepare(`INSERT INTO attempts (id, run_id, "index", output_path, meta_json, revised_prompt) VALUES (?, ?, ?, ?, ?, ?)`).run(attemptId, runId, i + 1, relativeOutput, JSON.stringify(item.meta), item.revisedPrompt);
      resultAttempts.push({ attemptId, url: `/api/file/${relativeOutput}`, meta: item.meta, revisedPrompt: item.revisedPrompt });
    }

    // Increment generation count after successful generation
    await incrementGenerationCount(authUser.id);

    return ok({ runId, attempts: resultAttempts }, rid);
  } catch (error) {
    return fail(rid, error, { status: 500, code: "PRESET_GENERATION_FAILED", message: "Dating edit generation failed." });
  }
}
