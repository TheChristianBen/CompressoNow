import type { ChatFormat, NormalizedMessage } from "@/types";

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function detectFormat(content: string): ChatFormat | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.messages) || (Array.isArray(parsed.chats) && parsed.chats.length > 0 && parsed.chats[0].messages)) {
        return "telegram";
      }
      if (Array.isArray(parsed.messages) || (parsed.channels && parsed.channels.length > 0)) {
        return "slack";
      }
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].user) {
        return "slack";
      }
    }
  } catch {
    // not JSON
  }
  if (/^\[?\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}[,\s]/.test(trimmed)) {
    return "whatsapp";
  }
  return null;
}

function parseWhatsAppTimestamp(line: string): { ts: number; rest: string } | null {
  const match = line.match(/^\[(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*(.*)$/);
  if (match) {
    let [, day, month, year, hour, min, sec, rest] = match;
    const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
    return {
      ts: new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hour, 10), parseInt(min, 10), sec ? parseInt(sec, 10) : 0).getTime(),
      rest,
    };
  }
  const match2 = line.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s+-\s+(.*)$/);
  if (match2) {
    let [, day, month, year, hour, min, sec, rest] = match2;
    const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
    return {
      ts: new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hour, 10), parseInt(min, 10), sec ? parseInt(sec, 10) : 0).getTime(),
      rest,
    };
  }
  return null;
}

function parseWhatsApp(content: string): NormalizedMessage[] {
  const lines = content.split("\n");
  const messages: NormalizedMessage[] = [];
  let current: NormalizedMessage | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseWhatsAppTimestamp(line);
    if (parsed) {
      if (current) messages.push(current);
      const colonIdx = parsed.rest.indexOf(":");
      let sender = "Unknown";
      let text = parsed.rest;
      if (colonIdx > 0) {
        sender = parsed.rest.slice(0, colonIdx).trim();
        text = parsed.rest.slice(colonIdx + 1).trim();
      }
      current = {
        id: generateId(),
        timestamp: parsed.ts,
        sender,
        text,
        replyTo: null,
        threadId: null,
        sourceFormat: "whatsapp",
        originalRaw: line,
      };
    } else if (current) {
      current.text += "\n" + line.trim();
    }
  }
  if (current) messages.push(current);
  return messages;
}

function parseTelegram(content: string): NormalizedMessage[] {
  const parsed = JSON.parse(content);
  let rawMessages: any[] = [];

  if (parsed.chats && Array.isArray(parsed.chats)) {
    const chat = parsed.chats.find((c: any) => c.messages && c.messages.length > 0) || parsed.chats[0];
    rawMessages = chat?.messages ?? [];
  } else if (parsed.messages && Array.isArray(parsed.messages)) {
    rawMessages = parsed.messages;
  } else if (Array.isArray(parsed)) {
    rawMessages = parsed;
  }

  return rawMessages
    .filter((m: any) => m && (m.text || m.text_entities || m.message))
    .map((m: any, i: number) => {
      let text = "";
      if (typeof m.text === "string") {
        text = m.text;
      } else if (Array.isArray(m.text)) {
        text = m.text.map((t: any) => (typeof t === "string" ? t : t.text || "")).join("");
      } else if (m.message) {
        text = m.message;
      }

      let sender = "Unknown";
      if (m.from) sender = m.from;
      else if (m.sender) sender = typeof m.sender === "string" ? m.sender : m.sender.first_name || m.sender.name || "Unknown";
      else if (m.author) sender = m.author;

      let ts = Date.now();
      if (m.date_unixtime) ts = parseInt(m.date_unixtime, 10) * 1000;
      else if (m.date) {
        const d = new Date(m.date);
        if (!isNaN(d.getTime())) ts = d.getTime();
      }

      return {
        id: m.id ? `tg-${m.id}-${i}` : generateId(),
        timestamp: ts,
        sender,
        text,
        replyTo: m.reply_to_message_id ? `tg-${m.reply_to_message_id}` : null,
        threadId: m.thread_id ? `tg-thread-${m.thread_id}` : null,
        sourceFormat: "telegram" as ChatFormat,
        originalRaw: JSON.stringify(m).slice(0, 500),
      };
    });
}

function parseSlack(content: string): NormalizedMessage[] {
  const parsed = JSON.parse(content);
  let rawMessages: any[] = [];

  if (Array.isArray(parsed)) {
    rawMessages = parsed;
  } else if (parsed.messages && Array.isArray(parsed.messages)) {
    rawMessages = parsed.messages;
  } else if (parsed.channels && Array.isArray(parsed.channels)) {
    const ch = parsed.channels[0];
    rawMessages = ch?.messages ?? [];
  } else if (parsed.channel_history && Array.isArray(parsed.channel_history)) {
    rawMessages = parsed.channel_history;
  }

  return rawMessages
    .filter((m: any) => m && (m.text || m.message))
    .map((m: any, i: number) => {
      let sender = "Unknown";
      if (m.user_profile && m.user_profile.name) sender = m.user_profile.name;
      else if (m.user) sender = m.user;
      else if (m.username) sender = m.username;
      else if (m.bot_profile && m.bot_profile.name) sender = m.bot_profile.name;

      let ts = Date.now();
      if (m.ts) ts = parseFloat(m.ts) * 1000;
      else if (m.timestamp) ts = m.timestamp;

      return {
        id: m.client_msg_id ? `slack-${m.client_msg_id}` : `slack-${i}-${ts}`,
        timestamp: ts,
        sender,
        text: m.text || m.message || "",
        replyTo: m.thread_ts ? `slack-${m.thread_ts}` : null,
        threadId: m.thread_ts ? `slack-thread-${m.thread_ts}` : null,
        sourceFormat: "slack" as ChatFormat,
        originalRaw: JSON.stringify(m).slice(0, 500),
      };
    });
}

export function parseChat(content: string, forceFormat?: ChatFormat): NormalizedMessage[] {
  if (!content || !content.trim()) {
    return [];
  }
  const format = forceFormat ?? detectFormat(content);
  switch (format) {
    case "whatsapp":
      return parseWhatsApp(content);
    case "telegram":
      return parseTelegram(content);
    case "slack":
      return parseSlack(content);
    default:
      return parseWhatsApp(content);
  }
}

export function validateAndClean(messages: NormalizedMessage[]): NormalizedMessage[] {
  return messages
    .filter((m) => m.text && m.text.trim().length > 0)
    .map((m) => ({
      ...m,
      sender: m.sender?.trim() || "Unknown",
      text: m.text.trim(),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}
