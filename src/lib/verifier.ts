import type { ExtractedItem, NormalizedMessage, VerificationResult } from "@/types";

const NAME_PATTERN = /@([A-Z][a-z]+)/g;
const DATE_WORDS = /\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|eod|eow)\b/gi;
const NUMBER_PATTERN = /\b\d+\b/g;

export function verifyItem(item: ExtractedItem, messages: NormalizedMessage[]): VerificationResult {
  const citedMessages = messages.filter((m) => item.sourceMessageIds.includes(m.id));
  if (citedMessages.length === 0) {
    return { verified: false, confidence: "low", issues: ["No cited messages found."] };
  }

  const citedText = citedMessages.map((m) => `${m.sender} ${m.text}`).join(" ").toLowerCase();
  const issues: string[] = [];

  const namesInTask = item.task.match(NAME_PATTERN);
  if (namesInTask) {
    for (const nameMatch of namesInTask) {
      const name = nameMatch.slice(1).toLowerCase();
      if (!citedText.includes(name) && !item.owner.toLowerCase().includes(name)) {
        issues.push(`Name "${nameMatch}" not found in cited messages.`);
      }
    }
  }

  if (item.owner && item.owner !== "Unknown" && item.owner !== "") {
    if (!citedText.includes(item.owner.toLowerCase())) {
      issues.push(`Owner "${item.owner}" not found in cited messages.`);
    }
  }

  const dateWordsInTask = item.task.match(DATE_WORDS);
  if (dateWordsInTask) {
    for (const dw of dateWordsInTask) {
      if (!citedText.includes(dw.toLowerCase())) {
        issues.push(`Date reference "${dw}" not found in cited messages.`);
      }
    }
  }

  const numbersInTask = item.task.match(NUMBER_PATTERN);
  if (numbersInTask) {
    for (const num of numbersInTask) {
      if (num.length > 1 && !citedText.includes(num)) {
        issues.push(`Number "${num}" not found in cited messages.`);
      }
    }
  }

  if (issues.length >= 2) {
    return { verified: false, confidence: "low", issues };
  }
  if (issues.length === 1) {
    return { verified: true, confidence: "medium", issues };
  }

  const hasStrongEvidence = citedMessages.some((m) => m.text.length > 20);
  return {
    verified: true,
    confidence: hasStrongEvidence ? "high" : "medium",
    issues: [],
  };
}

export function verifyItems(
  items: ExtractedItem[],
  messages: NormalizedMessage[],
): ExtractedItem[] {
  return items.map((item) => {
    const result = verifyItem(item, messages);
    return {
      ...item,
      verified: result.verified,
      confidence: result.confidence,
      verificationIssues: result.issues,
    };
  });
}
