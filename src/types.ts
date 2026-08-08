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
  pass?: 1 | 2;
};

export type AnalysisDebug = {
  image: { name: string; mimeType: string; sizeBytes: number };
  prompts: { firstPass: string; recallAudit: string };
  firstPass: { bookCount: number; usage?: { input_tokens?: number; output_tokens?: number }; books: Book[] };
  recallAudit: {
    modelReportedCount: number;
    usage?: { input_tokens?: number; output_tokens?: number };
    added: Book[];
    suppressedAsOverlaps: Array<{ candidate: Book; overlaps: Array<{ id: string; title: string; author: string; iou: number }> }>;
  };
};

export type Analysis = {
  model: string;
  passes?: number;
  books: Book[];
  usage?: { input_tokens?: number; output_tokens?: number };
  debug?: AnalysisDebug;
  raw?: unknown;
};
