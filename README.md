# Shelver

Experimental web app for identifying books in shelf photographs and benchmarking vision models.

## Grading harness

Upload one image and run it repeatedly with different models. Every result is retained in browser memory. Seed ground truth from the best run, correct titles/authors once, add missed books, and compare all runs.

Metrics: precision, recall, F1, fuzzy title accuracy, fuzzy author accuracy, bounding-box IoU where ground-truth boxes exist, false positives, misses, latency and API token use.

The grader deliberately keeps recognition and grading separate. A model's own confidence is not used to decide whether it is correct.

## Models

The model allow-list is in both `src/App.tsx` and `worker/index.ts`. Keep them synchronized. The harness is intended for experimentation; remove models your API project cannot access.

## Setup

```sh
npm install
cp .dev.vars.example .dev.vars
# add OPENAI_API_KEY
npm run dev
```

For Cloudflare, store the key as a Worker secret:

```sh
npx wrangler secret put OPENAI_API_KEY
```

Then deploy with:

```sh
npm run deploy
```

The API key is read only by the Worker and is never sent to the browser.

## Current recognition strategy

The original whole image is sent to the selected vision model. No automatic shelf cropping is performed. The model returns structured title, author, confidence and normalized bounding-box data. Bibliographic enrichment is performed separately.

## Grading workflow

1. Upload one representative shelf image.
2. Run several models against exactly the same upload.
3. Choose the most complete run and **Seed ground truth**.
4. Correct its title/author fields, remove hallucinations and add missed books.
5. The leaderboard recomputes automatically.
6. Prefer F1/recall for catalogue completeness, then inspect title accuracy, latency and token usage to choose the cheapest acceptable model.

Ground truth is intentionally user-edited rather than model-generated truth. For a persistent benchmark suite, the next step is storing experiments in D1/R2.