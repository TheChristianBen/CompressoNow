import type { AppSettings, BriefingItem, Message } from "@/core/schema";
import { extractCandidates } from "@/core/extract";
import { resolveCandidate } from "@/core/resolve";
import { computeScore, scoreToLevel, scoreExplanation } from "@/core/score";
import { createBriefingItem, createUnverifiedItem } from "@/core/verify";
import { isLLMAvailable, llmClassifyWithRetry } from "@/core/llm";

export interface ProcessResult {
  items: BriefingItem[];
  unverifiedItems: BriefingItem[];
  ruleBasedMode: boolean;
  processingTimeMs: number;
  messageCount: number;
}

export function processMessages(
  messages: readonly Message[],
  settings: AppSettings,
  showUnverified: boolean = false,
): ProcessResult {
  const start = performance.now();

  if (messages.length === 0) {
    return { items: [], unverifiedItems: [], ruleBasedMode: true, processingTimeMs: 0, messageCount: 0 };
  }

  // Step 1: Extract candidates (rule-based)
  let candidates = extractCandidates(messages, settings.userName);

  // Step 2: Apply LLM if available (can only reorder/rephrase, never add)
  let ruleBasedMode = true;
  if (settings.enableLLM && isLLMAvailable()) {
    ruleBasedMode = false;
    candidates = candidates.map((c) => {
      const llmResult = llmClassifyWithRetry(c);
      if (llmResult) {
        return { ...c, category: llmResult.category, task: llmResult.task, owner: llmResult.owner };
      }
      return c;
    });
  }

  // Step 3: Resolve (state machine)
  // Step 4: Score
  // Step 5: Verify (the gate)
  const items: BriefingItem[] = [];
  const unverifiedItems: BriefingItem[] = [];

  for (const candidate of candidates) {
    const resolution = resolveCandidate(candidate, messages);
    const allSourceIds = [...new Set([...candidate.sourceMessageIds, ...resolution.additionalSourceIds])];

    const breakdown = computeScore(
      {
        deadline: candidate.deadline,
        owner: candidate.owner,
        task: candidate.task,
        sender: candidate.sender,
        sourceMessageIds: allSourceIds,
        status: resolution.status,
      },
      messages,
      settings.weights,
      settings.userName,
    );

    const priority = breakdown.total;
    const priorityLevel = scoreToLevel(priority);
    const whyThisRanking = scoreExplanation(breakdown);

    const createResult = createBriefingItem(
      {
        candidate,
        status: resolution.status,
        resolvedByMessageId: resolution.resolvedByMessageId,
        additionalSourceIds: resolution.additionalSourceIds,
        priority,
        priorityLevel,
        scoreBreakdown: breakdown,
        category: candidate.category,
        task: candidate.task,
        owner: candidate.owner,
      },
      messages,
    );

    if (createResult.ok) {
      items.push({
        ...createResult.item,
        whyThisRanking,
      });
    } else {
      // Item failed verification — add to unverified if toggle is on
      if (showUnverified) {
        const unverified = createUnverifiedItem(
          {
            candidate,
            status: resolution.status,
            resolvedByMessageId: resolution.resolvedByMessageId,
            additionalSourceIds: resolution.additionalSourceIds,
            priority,
            priorityLevel,
            scoreBreakdown: breakdown,
            category: candidate.category,
            task: candidate.task,
            owner: candidate.owner,
          },
          messages,
        );
        unverifiedItems.push({ ...unverified, whyThisRanking });
      }
    }
  }

  // Sort: by category priority, then by score descending
  const categoryOrder: Record<string, number> = {
    needsAction: 0,
    deadlines: 1,
    decisions: 2,
    fyi: 3,
    ignorable: 4,
  };

  items.sort((a, b) => {
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;
    return b.priority - a.priority;
  });

  const processingTimeMs = performance.now() - start;

  return {
    items,
    unverifiedItems,
    ruleBasedMode,
    processingTimeMs,
    messageCount: messages.length,
  };
}
