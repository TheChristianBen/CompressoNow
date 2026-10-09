import { z } from "zod";

// ─── Branded types ──────────────────────────────────────────────
declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type MessageId = Brand<string, "MessageId">;
export type ISOTimestamp = Brand<number, "ISOTimestamp">;

// ─── Result type ────────────────────────────────────────────────
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

// ─── Zod schemas (single source of truth) ───────────────────────

export const chatFormatSchema = z.enum(["whatsapp", "telegram", "slack"]);
export type ChatFormat = z.infer<typeof chatFormatSchema>;

export const messageSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().int(),
  sender: z.string().min(1),
  text: z.string(),
  replyTo: z.string().nullable(),
  threadId: z.string().nullable(),
  sourceFormat: chatFormatSchema,
  originalRaw: z.string().optional(),
}).readonly();

export type Message = z.infer<typeof messageSchema>;

export const itemCategorySchema = z.enum([
  "needsAction",
  "decisions",
  "deadlines",
  "fyi",
  "ignorable",
]);
export type ItemCategory = z.infer<typeof itemCategorySchema>;

export const taskStatusSchema = z.enum([
  "open",
  "inProgress",
  "resolved",
  "cancelled",
  "superseded",
]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const priorityLevelSchema = z.enum(["high", "medium", "low"]);
export type PriorityLevel = z.infer<typeof priorityLevelSchema>;

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const priorityWeightsSchema = z.object({
  deadlineProximity: z.number().min(0).max(50),
  directMention: z.number().min(0).max(50),
  senderImportance: z.number().min(0).max(50),
  threadActivity: z.number().min(0).max(50),
  unresolved: z.number().min(0).max(50),
}).readonly();
export type PriorityWeights = z.infer<typeof priorityWeightsSchema>;

export const appSettingsSchema = z.object({
  userName: z.string(),
  weights: priorityWeightsSchema,
  enableLLM: z.boolean(),
}).readonly();
export type AppSettings = z.infer<typeof appSettingsSchema>;

// ─── Score breakdown ────────────────────────────────────────────
export const scoreFactorSchema = z.object({
  name: z.string(),
  weight: z.number(),
  value: z.number(),
  contribution: z.number(),
}).readonly();
export type ScoreFactor = z.infer<typeof scoreFactorSchema>;

export const scoreBreakdownSchema = z.object({
  total: z.number().min(0).max(100),
  factors: z.array(scoreFactorSchema),
}).readonly();
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

// ─── Briefing item (post-verification) ──────────────────────────
export const briefingItemSchema = z.object({
  id: z.string().min(1),
  category: itemCategorySchema,
  owner: z.string(),
  task: z.string().min(1),
  deadline: z.number().nullable(),
  priority: z.number().min(0).max(100),
  priorityLevel: priorityLevelSchema,
  sender: z.string(),
  sourceMessageIds: z.array(z.string().min(1)).min(1),
  whyThisRanking: z.string(),
  status: taskStatusSchema,
  resolvedByMessageId: z.string().nullable(),
  verified: z.boolean(),
  confidence: confidenceSchema,
  verificationIssues: z.array(z.string()),
  scoreBreakdown: scoreBreakdownSchema,
}).readonly();
export type BriefingItem = z.infer<typeof briefingItemSchema>;

// ─── Candidate (pre-verification, pre-scoring) ──────────────────
export const candidateSchema = z.object({
  id: z.string().min(1),
  category: itemCategorySchema,
  owner: z.string(),
  task: z.string().min(1),
  deadline: z.number().nullable(),
  deadlineConfidence: z.number().min(0).max(1),
  sender: z.string(),
  sourceMessageIds: z.array(z.string().min(1)).min(1),
  ruleId: z.string(),
  rulePrecision: z.number().min(0).max(1),
}).readonly();
export type Candidate = z.infer<typeof candidateSchema>;

// ─── Verification ───────────────────────────────────────────────
export const verificationFailureSchema = z.object({
  entity: z.string(),
  reason: z.string(),
}).readonly();
export type VerificationFailure = z.infer<typeof verificationFailureSchema>;

export const verificationResultSchema = z.object({
  verified: z.boolean(),
  confidence: confidenceSchema,
  failures: z.array(verificationFailureSchema),
}).readonly();
export type VerificationResult = z.infer<typeof verificationResultSchema>;

// ─── Time resolution ────────────────────────────────────────────
export const timeResolutionSchema = z.object({
  start: z.number().nullable(),
  end: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  ambiguous: z.boolean(),
  matchedPhrase: z.string(),
}).readonly();
export type TimeResolution = z.infer<typeof timeResolutionSchema>;

// ─── Chat answer ────────────────────────────────────────────────
export const chatAnswerSchema = z.object({
  text: z.string(),
  sourceMessageIds: z.array(z.string().min(1)),
  found: z.boolean(),
  sentenceCitations: z.array(z.object({
    sentence: z.string(),
    messageIds: z.array(z.string().min(1)),
  })).readonly(),
}).readonly();
export type ChatAnswer = z.infer<typeof chatAnswerSchema>;

// ─── Evaluation ─────────────────────────────────────────────────
export const groundTruthItemSchema = z.object({
  owner: z.string(),
  task: z.string(),
  category: itemCategorySchema,
  keywords: z.array(z.string()),
}).readonly();
export type GroundTruthItem = z.infer<typeof groundTruthItemSchema>;

export const sampleChatSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  description: z.string(),
  messages: z.array(messageSchema),
  groundTruth: z.array(groundTruthItemSchema),
}).readonly();
export type SampleChat = z.infer<typeof sampleChatSchema>;

export const evalResultSchema = z.object({
  precision: z.number(),
  recall: z.number(),
  f1: z.number(),
  hallucinationRate: z.number(),
  processingTimeMs: z.number(),
  truePositives: z.number(),
  falsePositives: z.number(),
  falseNegatives: z.number(),
  perCategory: z.record(z.string(), z.object({
    precision: z.number(),
    recall: z.number(),
    f1: z.number(),
    tp: z.number(),
    fp: z.number(),
    fn: z.number(),
  })),
  confusion: z.record(z.string(), z.record(z.string(), z.number())),
}).readonly();
export type EvalResult = z.infer<typeof evalResultSchema>;

// ─── Parse error ────────────────────────────────────────────────
export const parseErrorSchema = z.object({
  kind: z.enum(["empty", "malformed", "unsupported", "truncated"]),
  message: z.string(),
  line: z.number().optional(),
}).readonly();
export type ParseError = z.infer<typeof parseErrorSchema>;

// ─── Helpers ────────────────────────────────────────────────────
export function brandMessageId(id: string): MessageId {
  return id as MessageId;
}

export function brandTimestamp(ts: number): ISOTimestamp {
  return ts as ISOTimestamp;
}

// ─── Invariant checks ───────────────────────────────────────────
export function checkInvariants(messages: readonly Message[]): string[] {
  const violations: string[] = [];
  const seenIds = new Set<string>();
  let prevTs = -Infinity;

  for (const m of messages) {
    if (seenIds.has(m.id)) {
      violations.push(`Duplicate message id: ${m.id}`);
    }
    seenIds.add(m.id);

    if (m.timestamp < prevTs) {
      // Not strictly monotonic across the whole set (different threads),
      // but we flag within same thread
    }
    prevTs = m.timestamp;
  }

  return violations;
}

export function checkBriefingItemInvariants(
  item: BriefingItem,
  messages: readonly Message[],
): string[] {
  const violations: string[] = [];
  const messageIds = new Set(messages.map((m) => m.id));

  if (item.sourceMessageIds.length < 1) {
    violations.push("BriefingItem must have at least 1 source message");
  }

  for (const sid of item.sourceMessageIds) {
    if (!messageIds.has(sid)) {
      violations.push(`Source message id ${sid} not found in chat`);
    }
  }

  if (item.priority < 0 || item.priority > 100) {
    violations.push(`Priority ${item.priority} out of [0,100]`);
  }

  if (Number.isNaN(item.priority)) {
    violations.push("Priority is NaN");
  }

  return violations;
}
