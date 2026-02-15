"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import ProfilePreview from "./components/ProfilePreview";

/* ─────── Top-level tabs ─────── */
type AppTab = "editor" | "preview";

/* ─────── Types ─────── */
type Mode = "filters" | "ai-retouch";
type Provider = "openai" | "gemini";
type Attempt = { attemptId: string; url: string; meta?: Record<string, unknown>; revisedPrompt?: string | null };

/* ─────── Helpers ─────── */
function parseApi<T>(res: Response, json: any): T {
  if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || `Request failed (${res.status}).`);
  return json as T;
}

/* ─────── Preset info (mirrors server DATING_PRESETS — 4 presets) ─────── */
const PRESET_INFO = [
  { id: "golden-hour", name: "Golden Hour Glow", emoji: "🌅", desc: "Warm golden-hour lighting — #1 for dating" },
  { id: "clean-headshot", name: "Clean Pro Headshot", emoji: "✨", desc: "Studio-quality — polished and professional" },
  { id: "soft-portrait", name: "Soft Flattering Portrait", emoji: "🪞", desc: "Dreamy, approachable, naturally flattering" },
  { id: "film-editorial", name: "Film Editorial", emoji: "🎞️", desc: "Vintage film — artistic and distinctive" },
];

/* ─────── Suggested AI prompts ─────── */
const SUGGESTED_PROMPTS = [
  "Professional dating profile retouch: improve lighting, warm golden tones, smooth skin naturally, brighten eyes",
  "Natural skin retouch, even skin tone, remove blemishes, keep real texture, sharpen eyes",
  "Soft flattering portrait light, gentle background blur, warm inviting tones",
  "Improve jawline definition, tighten loose skin subtly, keep it natural and believable",
  "Cinematic dating photo: shallow depth of field, rich warm color grade, crisp face detail",
  "Remove under-eye shadows, brighten smile, warm golden-hour lighting effect",
];

/* ─────── User info from /api/me ─────── */
type UserInfo = {
  generationCount: number;
  maxGenerations: number | null; // null = unlimited (admin)
  generationsRemaining: number | null;
  canGenerate: boolean;
  role: string;
};

/* ─────── Page ─────── */
export default function Home() {
  const { data: session } = useSession();

  /* Top-level tab */
  const [appTab, setAppTab] = useState<AppTab>("editor");

  /* User generation limits */
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  async function fetchUserInfo() {
    try {
      const res = await fetch("/api/me");
      const json = await res.json();
      if (json.ok) setUserInfo(json.user);
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (session?.user) fetchUserInfo();
  }, [session]);

  /* Upload */
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* Mode + Provider */
  const [mode, setMode] = useState<Mode>("filters");
  const [provider, setProvider] = useState<Provider>("gemini");

  /* Prompt controls */
  const [prompt, setPrompt] = useState("");

  /* Advanced mode (API key overrides) */
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advOpenAIKey, setAdvOpenAIKey] = useState("");
  const [advGeminiKey, setAdvGeminiKey] = useState("");

  /* Results */
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [winnerAttemptId, setWinnerAttemptId] = useState<string | null>(null);
  const [activeModalUrl, setActiveModalUrl] = useState<string | null>(null);

  /* Feedback */
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* Whether the user has hit their limit */
  const atLimit = userInfo !== null && !userInfo.canGenerate;

  /* ─── Computed ─── */
  const canGenerate = useMemo(() => {
    if (!imageId || loading) return false;
    if (atLimit) return false;
    if (mode === "ai-retouch" && !prompt.trim()) return false;
    return true;
  }, [imageId, loading, atLimit, mode, prompt]);

  const generateLabel = useMemo(() => {
    if (loading) return "Generating…";
    if (mode === "filters") return "Apply 4 Pro Dating Edits";
    return `AI Retouch via ${provider === "openai" ? "OpenAI" : "Gemini 3 Pro"}`;
  }, [loading, mode, provider]);

  const isHeic = useMemo(() => {
    if (!uploadedFile) return false;
    const name = uploadedFile.name.toLowerCase();
    return name.endsWith(".heic") || name.endsWith(".heif");
  }, [uploadedFile]);

  /* ─── Upload handler ─── */
  async function uploadFile(file: File) {
    setError(null);
    setNotice(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      const data = parseApi<{ imageId: string; originalUrl: string }>(res, json);
      setImageId(data.imageId);
      setPreviewUrl(data.originalUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setAttempts([]);
    setRunId(null);
    setWinnerAttemptId(null);
    if (["image/jpeg", "image/png"].includes(file.type)) uploadFile(file);
  }

  /* ─── Generate handler ─── */
  async function onGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    setAttempts([]);
    setRunId(null);
    setWinnerAttemptId(null);
    try {
      let res: Response;
      if (mode === "filters") {
        res = await fetch("/api/generate/preset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId }),
        });
      } else {
        const advanced: Record<string, string> = {};
        if (advOpenAIKey.trim()) advanced.openaiApiKey = advOpenAIKey.trim();
        if (advGeminiKey.trim()) advanced.geminiApiKey = advGeminiKey.trim();
        res = await fetch("/api/generate/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId, provider, prompt: prompt.trim(), attempts: 4, advanced: Object.keys(advanced).length ? advanced : undefined }),
        });
      }
      const json = await res.json();
      const data = parseApi<{ runId: string; attempts: Attempt[] }>(res, json);
      setRunId(data.runId);
      setAttempts(data.attempts);
      setNotice(`Generated ${data.attempts.length} variation(s).`);
      // Refresh user info to get updated generation count
      fetchUserInfo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ─── Winner handler ─── */
  async function onSelectWinner(attemptId: string) {
    if (!runId) return;
    try {
      const res = await fetch("/api/feedback/winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, attemptId }),
      });
      const json = await res.json();
      parseApi(res, json);
      setWinnerAttemptId(attemptId);
      setNotice("Winner saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save winner.");
    }
  }

  /* ─── Save handler ─── */
  async function onSaveAttempt(attemptId: string) {
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const json = await res.json();
      const data = parseApi<{ downloadUrl: string; fileName: string }>(res, json);
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.download = data.fileName;
      a.click();
      setNotice("Saved and downloading.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  /* ─── Reset ─── */
  function resetAll() {
    setUploadedFile(null);
    setImageId(null);
    setPreviewUrl(null);
    setAttempts([]);
    setRunId(null);
    setWinnerAttemptId(null);
    setError(null);
    setNotice(null);
    setPrompt("");
    setAdvOpenAIKey("");
    setAdvGeminiKey("");
  }

  /* ─────── Render ─────── */
  return (
    <main className="min-h-screen bg-[#111418] px-4 py-6 text-white sm:px-6">
      <section className="mx-auto max-w-[1400px] space-y-5">

        {/* ──── Header ──── */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-white/[0.08] bg-[#1a1d23] px-6 py-5">
          <div>
            <h1 className="text-tinder-gradient text-3xl font-bold tracking-tight">Dating Profile Photomaxxing</h1>
            <p className="mt-1 text-sm text-[#8e96a3]">
              Upload a photo. Get 4 professional dating edits or AI retouch. Pick the best.
            </p>
          </div>
          {session?.user && (
            <div className="flex items-center gap-3">
              {/* Generation counter */}
              {userInfo && (
                <div className="flex items-center gap-1.5 rounded-pill border border-white/[0.08] bg-[#111418] px-3 py-1.5">
                  {userInfo.maxGenerations !== null ? (
                    <>
                      <span className={`text-xs font-semibold ${atLimit ? "text-red-400" : "text-tinder-gradient"}`}>
                        {userInfo.generationsRemaining}
                      </span>
                      <span className="text-[10px] text-[#667180]">/ {userInfo.maxGenerations} left</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-medium text-emerald-400">Admin (unlimited)</span>
                  )}
                </div>
              )}
              <span className="text-xs text-[#667180]">{session.user.email}</span>
              <button
                onClick={() => signOut()}
                className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-[#8e96a3] transition hover:bg-white/10 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          )}
        </header>

        {/* ──── Top-level tab navigation ──── */}
        <div className="flex rounded-pill border border-white/[0.08] bg-[#1a1d23] p-1">
          <button
            type="button"
            onClick={() => setAppTab("editor")}
            className={`flex-1 rounded-pill px-4 py-2.5 text-sm font-medium transition ${
              appTab === "editor"
                ? "bg-tinder-gradient text-white shadow-md"
                : "text-[#667180] hover:text-white"
            }`}
          >
            Photo Editor
          </button>
          <button
            type="button"
            onClick={() => setAppTab("preview")}
            className={`flex-1 rounded-pill px-4 py-2.5 text-sm font-medium transition ${
              appTab === "preview"
                ? "bg-tinder-gradient text-white shadow-md"
                : "text-[#667180] hover:text-white"
            }`}
          >
            Profile Preview
          </button>
        </div>

        {/* ──── Profile Preview tab ──── */}
        {appTab === "preview" && <ProfilePreview />}

        {/* ──── Photo Editor tab ──── */}
        {appTab === "editor" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">

          {/* ──── LEFT SIDEBAR ──── */}
          <aside className="space-y-5">

            {/* Upload */}
            <section className="rounded-card border border-white/[0.08] bg-[#1a1d23] p-5">
              <h2 className="text-base font-semibold text-white">1. Upload Photo</h2>
              <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-white/10 bg-[#111418] px-4 py-8 transition hover:border-[#FD267A]/40 hover:bg-[#1a1d23]">
                <svg className="mb-2 h-8 w-8 text-[#667180]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" /></svg>
                <span className="text-sm text-[#8e96a3]">{uploadedFile ? uploadedFile.name : "Click to upload JPG / PNG"}</span>
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPickFile} />
              </label>
              {isHeic && <p className="mt-2 text-xs text-amber-400">HEIC not supported — please convert to JPG first.</p>}
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="mt-3 max-h-56 w-full rounded-xl border border-white/[0.08] object-contain" />
              )}
            </section>

            {/* Mode & Controls */}
            <section className="rounded-card border border-white/[0.08] bg-[#1a1d23] p-5">
              <h2 className="text-base font-semibold text-white">2. Choose Mode</h2>

              {/* Mode toggle — pill segmented control */}
              <div className="mt-3 flex rounded-pill border border-white/[0.08] bg-[#111418] p-1">
                <button
                  type="button"
                  onClick={() => setMode("filters")}
                  className={`flex-1 rounded-pill px-4 py-2.5 text-sm font-medium transition ${
                    mode === "filters"
                      ? "bg-tinder-gradient text-white shadow-md"
                      : "text-[#667180] hover:text-white"
                  }`}
                >
                  Dating Edits
                </button>
                <button
                  type="button"
                  onClick={() => setMode("ai-retouch")}
                  className={`flex-1 rounded-pill px-4 py-2.5 text-sm font-medium transition ${
                    mode === "ai-retouch"
                      ? "bg-tinder-gradient text-white shadow-md"
                      : "text-[#667180] hover:text-white"
                  }`}
                >
                  AI Retouch
                </button>
              </div>

              {/* ── Filters info ── */}
              {mode === "filters" && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-[#8e96a3]">4 professional dating photographer edits via Gemini 3 Pro:</p>
                  <div className="space-y-1.5">
                    {PRESET_INFO.map((f) => (
                      <div key={f.id} className="flex items-center gap-2.5 rounded-lg bg-[#111418] px-3 py-2.5">
                        <span className="text-lg">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-medium text-white">{f.name}</p>
                          <p className="text-[10px] text-[#667180]">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── AI Retouch controls ── */}
              {mode === "ai-retouch" && (
                <div className="mt-4 space-y-3">
                  {/* Provider selector */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex rounded-pill border border-white/[0.08] bg-[#111418] p-1">
                      {(["gemini", "openai"] as Provider[]).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProvider(p)}
                          className={`flex-1 rounded-pill px-3 py-2 text-xs font-medium transition ${
                            provider === p
                              ? "bg-tinder-gradient text-white shadow-md"
                              : "text-[#667180] hover:text-white"
                          }`}
                        >
                          {p === "openai" ? "OpenAI (gpt-4.1)" : "Gemini 3 Pro"}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#667180]">Type what you want — we generate 4 prompt variations and 4 edits for you to pick the best.</p>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Describe how you want the photo to look…"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full rounded-input border border-white/10 bg-[#111418] px-4 py-3 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50 focus:ring-1 focus:ring-[#FD267A]/20"
                  />

                  {/* Suggested prompts */}
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_PROMPTS.map(sp => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setPrompt(sp)}
                        className="rounded-pill bg-white/5 px-3 py-1.5 text-[11px] leading-snug text-[#8e96a3] transition hover:bg-white/10 hover:text-white"
                      >
                        {sp}
                      </button>
                    ))}
                  </div>

                  {/* Advanced panel */}
                  <div className="rounded-xl border border-white/[0.06] bg-[#111418] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#667180]">Advanced (API keys)</p>
                      <button
                        type="button"
                        onClick={() => setAdvancedOpen(v => !v)}
                        className="rounded-pill bg-white/5 px-2.5 py-1 text-[10px] font-medium text-[#8e96a3] transition hover:bg-white/10"
                      >
                        {advancedOpen ? "Hide" : "Show"}
                      </button>
                    </div>
                    {advancedOpen && (
                      <div className="mt-2 grid gap-2">
                        <input type="password" placeholder="OpenAI API key override" value={advOpenAIKey} onChange={e => setAdvOpenAIKey(e.target.value)} className="rounded-input border border-white/10 bg-[#1a1d23] px-3 py-2 text-xs text-white placeholder-[#667180] outline-none" />
                        <input type="password" placeholder="Gemini API key override" value={advGeminiKey} onChange={e => setAdvGeminiKey(e.target.value)} className="rounded-input border border-white/10 bg-[#1a1d23] px-3 py-2 text-xs text-white placeholder-[#667180] outline-none" />
                        <p className="text-[10px] text-[#667180]">Keys are sent server-side per request and never stored.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* At-limit banner */}
              {atLimit && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-red-300">You&apos;ve used all {userInfo?.maxGenerations} free generations.</p>
                  <p className="mt-0.5 text-xs text-red-400/70">Contact admin for more.</p>
                </div>
              )}

              {/* Generate + Reset */}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  disabled={!canGenerate}
                  onClick={onGenerate}
                  className={`flex-1 rounded-pill px-4 py-3 text-sm font-semibold text-white transition ${
                    atLimit
                      ? "cursor-not-allowed bg-[#667180]/30 opacity-50"
                      : "bg-tinder-gradient hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  }`}
                >
                  {atLimit ? "No generations left" : generateLabel}
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-pill border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-[#8e96a3] transition hover:bg-white/10 hover:text-white"
                >
                  Reset
                </button>
              </div>
            </section>
          </aside>

          {/* ──── RIGHT: RESULTS ──── */}
          <section className="rounded-card border border-white/[0.08] bg-[#1a1d23] p-5">
            <h2 className="text-base font-semibold text-white">Results</h2>

            {/* Notices */}
            {(error || notice) && (
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#111418] p-4">
                {error && <p className="text-sm text-red-400">{error}</p>}
                {notice && <p className="text-sm text-emerald-400">{notice}</p>}
              </div>
            )}

            {/* Loading skeletons — 2x2 grid */}
            {loading && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-${i}`} className="animate-pulse rounded-xl border border-white/[0.06] bg-[#111418] p-3">
                    <div className="h-4 w-28 rounded bg-white/10" />
                    <div className="mt-2 h-3 w-40 rounded bg-white/5" />
                    <div className="mt-3 aspect-[3/4] rounded-lg bg-white/[0.06]" />
                    <div className="mt-3 flex gap-2">
                      <div className="h-9 w-16 rounded-pill bg-white/10" />
                      <div className="h-9 w-20 rounded-pill bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results grid — 2x2 */}
            {!loading && attempts.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Always show Original for comparison */}
                {previewUrl && (
                  <article className="rounded-xl border-2 border-dashed border-[#FD267A]/30 bg-[#FD267A]/5 p-3">
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-[#FD267A]">📷 Original</p>
                      <p className="text-[11px] text-[#667180]">Your upload — compare below</p>
                    </div>
                    <button type="button" className="w-full rounded-lg border border-white/[0.06] bg-[#111418] p-1 transition hover:border-[#FD267A]/40" onClick={() => setActiveModalUrl(previewUrl)}>
                      <img src={previewUrl} alt="Original" className="max-h-[420px] w-full rounded object-contain" />
                    </button>
                  </article>
                )}

                {attempts.map((a, idx) => {
                  const filterName = (a.meta?.filterName as string) || `Variation ${idx + 1}`;
                  const filterDesc = (a.meta?.filterDescription as string) || "";
                  const editPrompt = (a.meta?.editPrompt as string) || "";
                  const isPreset = !!a.meta?.filterName;
                  const info = isPreset ? PRESET_INFO[idx] : null;
                  return (
                    <article key={a.attemptId} className="group rounded-xl border border-white/[0.06] bg-[#111418] p-3 transition hover:-translate-y-0.5 hover:border-[#FD267A]/30 hover:shadow-lg">
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-white">
                          {info ? `${info.emoji} ` : ""}{filterName}
                        </p>
                        {filterDesc && <p className="text-[11px] text-[#667180]">{filterDesc}</p>}
                      </div>

                      <button type="button" className="w-full rounded-lg border border-white/[0.06] bg-black/20 p-1 transition hover:border-[#FD267A]/40" onClick={() => setActiveModalUrl(a.url)}>
                        <img src={a.url} alt={filterName} className="max-h-[420px] w-full rounded object-contain" />
                      </button>

                      {/* Prompt display — show for all results */}
                      {(a.revisedPrompt || editPrompt) && (
                        <div className="mt-2 rounded-lg bg-white/[0.03] px-2.5 py-2">
                          {editPrompt && (
                            <p className="text-[10px] text-[#8e96a3]">
                              <span className="font-medium text-[#FD267A]">Prompt:</span> {editPrompt}
                            </p>
                          )}
                          {a.revisedPrompt && a.revisedPrompt !== editPrompt && (
                            <p className="mt-0.5 text-[10px] italic text-[#667180]">
                              <span className="font-medium text-[#FF7854]">Model:</span> {a.revisedPrompt}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => onSaveAttempt(a.attemptId)}
                          className="rounded-pill bg-tinder-gradient px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => onSelectWinner(a.attemptId)}
                          className={`rounded-pill px-4 py-2 text-xs font-semibold transition ${
                            winnerAttemptId === a.attemptId
                              ? "bg-emerald-500 text-white"
                              : "border border-white/10 bg-white/5 text-[#8e96a3] hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {winnerAttemptId === a.attemptId ? "Winner!" : "Best One"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {!loading && attempts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-[#667180]">
                <svg className="mb-3 h-12 w-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-base font-medium">No results yet</p>
                <p className="mt-1 text-sm">Upload a photo and click Generate.</p>
              </div>
            )}
          </section>
        </div>
        )}
      </section>

      {/* ──── Footer ──── */}
      <footer className="mx-auto max-w-[1400px] pb-2 pt-6 text-center">
        <p className="text-[11px] tracking-wide text-[#667180]/60">
          Designed &amp; built by{" "}
          <a
            href="https://notime.world"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#667180]/80 underline decoration-[#FD267A]/30 underline-offset-2 transition hover:text-white hover:decoration-[#FD267A]"
          >
            Reece
          </a>
          {" "}&middot;{" "}
          <a
            href="https://notime.world"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#667180]/80 underline decoration-[#FD267A]/30 underline-offset-2 transition hover:text-white hover:decoration-[#FD267A]"
          >
            notime.world
          </a>
        </p>
      </footer>

      {/* ──── Full-size Modal ──── */}
      {activeModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setActiveModalUrl(null)}>
          <div className="max-h-full w-full max-w-5xl rounded-card border border-white/10 bg-[#1a1d23] p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => setActiveModalUrl(null)} className="rounded-pill bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">Close</button>
            </div>
            <img src={activeModalUrl} alt="Full size" className="max-h-[80vh] w-full object-contain" />
          </div>
        </div>
      )}
    </main>
  );
}
