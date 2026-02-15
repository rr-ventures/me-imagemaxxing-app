import sharp from "sharp";

/**
 * 5 research-backed dating profile photo filters (Sharp — no API calls).
 *
 * Research sources:
 * - 1.8M profile study: warm tones +18% attractiveness, bright +14% energy, earth tones +12% approachability
 * - TheUltimateProfile 2025: enhanced photos 41% more swipes; pro-quality 272% more matches; subtle = key
 * - VSCO portrait presets (E3, KP2/Kodak Portra, A6): exposure +0.7–1.3, contrast -1.3 to -1.5, warmth, sharpen 0.7–0.9
 * - Instagram/Juno-style: brighten subject, warm skin, added contrast for portraits
 */

export type FilterId = "golden-hour" | "clean-sharp" | "vivid-pop" | "soft-portrait" | "film-warm";

export interface FilterDefinition {
  id: FilterId;
  name: string;
  description: string;
  params: FilterParams;
}

interface FilterParams {
  brightness: number;
  saturation: number;
  contrast: number;
  warmthShift: number;
  sharpness: number;
  shadowLift: number;
  highlightCompress: number;
  vignetteStrength: number;
}

/**
 * Professional photoshoot-level presets. Values pushed so each of the 5 looks clearly different.
 * Research: warm +18% attractiveness, pro quality 272% more matches, VSCO/Portra-style reference.
 */
export const FILTERS: FilterDefinition[] = [
  {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Warm tones (+18% attractiveness). Strong golden glow, lifted shadows.",
    params: {
      brightness: 1.18,
      saturation: 1.20,
      contrast: 1.05,
      warmthShift: 42,
      sharpness: 0.4,
      shadowLift: 28,
      highlightCompress: 8,
      vignetteStrength: 0.28,
    },
  },
  {
    id: "clean-sharp",
    name: "Clean & Sharp",
    description: "Pro headshot. Crisp detail, neutral-cool, high clarity.",
    params: {
      brightness: 1.16,
      saturation: 1.02,
      contrast: 1.22,
      warmthShift: -4,
      sharpness: 1.6,
      shadowLift: 14,
      highlightCompress: 0,
      vignetteStrength: 0,
    },
  },
  {
    id: "vivid-pop",
    name: "Vivid Pop",
    description: "Rich color & punch. Stands out in the swipe deck.",
    params: {
      brightness: 1.08,
      saturation: 1.38,
      contrast: 1.28,
      warmthShift: 12,
      sharpness: 1.0,
      shadowLift: 8,
      highlightCompress: 4,
      vignetteStrength: 0.14,
    },
  },
  {
    id: "soft-portrait",
    name: "Soft Portrait",
    description: "VSCO Portra-style. Soft, flattering, dreamy.",
    params: {
      brightness: 1.12,
      saturation: 1.06,
      contrast: 0.82,
      warmthShift: 24,
      sharpness: 0.25,
      shadowLift: 36,
      highlightCompress: 18,
      vignetteStrength: 0.32,
    },
  },
  {
    id: "film-warm",
    name: "Film Warm",
    description: "Vintage film. Muted color, warm shadows, editorial look.",
    params: {
      brightness: 1.02,
      saturation: 0.78,
      contrast: 1.12,
      warmthShift: 38,
      sharpness: 0.35,
      shadowLift: 42,
      highlightCompress: 24,
      vignetteStrength: 0.36,
    },
  },
];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Sharp recomb() expects a 3x3 matrix (tuple of 3 tuples of 3 numbers). */
type Matrix3x3 = [[number, number, number], [number, number, number], [number, number, number]];

/**
 * Apply warmth by adjusting RGB channels directly via recomb matrix.
 * This avoids the Sharp tint() bug where near-white values strip all color.
 *
 * Positive warmthShift = warmer (boost red, reduce blue)
 * Negative warmthShift = cooler (boost blue, reduce red)
 */
function warmthMatrix(shift: number): Matrix3x3 {
  const s = shift / 100;
  return [
    [1 + s * 0.6, s * 0.2, 0],
    [0, 1 + s * 0.1, 0],
    [0, s * 0.1, 1 - s * 0.4],
  ];
}

/**
 * Apply shadow lift and highlight compression using a tone curve via linear.
 * shadowLift: raises the black point (0-50)
 * highlightCompress: lowers the white point (0-30)
 */
function buildToneCurve(shadowLift: number, highlightCompress: number) {
  // Map 0-255 range: new_black = shadowLift, new_white = 255 - highlightCompress
  const newBlack = clamp(shadowLift, 0, 50);
  const newWhite = clamp(255 - highlightCompress, 225, 255);
  const scale = (newWhite - newBlack) / 255;
  return { a: scale, b: newBlack };
}

export async function applyFilter(inputBuffer: Buffer, filterId: FilterId): Promise<{
  outputBuffer: Buffer;
  meta: Record<string, unknown>;
}> {
  const filter = FILTERS.find((f) => f.id === filterId);
  if (!filter) throw new Error(`Unknown filter: ${filterId}`);

  const p = filter.params;
  let pipeline = sharp(inputBuffer).rotate(); // auto-rotate based on EXIF

  // 1. Brightness & saturation
  pipeline = pipeline.modulate({
    brightness: p.brightness,
    saturation: p.saturation,
  });

  // 2. Contrast via linear transform
  if (Math.abs(p.contrast - 1) > 0.001) {
    const offset = 128 * (1 - p.contrast);
    pipeline = pipeline.linear(p.contrast, offset);
  }

  // 3. Warmth via color matrix (NOT tint — avoids the desaturation bug)
  if (Math.abs(p.warmthShift) > 0.5) {
    pipeline = pipeline.recomb(warmthMatrix(p.warmthShift));
  }

  // 4. Shadow lift + highlight compression
  if (p.shadowLift > 0 || p.highlightCompress > 0) {
    const tone = buildToneCurve(p.shadowLift, p.highlightCompress);
    pipeline = pipeline.linear(tone.a, tone.b);
  }

  // 5. Sharpening
  if (p.sharpness > 0.05) {
    pipeline = pipeline.sharpen({
      sigma: 0.8 + p.sharpness,
      m1: 1.0,
      m2: 2.0,
      x1: 2,
      y2: 10,
      y3: 20,
    });
  }

  // 6. Vignette (composite a dark gradient overlay)
  if (p.vignetteStrength > 0.01) {
    const metadata = await sharp(inputBuffer).metadata();
    const w = metadata.width || 800;
    const h = metadata.height || 800;

    // Create radial gradient vignette using SVG
    const strength = Math.round(p.vignetteStrength * 255);
    const vignetteSvg = Buffer.from(`
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stop-color="black" stop-opacity="0"/>
            <stop offset="100%" stop-color="black" stop-opacity="${(strength / 255).toFixed(2)}"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#v)"/>
      </svg>
    `);

    pipeline = pipeline.composite([
      { input: vignetteSvg, blend: "multiply" },
    ]);
  }

  const outputBuffer = await pipeline.jpeg({ quality: 95 }).toBuffer();

  return {
    outputBuffer,
    meta: {
      filterId: filter.id,
      filterName: filter.name,
      filterDescription: filter.description,
      noCrop: true,
    },
  };
}

/**
 * Apply all 5 filters to a single image. Returns one result per filter.
 */
export async function applyAllFilters(inputBuffer: Buffer): Promise<
  Array<{ filterId: FilterId; outputBuffer: Buffer; meta: Record<string, unknown> }>
> {
  const results = await Promise.all(
    FILTERS.map(async (f) => {
      const { outputBuffer, meta } = await applyFilter(inputBuffer, f.id);
      return { filterId: f.id, outputBuffer, meta };
    })
  );
  return results;
}
