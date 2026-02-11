"use client";

import { useEffect, useMemo, useState } from "react";

/* ─────── Types ─────── */
type Mode = "preset" | "prompt";
type Provider = "openai" | "gemini";
type PresetId = "A" | "B" | "C";
type Attempt = { attemptId: string; url: string; meta?: Record<string, unknown>; revisedPrompt?: string | null };
type HealthChecks = { openaiConfigured?: boolean; geminiConfigured?: boolean; uploadsDirExists?: boolean; outputsDirExists?: boolean; databaseDirWritable?: boolean };

/* ─────── Helpers ─────── */
function parseApi<T>(res: Response, json: any): T {
  if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || `Request failed (${res.status}).`);
  return json as T;
}

/* ─────── Suggested prompts ─────── */
const SUGGESTED_PROMPTS = [
  "Improve lighting, warm tones, dating profile look",
  "Natural skin retouching, keep texture, brightened eyes",
  "Soft studio portrait light, shallow depth of field",
  "High-fashion editorial look, cinematic color grade",
  "Clean and sharp, subtle glow, professional headshot",
];

/* ─────── Page ─────── */
export default function Home() {
  /* Upload */
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* Mode + Provider */
  const [mode, setMode] = useState<Mode>("preset");
  const [provider, setProvider] = useState<Provider>("openai");

  /* Preset controls */
  const [presetId, setPresetId] = useState<PresetId>("A");
  const [intensity, setIntensity] = useState(50);

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
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  /* Health */
  const [health, setHealth] = useState<HealthChecks | null>(null);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(d => { if (d.ok) setHealth(d.checks ?? null); }).catch(() => {});
  }, []);

  /* ─── Computed ─── */
  const canGenerate = useMemo(() => {
    if (!imageId || loading) return false;
    if (mode === "prompt" && !prompt.trim()) return false;
    return true;
  }, [imageId, loading, mode, prompt]);

  const generateLabel = useMemo(() => {
    if (loading) return "Generating...";
    if (mode === "preset") return "Generate 5 Preset Variations";
    return `Generate 5 via ${provider === "openai" ? "OpenAI" : "Gemini"}`;
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
      setLastRequestId(json.requestId ?? null);
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
      if (mode === "preset") {
        res = await fetch("/api/generate/preset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId, presetId, intensity, attempts: 5 }),
        });
      } else {
        const advanced: Record<string, string> = {};
        if (advOpenAIKey.trim()) advanced.openaiApiKey = advOpenAIKey.trim();
        if (advGeminiKey.trim()) advanced.geminiApiKey = advGeminiKey.trim();
        res = await fetch("/api/generate/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId, provider, prompt: prompt.trim(), attempts: 5, advanced: Object.keys(advanced).length ? advanced : undefined }),
        });
      }
      const json = await res.json();
      setLastRequestId(json.requestId ?? null);
      const data = parseApi<{ runId: string; attempts: Attempt[] }>(res, json);
      setRunId(data.runId);
      setAttempts(data.attempts);
      setNotice(`Generated ${data.attempts.length} attempt(s).`);
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

  /* ─── Copy metadata ─── */
  function onCopyMeta(attempt: Attempt) {
    const payload = { attemptId: attempt.attemptId, meta: attempt.meta, revisedPrompt: attempt.revisedPrompt };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => setNotice("Metadata copied."));
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
    setLastRequestId(null);
    setPrompt("");
    setAdvOpenAIKey("");
    setAdvGeminiKey("");
  }

  /* ─────── Render ─────── */
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#172554] px-6 py-8 text-slate-100">
      <section className="mx-auto max-w-[1600px] space-y-6">

        {/* ──── Header ──── */}
        <header className="rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Studio Console</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">me-imagemaxxing</h1>
            </div>
            <a href="/api/health" target="_blank" rel="noreferrer" className="rounded-xl border border-cyan-300/30 bg-cyan-500/20 px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/30">Health Check JSON</a>
          </div>
          <p className="mt-3 text-slate-200">Upload one photo and generate exactly five attempts in preset or prompt mode.</p>
          <p className="mt-1 text-sm text-slate-300/90">No cropping. Identity preserved by default. Prompt mode always edits from your uploaded photo.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full border px-3 py-1 ${health?.openaiConfigured ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200" : "border-amber-400/60 bg-amber-500/20 text-amber-200"}`}>OpenAI {health?.openaiConfigured ? "configured" : "not configured"}</span>
            <span className={`rounded-full border px-3 py-1 ${health?.geminiConfigured ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200" : "border-amber-400/60 bg-amber-500/20 text-amber-200"}`}>Gemini {health?.geminiConfigured ? "configured" : "not configured"}</span>
          </div>
        </header>

        {/* ──── Two-column layout ──── */}
        <div className="grid grid-cols-[420px_minmax(0,1fr)] gap-6">

          {/* ──── LEFT SIDEBAR ──── */}
          <aside className="space-y-6">

            {/* Upload */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">1) Upload Photo</h2>
              <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-10 transition hover:border-cyan-300/50 hover:bg-white/10">
                <span className="text-sm text-slate-300">{uploadedFile ? uploadedFile.name : "Click or drop a JPG / PNG"}</span>
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPickFile} />
              </label>
              {isHeic && <p className="mt-2 text-xs text-amber-300">HEIC not supported — please convert to JPG first.</p>}
              {previewUrl && <img src={previewUrl} alt="Preview" className="mt-4 max-h-60 w-full rounded-xl border border-white/10 object-contain" />}
            </section>

            {/* Mode & Controls */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">2) Mode & Controls</h2>

              {/* Mode toggle */}
              <div className="mt-4 flex gap-2">
                {(["preset", "prompt"] as Mode[]).map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${mode === m ? "bg-cyan-400 text-slate-950" : "border border-white/20 bg-white/10 text-slate-100 hover:bg-white/20"}`}>{m === "preset" ? "Preset" : "Prompt"}</button>
                ))}
              </div>

              {/* Provider selector (prompt mode) */}
              {mode === "prompt" && (
                <div className="mt-3 flex gap-2">
                  {(["openai", "gemini"] as Provider[]).map(p => (
                    <button key={p} type="button" onClick={() => setProvider(p)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition ${provider === p ? "bg-indigo-500 text-white" : "border border-white/20 bg-white/10 text-slate-200 hover:bg-white/20"}`}>{p === "openai" ? "OpenAI (gpt-4.1-mini)" : "Gemini (2.5 flash)"}</button>
                  ))}
                </div>
              )}

              {/* ── Preset controls ── */}
              {mode === "preset" && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    {(["A", "B", "C"] as PresetId[]).map(id => (
                      <button key={id} type="button" onClick={() => setPresetId(id)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition ${presetId === id ? "bg-cyan-400 text-slate-950" : "border border-white/20 bg-white/10 text-slate-200 hover:bg-white/20"}`}>
                        {id === "A" ? "A – Clean+Bright" : id === "B" ? "B – Natural/Low-sat" : "C – Crisp/Depth"}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="flex items-center justify-between text-xs text-slate-300">
                      <span>Intensity</span><span>{intensity}%</span>
                    </label>
                    <input type="range" min={0} max={100} value={intensity} onChange={e => setIntensity(Number(e.target.value))} className="mt-1 w-full accent-cyan-400" />
                  </div>
                </div>
              )}

              {/* ── Prompt controls ── */}
              {mode === "prompt" && (
                <div className="mt-4 space-y-3">
                  <textarea rows={3} placeholder="Describe how you want the photo to look..." value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder-slate-400 outline-none transition focus:border-cyan-300/50" />

                  {/* Suggested prompts */}
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_PROMPTS.map(sp => (
                      <button key={sp} type="button" onClick={() => setPrompt(sp)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/20">{sp}</button>
                    ))}
                  </div>

                  {/* Advanced panel */}
                  <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-amber-200">Advanced (paste keys for testing)</p>
                      <button type="button" onClick={() => setAdvancedOpen(v => !v)} className="rounded bg-amber-400/20 px-2 py-1 text-xs font-medium text-amber-100 transition hover:bg-amber-400/35">{advancedOpen ? "Hide" : "Show"}</button>
                    </div>
                    {advancedOpen && (
                      <div className="mt-2 grid gap-2">
                        <input type="password" placeholder="OpenAI API key override" value={advOpenAIKey} onChange={e => setAdvOpenAIKey(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs text-slate-100 placeholder-slate-400 outline-none" />
                        <input type="password" placeholder="Gemini API key override" value={advGeminiKey} onChange={e => setAdvGeminiKey(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs text-slate-100 placeholder-slate-400 outline-none" />
                        <p className="text-[10px] text-amber-300/70">Keys are sent server-side per request and never stored.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generate + Reset */}
              <div className="mt-5 flex gap-2">
                <button type="button" disabled={!canGenerate} onClick={onGenerate} className="flex-1 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900/50 disabled:text-slate-400">{generateLabel}</button>
                <button type="button" onClick={resetAll} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-slate-100 transition hover:bg-white/20">Reset</button>
              </div>
            </section>
          </aside>

          {/* ──── RIGHT: RESULTS ──── */}
          <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Results</h2>

            {/* Notices */}
            {(error || notice || lastRequestId) && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                {error && <p className="text-sm text-rose-300">{error}</p>}
                {notice && <p className="text-sm text-emerald-300">{notice}</p>}
                {lastRequestId && <p className="mt-1 text-xs text-slate-400">Request ID: <span className="font-mono">{lastRequestId}</span></p>}
              </div>
            )}

            {/* Loading skeletons */}
            {loading && (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={`skel-${i}`} className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="h-4 w-24 rounded bg-white/10" />
                    <div className="mt-3 aspect-[3/4] rounded-lg bg-white/10" />
                    <div className="mt-3 flex gap-2">
                      <div className="h-8 w-16 rounded bg-white/10" />
                      <div className="h-8 w-20 rounded bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results grid */}
            {!loading && attempts.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {attempts.map((a, idx) => (
                  <article key={a.attemptId} className="group rounded-xl border border-white/10 bg-black/20 p-3 transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:shadow-xl">
                    <p className="mb-2 text-sm font-medium text-slate-100">Attempt {idx + 1}{a.meta?.variantName ? ` – ${a.meta.variantName}` : ""}</p>
                    <button type="button" className="w-full rounded-lg border border-white/20 bg-black/30 p-2 transition hover:border-cyan-300/60" onClick={() => setActiveModalUrl(a.url)}>
                      <img src={a.url} alt={`Attempt ${idx + 1}`} className="max-h-[460px] w-full object-contain" />
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => onSaveAttempt(a.attemptId)} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-medium text-slate-950 transition hover:bg-cyan-400">Save</button>
                      <button onClick={() => onSelectWinner(a.attemptId)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${winnerAttemptId === a.attemptId ? "bg-emerald-500 text-white" : "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/35"}`}>{winnerAttemptId === a.attemptId ? "Winner!" : "Select Winner"}</button>
                      <button onClick={() => onCopyMeta(a)} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100 transition hover:bg-white/20">Copy metadata</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && attempts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <p className="text-lg">No results yet</p>
                <p className="mt-1 text-sm">Upload a photo and click Generate.</p>
              </div>
            )}
          </section>
        </div>
      </section>

      {/* ──── Full-size Modal ──── */}
      {activeModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md" onClick={() => setActiveModalUrl(null)}>
          <div className="max-h-full w-full max-w-6xl rounded-2xl border border-white/20 bg-slate-900 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setActiveModalUrl(null)} className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20">Close</button>
            </div>
            <img src={activeModalUrl} alt="Full size" className="max-h-[80vh] w-full object-contain" />
          </div>
        </div>
      )}
    </main>
  );
}
