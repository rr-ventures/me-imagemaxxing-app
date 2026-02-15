"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"email" | "password">("email");

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await signIn("resend", { email: email.trim(), callbackUrl: "/" });
      setEmailSent(true);
    } catch {
      // handled by next-auth redirect
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    try {
      await signIn("admin-password", { password: password.trim(), callbackUrl: "/" });
    } catch {
      // handled by next-auth redirect
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111418] px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-[#FD267A] to-[#FF7854] bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Dating Profile Photomaxxing
          </h1>
          <p className="mt-2 text-sm text-[#667180]">
            Professional dating photo edits powered by AI
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
            {error === "CredentialsSignin" ? "Invalid password." : "Something went wrong. Please try again."}
          </div>
        )}

        {/* Email sent confirmation */}
        {emailSent && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-300">
            Check your email for a sign-in link!
          </div>
        )}

        {/* Tab toggle */}
        <div className="flex rounded-full border border-white/10 bg-[#1a1d23] p-1">
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
              mode === "email"
                ? "bg-gradient-to-r from-[#FD267A] to-[#FF7854] text-white"
                : "text-[#667180] hover:text-white"
            }`}
          >
            Email Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
              mode === "password"
                ? "bg-gradient-to-r from-[#FD267A] to-[#FF7854] text-white"
                : "text-[#667180] hover:text-white"
            }`}
          >
            Admin Access
          </button>
        </div>

        {/* Email form */}
        {mode === "email" && (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#667180]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-white/10 bg-[#1a1d23] px-4 py-3 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50 focus:ring-1 focus:ring-[#FD267A]/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-full bg-gradient-to-r from-[#FD267A] to-[#FF7854] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
            <p className="text-center text-xs text-[#667180]">
              We&apos;ll email you a sign-in link. No password needed.
            </p>
          </form>
        )}

        {/* Password form */}
        {mode === "password" && (
          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#667180]">
                Admin password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="w-full rounded-lg border border-white/10 bg-[#1a1d23] px-4 py-3 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50 focus:ring-1 focus:ring-[#FD267A]/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full rounded-full bg-gradient-to-r from-[#FD267A] to-[#FF7854] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In as Admin"}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-[#667180]">
          Each account gets 5 free generations.
        </p>
        <p className="text-center text-[10px] tracking-wide text-[#667180]/50">
          Built by{" "}
          <a href="https://notime.world" target="_blank" rel="noopener noreferrer" className="text-[#667180]/70 underline decoration-[#FD267A]/20 underline-offset-2 transition hover:text-white hover:decoration-[#FD267A]">
            Reece
          </a>
          {" "}&middot;{" "}
          <a href="https://notime.world" target="_blank" rel="noopener noreferrer" className="text-[#667180]/70 underline decoration-[#FD267A]/20 underline-offset-2 transition hover:text-white hover:decoration-[#FD267A]">
            notime.world
          </a>
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
