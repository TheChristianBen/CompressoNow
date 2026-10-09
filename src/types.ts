export type ChatFormat = "whatsapp" | "telegram" | "slack";

export interface NormalizedMessage {
  id: string;
  timestamp: number;
  sender: string;
  text: string;
  replyTo: string | null;
  threadId: string | null;
  sourceFormat: ChatFormat;
  originalRaw?: string;
}

export type PriorityLevel = "high" | "medium" | "low";

export type ItemCategory =
  | "needsAction"
  | "decisions"
  | "deadlines"
  | "fyi"
  | "ignorable";

export interface ExtractedItem {
  id: string;
  category: ItemCategory;
  owner: string;
  task: string;
  deadline: number | null;
  priority: number;
  priorityLevel: PriorityLevel;
  sender: string;
  sourceMessageIds: string[];
  whyThisRanking: string;
  status: "unresolved" | "resolved";
  resolvedByMessageId?: string;
  verified: boolean;
  confidence: "high" | "medium" | "low";
  verificationIssues?: string[];
}

export interface PriorityWeights {
  deadlineProximity: number;
  directMention: number;
  senderImportance: number;
  threadActivity: number;
  unresolved: number;
}

export interface AppSettings {
  userName: string;
  weights: PriorityWeights;
  enableLLM: boolean;
}

export interface VerificationResult {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  issues: string[];
}

export interface ChatAnswer {
  text: string;
  sourceMessageIds: string[];
  found: boolean;
}

export interface SampleChat {
  id: string;
  label: string;
  description: string;
  messages: NormalizedMessage[];
  groundTruth: GroundTruthItem[];
}

export interface GroundTruthItem {
  owner: string;
  task: string;
  category: ItemCategory;
  keywords: string[];
}

export interface EvalResult {
  precision: number;
  recall: number;
  f1: number;
  hallucinationRate: number;
  processingTimeMs: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}
