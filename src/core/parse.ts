import { z } from "zod";
import type { ChatFormat, Message, ParseError, Result } from "@/core/schema";
import { ok, err, messageSchema } from "@/core/schema";

let idCounter = 0;
function deterministicId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function detectFormat(content: string): ChatFormat | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.chats) && parsed.chats.length > 0 && parsed.chats[0].messages) {
        return "telegram";
      }
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0 && parsed.messages[0]?.user) {
        return "slack";
      }
      if (Array.isArray(parsed.messages)) {
        return "telegram";
      }
      if (parsed.channels && Array.isArray(parsed.channels)) {
        return "slack";
      }
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].user) {
        return "slack";
      }
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].text_entities || parsed[0].date_unixtime)) {
        return "telegram";
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

// Detect DD/MM vs MM/DD format by scanning all timestamps
function detectDateFormat(lines: string[]): "DM" | "MD" | "ambiguous" {
  let dmCount = 0;
  let mdCount = 0;
  for (const line of lines) {
    const match = line.match(/^\[?(\d{1,2})[\/.](\d{1,2})[\/.]/);
    if (match) {
      const a = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      if (a > 12 && b <= 12) dmCount++;
      else if (b > 12 && a <= 12) mdCount++;
    }
  }
  if (dmCount > 0 && mdCount === 0) return "DM";
  if (mdCount > 0 && dmCount === 0) return "MD";
  return "ambiguous";
}

function parseWhatsAppTimestamp(line: string, dateFormat: "DM" | "MD" | "ambiguous"): { ts: number; rest: string } | null {
  const match = line.match(/^\[(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\]\s*(.*)$/i);
  const match2 = line.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\s+-\s+(.*)$/i);

  const m = match || match2;
  if (!m) return null;

  let [, first, second, year, hour, min, sec, ampm, rest] = m;
  const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);

  let day: number, month: number;
  const a = parseInt(first, 10);
  const b = parseInt(second, 10);

  if (dateFormat === "DM") {
    day = a; month = b;
  } else if (dateFormat === "MD") {
    day = b; month = a;
  } else {
    // ambiguous: infer from values
    if (a > 12 && b <= 12) { day = a; month = b; }
    else if (b > 12 && a <= 12) { day = b; month = a; }
    else { day = a; month = b; } // default to DM
  }

  let h = parseInt(hour, 10);
  if (ampm) {
    const ap = ampm.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  }

  return {
    ts: new Date(fullYear, month - 1, day, h, parseInt(min, 10), sec ? parseInt(sec, 10) : 0).getTime(),
    rest,
  };
}

// System message detection
function isSystemMessage(sender: string, text: string): boolean {
  const systemPatterns = [
    /^messages and calls are end-to-end encrypted/i,
    /^.+ added .+/i,
    /^.+ changed/i,
    /^.+ left/i,
    /^.+ joined/i,
    /^group icon changed/i,
    /^you blocked/i,
    /^security code changed/i,
    /^.+ is now/i,
  ];
  return systemPatterns.some((p) => p.test(sender) || p.test(text));
}

// Clean media omitted / edited / deleted markers
function cleanText(text: string): string {
  return text
    .replace(/<Media omitted>/g, "[media]")
    .replace(/<This message was edited>/g, "")
    .replace(/This message was deleted\./g, "")
    .replace(/<This message was deleted.>/g, "")
    .trim();
}

export function parseWhatsApp(content: string): Result<Message[], ParseError> {
  const lines = content.split("\n");
  if (lines.length === 0 || !content.trim()) {
    return err({ kind: "empty", message: "File is empty" });
  }

  const dateFormat = detectDateFormat(lines);
  const messages: Message[] = [];
  let current: Message | null = null;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;

    const parsed = parseWhatsAppTimestamp(line, dateFormat);
    if (parsed) {
      if (current) messages.push(current);

      const colonIdx = parsed.rest.indexOf(":");
      let sender = "Unknown";
      let text = parsed.rest;

      if (colonIdx > 0) {
        sender = parsed.rest.slice(0, colonIdx).trim();
        text = parsed.rest.slice(colonIdx + 1).trim();
      } else {
        // System message without colon
        sender = "System";
        text = parsed.rest.trim();
      }

      if (isSystemMessage(sender, text)) {
        current = null;
        continue;
      }

      text = cleanText(text);
      if (!text) {
        current = null;
        continue;
      }

      current = {
        id: deterministicId("wa"),
        timestamp: parsed.ts,
        sender: sender.trim(),
        text,
        replyTo: null,
        threadId: null,
        sourceFormat: "whatsapp",
        originalRaw: line,
      };
    } else if (current) {
      // Multi-line message continuation
      const continued = line.trim();
      if (continued) {
        current = { ...current, text: current.text + "\n" + continued };
      }
    }
  }
  if (current) messages.push(current);

  if (messages.length === 0) {
    return err({ kind: "malformed", message: "No valid messages found in WhatsApp export" });
  }

  return ok(messages);
}

export function parseTelegram(content: string): Result<Message[], ParseError> {
  if (!content.trim()) {
    return err({ kind: "empty", message: "File is empty" });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return err({ kind: "malformed", message: "Invalid JSON for Telegram export" });
  }

  let rawMessages: any[] = [];
  const obj = parsed as any;

  if (obj.chats && Array.isArray(obj.chats)) {
    const chat = obj.chats.find((c: any) => c.messages && c.messages.length > 0) || obj.chats[0];
    rawMessages = chat?.messages ?? [];
  } else if (obj.messages && Array.isArray(obj.messages)) {
    rawMessages = obj.messages;
  } else if (Array.isArray(obj)) {
    rawMessages = obj;
  }

  if (rawMessages.length === 0) {
    return err({ kind: "malformed", message: "No messages found in Telegram export" });
  }

  const messages: Message[] = [];
  for (let i = 0; i < rawMessages.length; i++) {
    const m = rawMessages[i];
    if (!m || (m.type === "service")) continue;

    let text = "";
    if (typeof m.text === "string") {
      text = m.text;
    } else if (Array.isArray(m.text)) {
      text = m.text.map((t: any) => (typeof t === "string" ? t : t.text || "")).join("");
    } else if (m.message) {
      text = m.message;
    }

    if (!text || !text.trim()) continue;

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

    messages.push({
      id: m.id ? `tg-${m.id}` : deterministicId("tg"),
      timestamp: ts,
      sender: sender.trim(),
      text: text.trim(),
      replyTo: m.reply_to_message_id ? `tg-${m.reply_to_message_id}` : null,
      threadId: m.thread_id ? `tg-thread-${m.thread_id}` : null,
      sourceFormat: "telegram",
      originalRaw: JSON.stringify(m).slice(0, 500),
    });
  }

  if (messages.length === 0) {
    return err({ kind: "malformed", message: "No valid messages found after filtering" });
  }

  return ok(messages);
}

export function parseSlack(content: string): Result<Message[], ParseError> {
  if (!content.trim()) {
    return err({ kind: "empty", message: "File is empty" });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return err({ kind: "malformed", message: "Invalid JSON for Slack export" });
  }

  let rawMessages: any[] = [];
  const obj = parsed as any;

  if (Array.isArray(obj)) {
    rawMessages = obj;
  } else if (obj.messages && Array.isArray(obj.messages)) {
    rawMessages = obj.messages;
  } else if (obj.channels && Array.isArray(obj.channels)) {
    const ch = obj.channels[0];
    rawMessages = ch?.messages ?? [];
  } else if (obj.channel_history && Array.isArray(obj.channel_history)) {
    rawMessages = obj.channel_history;
  }

  if (rawMessages.length === 0) {
    return err({ kind: "malformed", message: "No messages found in Slack export" });
  }

  const messages: Message[] = [];
  for (let i = 0; i < rawMessages.length; i++) {
    const m = rawMessages[i];
    if (!m) continue;

    let text = m.text || m.message || "";
    if (!text || !text.trim()) continue;

    let sender = "Unknown";
    if (m.user_profile && m.user_profile.name) sender = m.user_profile.name;
    else if (m.user) sender = m.user;
    else if (m.username) sender = m.username;
    else if (m.bot_profile && m.bot_profile.name) sender = m.bot_profile.name;

    let ts = Date.now();
    if (m.ts) ts = parseFloat(m.ts) * 1000;
    else if (m.timestamp) ts = m.timestamp;

    messages.push({
      id: m.client_msg_id ? `slack-${m.client_msg_id}` : `slack-${i}-${ts}`,
      timestamp: ts,
      sender: sender.trim(),
      text: text.trim(),
      replyTo: m.thread_ts ? `slack-${m.thread_ts}` : null,
      threadId: m.thread_ts ? `slack-thread-${m.thread_ts}` : null,
      sourceFormat: "slack",
      originalRaw: JSON.stringify(m).slice(0, 500),
    });
  }

  if (messages.length === 0) {
    return err({ kind: "malformed", message: "No valid messages found after filtering" });
  }

  return ok(messages);
}

export function parseChat(content: string, forceFormat?: ChatFormat): Result<Message[], ParseError> {
  if (!content || !content.trim()) {
    return err({ kind: "empty", message: "Content is empty" });
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

export function validateAndClean(messages: Message[]): Message[] {
  return messages
    .filter((m) => m.text && m.text.trim().length > 0)
    .map((m) => ({
      ...m,
      sender: m.sender?.trim() || "Unknown",
      text: m.text.trim(),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Serialize messages for round-trip testing
export function serializeMessages(messages: readonly Message[]): string {
  return JSON.stringify(messages);
}

export function deserializeMessages(json: string): Result<Message[], ParseError> {
  try {
    const data = JSON.parse(json);
    const result = z.array(messageSchema).safeParse(data);
    if (!result.success) {
      return err({ kind: "malformed", message: result.error.message });
    }
    return ok(result.data);
  } catch {
    return err({ kind: "malformed", message: "Failed to deserialize messages" });
  }
}
