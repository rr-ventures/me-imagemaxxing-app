import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_GENERATIONS = 5;

/**
 * GET /api/me — returns the current user's generation count and limits.
 * Called by the frontend to show remaining generations and disable the button.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const isAdmin = user.role === "admin";
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      generationCount: user.generationCount,
      maxGenerations: isAdmin ? null : MAX_GENERATIONS, // null = unlimited
      generationsRemaining: isAdmin ? null : Math.max(0, MAX_GENERATIONS - user.generationCount),
      canGenerate: isAdmin || user.generationCount < MAX_GENERATIONS,
    },
  });
}
