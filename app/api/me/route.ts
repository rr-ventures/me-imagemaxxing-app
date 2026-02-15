import { NextResponse } from "next/server";

/**
 * GET /api/me — Auth disabled (backlogged). Returns unlimited access.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    user: {
      id: "anonymous",
      email: null,
      role: "admin",
      generationCount: 0,
      maxGenerations: null,
      generationsRemaining: null,
      canGenerate: true,
    },
  });
}
