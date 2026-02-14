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
    throw new Error("GEMINI_API_KEY is not configured. Set it in Railway variables, or enable Advanced mode and paste your key there.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-image";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const imageBase64 = imageBuffer.toString("base64");

  const jobs = Array.from({ length: attempts }, async (_, index) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: `${IDENTITY_GUARDRAIL}\n\n${userPrompt}\n\nAttempt variation: ${index + 1}/${attempts}. Keep composition and identity consistent with the source photo.` },
          { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
        ]}],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
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
    return { index, imageBase64: outData, mimeType: outMime, revisedPrompt, meta: { provider: "gemini", model, noCrop: true } };
  });

  return Promise.all(jobs);
}
