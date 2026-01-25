# Setup

Professional photo enhancement app for dating profiles and social media.

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- (Optional) Docker for Dev Container

## Quick Start

### 1. Install dependencies

```bash
# Frontend
npm install

# Python backend
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if needed (optional for MVP)
```

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing the Image Processor

Test the Python image processor directly:

```bash
python scripts/image_processor.py path/to/your/photo.jpg ./output
```

This will generate 10 variations in the `./output` folder.

## Project Structure

```
/app                    # Next.js frontend
  /page.tsx            # Main upload UI
  /layout.tsx          # App layout
  /globals.css         # Styles
/scripts                # Python image processing
  /image_processor.py  # 10 professional presets
/presets                # Preset configurations (future)
/public/uploads         # Uploaded images
/docs                   # Documentation
```

## Next Steps (TODO)

1. **Backend API**: Create Flask/FastAPI endpoint to connect frontend → Python processor
2. **File upload**: Wire up actual file upload (currently mock)
3. **Image display**: Show actual processed images instead of placeholders
4. **Batch processing**: Support uploading multiple photos
5. **AI enhancements**: Add OpenAI/Leonardo integration for advanced edits
6. **Download**: Implement actual image download

## Dev Container (Optional)

For a consistent development environment:

1. Install Docker + VS Code Dev Containers extension
2. Open repo → "Reopen in Container"
3. Everything installs automatically
