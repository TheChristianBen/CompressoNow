import type { EvalResult, ExtractedItem, GroundTruthItem, NormalizedMessage, SampleChat } from "@/types";
import { extractItems } from "@/lib/extractor";
import { scoreItems } from "@/lib/scorer";
import { resolveItems } from "@/lib/resolver";
import { verifyItems } from "@/lib/verifier";
import { getEvalSampleChats } from "@/lib/sampleChat";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/config";

function matchItemToTruth(item: ExtractedItem, truth: GroundTruthItem): boolean {
  if (item.category !== truth.category) {
    if ((item.category === "deadlines" && truth.category === "needsAction") ||
        (item.category === "needsAction" && truth.category === "deadlines")) {
      // close enough
    } else {
      return false;
    }
  }

  const itemLower = item.task.toLowerCase();
  const ownerLower = item.owner.toLowerCase();

  if (truth.owner && ownerLower !== truth.owner.toLowerCase() && !ownerLower.includes(truth.owner.toLowerCase())) {
    return false;
  }

  const matchedKeywords = truth.keywords.filter((kw) => itemLower.includes(kw.toLowerCase()));
  return matchedKeywords.length >= Math.ceil(truth.keywords.length * 0.5);
}

export function evaluateSampleChat(chat: SampleChat, settings: AppSettings): EvalResult {
  const start = performance.now();

  let items = extractItems(chat.messages, settings);
  items = scoreItems(items, chat.messages, settings);
  items = resolveItems(items, chat.messages);
  items = verifyItems(items, chat.messages);

  const processingTimeMs = performance.now() - start;

  let truePositives = 0;
  let falsePositives = 0;
  const matchedTruth = new Set<number>();

  for (const item of items) {
    if (item.category === "ignorable" || item.category === "fyi") continue;
    if (!item.verified) {
      falsePositives++;
      continue;
    }

    let matched = false;
    for (let ti = 0; ti < chat.groundTruth.length; ti++) {
      if (matchedTruth.has(ti)) continue;
      if (matchItemToTruth(item, chat.groundTruth[ti])) {
        truePositives++;
        matchedTruth.add(ti);
        matched = true;
        break;
      }
    }
    if (!matched) {
      falsePositives++;
    }
  }

  const falseNegatives = chat.groundTruth.length - matchedTruth.size;
  const totalExtracted = truePositives + falsePositives;

  const precision = totalExtracted > 0 ? truePositives / totalExtracted : 0;
  const recall = chat.groundTruth.length > 0 ? truePositives / chat.groundTruth.length : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const unverified = items.filter((i) => !i.verified && i.category !== "ignorable" && i.category !== "fyi").length;
  const totalNonIgnorable = items.filter((i) => i.category !== "ignorable" && i.category !== "fyi").length;
  const hallucinationRate = totalNonIgnorable > 0 ? unverified / totalNonIgnorable : 0;

  return {
    precision,
    recall,
    f1,
    hallucinationRate,
    processingTimeMs,
    truePositives,
    falsePositives,
    falseNegatives,
  };
}

export function evaluateAll(settings?: AppSettings): { results: { chat: SampleChat; result: EvalResult }[]; aggregate: EvalResult } {
  const chats = getEvalSampleChats();
  const useSettings = settings ?? { ...DEFAULT_SETTINGS, weights: { ...DEFAULT_SETTINGS.weights } };

  const results = chats.map((chat) => ({
    chat,
    result: evaluateSampleChat(chat, useSettings),
  }));

  const totalTP = results.reduce((sum, r) => sum + r.result.truePositives, 0);
  const totalFP = results.reduce((sum, r) => sum + r.result.falsePositives, 0);
  const totalFN = results.reduce((sum, r) => sum + r.result.falseNegatives, 0);
  const totalTime = results.reduce((sum, r) => sum + r.result.processingTimeMs, 0);

  const precision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const recall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const avgHallucination = results.reduce((sum, r) => sum + r.result.hallucinationRate, 0) / results.length;

  return {
    results,
    aggregate: {
      precision,
      recall,
      f1,
      hallucinationRate: avgHallucination,
      processingTimeMs: totalTime,
      truePositives: totalTP,
      falsePositives: totalFP,
      falseNegatives: totalFN,
    },
  };
}
