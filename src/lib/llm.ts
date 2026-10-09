import type { ExtractedItem, NormalizedMessage } from "@/types";

export interface LLMResult {
  category: ExtractedItem["category"];
  task: string;
  owner: string;
  confidence: "high" | "medium" | "low";
}

let modelAvailable = false;

export function isLLMAvailable(): boolean {
  return modelAvailable;
}

export function setLLMAvailable(available: boolean): void {
  modelAvailable = available;
}

const CATEGORY_KEYWORDS: Record<string, ExtractedItem["category"]> = {
  action: "needsAction",
  task: "needsAction",
  decision: "decisions",
  deadline: "deadlines",
  due: "deadlines",
  fyi: "fyi",
  info: "fyi",
  ignore: "ignorable",
};

function validateResult(result: unknown): result is LLMResult {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, unknown>;
  const cat = r.category;
  if (typeof cat !== "string" || !["needsAction", "decisions", "deadlines", "fyi", "ignorable"].includes(cat)) {
    return false;
  }
  if (typeof r.task !== "string" || r.task.length === 0) return false;
  if (typeof r.owner !== "string") return false;
  if (r.confidence && !["high", "medium", "low"].includes(r.confidence as string)) return false;
  return true;
}

export function llmClassify(item: ExtractedItem, _messages: NormalizedMessage[]): LLMResult | null {
  if (!modelAvailable) return null;

  let result: unknown;
  try {
    const lowerTask = item.task.toLowerCase();
    let category: ExtractedItem["category"] = item.category;

    for (const [keyword, cat] of Object.entries(CATEGORY_KEYWORDS)) {
      if (lowerTask.includes(keyword)) {
        category = cat;
        break;
      }
    }

    result = {
      category,
      task: item.task,
      owner: item.owner,
      confidence: item.confidence,
    };
  } catch {
    return null;
  }

  if (!validateResult(result)) {
    return null;
  }

  return result;
}

export function llmClassifyWithRetry(item: ExtractedItem, messages: NormalizedMessage[]): LLMResult | null {
  const first = llmClassify(item, messages);
  if (first) return first;
  return llmClassify(item, messages);
}
