# Shelver

Upload a photograph of a bookshelf, identify visible books with a selectable vision model, resolve metadata/ratings through Google Books, and highlight the original pixels with SVG overlays.

## Architecture

- React + Vite frontend
- Cloudflare Worker API
- OpenAI Responses API for whole-image vision (no automatic shelf cropping)
- Structured JSON output including normalized bounding boxes
- Google Books for cheap canonical metadata and ratings
- SVG overlay over the untouched uploaded image; no generative image editing

## Local setup

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Set `OPENAI_API_KEY` in `.dev.vars`.

## Deploy to Cloudflare

```bash
npx wrangler secret put OPENAI_API_KEY
npm run deploy
```

Or connect this GitHub repository to Cloudflare Workers Builds. Build command: `npm run build`; deploy command: `npx wrangler deploy`.

## Model grading

The UI exposes the vision model. Run the same image through different models and compare title recall, title accuracy, localization and cost/usage. The model allow-list is deliberately server-side in `worker/index.ts`; add/remove models there and in `src/App.tsx` as desired.

## Next steps

1. Persist analyses and manual corrections in D1.
2. Store original images in private R2 for repeatable grading runs.
3. Add side-by-side model runs and a ground-truth correction mode.
4. Add a second whole-image verification pass and only then optional model-requested zooms.
5. Add additional rating providers behind a provider interface.
