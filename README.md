# Shelver

Book-shelf recognition experiment for Cloudflare Workers.

## Automatic model grading

The grading build is intentionally low-touch:

1. Upload one shelf photograph.
2. Click **Grade models**.
3. The configured vision models run sequentially against the exact same original image.
4. Shelver fuzzy-matches title + author across their outputs and builds an automatic consensus catalogue.
5. The leaderboard reports titles found, unique titles, cross-model consensus matches, agreement rate, single-model-only claims, latency and token usage.

This is not labelled as absolute ground truth: a title found by several independent models is stronger evidence, while a title found by only one may either be an excellent unique find or a hallucination. The goal is to make model comparison immediately useful without requiring a manual catalogue first.

The image is never generatively modified. Detection boxes are rendered as SVG overlays over the original upload.

## Setup

```sh
bun install
cp .dev.vars.example .dev.vars
# add OPENAI_API_KEY
bun run dev
```

Cloudflare secret:

```sh
npx wrangler secret put OPENAI_API_KEY
```

Deploy:

```sh
bun run deploy
```

The API key is only available to the Worker.

## Recognition strategy

Each model receives the original whole image. There is no automatic shelf segmentation or cropping. It returns structured title, author, confidence and normalized bounding-box data. Google Books enrichment is separate from visual recognition.

The benchmark model list is currently configured in `src/App.tsx` and must also be allowed in `worker/index.ts`. A model that is unavailable to the API project will fail individually while the remaining benchmark continues.