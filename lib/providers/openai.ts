import OpenAI from "openai";

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

type GenerateWithOpenAIInput = {
  imageBuffer: Buffer;
  imageMimeType: string;
  userPrompt: string;
  attempts: number;
  apiKeyOverride?: string;
};

type OpenAIAttemptResult = {
  index: number;
  imageBase64: string;
  mimeType: string;
  revisedPrompt: string | null;
  meta: Record<string, unknown>;
};

function resolveApiKey(apiKeyOverride?: string) {
  const key =
    apiKeyOverride?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.CHATGPT_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY (or CHATGPT_API_KEY) is not configured. Set it in Railway variables, or enable Advanced mode and paste your key there."
    );
  }
  return key;
}

/**
 * Extract image from Responses API output.
 *
 * Per OpenAI docs (2025+), when using the image_generation tool:
 *   response.output is an array of items.
 *   Items with type === "image_generation_call" have:
 *     - result: string (base64 image data)
 *     - revised_prompt?: string
 *
 * We also handle the nested content[] shape as a fallback in case
 * the SDK ever wraps it differently.
 */
function extractImagePayload(response: unknown) {
  const output = (response as { output?: unknown[] })?.output;
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    const itemAny = item as Record<string, unknown>;

    // Primary path: type === "image_generation_call" with .result
    if (
      itemAny.type === "image_generation_call" &&
      typeof itemAny.result === "string" &&
      itemAny.result.length > 0
    ) {
      return {
        imageBase64: itemAny.result,
        mimeType: "image/png",
        revisedPrompt:
          typeof itemAny.revised_prompt === "string"
            ? itemAny.revised_prompt
            : null,
      };
    }

    // Fallback: nested content[] array (older SDK shapes)
    const content = (itemAny as { content?: unknown[] }).content;
    if (Array.isArray(content)) {
      for (const chunk of content) {
        const chunkAny = chunk as Record<string, unknown>;
        const b64 =
          (typeof chunkAny.result === "string" && chunkAny.result) ||
          (typeof chunkAny.image_base64 === "string" &&
            chunkAny.image_base64) ||
          (typeof chunkAny.b64_json === "string" && chunkAny.b64_json);

        if (b64) {
          return {
            imageBase64: b64,
            mimeType:
              (typeof chunkAny.mime_type === "string" && chunkAny.mime_type) ||
              "image/png",
            revisedPrompt:
              (typeof chunkAny.revised_prompt === "string" &&
                chunkAny.revised_prompt) ||
              null,
          };
        }
      }
    }
  }

  return null;
}

async function generateSingleAttempt(
  client: OpenAI,
  imageDataUrl: string,
  userPrompt: string,
  index: number,
  attempts: number
): Promise<OpenAIAttemptResult> {
  const response = await client.responses.create({
    model: "gpt-4.1",
    tool_choice: { type: "image_generation" },
    tools: [
      {
        type: "image_generation",
        quality: "high",
      },
    ],
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: IDENTITY_GUARDRAIL }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `${userPrompt}\n\nAttempt variation: ${index + 1}/${attempts}. Keep composition and identity consistent with the source photo.`,
          },
          {
            type: "input_image",
            image_url: imageDataUrl,
          },
        ],
      },
    ],
  } as any);

  const payload = extractImagePayload(response);
  if (!payload) {
    console.error(
      "OpenAI response missing image payload. Full response:",
      JSON.stringify(response, null, 2).slice(0, 2000)
    );
    throw new Error(
      "OpenAI did not return an image payload. Check server logs for response shape."
    );
  }

  return {
    index,
    imageBase64: payload.imageBase64,
    mimeType: payload.mimeType,
    revisedPrompt: payload.revisedPrompt,
    meta: {
      provider: "openai",
      orchestratorModel: "gpt-4.1",
      rendererModel: "gpt-image-1 (auto)",
      noCrop: true,
    },
  };
}

export async function generateWithOpenAI({
  imageBuffer,
  imageMimeType,
  userPrompt,
  attempts,
  apiKeyOverride,
}: GenerateWithOpenAIInput): Promise<OpenAIAttemptResult[]> {
  const client = new OpenAI({ apiKey: resolveApiKey(apiKeyOverride) });
  const imageDataUrl = `data:${imageMimeType};base64,${imageBuffer.toString(
    "base64"
  )}`;

  const jobs = Array.from({ length: attempts }, (_, index) =>
    generateSingleAttempt(client, imageDataUrl, userPrompt, index, attempts)
  );

  return Promise.all(jobs);
}
