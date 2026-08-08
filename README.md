# Shelver

Shelver turns a photograph of a bookshelf into a useful catalogue of the books it can see.

The intended experience is deliberately simple: upload a photograph, let a vision model read the shelf, resolve the identified books against bibliographic data, and present the results as a list that can be sorted and related back to the original image. Ratings and other metadata can then be attached without asking the vision model to do work that ordinary APIs can do more cheaply and reliably.

Shelver is also an experiment in finding the cheapest model that is *actually good enough* at this particular vision task. The built-in model grader runs the same photograph through several models and compares their results automatically.

## What the app does

A normal shelf analysis has four conceptual stages:

1. **Read the original image.** A multimodal model identifies visible physical books and returns title, author, confidence and a normalized bounding box for each spine.
2. **Resolve the book.** Bibliographic lookup is kept separate from visual recognition. The current implementation uses Google Books to canonicalise titles/authors and retrieve available rating metadata.
3. **Show the catalogue.** Results can be displayed as book records rather than model prose, making sorting, deduplication and later enrichment straightforward.
4. **Relate results back to the photograph.** Bounding boxes are rendered as SVG over the original image. Shelver never asks an image-generation model to recreate or annotate the photograph.

A physical spine detection and a canonical book are intentionally different concepts. Multiple copies of the same title may occur in one photograph, while ratings and bibliographic metadata belong to the underlying work rather than to a particular copy on a shelf.

## Philosophy: don't over-complicate the vision problem

Shelver deliberately avoids a large traditional computer-vision preprocessing pipeline.

A tempting design is to detect shelves, crop each shelf, detect individual spines, rotate them, OCR them independently, merge the results, and then ask an LLM to repair the catalogue. In practice every preprocessing stage creates another opportunity to lose information: a shelf boundary can cut through a book, a crop can remove an author name, tilted or stacked books can violate the geometry assumptions, and splitting the photograph can remove context that helps a capable vision model understand what it is seeing.

The default strategy is therefore:

> **Give a capable vision model the best original image and ask it directly what books it can see.**

No automatic shelf segmentation or cropping is performed. Coordinates returned by the model refer to the same original image uploaded by the user.

This is not a claim that preprocessing can never help. Adaptive zooming, targeted crops or specialised OCR may eventually prove useful for genuinely unreadable regions. But those should be introduced because measured results show they improve accuracy or cost — not because a more elaborate pipeline feels more sophisticated.

The project follows a few related rules:

- **Keep the original image authoritative.** Never generatively redraw it to add highlights.
- **Separate recognition from lookup.** Use expensive vision reasoning for pixels; use cheap APIs/code for metadata, ratings, sorting and fuzzy matching.
- **Prefer structured output over prose.** Titles, authors and coordinates should become persistent data immediately.
- **Measure before optimising.** Benchmark models on real shelf photographs before introducing additional CV stages.
- **Treat uncertainty honestly.** A model finding more books is not automatically better; it may simply hallucinate more.
- **Escalate selectively.** If more expensive models or future zoom passes are useful, reserve them for cases where cheaper processing is uncertain.

The aim is a small pipeline whose behaviour can be understood and measured rather than a clever pipeline whose errors are difficult to trace.

## Automatic model grader

The grader exists to test that philosophy empirically and to answer questions such as:

- Does a much cheaper model find nearly as many real books as a flagship model?
- Does a model that returns more titles also produce more one-off/hallucinated titles?
- How much latency and token usage buys a meaningful improvement in catalogue quality?
- Do different models independently agree on the same difficult books?

The grading workflow is intentionally low-touch:

1. Upload one shelf photograph.
2. Click **Grade models**.
3. The configured vision models run **sequentially against exactly the same original image**.
4. Shelver fuzzy-matches title + author across their outputs.
5. It builds an automatic consensus catalogue and leaderboard.

The leaderboard currently reports:

- titles found
- unique titles
- titles independently matched by another model
- agreement percentage
- single-model-only claims
- latency
- API token usage

The consensus catalogue also shows how many models independently identified each candidate book.

### Consensus is evidence, not ground truth

The automatic grader intentionally does not pretend that majority agreement is perfect ground truth.

If four models identify *Roadside Picnic*, that is strong evidence that the book is really present. If only one model identifies another title, that result is interesting but ambiguous: it may be an excellent find that every other model missed, or it may be a hallucination.

For early model selection this automatic comparison is much more useful than requiring a user to manually transcribe an entire bookshelf before running a benchmark. A manually verified benchmark set can still be added later when absolute precision/recall measurements are needed.

Likewise, model-reported confidence should not be treated as objective accuracy. Agreement between independent runs, bibliographic resolution and eventually human-verified test images are stronger signals.

## Highlighting books

Every detected physical book can carry a normalized bounding box relative to the uploaded image. The frontend draws these boxes using SVG positioned over the original photograph.

This distinction is important. Selecting rank 15 in a sorted catalogue should resolve to a stable book/detection ID and then to its stored coordinates. Sorting the list must never change which physical spine a record refers to.

No image-generation model is involved in highlighting.

## Metadata and ratings

Visual identification and metadata retrieval are deliberately independent. Once Shelver has a plausible title and author, ordinary bibliographic services are better suited to canonicalising the record and retrieving available metadata.

The current implementation uses Google Books. The architecture should remain provider-oriented so other sources can be added or substituted without changing the vision pipeline. Metadata should also be cached where practical: once a canonical work has been resolved, repeated photographs of that work should not require repeated expensive processing.

## Technology

- React + Vite frontend
- Cloudflare Worker backend
- OpenAI Responses API for multimodal recognition
- Google Books for current bibliographic enrichment
- SVG overlays for localization/highlighting
- Bun for dependency management/build tooling

The OpenAI API key exists only as a Cloudflare Worker secret and is never exposed to the browser.

## Local setup

```sh
bun install
cp .dev.vars.example .dev.vars
# add OPENAI_API_KEY to .dev.vars
bun run dev
```

For Cloudflare, configure the Worker secret:

```sh
npx wrangler secret put OPENAI_API_KEY
```

Deploy with:

```sh
bun run deploy
```

## Model configuration

The benchmark model list is configured in `src/App.tsx`; models must also be allowed by `worker/index.ts`.

A model unavailable to the configured OpenAI API project fails individually while the rest of a grading run continues. This is intentional: one unavailable or incompatible model should not destroy the entire benchmark.

## Direction

Useful future work should stay evidence-led. Likely candidates include persistent benchmark runs, caching canonical book metadata, richer rating providers, human verification for a small ground-truth corpus, and optional model-requested detail/zoom passes for ambiguous regions.

The guiding question is not **“how much computer vision can we add?”** It is:

> **What is the simplest, cheapest pipeline that reliably turns a shelf photograph into a good catalogue?**
