import type { ChatAnswer, NormalizedMessage } from "@/types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreMessage(query: string, message: NormalizedMessage): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const msgTokens = tokenize(message.text);
  const senderTokens = tokenize(message.sender);

  let score = 0;
  for (const qt of queryTokens) {
    if (msgTokens.includes(qt)) score += 2;
    else if (msgTokens.some((mt) => mt.includes(qt) || qt.includes(mt))) score += 1;
    if (senderTokens.includes(qt)) score += 1;
  }

  if (/\?/.test(query) && /\?/.test(message.text)) score += 1;
  return score;
}

export function askChat(question: string, messages: NormalizedMessage[]): ChatAnswer {
  if (!question.trim()) {
    return { text: "Please enter a question.", sourceMessageIds: [], found: false };
  }

  const scored = messages
    .map((m) => ({ message: m, score: scoreMessage(question, m) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { text: "Not found in this chat.", sourceMessageIds: [], found: false };
  }

  const top = scored.slice(0, 5);
  const topMessages = top.map((s) => s.message);

  const summary = topMessages
    .map((m) => `${m.sender}: "${m.text}"`)
    .join("\n\n");

  return {
    text: `Based on the chat, here's what I found:\n\n${summary}`,
    sourceMessageIds: topMessages.map((m) => m.id),
    found: true,
  };
}
