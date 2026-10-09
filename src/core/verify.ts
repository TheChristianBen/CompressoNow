import type { Message, VerificationFailure, VerificationResult } from "@/core/schema";

// Normalized matching: case, unicode, number formats
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNumber(n: string): string {
  const trimmed = n.replace(/[,.\s]/g, "");
  return trimmed;
}

const NAME_PATTERN = /@([A-Z][a-z]+)/g;
const DATE_WORDS = /\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|eod|eow|kal|parso)\b/gi;
const NUMBER_PATTERN = /\b\d+(?:\.\d+)?\b/g;

export function verifyAgainstSources(
  task: string,
  owner: string,
  sourceMessageIds: readonly string[],
  messages: readonly Message[],
): VerificationResult {
  const citedMessages = messages.filter((m) => sourceMessageIds.includes(m.id));

  if (citedMessages.length === 0) {
    return {
      verified: false,
      confidence: "low",
      failures: [{ entity: "all", reason: "No cited messages found" }],
    };
  }

  const citedText = normalizeText(citedMessages.map((m) => `${m.sender} ${m.text}`).join(" "));
  const taskNorm = normalizeText(task);
  const failures: VerificationFailure[] = [];

  // Check names
  const namesInTask = task.match(NAME_PATTERN);
  if (namesInTask) {
    for (const nameMatch of namesInTask) {
      const name = normalizeText(nameMatch.slice(1));
      if (!citedText.includes(name) && !normalizeText(owner).includes(name)) {
        failures.push({ entity: nameMatch, reason: "Name not found in cited messages" });
      }
    }
  }

  // Check owner
  if (owner && owner !== "Unknown" && owner !== "") {
    const ownerNorm = normalizeText(owner);
    if (!citedText.includes(ownerNorm)) {
      failures.push({ entity: owner, reason: "Owner not found in cited messages" });
    }
  }

  // Check date words
  const dateWordsInTask = task.match(DATE_WORDS);
  if (dateWordsInTask) {
    for (const dw of dateWordsInTask) {
      if (!citedText.includes(normalizeText(dw))) {
        failures.push({ entity: dw, reason: "Date reference not found in cited messages" });
      }
    }
  }

  // Check numbers
  const numbersInTask = task.match(NUMBER_PATTERN);
  if (numbersInTask) {
    for (const num of numbersInTask) {
      if (num.length > 1) {
        const numNorm = normalizeNumber(num);
        const citedNumbers = citedText.match(/\d+/g) ?? [];
        const citedNorm = citedNumbers.map(normalizeNumber);
        if (!citedNorm.includes(numNorm)) {
          failures.push({ entity: num, reason: "Number not found in cited messages" });
        }
      }
    }
  }

  if (failures.length >= 2) {
    return { verified: false, confidence: "low", failures };
  }
  if (failures.length === 1) {
    return { verified: true, confidence: "medium", failures };
  }

  const hasStrongEvidence = citedMessages.some((m) => m.text.length > 20);
  return {
    verified: true,
    confidence: hasStrongEvidence ? "high" : "medium",
    failures: [],
  };
}

// ─── BriefingItem construction (the gate) ───────────────────────
// A BriefingItem cannot be constructed without passing verify()
import type { BriefingItem, Candidate, ItemCategory, PriorityLevel, ScoreBreakdown, TaskStatus } from "@/core/schema";

export interface BriefingItemInput {
  candidate: Candidate;
  status: TaskStatus;
  resolvedByMessageId: string | null;
  additionalSourceIds: string[];
  priority: number;
  priorityLevel: PriorityLevel;
  scoreBreakdown: ScoreBreakdown;
  category: ItemCategory;
  task: string;
  owner: string;
}

export function createBriefingItem(
  input: BriefingItemInput,
  messages: readonly Message[],
): { ok: true; item: BriefingItem } | { ok: false; failures: VerificationFailure[] } {
  const allSourceIds = [...new Set([...input.candidate.sourceMessageIds, ...input.additionalSourceIds])];

  const verification = verifyAgainstSources(
    input.task,
    input.owner,
    allSourceIds,
    messages,
  );

  if (!verification.verified) {
    return { ok: false, failures: verification.failures };
  }

  const item: BriefingItem = {
    id: input.candidate.id,
    category: input.category,
    owner: input.owner,
    task: input.task,
    deadline: input.candidate.deadline,
    priority: input.priority,
    priorityLevel: input.priorityLevel,
    sender: input.candidate.sender,
    sourceMessageIds: allSourceIds,
    whyThisRanking: "",
    status: input.status,
    resolvedByMessageId: input.resolvedByMessageId,
    verified: true,
    confidence: verification.confidence,
    verificationIssues: verification.failures.map((f) => `${f.entity}: ${f.reason}`),
    scoreBreakdown: input.scoreBreakdown,
  };

  return { ok: true, item };
}

// ─── Unverified item (for display when toggle is on) ─────────────
export function createUnverifiedItem(
  input: BriefingItemInput,
  messages: readonly Message[],
): BriefingItem {
  const allSourceIds = [...new Set([...input.candidate.sourceMessageIds, ...input.additionalSourceIds])];
  const verification = verifyAgainstSources(input.task, input.owner, allSourceIds, messages);

  return {
    id: input.candidate.id,
    category: input.category,
    owner: input.owner,
    task: input.task,
    deadline: input.candidate.deadline,
    priority: input.priority,
    priorityLevel: input.priorityLevel,
    sender: input.candidate.sender,
    sourceMessageIds: allSourceIds,
    whyThisRanking: "",
    status: input.status,
    resolvedByMessageId: input.resolvedByMessageId,
    verified: verification.verified,
    confidence: verification.confidence,
    verificationIssues: verification.failures.map((f) => `${f.entity}: ${f.reason}`),
    scoreBreakdown: input.scoreBreakdown,
  };
}
