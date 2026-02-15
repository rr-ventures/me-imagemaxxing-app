# me-imagemaxxing

Upload one photo, generate exactly five identity-safe editing attempts using deterministic presets or AI-powered prompt mode (OpenAI / Gemini).

## Quick Start (local)

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Copy env template and add your API keys
cp .env.example .env.local
# Edit .env.local and paste your keys

# 3. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Preset mode works with zero API keys.** Prompt mode requires either an OpenAI or Gemini key — you can paste it directly in the Advanced panel on the page or set it in `.env.local`.

## Environment Variables

| Variable | Required? | Description |
|---|---|---|
| `DATABASE_PATH` | No | SQLite path. Default: `./data/app.db`. Railway: `/data/app.db` with volume at `/data` |
| `OPENAI_API_KEY` | For OpenAI prompt mode | Your OpenAI key |
| `GEMINI_API_KEY` | For Gemini prompt mode | Your Google AI Studio key |
| `GEMINI_MODEL` | No | Default: `gemini-2.5-flash-image` |

## Railway Deployment

1. Push to GitHub, connect repo in Railway
2. Railway auto-detects `railway.toml` and runs `npm run build && npm run start`
3. **Add volume**: Service Settings → Volumes → Mount at `/data`
4. **Set variables** in Railway dashboard:
   - `DATABASE_PATH` = `/data/app.db`
   - `OPENAI_API_KEY` = your key (optional)
   - `GEMINI_API_KEY` = your key (optional)

That's it. No extra configuration needed.

## Architecture

- **Next.js 14 App Router** (TypeScript, Tailwind)
- **SQLite** via `better-sqlite3` for persistence
- **sharp** for deterministic preset transforms
- **OpenAI Responses API** (`gpt-4.1-mini` orchestrator → `gpt-image-1` renderer)
- **Google Gemini API** (`gemini-2.5-flash-image` via `v1beta/generateContent`)

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload JPG/PNG, returns `imageId` |
| `/api/generate/preset` | POST | Run preset (A/B/C) with 5 jittered variations |
| `/api/generate/prompt` | POST | Run prompt mode (OpenAI or Gemini), 5 attempts |
| `/api/feedback/winner` | POST | Mark a winner for a run |
| `/api/save` | POST | Save/download an attempt |
| `/api/file/[...path]` | GET | Serve files from `/data` |
| `/api/health` | GET | System health + key status |

## Verified API Integration (Feb 2026)

### OpenAI
- Orchestrator: `gpt-4.1-mini` (valid per OpenAI supported models list)
- Renderer: `gpt-image-1` (auto-selected by image_generation tool)
- Response shape: `output[].type === "image_generation_call"`, base64 in `.result`
- Auth: `Authorization: Bearer <key>` (via Node SDK)

### Gemini
- Model: `gemini-2.5-flash-image` (stable, available via AI Studio key)
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Auth: `x-goog-api-key: <key>` header
- Image returned in `candidates[0].content.parts[].inlineData.data` (base64)
