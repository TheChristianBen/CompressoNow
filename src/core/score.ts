import type { Message, PriorityWeights, ScoreBreakdown, ScoreFactor, TaskStatus } from "@/core/schema";

function normalize(v: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

function computeDeadlineProximity(deadline: number | null, now: number): number {
  if (deadline === null) return 0;
  const diff = deadline - now;
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 1; // overdue = max
  if (days <= 1) return 1;
  if (days <= 3) return 0.8;
  if (days <= 7) return 0.6;
  if (days <= 14) return 0.4;
  return 0.2;
}

function computeDirectMention(owner: string, task: string, userName: string): number {
  if (userName && owner.toLowerCase() === userName.toLowerCase()) return 1;
  if (task.includes("@")) return 0.5;
  return 0;
}

function computeSenderImportance(sender: string, messages: readonly Message[]): number {
  const senderMsgs = messages.filter((m) => m.sender === sender);
  const totalMsgs = messages.length;
  if (totalMsgs === 0) return 0;
  const ratio = senderMsgs.length / totalMsgs;
  return normalize(ratio, 0, 0.3);
}

function computeThreadActivity(sourceMessageIds: readonly string[], messages: readonly Message[]): number {
  if (sourceMessageIds.length <= 1) return 0.2;
  const repliedMsgs = messages.filter((m) =>
    sourceMessageIds.some((sid) => m.replyTo === sid || m.threadId === sid)
  );
  return normalize(repliedMsgs.length, 0, 5);
}

function computeUnresolved(status: TaskStatus): number {
  if (status === "open" || status === "inProgress") return 1;
  return 0;
}

export interface ScoreInput {
  deadline: number | null;
  owner: string;
  task: string;
  sender: string;
  sourceMessageIds: readonly string[];
  status: TaskStatus;
}

export function computeScore(
  input: ScoreInput,
  messages: readonly Message[],
  weights: PriorityWeights,
  userName: string,
  now: number = Date.now(),
): ScoreBreakdown {
  const wSum =
    weights.deadlineProximity +
    weights.directMention +
    weights.senderImportance +
    weights.threadActivity +
    weights.unresolved;

  if (wSum === 0) {
    return {
      total: 0,
      factors: [
        { name: "deadlineProximity", weight: 0, value: 0, contribution: 0 },
        { name: "directMention", weight: 0, value: 0, contribution: 0 },
        { name: "senderImportance", weight: 0, value: 0, contribution: 0 },
        { name: "threadActivity", weight: 0, value: 0, contribution: 0 },
        { name: "unresolved", weight: 0, value: 0, contribution: 0 },
      ],
    };
  }

  const deadlineVal = computeDeadlineProximity(input.deadline, now);
  const mentionVal = computeDirectMention(input.owner, input.task, userName);
  const senderVal = computeSenderImportance(input.sender, messages);
  const threadVal = computeThreadActivity(input.sourceMessageIds, messages);
  const unresolvedVal = computeUnresolved(input.status);

  const factors: ScoreFactor[] = [
    { name: "deadlineProximity", weight: weights.deadlineProximity, value: deadlineVal, contribution: (deadlineVal * weights.deadlineProximity) / wSum },
    { name: "directMention", weight: weights.directMention, value: mentionVal, contribution: (mentionVal * weights.directMention) / wSum },
    { name: "senderImportance", weight: weights.senderImportance, value: senderVal, contribution: (senderVal * weights.senderImportance) / wSum },
    { name: "threadActivity", weight: weights.threadActivity, value: threadVal, contribution: (threadVal * weights.threadActivity) / wSum },
    { name: "unresolved", weight: weights.unresolved, value: unresolvedVal, contribution: (unresolvedVal * weights.unresolved) / wSum },
  ];

  const total = Math.round(Math.min(100, Math.max(0, factors.reduce((sum, f) => sum + f.contribution, 0) * 100)));

  return { total, factors };
}

export function scoreToLevel(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function scoreExplanation(breakdown: ScoreBreakdown): string {
  return breakdown.factors
    .map((f) => `${f.name}: ${(f.value * 100).toFixed(0)}/100 (weight ${f.weight}, contribution ${f.contribution.toFixed(3)})`)
    .join(", ");
}
