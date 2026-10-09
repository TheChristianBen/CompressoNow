import type { AppSettings, PriorityWeights } from "@/core/schema";

export const DEFAULT_WEIGHTS: PriorityWeights = {
  deadlineProximity: 35,
  directMention: 25,
  senderImportance: 15,
  threadActivity: 10,
  unresolved: 15,
};

export const DEFAULT_SETTINGS: AppSettings = {
  userName: "",
  weights: { ...DEFAULT_WEIGHTS },
  enableLLM: false,
};

export const MAX_MESSAGES_PER_CHUNK = 200;
export const CHUNK_OVERLAP = 20;
