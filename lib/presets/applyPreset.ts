import sharp from "sharp";

export type PresetId = "A" | "B" | "C";

type PresetParams = { brightness: number; saturation: number; contrast: number; warmth: number; sharpness: number };

const variantNames = ["Baseline", "Brighter Lift", "Contrast Pop", "Tone Shift", "Crisp Finish"];
const attemptJitter: Array<Partial<PresetParams>> = [{}, { brightness: 0.04 }, { contrast: 0.06 }, { warmth: 0.08 }, { sharpness: 0.2 }];

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

function baseParams(pid: PresetId, intensity: number): PresetParams {
  const t = clamp(intensity / 100, 0, 1);
  if (pid === "A") return { brightness: 1 + 0.18 * t, saturation: 1 + 0.08 * t, contrast: 1 + 0.08 * t, warmth: 0.12 * t, sharpness: 0.3 * t };
  if (pid === "B") return { brightness: 1 + 0.06 * t, saturation: 1 - 0.12 * t, contrast: 1 + 0.04 * t, warmth: -0.06 * t, sharpness: 0.2 * t };
  return { brightness: 1 + 0.04 * t, saturation: 1 + 0.04 * t, contrast: 1 + 0.2 * t, warmth: 0.04 * t, sharpness: 0.7 * t };
}

export async function applyPreset(inputBuffer: Buffer, presetId: PresetId, intensity: number, attemptIndex: number) {
  const base = baseParams(presetId, intensity);
  const jitter = attemptJitter[attemptIndex] ?? {};
  const params: PresetParams = {
    brightness: base.brightness + (jitter.brightness ?? 0),
    saturation: base.saturation + (jitter.saturation ?? 0),
    contrast: base.contrast + (jitter.contrast ?? 0),
    warmth: base.warmth + (jitter.warmth ?? 0),
    sharpness: clamp(base.sharpness + (jitter.sharpness ?? 0), 0, 2),
  };

  let pipeline = sharp(inputBuffer).rotate();
  pipeline = pipeline.modulate({ brightness: params.brightness, saturation: params.saturation });
  pipeline = pipeline.linear(params.contrast, -(128 * params.contrast) + 128);
  if (Math.abs(params.warmth) > 0.001) {
    pipeline = pipeline.tint({ r: clamp(Math.round(255 + params.warmth * 30), 0, 255), g: 255, b: clamp(Math.round(255 - params.warmth * 30), 0, 255) });
  }
  if (params.sharpness > 0.01) {
    pipeline = pipeline.sharpen({ sigma: 1 + params.sharpness, m1: 1, m2: 2, x1: 2, y2: 10, y3: 20 });
  }

  const outputBuffer = await pipeline.jpeg({ quality: 95 }).toBuffer();
  return {
    outputBuffer,
    meta: { presetId, attemptIndex, variantName: variantNames[attemptIndex] ?? `Variation ${attemptIndex + 1}`, intensity, params, noCrop: true },
  };
}
