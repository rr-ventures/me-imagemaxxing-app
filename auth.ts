import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    // Magic-link email via Resend (only active if AUTH_RESEND_KEY is set)
    ...(process.env.AUTH_RESEND_KEY
      ? [
          Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: process.env.AUTH_EMAIL_FROM?.trim() || "Dating Profile Photomaxxing <noreply@resend.dev>",
          }),
        ]
      : []),
    // Password bypass for admin
    Credentials({
      id: "admin-password",
      name: "Admin Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const pw = (credentials?.password as string)?.trim();
        if (!pw) return null;
        const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "rrventures";
        if (pw !== adminPassword) return null;

        // Find or create admin user
        let admin = await prisma.user.findFirst({ where: { role: "admin" } });
        if (!admin) {
          admin = await prisma.user.create({
            data: {
              email: "reece@notime.world",
              name: "Admin",
              role: "admin",
              emailVerified: new Date(),
            },
          });
        }
        return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
      },
    }),
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      const isSignIn = request.nextUrl.pathname.startsWith("/signin");
      const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");
      // Always allow auth pages and API
      if (isSignIn || isAuthApi) return true;
      // Block unauthenticated users everywhere else
      return !!session?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role ?? "user";
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
});
