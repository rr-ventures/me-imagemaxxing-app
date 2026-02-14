import sharp from "sharp";

/**
 * 5 research-backed dating profile photo filters.
 *
 * Sources:
 * - OKCupid blog data: warm tones & high contrast get more messages
 * - Photofeeler studies: bright, warm photos score highest for attractiveness
 * - TheUltimateProfile.com 2025 study: enhanced photos get 41% more swipes,
 *   but over-editing triggers uncanny valley → keep it subtle & natural
 * - Hinge data: naturally bright, high-quality photos outperform all others
 */

export type FilterId = "golden-hour" | "clean-sharp" | "vivid-pop" | "soft-portrait" | "film-warm";

export interface FilterDefinition {
  id: FilterId;
  name: string;
  description: string;
  params: FilterParams;
}

interface FilterParams {
  brightness: number;       // multiplier, 1 = no change
  saturation: number;       // multiplier, 1 = no change
  contrast: number;         // multiplier for linear(), 1 = no change
  warmthShift: number;      // kelvin-style: positive = warmer, negative = cooler. Range roughly -30 to +30
  sharpness: number;        // sigma for sharpen, 0 = no sharpening
  shadowLift: number;       // 0-50, lifts dark tones (0 = no lift)
  highlightCompress: number; // 0-30, compresses bright tones (0 = no compression)
  vignetteStrength: number; // 0-1, subtle vignette to draw eye to center
}

/**
 * The 5 dating-optimized filters, ranked by research effectiveness:
 *
 * 1. Golden Hour — warm glow, #1 most effective for dating (warm tones = +27% attractiveness)
 * 2. Clean & Sharp — professional headshot look (high-quality photos = 272% more matches)
 * 3. Vivid Pop — thumbnail-optimized contrast (high contrast = 32% more engagement)
 * 4. Soft Portrait — flattering portrait light (mimics pro photography)
 * 5. Film Warm — instagram aesthetic (perceived as more creative/interesting)
 */
export const FILTERS: FilterDefinition[] = [
  {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Warm golden tones, soft glow — the #1 dating photo filter based on research",
    params: {
      brightness: 1.08,
      saturation: 1.10,
      contrast: 1.06,
      warmthShift: 20,
      sharpness: 0.5,
      shadowLift: 15,
      highlightCompress: 5,
      vignetteStrength: 0.15,
    },
  },
  {
    id: "clean-sharp",
    name: "Clean & Sharp",
    description: "Professional headshot quality — crisp, bright, polished",
    params: {
      brightness: 1.10,
      saturation: 1.04,
      contrast: 1.10,
      warmthShift: 5,
      sharpness: 1.2,
      shadowLift: 10,
      highlightCompress: 0,
      vignetteStrength: 0,
    },
  },
  {
    id: "vivid-pop",
    name: "Vivid Pop",
    description: "Rich colors & strong contrast — stands out in the swipe deck",
    params: {
      brightness: 1.05,
      saturation: 1.18,
      contrast: 1.15,
      warmthShift: 8,
      sharpness: 0.8,
      shadowLift: 5,
      highlightCompress: 5,
      vignetteStrength: 0.1,
    },
  },
  {
    id: "soft-portrait",
    name: "Soft Portrait",
    description: "Gentle, flattering light — smooths imperfections naturally",
    params: {
      brightness: 1.12,
      saturation: 1.06,
      contrast: 0.95,
      warmthShift: 12,
      sharpness: 0.3,
      shadowLift: 20,
      highlightCompress: 10,
      vignetteStrength: 0.2,
    },
  },
  {
    id: "film-warm",
    name: "Film Warm",
    description: "Vintage film tones — perceived as more creative & interesting",
    params: {
      brightness: 1.04,
      saturation: 0.92,
      contrast: 1.08,
      warmthShift: 15,
      sharpness: 0.4,
      shadowLift: 25,
      highlightCompress: 15,
      vignetteStrength: 0.18,
    },
  },
];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Apply warmth by adjusting RGB channels directly via recomb matrix.
 * This avoids the Sharp tint() bug where near-white values strip all color.
 *
 * Positive warmthShift = warmer (boost red, reduce blue)
 * Negative warmthShift = cooler (boost blue, reduce red)
 */
function warmthMatrix(shift: number): [number[], number[], number[]] {
  // Normalize shift to a small multiplier (shift range: -30 to +30)
  const s = shift / 100;
  return [
    [1 + s * 0.6, s * 0.2, 0],          // Red channel: boost red
    [0, 1 + s * 0.1, 0],                 // Green: slight boost for warmth
    [0, s * 0.1, 1 - s * 0.4],           // Blue channel: reduce blue for warmth
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
