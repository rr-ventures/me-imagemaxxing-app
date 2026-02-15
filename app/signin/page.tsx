"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"email" | "password">("email");
  const [emailSent, setEmailSent] = useState(false);

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-tinder-gradient px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-2xl">
        {/* Logo Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#FD267A] to-[#FF6036] shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8.21 10.08c-.02 0-.04 0-.06.02-.02.02-.04.04-.06.06-.02.02-.02.04-.02.06 0 .02 0 .04.02.06.56 1.15 1.25 2.22 2.06 3.2.56.68 1.18 1.3 1.84 1.86.02.02.04.02.06.02.02 0 .04-.02.06-.02.02-.02.02-.04.02-.06-.02-.58-.14-1.14-.34-1.68-.2-.54-.48-1.04-.82-1.5-.34-.46-.74-.88-1.18-1.24-.44-.36-.92-.66-1.44-.9-.02-.02-.04-.02-.06-.02zm4.24 7.26c.66-.56 1.28-1.18 1.84-1.86.8-1 1.5-2.06 2.06-3.2.02-.02.02-.04.02-.06 0-.02 0-.04-.02-.06-.02-.02-.04-.04-.06-.06-.02-.02-.04-.02-.06-.02-.52.24-1 .54-1.44.9-.44.36-.84.78-1.18 1.24-.34.46-.62.96-.82 1.5-.2.54-.32 1.1-.34 1.68 0 .02 0 .04.02.06.02.02.04.02.06.02.02 0 .04 0 .06-.02zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
              <path d="M12.87 19.03c-.02.02-.04.02-.06.02-.02 0-.04-.02-.06-.02-.66-.56-1.28-1.18-1.84-1.86-.8-1-1.5-2.06-2.06-3.2-.02-.02-.02-.04-.02-.06 0-.02 0-.04.02-.06.02-.02.04-.04.06-.06.02-.02.04-.02.06-.02.52.24 1 .54 1.44.9.44.36.84.78 1.18 1.24.34.46.62.96.82 1.5.2.54.32 1.1.34 1.68 0 .02 0 .04.02.06zm-1.74-7.26c.02 0 .04 0 .06-.02.02-.02.04-.04.06-.06.02-.02.02-.04.02-.06 0-.02 0-.04-.02-.06-.56-1.15-1.25-2.22-2.06-3.2-.56-.68-1.18-1.3-1.84-1.86-.02-.02-.04-.02-.06-.02-.02 0-.04.02-.06.02-.02.02-.02.04-.02.06.02.58.14 1.14.34 1.68.2.54.48 1.04.82 1.5.34.46.74.88 1.18 1.24.44.36.92.66 1.44.9.02.02.04.02.06.02z" opacity=".3" />
              {/* Simplified Flame Icon Placeholder - Replace with actual Tinder flame SVG if available */}
              <path d="M12.94 3.08c.57 1.83.13 3.42-.56 4.68-1.16 2.12-2.92 3.16-3.1 5.38-.17 2.1 1.26 4.04 3.32 4.53 2.06.49 4.22-.38 5.26-2.12.56-.94.78-2.04.64-3.12-.01-.08.08-.14.15-.09.91.64 1.57 1.62 1.83 2.72.48 2.02-.19 4.2-1.73 5.68-1.54 1.48-3.7 2.07-5.77 1.58-2.07-.49-3.75-2.06-4.48-4.04-.73-1.98-.38-4.22.94-5.92 1.32-1.7 3.52-2.68 3.5-4.84-.01-1.42-.6-2.74-1.62-3.72-.07-.07-.02-.19.08-.19.5-.02 1.01.14 1.44.47z" fill="white"/>
            </svg>
          </div>
          <h2 className="mt-6 bg-gradient-to-r from-[#FD267A] to-[#FF6036] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            Get Started
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Log in to manage your profile maxxing.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm font-medium text-red-600 shadow-sm">
            {error === "CredentialsSignin"
              ? "Oops! That password doesn't look right."
              : "Something went wrong. Please try again."}
          </div>
        )}

        {/* Success Message */}
        {emailSent && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-center text-sm font-medium text-green-600 shadow-sm">
            Check your email for the magic link!
          </div>
        )}

        {/* Toggle */}
        <div className="flex rounded-full bg-gray-100 p-1">
          <button
            onClick={() => setMode("email")}
            className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-all duration-200 ${
              mode === "email"
                ? "bg-white text-gray-900 shadow-md"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setMode("password")}
            className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-all duration-200 ${
              mode === "password"
                ? "bg-white text-gray-900 shadow-md"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Admin
          </button>
        </div>

        {/* Forms */}
        {mode === "email" ? (
          <form className="space-y-6" onSubmit={handleEmailSignIn}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FD267A] focus:bg-white focus:outline-none focus:ring-0 sm:text-sm"
                placeholder="Email address"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="group relative flex w-full justify-center rounded-full bg-gradient-to-r from-[#FD267A] to-[#FF6036] px-4 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:from-[#E31C66] hover:to-[#E85029] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FD267A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                "LOG IN WITH EMAIL"
              )}
            </button>
            <p className="text-center text-xs text-gray-400">
              We&apos;ll send you a magic link for a password-free sign in.
            </p>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handlePasswordSignIn}>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FD267A] focus:bg-white focus:outline-none focus:ring-0 sm:text-sm"
                placeholder="Admin Password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="group relative flex w-full justify-center rounded-full bg-gradient-to-r from-[#FD267A] to-[#FF6036] px-4 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:from-[#E31C66] hover:to-[#E85029] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FD267A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "LOG IN"
              )}
            </button>
            <p className="text-center text-xs text-gray-400">
              Admin access only.
            </p>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Trouble logging in?{" "}
            <a href="#" className="font-medium text-[#FD267A] hover:text-[#FF6036]">
              Get help
            </a>
          </p>
        </div>
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
