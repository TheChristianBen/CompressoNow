import type { BriefingItem, Candidate, ItemCategory } from "@/core/schema";
import { z } from "zod";

// LLM can only reorder or rephrase core output. It can never add items.
// This is a stub implementation that simulates LLM classification.
// In production, this would load a Transformers.js or WebLLM model.

let modelAvailable = false;

export function isLLMAvailable(): boolean {
  return modelAvailable;
}

export function setLLMAvailable(available: boolean): void {
  modelAvailable = available;
}

const llmResultSchema = z.object({
  category: z.enum(["needsAction", "decisions", "deadlines", "fyi", "ignorable"]),
  task: z.string().min(1),
  owner: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
}).readonly();

export type LLMResult = z.infer<typeof llmResultSchema>;

const CATEGORY_KEYWORDS: Record<string, ItemCategory> = {
  action: "needsAction",
  task: "needsAction",
  decision: "decisions",
  deadline: "deadlines",
  due: "deadlines",
  fyi: "fyi",
  info: "fyi",
  ignore: "ignorable",
};

export function llmClassify(candidate: Candidate): LLMResult | null {
  if (!modelAvailable) return null;

  try {
    const lowerTask = candidate.task.toLowerCase();
    let category: ItemCategory = candidate.category;

    for (const [keyword, cat] of Object.entries(CATEGORY_KEYWORDS)) {
      if (lowerTask.includes(keyword)) {
        category = cat;
        break;
      }
    }

    const result = {
      category,
      task: candidate.task,
      owner: candidate.owner,
      confidence: candidate.deadlineConfidence > 0.8 ? "high" : "medium",
    };

    // Validate against schema
    const parsed = llmResultSchema.safeParse(result);
    if (!parsed.success) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

// Retry once, then return null (caller falls back to rule-based)
export function llmClassifyWithRetry(candidate: Candidate): LLMResult | null {
  const first = llmClassify(candidate);
  if (first) return first;
  return llmClassify(candidate);
}

// The LLM can only modify category, task phrasing, and owner — never add new items
export function applyLLMToItem(
  item: BriefingItem,
  llmResult: LLMResult,
): BriefingItem {
  return {
    ...item,
    category: llmResult.category,
    task: llmResult.task,
    owner: llmResult.owner,
    confidence: llmResult.confidence,
  };
}
