export type Box = { x: number; y: number; width: number; height: number };

export type Book = {
  id: string;
  title: string;
  author: string;
  confidence: number;
  box: Box;
  rating?: number;
  ratingsCount?: number;
  source?: string;
};

export type Analysis = {
  model: string;
  passes?: number;
  books: Book[];
  usage?: { input_tokens?: number; output_tokens?: number };
  raw?: unknown;
};
