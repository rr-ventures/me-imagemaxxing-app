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

const PROMPT_VARIATION_SYSTEM = `You are helping prepare instructions for an image-editing API. The user will give a single freeform request (like they would in ChatGPT) for how to edit a dating profile photo. Your job is to output exactly 4 slightly different versions of that same request: same intent, but reworded or slightly refined so that 4 separate API calls will produce 4 slightly different results the user can compare. Each version should be one clear instruction (1-2 sentences). Output valid JSON only, in this exact shape, with no other text: {"prompts": ["first instruction", "second instruction", "third instruction", "fourth instruction"]}`;

/**
 * Call OpenAI chat to generate 4 slightly different phrasings of the user's prompt.
 */
async function getPromptVariations(
  client: OpenAI,
  userPrompt: string
): Promise<string[]> {
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini",
    messages: [
      { role: "system", content: PROMPT_VARIATION_SYSTEM },
      { role: "user", content: `User's request: ${userPrompt}\n\nOutput the JSON with 4 prompt variations now.` },
    ],
    temperature: 0.7,
  });
  const text = res.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI did not return prompt variations.");
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: { prompts?: string[] };
  try {
    parsed = JSON.parse(jsonStr) as { prompts?: string[] };
  } catch {
    throw new Error("Could not parse prompt variations from OpenAI.");
  }
  const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts.filter((p): p is string => typeof p === "string" && p.length > 0) : [];
  if (prompts.length < 4) {
    return Array.from({ length: 4 }, (_, i) => (i === 0 ? userPrompt : `${userPrompt} (slight variation ${i + 1} for diversity)`));
  }
  return prompts.slice(0, 4);
}

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
      "OpenAI API key not set. In Railway: open your service → Variables tab → add OPENAI_API_KEY or CHATGPT_API_KEY (service variables, not only Shared). Or use Advanced mode below and paste a key."
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
  editPrompt: string,
  index: number
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
            text: `Apply this edit to the photo: ${editPrompt}\n\nKeep composition and identity consistent with the source.`,
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
    revisedPrompt: payload.revisedPrompt || editPrompt,
    meta: {
      provider: "openai",
      orchestratorModel: "gpt-4.1",
      rendererModel: "gpt-image-1 (auto)",
      editPrompt,
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

  // Step 1: LLM generates 4 slightly different versions of the user's prompt
  const promptVariations = await getPromptVariations(client, userPrompt);

  // Step 2: 4 image API calls, each with one of the 4 prompt variations
  const jobs = Array.from({ length: attempts }, (_, index) =>
    generateSingleAttempt(
      client,
      imageDataUrl,
      promptVariations[index] ?? userPrompt,
      index
    )
  );

  return Promise.all(jobs);
}
