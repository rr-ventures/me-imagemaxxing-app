export { auth as middleware } from "@/auth";

export const config = {
  // Protect everything except auth routes, API auth routes, static files, and public assets
  matcher: [
    "/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)",
  ],
};
