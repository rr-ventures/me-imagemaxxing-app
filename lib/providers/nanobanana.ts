const IDENTITY_GUARDRAIL =
  `You are a professional dating profile photo editor. Edit the provided photo with these strict rules:
- IDENTITY: Keep the exact same person, face, and body. Never change who they are.
- NO CROPPING: Output the full image at the same aspect ratio.
- NATURAL RESULTS: All edits must look believable — never cartoonish, AI-generated, or over-processed.
- SKIN: Smooth blemishes and even skin tone subtly while keeping real skin texture (pores, natural lines). Never plastic or airbrushed.
- LIGHTING: Enhance to look like soft, flattering natural light or professional studio lighting. Remove harsh shadows on the face.
- EYES: Brighten and sharpen eyes subtly. Add a natural catch-light if missing.
- COLOR: Use warm, inviting tones. Slight golden-hour warmth is ideal for dating photos.
- SHARPNESS: Crisp focus on the face and eyes. Gentle background softening is fine.
- BODY EDITS: Only reshape or modify the body/face if the user explicitly asks (e.g. "improve jawline"). Otherwise, leave proportions untouched.
- OUTPUT QUALITY: Maximum resolution. No compression artifacts. Professional retouching standard.`;

const PROMPT_VARIATION_SYSTEM = `You are helping prepare instructions for an image-editing API. The user will give a single freeform request (like they would in ChatGPT) for how to edit a dating profile photo. Your job is to output exactly 4 slightly different versions of that same request: same intent, but reworded or slightly refined so that 4 separate API calls will produce 4 slightly different results the user can compare. Each version should be one clear instruction (1-2 sentences). Do not add numbering or labels. Output valid JSON only, in this exact shape, with no other text: {"prompts": ["first instruction", "second instruction", "third instruction", "fourth instruction"]}`;

/**
 * Call Gemini text model to generate 4 slightly different phrasings of the user's prompt.
 */
async function getPromptVariations(
  apiKey: string,
  userPrompt: string
): Promise<string[]> {
  const textModel = process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT_VARIATION_SYSTEM }] },
      contents: [{ parts: [{ text: `User's request: ${userPrompt}\n\nOutput the JSON with 4 prompt variations now.` }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });
  const raw = (await res.json().catch(() => null)) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
  if (!res.ok) throw new Error(raw?.error?.message || `Gemini text request failed (${res.status}).`);
  const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini did not return prompt variations.");
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: { prompts?: string[] };
  try {
    parsed = JSON.parse(jsonStr) as { prompts?: string[] };
  } catch {
    throw new Error("Could not parse prompt variations from Gemini.");
  }
  const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts.filter((p): p is string => typeof p === "string" && p.length > 0) : [];
  if (prompts.length < 4) {
    return Array.from({ length: 4 }, (_, i) => (i === 0 ? userPrompt : `${userPrompt} (slight variation ${i + 1} for diversity)`));
  }
  return prompts.slice(0, 4);
}

type Result = { index: number; imageBase64: string; mimeType: string; revisedPrompt: string | null; meta: Record<string, unknown> };

export async function generateWithGemini({
  imageBuffer,
  imageMimeType,
  userPrompt,
  attempts,
  apiKeyOverride,
}: {
  imageBuffer: Buffer;
  imageMimeType: string;
  userPrompt: string;
  attempts: number;
  apiKeyOverride?: string;
}): Promise<Result[]> {
  const apiKey = apiKeyOverride?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Gemini API key not set. In Railway: open your service → Variables tab → add GEMINI_API_KEY.");
  }

  // Step 1: LLM generates 4 slightly different versions of the user's prompt
  const promptVariations = await getPromptVariations(apiKey, userPrompt);

  // Gemini 3 Pro Image (Nano Banana Pro)
  const imageModel = process.env.GEMINI_MODEL?.trim() || "gemini-3-pro-image-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent`;
  const imageBase64 = imageBuffer.toString("base64");
  const imageSize = process.env.GEMINI_IMAGE_SIZE?.trim() || "1K";

  // Step 2: 4 image API calls, each with one of the 4 prompt variations
  const jobs = Array.from({ length: attempts }, async (_, index) => {
    const editPrompt = promptVariations[index] ?? userPrompt;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: `${IDENTITY_GUARDRAIL}\n\nApply this edit to the photo: ${editPrompt}\n\nKeep composition and identity consistent with the source.` },
          { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
        ]}],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { imageSize },
        },
      }),
    });

    const raw = (await res.json().catch(() => null)) as any;
    if (!res.ok) throw new Error(raw?.error?.message || `Gemini request failed (${res.status}).`);

    const parts: any[] = raw?.candidates?.[0]?.content?.parts || [];
    let outData = "";
    let outMime = "image/png";
    let revisedPrompt: string | null = null;

    for (const p of parts) {
      const inline = p.inlineData || (p.inline_data ? { mimeType: p.inline_data.mime_type, data: p.inline_data.data } : undefined);
      if (inline?.data) { outData = inline.data; outMime = inline.mimeType || "image/png"; }
      if (typeof p.text === "string" && p.text.trim()) revisedPrompt = p.text;
    }

    if (!outData) throw new Error("Gemini did not return an image payload.");
    return {
      index,
      imageBase64: outData,
      mimeType: outMime,
      revisedPrompt: revisedPrompt || editPrompt,
      meta: { provider: "gemini", model: imageModel, editPrompt, noCrop: true },
    };
  });

  return Promise.all(jobs);
}

/* ─────── Preset mode: 4 pro dating photographer edits via Gemini 3 Pro ─────── */

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

/**
 * 4 professional dating photographer / editor presets.
 * Each is a detailed editing instruction sent to Gemini 3 Pro Image.
 */
export const DATING_PRESETS: PresetDefinition[] = [
  {
    id: "golden-hour",
    name: "Golden Hour Glow",
    description: "Warm golden-hour lighting — #1 for dating attractiveness.",
    prompt: "Retouch this dating profile photo with warm golden-hour lighting. Add a soft, warm glow as if the photo was taken during late-afternoon golden hour. Subtly smooth skin while keeping real texture. Brighten eyes with a natural catch-light. Warm the overall color grade (golden tones). Gently soften the background. The result should look like a professional dating photographer shot this at magic hour.",
  },
  {
    id: "clean-headshot",
    name: "Clean Pro Headshot",
    description: "Crisp studio-quality headshot — polished and professional.",
    prompt: "Retouch this dating profile photo to look like a professional studio headshot. Use clean, even lighting with no harsh shadows on the face. Sharpen facial details, especially eyes and jawline. Even out skin tone and smooth minor blemishes while keeping natural texture. Keep colors neutral and true-to-life. The result should look like it was shot by a professional portrait photographer in a studio.",
  },
  {
    id: "soft-portrait",
    name: "Soft Flattering Portrait",
    description: "Soft, dreamy, and naturally flattering.",
    prompt: "Retouch this dating profile photo with a soft, flattering portrait style. Lower contrast slightly for a dreamy feel. Smooth skin beautifully while keeping it natural (not plastic). Add soft, diffused lighting. Warm the tones slightly. Add a gentle vignette to draw attention to the face. The result should look approachable, warm, and naturally attractive — like a portrait taken by a photographer who specializes in flattering their subjects.",
  },
  {
    id: "film-editorial",
    name: "Film Editorial",
    description: "Vintage film aesthetic — artistic and distinctive.",
    prompt: "Retouch this dating profile photo in a warm film editorial style. Apply a subtle film color grade: slightly muted saturation, warm shadows, soft highlight rolloff. Add gentle warmth throughout. Keep skin natural but refined. The result should look like it was shot on high-end film stock (Kodak Portra) by a fashion photographer — artistic, distinctive, and effortlessly cool.",
  },
];

/**
 * Run 4 predefined professional dating photographer edits via Gemini 3 Pro Image.
 */
export async function generatePresetEdits({
  imageBuffer,
  imageMimeType,
}: {
  imageBuffer: Buffer;
  imageMimeType: string;
}): Promise<Array<{
  presetId: string;
  imageBase64: string;
  mimeType: string;
  revisedPrompt: string | null;
  meta: Record<string, unknown>;
}>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Gemini API key not set. In Railway: open your service → Variables tab → add GEMINI_API_KEY.");
  }

  const imageModel = process.env.GEMINI_MODEL?.trim() || "gemini-3-pro-image-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent`;
  const imageBase64 = imageBuffer.toString("base64");
  const imageSize = process.env.GEMINI_IMAGE_SIZE?.trim() || "1K";

  const jobs = DATING_PRESETS.map(async (preset) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: `${IDENTITY_GUARDRAIL}\n\n${preset.prompt}\n\nKeep composition and identity consistent with the source photo.` },
          { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
        ]}],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { imageSize },
        },
      }),
    });

    const raw = (await res.json().catch(() => null)) as any;
    if (!res.ok) throw new Error(raw?.error?.message || `Gemini preset request failed for "${preset.name}" (${res.status}).`);

    const parts: any[] = raw?.candidates?.[0]?.content?.parts || [];
    let outData = "";
    let outMime = "image/png";
    let revisedPrompt: string | null = null;

    for (const p of parts) {
      const inline = p.inlineData || (p.inline_data ? { mimeType: p.inline_data.mime_type, data: p.inline_data.data } : undefined);
      if (inline?.data) { outData = inline.data; outMime = inline.mimeType || "image/png"; }
      if (typeof p.text === "string" && p.text.trim()) revisedPrompt = p.text;
    }

    if (!outData) throw new Error(`Gemini did not return an image for preset "${preset.name}".`);

    return {
      presetId: preset.id,
      imageBase64: outData,
      mimeType: outMime,
      revisedPrompt: revisedPrompt || preset.prompt,
      meta: {
        provider: "gemini",
        model: imageModel,
        filterName: preset.name,
        filterDescription: preset.description,
        editPrompt: preset.prompt,
        noCrop: true,
      },
    };
  });

  return Promise.all(jobs);
}
