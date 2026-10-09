import type { ChatAnswer, Message } from "@/core/schema";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F\u0400-\u04FF\u0900-\u097F]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// BM25 scoring
function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  docFreqs: Map<string, number>,
  totalDocs: number,
  avgDocLength: number,
  k1: number = 1.5,
  b: number = 0.75,
): number {
  const docLength = docTokens.length;
  if (docLength === 0) return 0;

  const termFreqs = new Map<string, number>();
  for (const t of docTokens) {
    termFreqs.set(t, (termFreqs.get(t) ?? 0) + 1);
  }

  let score = 0;
  for (const qt of queryTokens) {
    const tf = termFreqs.get(qt) ?? 0;
    if (tf === 0) continue;

    const df = docFreqs.get(qt) ?? 0;
    if (df === 0) continue;

    const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
    const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength)));
    score += idf * tfNorm;
  }

  return score;
}

const RETRIEVAL_THRESHOLD = 0.5;
const TOP_K = 5;

export function retrieveMessages(
  query: string,
  messages: readonly Message[],
): { message: Message; score: number }[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // Build document frequency map
  const docTokens = messages.map((m) => tokenize(m.text));
  const docFreqs = new Map<string, number>();
  for (const tokens of docTokens) {
    const seen = new Set(tokens);
    for (const t of seen) {
      docFreqs.set(t, (docFreqs.get(t) ?? 0) + 1);
    }
  }

  const totalDocs = messages.length;
  const avgDocLength = docTokens.reduce((sum, t) => sum + t.length, 0) / Math.max(1, totalDocs);

  const scored = messages.map((m, i) => ({
    message: m,
    score: bm25Score(queryTokens, docTokens[i], docFreqs, totalDocs, avgDocLength),
  }));

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

export function answerQuestion(
  question: string,
  messages: readonly Message[],
): ChatAnswer {
  if (!question.trim()) {
    return { text: "Please enter a question.", sourceMessageIds: [], found: false, sentenceCitations: [] };
  }

  const retrieved = retrieveMessages(question, messages);

  if (retrieved.length === 0 || retrieved[0].score < RETRIEVAL_THRESHOLD) {
    return { text: "Not found in this chat.", sourceMessageIds: [], found: false, sentenceCitations: [] };
  }

  const topMessages = retrieved.map((r) => r.message);

  // Build answer sentences with citations
  const sentenceCitations = topMessages.map((m) => ({
    sentence: `${m.sender}: "${m.text}"`,
    messageIds: [m.id],
  }));

  const text = `Based on the chat, here's what I found:\n\n${sentenceCitations.map((s) => s.sentence).join("\n\n")}`;

  return {
    text,
    sourceMessageIds: topMessages.map((m) => m.id),
    found: true,
    sentenceCitations,
  };
}
