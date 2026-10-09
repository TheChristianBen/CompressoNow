import type { Candidate, ItemCategory, Message } from "@/core/schema";

// ─── Pattern Registry ───────────────────────────────────────────
export interface ExtractionRule {
  id: string;
  precision: number;
  pattern: RegExp;
  category: ItemCategory;
  description: string;
}

const RULES: ExtractionRule[] = [
  // Decision patterns
  { id: "decision-go-with", precision: 0.9, category: "decisions", pattern: /\blet'?s go with\b/i, description: "Let's go with X" },
  { id: "decision-finalized", precision: 0.92, category: "decisions", pattern: /\bfinalized\b/i, description: "Finalized" },
  { id: "decision-agreed", precision: 0.85, category: "decisions", pattern: /\bagreed\b/i, description: "Agreed" },
  { id: "decision-decided", precision: 0.9, category: "decisions", pattern: /\bdecided\b/i, description: "Decided" },
  { id: "decision-will-use", precision: 0.88, category: "decisions", pattern: /\bwe'?ll (use|go with|do|adopt)\b/i, description: "We'll use/do X" },
  { id: "decision-confirmed", precision: 0.87, category: "decisions", pattern: /\bconfirmed\b/i, description: "Confirmed" },
  { id: "decision-signed-off", precision: 0.9, category: "decisions", pattern: /\bsigned off\b/i, description: "Signed off" },
  { id: "decision-settled", precision: 0.85, category: "decisions", pattern: /\bthat'?s settled\b/i, description: "That's settled" },

  // Task patterns
  { id: "task-please", precision: 0.75, category: "needsAction", pattern: /\bplease\s+\w+/i, description: "Please do X" },
  { id: "task-can-you", precision: 0.8, category: "needsAction", pattern: /\bcan you\s+/i, description: "Can you X" },
  { id: "task-could-you", precision: 0.8, category: "needsAction", pattern: /\bcould you\s+/i, description: "Could you X" },
  { id: "task-make-sure", precision: 0.7, category: "needsAction", pattern: /\bmake sure\b/i, description: "Make sure X" },
  { id: "task-dont-forget", precision: 0.75, category: "needsAction", pattern: /\bdon'?t forget\b/i, description: "Don't forget X" },
  { id: "task-remind", precision: 0.7, category: "needsAction", pattern: /\bremind me\b/i, description: "Remind me X" },
  { id: "task-needs-to", precision: 0.65, category: "needsAction", pattern: /\bneeds? to\b/i, description: "Needs to X" },
  { id: "task-should", precision: 0.55, category: "needsAction", pattern: /\bshould\b/i, description: "Should X" },
  { id: "task-must", precision: 0.7, category: "needsAction", pattern: /\bmust\b/i, description: "Must X" },
  { id: "task-assign", precision: 0.7, category: "needsAction", pattern: /\bassign\b/i, description: "Assign X" },
  { id: "task-update", precision: 0.5, category: "needsAction", pattern: /\bupdate\b/i, description: "Update X" },
  { id: "task-send", precision: 0.65, category: "needsAction", pattern: /\bsend (me|us|over)\b/i, description: "Send me X" },
  { id: "task-fix", precision: 0.7, category: "needsAction", pattern: /\bfix\b/i, description: "Fix X" },
  { id: "task-deploy", precision: 0.7, category: "needsAction", pattern: /\bdeploy\b/i, description: "Deploy X" },
  { id: "task-review", precision: 0.6, category: "needsAction", pattern: /\breview\b/i, description: "Review X" },
  { id: "task-check", precision: 0.5, category: "needsAction", pattern: /\bcheck\b/i, description: "Check X" },
];

// ─── Negation / Conditional Detection ───────────────────────────
const NEGATION_PATTERNS = [
  /\bdon'?t (send|do|update|fix|deploy|review|check|share|create)\b/i,
  /\bdo not (send|do|update|fix|deploy|review|check|share|create)\b/i,
  /\bno need to\b/i,
  /\bnot (necessary|required|needed)\b/i,
  /\bnever\b/i,
  /\bshouldn'?t\b/i,
  /\bwon'?t\b/i,
  /\bcan'?t\b/i,
  /\bunable to\b/i,
];

const CONDITIONAL_PATTERNS = [
  /\bif .+ (then|we'?ll|I'?ll|let'?s)\b/i,
  /\bif .+ agrees?\b/i,
  /\bdepending on\b/i,
  /\bunless\b/i,
  /\bonly if\b/i,
];

function isNegated(text: string): boolean {
  return NEGATION_PATTERNS.some((p) => p.test(text));
}

function isConditional(text: string): boolean {
  return CONDITIONAL_PATTERNS.some((p) => p.test(text));
}

// ─── Mention extraction ─────────────────────────────────────────
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

// ─── Coreference-lite ───────────────────────────────────────────
function resolveCoreference(
  text: string,
  sender: string,
  userName: string,
  messages: readonly Message[],
  currentIdx: number,
): string {
  const mentions = extractMentions(text);
  if (mentions.length > 0) {
    if (userName && mentions.some((m) => m.toLowerCase() === userName.toLowerCase())) {
      return userName;
    }
    return mentions[0];
  }

  if (/\bme\b/i.test(text) && /\bI'?ll\b/i.test(text)) {
    return sender;
  }

  if (isDirectedAtUser(text, userName) && userName) {
    // Try to resolve "you" via reply chain
    const current = messages[currentIdx];
    if (current.replyTo) {
      const replied = messages.find((m) => m.id === current.replyTo);
      if (replied) return replied.sender;
    }
    // Or the previous message sender
    if (currentIdx > 0) {
      const prev = messages[currentIdx - 1];
      if (prev.sender !== sender) return prev.sender;
    }
    return userName;
  }

  return sender;
}

// ─── Task phrase extraction ─────────────────────────────────────
function extractTaskPhrase(text: string): string {
  let cleaned = text.replace(/@\w+/g, "").trim();
  cleaned = cleaned.replace(/^(hey|hi|hello|guys|team|all|everyone|folks)[,\s]*/i, "");
  if (cleaned.length > 150) {
    cleaned = cleaned.slice(0, 150) + "...";
  }
  return cleaned;
}

// ─── Categorization ─────────────────────────────────────────────
function categorize(
  text: string,
  directed: boolean,
  hasDeadline: boolean,
  isDecision: boolean,
  isTask: boolean,
  ruleCategory: ItemCategory,
): ItemCategory {
  if (isDecision) return "decisions";
  if (ruleCategory === "decisions") return "decisions";
  if (hasDeadline && isTask) return "deadlines";
  if (directed && (isTask || isQuestion(text))) return "needsAction";
  if (hasDeadline) return "deadlines";
  if (isTask && directed) return "needsAction";
  if (isTask) return "fyi";
  return "ignorable";
}

// ─── Deduplication (token-set similarity) ───────────────────────
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

function deduplicate(candidates: Candidate[], threshold = 0.7): Candidate[] {
  const result: Candidate[] = [];
  const tokenSets = candidates.map((c) => tokenize(c.task));

  for (let i = 0; i < candidates.length; i++) {
    let merged = false;
    for (let j = 0; j < result.length; j++) {
      const sim = jaccardSimilarity(tokenSets[i], tokenize(result[j].task));
      if (sim >= threshold && candidates[i].category === result[j].category) {
        // Merge citations
        result[j] = {
          ...result[j],
          sourceMessageIds: [...new Set([...result[j].sourceMessageIds, ...candidates[i].sourceMessageIds])],
        };
        merged = true;
        break;
      }
    }
    if (!merged) {
      result.push(candidates[i]);
    }
  }

  return result;
}

// ─── Main extraction function ───────────────────────────────────
export function extractCandidates(
  messages: readonly Message[],
  userName: string,
): Candidate[] {
  const candidates: Candidate[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const text = m.text;

    // Skip negated and conditional messages (unless they also have a decision pattern)
    const negated = isNegated(text);
    const conditional = isConditional(text);

    const matchingRules = RULES.filter((r) => r.pattern.test(text));
    if (matchingRules.length === 0) {
      // Check for question directed at user or deadline reference
      const directed = isDirectedAtUser(text, userName);
      const isQ = isQuestion(text);
      if (!directed && !isQ) continue;
      if (negated && !directed) continue;
    }

    // Skip negated task phrases
    if (negated) {
      const hasDecision = matchingRules.some((r) => r.category === "decisions");
      if (!hasDecision) continue;
    }

    // Pick the highest-precision rule
    const bestRule = matchingRules.sort((a, b) => b.precision - a.precision)[0];
    const isDecision = matchingRules.some((r) => r.category === "decisions");
    const isTask = matchingRules.some((r) => r.category === "needsAction") || (isDirectedAtUser(text, userName) && isQuestion(text));
    const directed = isDirectedAtUser(text, userName);

    // Time resolution
    const timeRes = resolveTimeSafe(text, m.timestamp);
    const hasDeadline = timeRes.confidence > 0.5 && !timeRes.ambiguous;
    const deadline = hasDeadline ? timeRes.end : null;
    const deadlineConfidence = hasDeadline ? timeRes.confidence : 0;

    const category = bestRule
      ? categorize(text, directed, hasDeadline, isDecision, isTask, bestRule.category)
      : categorize(text, directed, hasDeadline, isDecision, isTask, "fyi");

    if (category === "ignorable") continue;

    const owner = isDecision
      ? ""
      : resolveCoreference(text, m.sender, userName, messages, i);
    const task = extractTaskPhrase(text);
    if (!task) continue;

    // Build source ids
    const sourceIds = [m.id];
    if (m.replyTo) {
      const replied = messages.find((x) => x.id === m.replyTo);
      if (replied) sourceIds.push(replied.id);
    }

    candidates.push({
      id: `cand-${m.id}-${i}`,
      category,
      owner,
      task,
      deadline,
      deadlineConfidence,
      sender: m.sender,
      sourceMessageIds: sourceIds,
      ruleId: bestRule?.id ?? "question-directed",
      rulePrecision: bestRule?.precision ?? 0.5,
    });
  }

  return deduplicate(candidates);
}

// Re-export time resolution for internal use
import { resolveTime } from "@/core/time";
function resolveTimeSafe(text: string, ts: number) {
  return resolveTime(text, ts);
}

export { RULES as EXTRACTION_RULES };
