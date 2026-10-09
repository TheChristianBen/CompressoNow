import type { AppSettings, ExtractedItem, ItemCategory, NormalizedMessage } from "@/types";
import { DECISION_PATTERNS, TASK_PATTERNS } from "@/config";
import { resolveRelativeDate, hasDateReference } from "@/lib/dateParser";

function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

function isQuestion(text: string): boolean {
  return /\?/.test(text);
}

function isDirectedAtUser(text: string, userName: string): boolean {
  const mentions = extractMentions(text);
  if (userName && mentions.some((m) => m.toLowerCase() === userName.toLowerCase())) {
    return true;
  }
  if (/\b(you|your|can you|could you|would you|please)\b/i.test(text)) {
    return true;
  }
  return false;
}

function matchAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function extractOwnerFromMessage(text: string, sender: string, userName: string): string {
  const mentions = extractMentions(text);
  if (mentions.length > 0) {
    if (userName && mentions.some((m) => m.toLowerCase() === userName.toLowerCase())) {
      return userName;
    }
    return mentions[0];
  }
  if (isDirectedAtUser(text, userName) && userName) {
    return userName;
  }
  return sender;
}

function extractTaskPhrase(text: string): string {
  let cleaned = text.replace(/@\w+/g, "").trim();
  cleaned = cleaned.replace(/^(hey|hi|hello|guys|team|all|everyone|folks)[,\s]*/i, "");
  if (cleaned.length > 120) {
    cleaned = cleaned.slice(0, 120) + "...";
  }
  return cleaned;
}

function categorize(text: string, isDirected: boolean, hasDeadline: boolean, isDecision: boolean, isTask: boolean): ItemCategory {
  if (isDecision) return "decisions";
  if (hasDeadline && isTask) return "deadlines";
  if (isDirected && (isTask || isQuestion(text))) return "needsAction";
  if (hasDeadline) return "deadlines";
  if (isTask && isDirected) return "needsAction";
  if (isTask) return "fyi";
  return "ignorable";
}

export function extractItems(
  messages: NormalizedMessage[],
  settings: AppSettings,
): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const userName = settings.userName;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const text = m.text;

    const mentions = extractMentions(text);
    const directed = isDirectedAtUser(text, userName);
    const isQ = isQuestion(text);
    const hasDeadline = hasDateReference(text);
    const deadline = hasDeadline ? resolveRelativeDate(text, m.timestamp) : null;
    const isDecision = matchAnyPattern(text, DECISION_PATTERNS);
    const isTask = matchAnyPattern(text, TASK_PATTERNS) || (directed && isQ);

    if (!isDecision && !isTask && !hasDeadline && !directed && !isQ) {
      continue;
    }

    if (isQ && !directed && !hasDeadline && !isTask && !isDecision) {
      continue;
    }

    const category = categorize(text, directed, hasDeadline, isDecision, isTask);
    if (category === "ignorable") continue;

    const owner = isDecision ? "" : extractOwnerFromMessage(text, m.sender, userName);
    const task = extractTaskPhrase(text);

    const sourceIds = [m.id];
    if (m.replyTo) {
      const replied = messages.find((x) => x.id === m.replyTo);
      if (replied) sourceIds.push(replied.id);
    }

    items.push({
      id: `item-${m.id}-${i}`,
      category,
      owner,
      task,
      deadline,
      priority: 0,
      priorityLevel: "low",
      sender: m.sender,
      sourceMessageIds: sourceIds,
      whyThisRanking: "",
      status: "unresolved",
      verified: true,
      confidence: "medium",
    });
  }

  return items;
}
