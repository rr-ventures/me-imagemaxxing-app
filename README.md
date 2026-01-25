# me-imagemaxxing-app

**Turn average photos into dating profile & social media ready images.**

This app generates 10 professionally-edited variations of your photos using Fiverr-quality presets optimized for dating profiles, Instagram, and TikTok.

## What this does

Upload photos → AI generates 10 variations with professional presets → pick your favorite → download

**Goal:** Transform 6/10 photos into 9/10 photos purely through editing (filters, lighting, shadows, color grading)

## Features

- **Batch upload** (up to 100 photos)
- **10 professional presets** based on actual Fiverr dating profile editing techniques
- **Side-by-side comparison** view
- **Download selected variations**
- **Optional AI enhancements** (coming soon: fix double chin, smooth hair, etc.)

## Tech Stack

- **Frontend:** Next.js + React + Tailwind CSS
- **Image Processing:** Python + Pillow
- **Presets:** Professional portrait retouching techniques (dodge & burn, color grading, skin smoothing)

## Professional Editing Techniques Used

Based on [Fiverr professional editing practices](https://www.fiverr.com/smastudio/professionally-edit-your-tinder-profile-photos-in-photoshop) and [portrait retouching guides](https://pixelphant.com/blog/expert-portrait-retouching-guide):

1. **Natural enhancement** - Subtle edits that don't look fake
2. **Color grading** - Warm/cool tones optimized for each platform
3. **Dodge & burn** - Sculpt face, enhance cheekbones, add eye sparkle
4. **Skin smoothing** - Frequency separation without over-smoothing
5. **Contrast & exposure** - Professional depth and dimension

## How to run

1. Open in Dev Container → follow `docs/setup.md`
2. Install dependencies: `npm install && pip install -r requirements.txt`
3. Run dev server: `npm run dev`
4. Open `http://localhost:3000`

## Project Structure

```
/app                 # Next.js frontend
/scripts             # Python image processing scripts
/presets             # 10 professional editing presets
/docs/images         # Before/after examples
```

## Screenshots

Put before/after images in `docs/images/`
