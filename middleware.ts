import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Custom middleware that replaces `export { auth as middleware }`.
 *
 * The NextAuth built-in middleware constructs redirect URLs using
 * `request.nextUrl`, which on Railway (behind a reverse proxy with
 * `next start -H 0.0.0.0`) resolves to `https://0.0.0.0:3000`.
 * That causes ERR_ADDRESS_INVALID in the browser.
 *
 * This middleware manually checks the JWT and builds redirect URLs
 * using the proxy's forwarded host headers instead.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow these paths through without auth check
  if (
    pathname.startsWith("/signin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  // Check for a valid JWT session token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  // If no valid token, redirect to signin
  if (!token) {
    // Build the correct public-facing URL from proxy headers
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "localhost:3000";
    const baseUrl = `${proto}://${host}`;
    const signinUrl = new URL("/signin", baseUrl);
    signinUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api/auth (NextAuth API routes)
     * - signin (login page)
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     */
    "/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)",
  ],
};
