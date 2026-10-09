import type { AppSettings, BriefingItem, EvalResult, GroundTruthItem, SampleChat } from "@/core/schema";
import { processMessages } from "@/core/process";
import { getEvalSampleChats } from "@/core/sampleChat";
import { DEFAULT_SETTINGS } from "@/core/defaults";

function matchItemToTruth(item: BriefingItem, truth: GroundTruthItem): boolean {
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

function emptyEvalResult(): EvalResult {
  return {
    precision: 0, recall: 0, f1: 0,
    hallucinationRate: 0, processingTimeMs: 0,
    truePositives: 0, falsePositives: 0, falseNegatives: 0,
    perCategory: {},
    confusion: {},
  };
}

export function evaluateSampleChat(chat: SampleChat, settings: AppSettings, showUnverified: boolean = false): EvalResult {
  const result = processMessages(chat.messages, settings, showUnverified);
  const items = result.items;

  const categories = ["needsAction", "decisions", "deadlines", "fyi", "ignorable"];
  const perCategory: Record<string, { precision: number; recall: number; f1: number; tp: number; fp: number; fn: number }> = {};
  const confusion: Record<string, Record<string, number>> = {};

  let totalTP = 0;
  let totalFP = 0;
  const matchedTruth = new Set<number>();
  const groundTruthByCategory = new Map<string, number[]>();

  for (const cat of categories) {
    perCategory[cat] = { precision: 0, recall: 0, f1: 0, tp: 0, fp: 0, fn: 0 };
    confusion[cat] = {};
    for (const cat2 of categories) {
      confusion[cat][cat2] = 0;
    }
  }

  for (const item of items) {
    if (item.category === "ignorable" || item.category === "fyi") {
      if (!item.verified) totalFP++;
      continue;
    }
    if (!item.verified) {
      totalFP++;
      continue;
    }

    let matched = false;
    for (let ti = 0; ti < chat.groundTruth.length; ti++) {
      if (matchedTruth.has(ti)) continue;
      if (matchItemToTruth(item, chat.groundTruth[ti])) {
        totalTP++;
        matchedTruth.add(ti);
        perCategory[item.category].tp++;
        matched = true;
        break;
      }
    }
    if (!matched) {
      totalFP++;
      perCategory[item.category].fp++;
    }
  }

  // Compute per-category recall
  for (const cat of categories) {
    const truthInCat = chat.groundTruth.filter((g) => g.category === cat);
    const matchedInCat = truthInCat.filter((_, i) => {
      const globalIdx = chat.groundTruth.indexOf(truthInCat[i]);
      return matchedTruth.has(globalIdx);
    });
    perCategory[cat].fn = truthInCat.length - matchedInCat.length;
    perCategory[cat].precision = perCategory[cat].tp + perCategory[cat].fp > 0
      ? perCategory[cat].tp / (perCategory[cat].tp + perCategory[cat].fp) : 0;
    perCategory[cat].recall = truthInCat.length > 0
      ? matchedInCat.length / truthInCat.length : 0;
    perCategory[cat].f1 = perCategory[cat].precision + perCategory[cat].recall > 0
      ? (2 * perCategory[cat].precision * perCategory[cat].recall) / (perCategory[cat].precision + perCategory[cat].recall) : 0;
  }

  const totalFN = chat.groundTruth.length - matchedTruth.size;
  const totalExtracted = totalTP + totalFP;
  const precision = totalExtracted > 0 ? totalTP / totalExtracted : 0;
  const recall = chat.groundTruth.length > 0 ? totalTP / chat.groundTruth.length : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const unverified = items.filter((i) => !i.verified && i.category !== "ignorable" && i.category !== "fyi").length;
  const totalNonIgnorable = items.filter((i) => i.category !== "ignorable" && i.category !== "fyi").length;
  const hallucinationRate = totalNonIgnorable > 0 ? unverified / totalNonIgnorable : 0;

  return {
    precision, recall, f1,
    hallucinationRate,
    processingTimeMs: result.processingTimeMs,
    truePositives: totalTP,
    falsePositives: totalFP,
    falseNegatives: totalFN,
    perCategory,
    confusion,
  };
}

export function evaluateAll(settings?: AppSettings, showUnverified?: boolean): {
  results: { chat: SampleChat; result: EvalResult; ruleBased: boolean }[];
  aggregate: EvalResult;
  ablation: { rulesOnly: EvalResult; rulesPlusLLM: EvalResult };
  latencyPer1000: number;
  peakMemoryKB: number;
} {
  const chats = getEvalSampleChats();
  const useSettings = settings ?? { ...DEFAULT_SETTINGS, weights: { ...DEFAULT_SETTINGS.weights } };

  const results = chats.map((chat) => {
    const result = evaluateSampleChat(chat, useSettings, showUnverified);
    const processResult = processMessages(chat.messages, useSettings, showUnverified);
    return { chat, result, ruleBased: processResult.ruleBasedMode };
  });

  const totalTP = results.reduce((s, r) => s + r.result.truePositives, 0);
  const totalFP = results.reduce((s, r) => s + r.result.falsePositives, 0);
  const totalFN = results.reduce((s, r) => s + r.result.falseNegatives, 0);
  const totalTime = results.reduce((s, r) => s + r.result.processingTimeMs, 0);
  const totalMessages = results.reduce((s, r) => s + r.chat.messages.length, 0);

  const precision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const recall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const avgHallucination = results.reduce((s, r) => s + r.result.hallucinationRate, 0) / results.length;

  const aggregate: EvalResult = {
    precision, recall, f1,
    hallucinationRate: avgHallucination,
    processingTimeMs: totalTime,
    truePositives: totalTP,
    falsePositives: totalFP,
    falseNegatives: totalFN,
    perCategory: {},
    confusion: {},
  };

  // Ablation: rules-only vs rules+LLM
  const rulesOnlySettings = { ...useSettings, enableLLM: false };
  const rulesPlusLLMSettings = { ...useSettings, enableLLM: true };

  const rulesOnlyResults = chats.map((chat) => evaluateSampleChat(chat, rulesOnlySettings, showUnverified));
  const rulesOnlyTP = rulesOnlyResults.reduce((s, r) => s + r.truePositives, 0);
  const rulesOnlyFP = rulesOnlyResults.reduce((s, r) => s + r.falsePositives, 0);
  const rulesOnlyFN = rulesOnlyResults.reduce((s, r) => s + r.falseNegatives, 0);
  const rulesOnlyP = rulesOnlyTP + rulesOnlyFP > 0 ? rulesOnlyTP / (rulesOnlyTP + rulesOnlyFP) : 0;
  const rulesOnlyR = rulesOnlyTP + rulesOnlyFN > 0 ? rulesOnlyTP / (rulesOnlyTP + rulesOnlyFN) : 0;
  const rulesOnlyF1 = rulesOnlyP + rulesOnlyR > 0 ? (2 * rulesOnlyP * rulesOnlyR) / (rulesOnlyP + rulesOnlyR) : 0;
  const rulesOnlyHallu = rulesOnlyResults.reduce((s, r) => s + r.hallucinationRate, 0) / rulesOnlyResults.length;

  const rulesOnly: EvalResult = {
    precision: rulesOnlyP, recall: rulesOnlyR, f1: rulesOnlyF1,
    hallucinationRate: rulesOnlyHallu,
    processingTimeMs: rulesOnlyResults.reduce((s, r) => s + r.processingTimeMs, 0),
    truePositives: rulesOnlyTP, falsePositives: rulesOnlyFP, falseNegatives: rulesOnlyFN,
    perCategory: {}, confusion: {},
  };

  const llmResults = chats.map((chat) => evaluateSampleChat(chat, rulesPlusLLMSettings, showUnverified));
  const llmTP = llmResults.reduce((s, r) => s + r.truePositives, 0);
  const llmFP = llmResults.reduce((s, r) => s + r.falsePositives, 0);
  const llmFN = llmResults.reduce((s, r) => s + r.falseNegatives, 0);
  const llmP = llmTP + llmFP > 0 ? llmTP / (llmTP + llmFP) : 0;
  const llmR = llmTP + llmFN > 0 ? llmTP / (llmTP + llmFN) : 0;
  const llmF1 = llmP + llmR > 0 ? (2 * llmP * llmR) / (llmP + llmR) : 0;
  const llmHallu = llmResults.reduce((s, r) => s + r.hallucinationRate, 0) / llmResults.length;

  const rulesPlusLLM: EvalResult = {
    precision: llmP, recall: llmR, f1: llmF1,
    hallucinationRate: llmHallu,
    processingTimeMs: llmResults.reduce((s, r) => s + r.processingTimeMs, 0),
    truePositives: llmTP, falsePositives: llmFP, falseNegatives: llmFN,
    perCategory: {}, confusion: {},
  };

  const latencyPer1000 = totalMessages > 0 ? (totalTime / totalMessages) * 1000 : 0;
  const peakMemoryKB = typeof (performance as any).memory?.usedJSHeapSize === "number"
    ? (performance as any).memory.usedJSHeapSize / 1024 : 0;

  return { results, aggregate, ablation: { rulesOnly, rulesPlusLLM }, latencyPer1000, peakMemoryKB };
}
