const IDENTITY_GUARDRAIL =
  "Edit the provided photo. Keep the same person/identity. No cropping. Natural results. No face/body reshaping unless explicitly requested by user. Improve lighting/color/texture naturally. Avoid over-smoothing and over-sharpening.";

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
