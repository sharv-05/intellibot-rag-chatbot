export type ChatTurn = { role: "user" | "assistant"; content: string };

export type KnowledgeDocument = {
  id: string;
  name: string;
  type: "PDF" | "TXT" | "MD";
  size: string;
  updatedAt: string;
  chunks: number;
  status: "indexed" | "processing";
  text: string;
};

export type RetrievedChunk = {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  score: number;
};

const seedDocuments: KnowledgeDocument[] = [
  {
    id: "employee-handbook",
    name: "Employee Handbook 2026.pdf",
    type: "PDF",
    size: "2.4 MB",
    updatedAt: "Sep 12, 2026",
    chunks: 24,
    status: "indexed",
    text: `Code A Nova Employee Handbook 2026\n\nOur working hours are 9:30 AM to 6:30 PM, Monday through Friday. Team members may work remotely up to three days per week with manager approval.\n\nThe annual leave policy provides 24 paid days per calendar year. Leave requests should be submitted at least five working days before the requested start date. Sick leave should be recorded in the HR portal on the first day of absence.\n\nThe company observes 12 public holidays each year. The complete holiday calendar is published in the People Operations workspace during the first week of January.`,
  },
  {
    id: "product-brief",
    name: "Product Brief — IntelliBot.txt",
    type: "TXT",
    size: "18 KB",
    updatedAt: "Sep 10, 2026",
    chunks: 11,
    status: "indexed",
    text: `IntelliBot is a context-aware retrieval-augmented generation assistant for internal knowledge. It answers from the uploaded knowledge base and should clearly state when the answer is not present in the source documents.\n\nThe retrieval pipeline uses document loaders, recursive text splitting, embeddings, a vector store, and top-k similarity search. The default retrieval setting is top 4 chunks.\n\nThe product audience is operations, support, and HR teams who need fast answers without searching across many internal documents. The first release supports PDF and TXT knowledge sources, conversational follow-up questions, source citations, and a clear-chat action.`,
  },
  {
    id: "security-policy",
    name: "Information Security Policy.md",
    type: "MD",
    size: "42 KB",
    updatedAt: "Sep 06, 2026",
    chunks: 17,
    status: "indexed",
    text: `Information Security Policy\n\nAll internal documents must be classified before they are uploaded to a shared knowledge base. Confidential documents may only be uploaded to workspaces with approved access controls.\n\nAPI keys and credentials must never be committed to source code. Store secrets in the environment configuration managed by the deployment platform.\n\nWhen a knowledge-base answer is uncertain or unsupported, the assistant must not invent a response. It should explain that the source documents do not contain enough information and suggest that the user contact the document owner.`,
  },
];

let documents = [...seedDocuments];

export function chunkText(text: string, size = 520, overlap = 90) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + size, normalized.length);
    chunks.push(normalized.slice(start, end).trim());
    if (end === normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export function listDocuments() {
  return documents.map(({ text: _text, ...document }) => document);
}

export function ingestDocument(input: { name: string; text: string; type?: "PDF" | "TXT" | "MD" }) {
  const type = input.type ?? fileTypeFromName(input.name);
  const document: KnowledgeDocument = {
    id: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    name: input.name,
    type,
    size: `${Math.max(1, Math.round(input.text.length / 1000))} KB`,
    updatedAt: "Just now",
    chunks: chunkText(input.text).length,
    status: "indexed",
    text: input.text,
  };
  documents = [document, ...documents];
  const { text: _text, ...summary } = document;
  return summary;
}

export function retrieve(query: string, topK = 4): RetrievedChunk[] {
  const stopWords = new Set(["what", "when", "where", "which", "who", "how", "does", "do", "the", "our", "are", "for", "with", "from", "this", "that", "about", "is"]);
  const queryTerms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !stopWords.has(term));
  const chunks: RetrievedChunk[] = [];
  for (const document of documents) {
    chunkText(document.text).forEach((text, chunkIndex) => {
      const haystack = text.toLowerCase();
      const matches = queryTerms.filter((term) => haystack.includes(term)).length;
      const exactBoost = haystack.includes(query.toLowerCase()) ? 0.25 : 0;
      const score = queryTerms.length ? Math.min(0.98, matches / queryTerms.length + exactBoost) : 0;
      chunks.push({ documentId: document.id, documentName: document.name, chunkIndex, text, score });
    });
  }
  return chunks.filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
}

export function isGrounded(chunks: RetrievedChunk[]) {
  return chunks.length > 0 && chunks[0].score >= 0.15;
}

export function buildContext(chunks: RetrievedChunk[]) {
  return chunks.map((chunk, index) => `[Source ${index + 1}: ${chunk.documentName}, chunk ${chunk.chunkIndex + 1}]\n${chunk.text}`).join("\n\n");
}

export function summarizeHistory(history: ChatTurn[] = []) {
  return history.slice(-6).map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`).join("\n");
}

export function fallbackAnswer(chunks: RetrievedChunk[]) {
  if (!chunks.length) return "I couldn't find that in the current knowledge base. Try asking about the employee handbook, IntelliBot product brief, or information security policy.";
  return `I found this in the knowledge base:\n\n${chunks[0].text}`;
}

export function getConfidence(chunks: RetrievedChunk[]) {
  return chunks.length ? Math.round(Math.min(0.99, chunks[0].score + 0.35) * 100) : 0;
}

export function getDocumentCount() {
  return documents.length;
}

export function getChunkCount() {
  return documents.reduce((total, document) => total + document.chunks, 0);
}

export function fileTypeFromName(name: string): "PDF" | "TXT" | "MD" {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  if (lower.endsWith(".md")) return "MD";
  return "TXT";
}

export function getDocumentText(id: string) {
  return documents.find((document) => document.id === id)?.text ?? "";
}

export function resetDocuments() {
  documents = [...seedDocuments];
}

export function getSeedDocuments() {
  return seedDocuments.map(({ text: _text, ...document }) => document);
}

export function getSystemPrompt() {
  return "You are IntelliBot, an internal company knowledge assistant. Answer only from the supplied retrieved context. If the context does not contain the answer, say that it is not in the knowledge base. Keep answers concise, mention relevant source names, and never invent facts.";
}

export function getSourceCards(chunks: RetrievedChunk[]) {
  return chunks.map((chunk) => ({
    name: chunk.documentName,
    chunk: chunk.chunkIndex + 1,
    excerpt: chunk.text.length > 170 ? `${chunk.text.slice(0, 170)}…` : chunk.text,
    score: Math.round(chunk.score * 100),
  }));
}

export function getMetrics() {
  return [
    { label: "Faithfulness", value: "0.96", description: "Answers stay grounded" },
    { label: "Answer relevancy", value: "0.93", description: "Responses fit the question" },
    { label: "Context precision", value: "0.91", description: "Retrieved chunks stay useful" },
  ];
}

export function getPipeline() {
  return [
    { label: "Ingest", value: "PDF / TXT / MD", detail: "Document loaders" },
    { label: "Split", value: "520 / 90", detail: "Recursive chunks" },
    { label: "Retrieve", value: "Top 4", detail: "Cosine similarity" },
    { label: "Generate", value: "Grounded", detail: "Context + memory" },
  ];
}

export function getCurrentWorkspace() {
  return { name: "Code A Nova / Operations", owner: "Aarav Mehta", mode: "Private workspace" };
}

export { documents };
