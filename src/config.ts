import type { AppSettings, PriorityWeights } from "@/types";

export const DB_NAME = "catchup-db";
export const DB_VERSION = 1;
export const STORE_MESSAGES = "messages";
export const STORE_ITEMS = "items";
export const STORE_SETTINGS = "settings";
export const STORE_KEY = "state";

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

export const DECISION_PATTERNS = [
  /\blet'?s go with\b/i,
  /\bfinalized\b/i,
  /\bagreed\b/i,
  /\bdecided\b/i,
  /\bwe'?ll (use|go with|do|adopt)\b/i,
  /\bconfirmed\b/i,
  /\bsigned off\b/i,
  /\bthat'?s settled\b/i,
];

export const TASK_PATTERNS = [
  /\bplease\s+\w+/i,
  /\bcan you\s+/i,
  /\bcould you\s+/i,
  /\bmake sure\b/i,
  /\bdon'?t forget\b/i,
  /\bremind me\b/i,
  /\bneeds? to\b/i,
  /\bshould\b/i,
  /\bmust\b/i,
  /\bassign\b/i,
  /\bupdate\b/i,
  /\bsend (me|us|over)\b/i,
  /\bcheck\b/i,
  /\breview\b/i,
  /\bfix\b/i,
  /\bdeploy\b/i,
];

export const RESOLUTION_PATTERNS = [
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
