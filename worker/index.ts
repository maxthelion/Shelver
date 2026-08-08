type Env = { OPENAI_API_KEY: string };

type Box = { x: number; y: number; width: number; height: number };
type DetectedBook = { id: string; title: string; author: string; confidence: number; box: Box };
type ModelResponse = { books: DetectedBook[]; usage?: { input_tokens?: number; output_tokens?: number } };

const MODEL = 'gpt-5.6-terra';
const schema = {
  type: 'object', additionalProperties: false, required: ['books'], properties: {
    books: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'title', 'author', 'confidence', 'box'], properties: {
      id: { type: 'string' }, title: { type: 'string' }, author: { type: 'string' }, confidence: { type: 'number' },
      box: { type: 'object', additionalProperties: false, required: ['x', 'y', 'width', 'height'], properties: {
        x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' },
      } },
    } } },
  },
};

const firstPassPrompt = `Catalogue every distinct visible physical book in this shelf photograph. Read the whole original image; do not invent unreadable titles. Return one record per physical spine/copy. box is normalized to the ORIGINAL image: x,y are top-left and width,height are fractions 0..1. Make boxes tightly enclose the corresponding spine. confidence is confidence that title+author are correct, 0..1.`;

function outputText(raw: any): string {
  const text = raw.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
  if (!text) throw new Error('No structured model output');
  return text;
}

async function catalogue(data: string, prompt: string, apiKey: string): Promise<ModelResponse> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, { type: 'input_image', image_url: data, detail: 'high' }] }],
      text: { format: { type: 'json_schema', name: 'shelf_catalogue', strict: true, schema } },
    }),
  });
  const raw: any = await response.json();
  if (!response.ok) throw new Error(raw.error?.message || 'OpenAI request failed');
  return { books: JSON.parse(outputText(raw)).books, usage: raw.usage };
}

function iou(a: Box, b: Box): number {
  const left = Math.max(a.x, b.x), top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  return intersection / (a.width * a.height + b.width * b.height - intersection || 1);
}

async function googleBook(title: string, author: string) {
  const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=3`);
  if (!response.ok) return {};
  const json: any = await response.json(), volume = json.items?.[0]?.volumeInfo;
  if (!volume) return {};
  return { rating: volume.averageRating, ratingsCount: volume.ratingsCount, source: 'Google Books', canonicalTitle: volume.title, canonicalAuthor: volume.authors?.join(', ') };
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/analyse' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    try {
      if (!env.OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY secret is not configured' }, { status: 500 });
      const form = await request.formData(), image = form.get('image');
      if (!(image instanceof File)) return Response.json({ error: 'Image required' }, { status: 400 });
      const bytes = new Uint8Array(await image.arrayBuffer());
      let binary = '';
      for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      const data = `data:${image.type || 'image/jpeg'};base64,${btoa(binary)}`;

      const first = await catalogue(data, firstPassPrompt, env.OPENAI_API_KEY);
      const reviewPrompt = `Audit this bookshelf photograph for missed books. A first pass found the records below. Inspect every shelf, gap, partial spine, and angled book in the ORIGINAL image. Return only distinct physical books absent from the first-pass records; never repeat an existing spine. Use the same normalized bounding-box rules. If there are no missing books, return an empty books array.\n\nFirst-pass records:\n${JSON.stringify(first.books)}`;
      const second = await catalogue(data, reviewPrompt, env.OPENAI_API_KEY);
      const books = [...first.books];
      for (const candidate of second.books) {
        if (!books.some(existing => iou(candidate.box, existing.box) >= 0.5)) books.push(candidate);
      }
      const enriched = await Promise.all(books.map(async book => {
        try {
          const metadata: any = await googleBook(book.title, book.author);
          return { ...book, title: metadata.canonicalTitle || book.title, author: metadata.canonicalAuthor || book.author, rating: metadata.rating, ratingsCount: metadata.ratingsCount, source: metadata.source };
        } catch { return book; }
      }));
      return Response.json({
        model: MODEL, passes: 2, books: enriched,
        usage: { input_tokens: (first.usage?.input_tokens || 0) + (second.usage?.input_tokens || 0), output_tokens: (first.usage?.output_tokens || 0) + (second.usage?.output_tokens || 0) },
      });
    } catch (reason) {
      return Response.json({ error: reason instanceof Error ? reason.message : String(reason) }, { status: 500 });
    }
  },
};
