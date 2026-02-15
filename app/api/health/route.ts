import fs from "node:fs";
import path from "node:path";
import { requestId, ok } from "@/lib/api-response";
import { getDatabasePath, OUTPUTS_DIR, UPLOADS_DIR } from "@/lib/paths";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rid = requestId(req.headers);
  try {
    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);
    return ok({
      status: "ok",
      checks: {
        uploadsDirExists: fs.existsSync(UPLOADS_DIR),
        outputsDirExists: fs.existsSync(OUTPUTS_DIR),
        databaseDirWritable: fs.existsSync(dbDir),
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.CHATGPT_API_KEY?.trim()),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
        databasePath: dbPath,
      },
      tip: "Use Advanced mode in the UI to paste API keys for quick testing without env vars.",
    }, rid);
  } catch (e) {
    return ok({ status: "ok", checks: {}, error: String(e) }, rid);
  }
}
