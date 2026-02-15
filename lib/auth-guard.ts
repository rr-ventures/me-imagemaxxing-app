import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";

const MAX_GENERATIONS = 5;

export interface AuthUser {
  id: string;
  email: string | null;
  role: string;
  generationCount: number;
}

/**
 * Check authentication and rate limits for generation endpoints.
 * Returns the authenticated user, or throws ApiError if not allowed.
 */
export async function requireAuthAndLimit(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in to use this feature.");
  }

  const userId = (session.user as any).id;
  if (!userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Invalid session. Please sign in again.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(401, "UNAUTHENTICATED", "User not found. Please sign in again.");
  }

  // Admin has unlimited generations
  if (user.role !== "admin" && user.generationCount >= MAX_GENERATIONS) {
    throw new ApiError(403, "RATE_LIMITED", `You've used all ${MAX_GENERATIONS} free generations. Contact admin for more.`);
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    generationCount: user.generationCount,
  };
}

/**
 * Increment the generation count for a user (call after successful generation).
 */
export async function incrementGenerationCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { generationCount: { increment: 1 } },
  });
}
