import { describe, it, expect } from "vitest";
import { computePriority, scoreItems } from "@/lib/scorer";
import type { AppSettings, ExtractedItem, NormalizedMessage } from "@/types";

const sampleMessages: NormalizedMessage[] = [
  { id: "m1", timestamp: Date.now() - 50000, sender: "Sarah", text: "Let's start the project", replyTo: null, threadId: null, sourceFormat: "whatsapp" },
  { id: "m2", timestamp: Date.now() - 40000, sender: "Mike", text: "Sure thing", replyTo: "m1", threadId: null, sourceFormat: "whatsapp" },
  { id: "m3", timestamp: Date.now() - 30000, sender: "Priya", text: "I'll handle the API", replyTo: null, threadId: null, sourceFormat: "whatsapp" },
  { id: "m4", timestamp: Date.now() - 20000, sender: "Sarah", text: "Great, thanks Priya", replyTo: "m3", threadId: null, sourceFormat: "whatsapp" },
  { id: "m5", timestamp: Date.now() - 10000, sender: "Alex", text: "I can help too", replyTo: "m3", threadId: null, sourceFormat: "whatsapp" },
];

const baseSettings: AppSettings = {
  userName: "Alex",
  weights: { deadlineProximity: 35, directMention: 25, senderImportance: 15, threadActivity: 10, unresolved: 15 },
  enableLLM: false,
};

function makeItem(overrides: Partial<ExtractedItem> = {}): ExtractedItem {
  return {
    id: "test-item",
    category: "needsAction",
    owner: "Alex",
    task: "Review the PR",
    deadline: null,
    priority: 0,
    priorityLevel: "low",
    sender: "Sarah",
    sourceMessageIds: ["m1", "m2"],
    whyThisRanking: "",
    status: "unresolved",
    verified: true,
    confidence: "medium",
    ...overrides,
  };
}

describe("scorer", () => {
  describe("computePriority", () => {
    it("returns a score between 0 and 100", () => {
      const item = makeItem();
      const result = computePriority(item, sampleMessages, baseSettings.weights, "Alex");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("assigns high priority for imminent deadline + direct mention + unresolved", () => {
      const item = makeItem({
        deadline: Date.now() + 86400000, // tomorrow
        owner: "Alex",
        status: "unresolved",
      });
      const result = computePriority(item, sampleMessages, baseSettings.weights, "Alex");
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.level).toBe("high");
    });

    it("assigns lower priority for no deadline and resolved status", () => {
      const item = makeItem({
        deadline: null,
        owner: "Bob",
        status: "resolved",
      });
      const result = computePriority(item, sampleMessages, baseSettings.weights, "Alex");
      expect(result.score).toBeLessThan(50);
    });

    it("produces an explanation string", () => {
      const item = makeItem();
      const result = computePriority(item, sampleMessages, baseSettings.weights, "Alex");
      expect(result.explanation).toContain("Deadline proximity");
      expect(result.explanation).toContain("Direct mention");
      expect(result.explanation).toContain("Sender importance");
    });

    it("handles zero weights gracefully", () => {
      const item = makeItem();
      const zeroWeights = { deadlineProximity: 0, directMention: 0, senderImportance: 0, threadActivity: 0, unresolved: 0 };
      const result = computePriority(item, sampleMessages, zeroWeights, "Alex");
      expect(result.score).toBe(0);
      expect(result.level).toBe("low");
    });

    it("gives higher score to overdue items", () => {
      const overdue = makeItem({ deadline: Date.now() - 86400000 });
      const future = makeItem({ deadline: Date.now() + 14 * 86400000 });
      const overdueResult = computePriority(overdue, sampleMessages, baseSettings.weights, "Alex");
      const futureResult = computePriority(future, sampleMessages, baseSettings.weights, "Alex");
      expect(overdueResult.score).toBeGreaterThan(futureResult.score);
    });

    it("gives higher score to direct mentions of the user", () => {
      const mentioned = makeItem({ owner: "Alex" });
      const notMentioned = makeItem({ owner: "Bob" });
      const mentionedResult = computePriority(mentioned, sampleMessages, baseSettings.weights, "Alex");
      const notMentionedResult = computePriority(notMentioned, sampleMessages, baseSettings.weights, "Alex");
      expect(mentionedResult.score).toBeGreaterThan(notMentionedResult.score);
    });
  });

  describe("scoreItems", () => {
    it("scores all items in the array", () => {
      const items = [
        makeItem({ id: "a", deadline: Date.now() + 86400000 }),
        makeItem({ id: "b", deadline: null }),
      ];
      const scored = scoreItems(items, sampleMessages, baseSettings);
      expect(scored).toHaveLength(2);
      expect(scored[0].priority).toBeGreaterThan(0);
      expect(scored[1].priorityLevel).toBeDefined();
    });

    it("preserves item properties while adding scores", () => {
      const items = [makeItem({ id: "x", task: "Custom task" })];
      const scored = scoreItems(items, sampleMessages, baseSettings);
      expect(scored[0].task).toBe("Custom task");
      expect(scored[0].whyThisRanking).toBeTruthy();
    });
  });
});
