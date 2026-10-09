import type { AppSettings, ExtractedItem, NormalizedMessage } from "@/types";
import { extractItems } from "@/lib/extractor";
import { scoreItems } from "@/lib/scorer";
import { resolveItems } from "@/lib/resolver";
import { verifyItems } from "@/lib/verifier";
import { isLLMAvailable, llmClassifyWithRetry } from "@/lib/llm";
import { MAX_MESSAGES_PER_CHUNK, CHUNK_OVERLAP } from "@/config";

export function chunkMessages(messages: NormalizedMessage[]): NormalizedMessage[][] {
  if (messages.length <= MAX_MESSAGES_PER_CHUNK) return [messages];

  const chunks: NormalizedMessage[][] = [];
  for (let i = 0; i < messages.length; i += MAX_MESSAGES_PER_CHUNK - CHUNK_OVERLAP) {
    chunks.push(messages.slice(i, i + MAX_MESSAGES_PER_CHUNK));
    if (i + MAX_MESSAGES_PER_CHUNK >= messages.length) break;
  }
  return chunks;
}

export function processMessages(
  messages: NormalizedMessage[],
  settings: AppSettings,
): ExtractedItem[] {
  if (messages.length === 0) return [];

  const chunks = chunkMessages(messages);
  let allItems: ExtractedItem[] = [];

  for (const chunk of chunks) {
    let items = extractItems(chunk, settings);

    if (settings.enableLLM && isLLMAvailable()) {
      items = items.map((item) => {
        const llmResult = llmClassifyWithRetry(item, chunk);
        if (llmResult) {
          return {
            ...item,
            category: llmResult.category,
            task: llmResult.task,
            owner: llmResult.owner,
            confidence: llmResult.confidence,
          };
        }
        return item;
      });
    }

    allItems = allItems.concat(items);
  }

  allItems = scoreItems(allItems, messages, settings);
  allItems = resolveItems(allItems, messages);
  allItems = verifyItems(allItems, messages);

  const categoryOrder: Record<string, number> = {
    needsAction: 0,
    deadlines: 1,
    decisions: 2,
    fyi: 3,
    ignorable: 4,
  };

  allItems.sort((a, b) => {
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;
    return b.priority - a.priority;
  });

  return allItems;
}
