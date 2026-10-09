import type { AppSettings, ExtractedItem, NormalizedMessage, PriorityWeights } from "@/types";

function computeDeadlineProximity(deadline: number | null, now: number): number {
  if (deadline === null) return 0;
  const diff = deadline - now;
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 100;
  if (days <= 1) return 100;
  if (days <= 3) return 80;
  if (days <= 7) return 60;
  if (days <= 14) return 40;
  return 20;
}

function computeDirectMention(item: ExtractedItem, userName: string): number {
  if (userName && item.owner.toLowerCase() === userName.toLowerCase()) return 100;
  if (item.task.includes("@")) return 50;
  return 0;
}

function computeSenderImportance(item: ExtractedItem, messages: NormalizedMessage[]): number {
  const senderMsgs = messages.filter((m) => m.sender === item.sender);
  const totalMsgs = messages.length;
  if (totalMsgs === 0) return 0;
  const ratio = senderMsgs.length / totalMsgs;
  if (ratio > 0.25) return 100;
  if (ratio > 0.15) return 70;
  if (ratio > 0.08) return 50;
  if (ratio > 0.03) return 30;
  return 15;
}

function computeThreadActivity(item: ExtractedItem, messages: NormalizedMessage[]): number {
  if (item.sourceMessageIds.length <= 1) return 20;
  const repliedMsgs = messages.filter((m) =>
    item.sourceMessageIds.some((sid) => m.replyTo === sid || m.threadId === sid)
  );
  if (repliedMsgs.length >= 5) return 100;
  if (repliedMsgs.length >= 3) return 70;
  if (repliedMsgs.length >= 1) return 50;
  return 30;
}

function computeUnresolved(item: ExtractedItem): number {
  return item.status === "unresolved" ? 100 : 0;
}

export function computePriority(
  item: ExtractedItem,
  messages: NormalizedMessage[],
  weights: PriorityWeights,
  userName: string,
  now: number = Date.now(),
): { score: number; level: "high" | "medium" | "low"; explanation: string } {
  const wSum = weights.deadlineProximity + weights.directMention + weights.senderImportance + weights.threadActivity + weights.unresolved;
  if (wSum === 0) return { score: 0, level: "low", explanation: "All weights are zero." };

  const deadlineScore = computeDeadlineProximity(item.deadline, now);
  const mentionScore = computeDirectMention(item, userName);
  const senderScore = computeSenderImportance(item, messages);
  const threadScore = computeThreadActivity(item, messages);
  const unresolvedScore = computeUnresolved(item);

  const weighted =
    (deadlineScore * weights.deadlineProximity +
      mentionScore * weights.directMention +
      senderScore * weights.senderImportance +
      threadScore * weights.threadActivity +
      unresolvedScore * weights.unresolved) /
    wSum;

  const score = Math.round(Math.min(100, Math.max(0, weighted)));

  let level: "high" | "medium" | "low";
  if (score >= 70) level = "high";
  else if (score >= 40) level = "medium";
  else level = "low";

  const explanation = `Deadline proximity: ${deadlineScore}/100 (weight ${weights.deadlineProximity}), Direct mention: ${mentionScore}/100 (weight ${weights.directMention}), Sender importance: ${senderScore}/100 (weight ${weights.senderImportance}), Thread activity: ${threadScore}/100 (weight ${weights.threadActivity}), Unresolved: ${unresolvedScore}/100 (weight ${weights.unresolved}).`;

  return { score, level, explanation };
}

export function scoreItems(
  items: ExtractedItem[],
  messages: NormalizedMessage[],
  settings: AppSettings,
  now: number = Date.now(),
): ExtractedItem[] {
  return items.map((item) => {
    const { score, level, explanation } = computePriority(item, messages, settings.weights, settings.userName, now);
    return {
      ...item,
      priority: score,
      priorityLevel: level,
      whyThisRanking: explanation,
    };
  });
}
