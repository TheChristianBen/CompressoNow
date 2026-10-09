import type { ExtractedItem, NormalizedMessage } from "@/types";
import { RESOLUTION_PATTERNS } from "@/config";

export function resolveItems(
  items: ExtractedItem[],
  messages: NormalizedMessage[],
): ExtractedItem[] {
  const updated = items.map((item) => ({ ...item }));

  for (const item of updated) {
    if (item.status === "resolved") continue;
    if (item.category === "decisions") continue;

    const sourceTime = messages.find((m) => m.id === item.sourceMessageIds[0])?.timestamp ?? 0;
    const owner = item.owner;

    for (const m of messages) {
      if (m.timestamp <= sourceTime) continue;
      if (m.text.length < 3) continue;

      const isResolved = RESOLUTION_PATTERNS.some((p) => p.test(m.text));
      if (!isResolved) continue;

      if (owner && owner !== "Unknown") {
        if (m.sender.toLowerCase() === owner.toLowerCase() || m.text.toLowerCase().includes(owner.toLowerCase())) {
          item.status = "resolved";
          item.resolvedByMessageId = m.id;
          item.sourceMessageIds = [...item.sourceMessageIds, m.id];
          break;
        }
      } else {
        const sourceSender = messages.find((msg) => msg.id === item.sourceMessageIds[0])?.sender;
        if (sourceSender && m.sender === sourceSender) {
          item.status = "resolved";
          item.resolvedByMessageId = m.id;
          item.sourceMessageIds = [...item.sourceMessageIds, m.id];
          break;
        }
      }
    }
  }

  return updated;
}
