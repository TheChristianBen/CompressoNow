import type { Candidate, Message, TaskStatus } from "@/core/schema";

const RESOLUTION_PATTERNS = [
  /\bdone\b/i,
  /\bcompleted\b/i,
  /\bsorted\b/i,
  /\bfinished\b/i,
  /\bresolved\b/i,
  /\bshipped\b/i,
  /\bmerged\b/i,
  /\btook care of\b/i,
  /\bhandled\b/i,
  /\bclosed\b/i,
];

const IN_PROGRESS_PATTERNS = [
  /\bworking on\b/i,
  /\bon it\b/i,
  /\bstarted\b/i,
  /\bin progress\b/i,
  /\balmost done\b/i,
  /\bhalfway\b/i,
];

const CANCELLED_PATTERNS = [
  /\bcancelled\b/i,
  /\bscrapped\b/i,
  /\bno longer needed\b/i,
  /\bforget it\b/i,
  /\bnever mind\b/i,
];

const SUPERSEDED_PATTERNS = [
  /\binstead\b/i,
  /\bchanged (the )?plan\b/i,
  /\bsuperseded\b/i,
  /\breplaced by\b/i,
];

export interface ResolutionResult {
  status: TaskStatus;
  resolvedByMessageId: string | null;
  additionalSourceIds: string[];
  possiblyResolved: boolean;
}

export function resolveCandidate(
  candidate: Candidate,
  messages: readonly Message[],
): ResolutionResult {
  if (candidate.category === "decisions") {
    return { status: "open", resolvedByMessageId: null, additionalSourceIds: [], possiblyResolved: false };
  }

  const sourceTime = messages.find((m) => m.id === candidate.sourceMessageIds[0])?.timestamp ?? 0;
  const owner = candidate.owner;

  const laterMessages = messages.filter((m) => m.timestamp > sourceTime && m.text.length >= 3);

  for (const m of laterMessages) {
    // Check for superseded first
    if (SUPERSEDED_PATTERNS.some((p) => p.test(m.text))) {
      if (matchesOwner(m, owner, messages, candidate)) {
        return {
          status: "superseded",
          resolvedByMessageId: m.id,
          additionalSourceIds: [m.id],
          possiblyResolved: false,
        };
      }
    }

    if (CANCELLED_PATTERNS.some((p) => p.test(m.text))) {
      if (matchesOwner(m, owner, messages, candidate)) {
        return {
          status: "cancelled",
          resolvedByMessageId: m.id,
          additionalSourceIds: [m.id],
          possiblyResolved: false,
        };
      }
    }

    if (RESOLUTION_PATTERNS.some((p) => p.test(m.text))) {
      if (matchesOwner(m, owner, messages, candidate)) {
        return {
          status: "resolved",
          resolvedByMessageId: m.id,
          additionalSourceIds: [m.id],
          possiblyResolved: false,
        };
      }
    }
  }

  // Check for in-progress (doesn't close, but updates status)
  for (const m of laterMessages) {
    if (IN_PROGRESS_PATTERNS.some((p) => p.test(m.text))) {
      if (matchesOwner(m, owner, messages, candidate)) {
        return {
          status: "inProgress",
          resolvedByMessageId: null,
          additionalSourceIds: [m.id],
          possiblyResolved: false,
        };
      }
    }
  }

  // Check for possible resolution (resolution word present but owner doesn't match)
  let possiblyResolved = false;
  for (const m of laterMessages) {
    if (RESOLUTION_PATTERNS.some((p) => p.test(m.text))) {
      possiblyResolved = true;
      break;
    }
  }

  return { status: "open", resolvedByMessageId: null, additionalSourceIds: [], possiblyResolved };
}

function matchesOwner(
  m: Message,
  owner: string,
  messages: readonly Message[],
  candidate: Candidate,
): boolean {
  if (owner && owner !== "Unknown") {
    if (m.sender.toLowerCase() === owner.toLowerCase()) return true;
    if (m.text.toLowerCase().includes(owner.toLowerCase())) return true;
  } else {
    const sourceSender = messages.find((msg) => msg.id === candidate.sourceMessageIds[0])?.sender;
    if (sourceSender && m.sender === sourceSender) return true;
  }
  return false;
}

export function resolveAllCandidates(
  candidates: Candidate[],
  messages: readonly Message[],
): { candidate: Candidate; resolution: ResolutionResult }[] {
  return candidates.map((c) => ({
    candidate: c,
    resolution: resolveCandidate(c, messages),
  }));
}
