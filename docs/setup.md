# Setup

## Local Development

```bash
npm install
cp .env.example .env.local   # edit and add your API keys
npm run dev
```

Open http://localhost:3000

## Railway Deployment

1. Push to GitHub, connect repo in Railway
2. Add volume: Service Settings → Volumes → mount at `/data`
3. Set environment variables in Railway dashboard:
   - `DATABASE_PATH` = `/data/app.db`
   - `OPENAI_API_KEY` = your key (optional)
   - `GEMINI_API_KEY` = your key (optional)

See `README.md` for full details.
