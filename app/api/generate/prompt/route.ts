import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import db from "@/lib/db";
import { OUTPUTS_DIR, safeJoinDataPath } from "@/lib/paths";
import { generateWithOpenAI } from "@/lib/providers/openai";
import { generateWithGemini } from "@/lib/providers/nanobanana";
import { ApiError, fail, ok, requestId } from "@/lib/api-response";
import { requireAuthAndLimit, incrementGenerationCount } from "@/lib/auth-guard";

export const runtime = "nodejs";

type Provider = "openai" | "gemini";

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
    const { imageId, provider, prompt, attempts, advanced } = body as {
      imageId?: string; provider?: Provider; prompt?: string; attempts?: number;
      advanced?: { openaiApiKey?: string; geminiApiKey?: string };
    };
    if (!imageId || !provider || !prompt?.trim()) throw new ApiError(400, "PROMPT_MISSING_FIELDS", "Missing required fields.");
    if (attempts !== 4) throw new ApiError(400, "PROMPT_INVALID_ATTEMPTS", "Must request exactly 4 attempts.");

    const image = db.prepare("SELECT id, original_path FROM images WHERE id = ?").get(imageId) as { id: string; original_path: string } | undefined;
    if (!image) throw new ApiError(404, "PROMPT_IMAGE_NOT_FOUND", "Image not found.");

    const sourceBuffer = await fs.readFile(safeJoinDataPath(image.original_path));
    const mimeType = mimeFromPath(image.original_path);

    const runId = randomUUID();
    db.prepare("INSERT INTO runs (id, image_id, mode, provider, user_prompt) VALUES (?, ?, 'prompt', ?, ?)").run(runId, imageId, provider, prompt);

    let providerResults: Awaited<ReturnType<typeof generateWithOpenAI>>;
    try {
      if (provider === "openai") {
        providerResults = await generateWithOpenAI({ imageBuffer: sourceBuffer, imageMimeType: mimeType, userPrompt: prompt, attempts: 4, apiKeyOverride: advanced?.openaiApiKey });
      } else {
        providerResults = await generateWithGemini({ imageBuffer: sourceBuffer, imageMimeType: mimeType, userPrompt: prompt, attempts: 4, apiKeyOverride: advanced?.geminiApiKey });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider failed.";
      const status = message.includes("API_KEY") || message.includes("not configured") ? 400 : 502;
      throw new ApiError(status, "PROMPT_PROVIDER_FAILED", message, { provider });
    }

    if (providerResults.length !== 4) throw new ApiError(502, "PROMPT_PROVIDER_BAD_COUNT", `Provider returned ${providerResults.length}, expected 4.`);

    const resultAttempts = [];
    for (let i = 0; i < providerResults.length; i++) {
      const item = providerResults[i];
      const attemptId = randomUUID();
      // Compress to progressive JPEG for fast loading
      const rawBuffer = Buffer.from(item.imageBase64, "base64");
      const compressed = await sharp(rawBuffer).jpeg({ quality: 85, progressive: true }).toBuffer();
      const fileName = `${runId}-${i + 1}.jpg`;
      const relativeOutput = path.posix.join("outputs", fileName);
      await fs.writeFile(path.resolve(OUTPUTS_DIR, fileName), compressed);
      db.prepare(`INSERT INTO attempts (id, run_id, "index", output_path, meta_json, revised_prompt) VALUES (?, ?, ?, ?, ?, ?)`).run(attemptId, runId, i + 1, relativeOutput, JSON.stringify(item.meta), item.revisedPrompt);
      resultAttempts.push({ attemptId, url: `/api/file/${relativeOutput}`, meta: item.meta, revisedPrompt: item.revisedPrompt });
    }

    // Increment generation count after successful generation
    await incrementGenerationCount(authUser.id);

    return ok({ runId, attempts: resultAttempts }, rid);
  } catch (error) {
    return fail(rid, error, { status: 500, code: "PROMPT_GENERATION_FAILED", message: "Prompt generation failed." });
  }
}
