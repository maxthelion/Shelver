# Shelver

Upload a photograph of a bookshelf, identify visible books with GPT-5.6 Terra, resolve metadata/ratings through Google Books, and highlight the original pixels with SVG overlays.

## Architecture

- React + Vite frontend
- Cloudflare Worker API
- Two-pass OpenAI Responses API vision: a full shelf catalogue, then a Terra recall audit for missed spines
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

## Analysis approach

Shelver uses GPT-5.6 Terra twice on the same full-resolution image. The first pass catalogues the shelf. The second pass receives the first-pass records and returns only missing books; overlapping boxes are removed before metadata enrichment. This increases recall, but also roughly doubles vision-model latency and cost.

## Next steps

1. Persist analyses and manual corrections in D1.
2. Store original images in private R2 for repeatable grading runs.
3. Add side-by-side model runs and a ground-truth correction mode.
4. Add a second whole-image verification pass and only then optional model-requested zooms.
5. Add additional rating providers behind a provider interface.
