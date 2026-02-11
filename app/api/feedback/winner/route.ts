import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import { ApiError, fail, ok, requestId } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rid = requestId(req.headers);
  try {
    const { runId, attemptId } = await req.json();
    if (!runId || !attemptId) throw new ApiError(400, "WINNER_MISSING_FIELDS", "runId and attemptId are required.");
    db.prepare(`INSERT INTO winners (id, run_id, attempt_id) VALUES (?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET attempt_id = excluded.attempt_id, created_at = datetime('now')`).run(randomUUID(), runId, attemptId);
    return ok({ saved: true }, rid);
  } catch (error) {
    return fail(rid, error, { status: 500, code: "WINNER_SAVE_FAILED", message: "Failed to save winner." });
  }
}
