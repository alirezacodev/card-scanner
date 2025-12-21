# Car Card Extractor

Minimal Next.js 15 App Router app to capture or upload a car card image, send it to a server-only AI extractor, and display structured JSON results.

## Requirements
- Node.js 18.18+ and npm
- OpenAI API key with vision-capable model access

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` in the project root (see `.env.example`):
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_key_here
   OPENAI_MODEL=gpt-4o-mini
   GEMINI_API_KEY=your_gemini_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

## Usage
- Tap **Take Picture** to open the device camera (uses `capture="environment"`).
- Tap **Upload Picture** to pick an existing image.
- After selection, a thumbnail appears, the image is posted to `/api/extract`, and the JSON response is shown.
- Loading and error states display beneath the controls.

## API
- POST `/api/extract`
  - `multipart/form-data` with field `image`
  - Accepts `image/jpeg`, `image/png`, `image/webp`
  - Max size 5 MB
  - Returns `{ ok: true, data }` or `{ ok: false, error }`

## Provider selection
- Set `AI_PROVIDER` to `openai` or `gemini`.
- `OPENAI_MODEL` defaults to `gpt-4o-mini`; `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
- The server validates that the chosen provider has its API key set.

## Mobile testing tips
- On mobile Safari/Chrome: open your LAN host (e.g., `http://<your-ip>:3000`).
- Ensure the device and dev machine are on the same network; allow camera permissions when prompted.

