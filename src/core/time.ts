import type { TimeResolution } from "@/core/schema";

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const MONTH_ABBR = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

function getMonthIndex(month: string): number {
  const lower = month.toLowerCase();
  let idx = MONTH_NAMES.indexOf(lower);
  if (idx === -1) idx = MONTH_ABBR.indexOf(lower);
  return idx;
}

function getNextWeekday(currentDate: Date, targetDay: number, skipCurrent: boolean): Date {
  const result = new Date(currentDate);
  const currentDay = result.getDay();
  let diff = targetDay - currentDay;
  if (skipCurrent) {
    if (diff <= 0) diff += 7;
  } else {
    if (diff < 0) diff += 7;
  }
  result.setDate(result.getDate() + diff);
  return result;
}

const AMBIGUOUS_PHRASES = [
  /\bsoon\b/i,
  /\blater\b/i,
  /\beventually\b/i,
  /\bat some point\b/i,
  /\bwhen (i|we) get (a )?chance\b/i,
  /\bwhen possible\b/i,
  /\basap\b/i,
  /\bright away\b/i,
];

export function resolveTime(
  text: string,
  messageTimestamp: number,
): TimeResolution {
  const base = new Date(messageTimestamp);
  const lower = text.toLowerCase();

  // Check ambiguous phrases first — never produce a fake deadline
  for (const pattern of AMBIGUOUS_PHRASES) {
    if (pattern.test(lower)) {
      return {
        start: null,
        end: null,
        confidence: 0.3,
        ambiguous: true,
        matchedPhrase: pattern.source.replace(/[\\]/g, ""),
      };
    }
  }

  // "in N days/weeks/months/years"
  const inMatch = lower.match(/\bin (\d+) (day|week|month|year)s?\b/);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const d = new Date(base);
    if (unit === "day") d.setDate(d.getDate() + n);
    else if (unit === "week") d.setDate(d.getDate() + n * 7);
    else if (unit === "month") d.setMonth(d.getMonth() + n);
    else if (unit === "year") d.setFullYear(d.getFullYear() + n);
    return { start: d.getTime(), end: d.getTime(), confidence: 0.95, ambiguous: false, matchedPhrase: inMatch[0] };
  }

  // "tomorrow" / "kal" (Hindi for tomorrow)
  if (/\btomorrow\b/.test(lower) || /\bkal\b/i.test(lower)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return { start: d.getTime(), end: d.getTime(), confidence: 0.95, ambiguous: false, matchedPhrase: "tomorrow" };
  }

  // "parso" (Hindi for day after tomorrow)
  if (/\bparso\b/i.test(lower)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 2);
    return { start: d.getTime(), end: d.getTime(), confidence: 0.9, ambiguous: false, matchedPhrase: "parso" };
  }

  // "today" / "tonight" / "eod" / "end of day"
  if (/\b(today|tonight)\b/.test(lower) || /\beod\b/i.test(lower) || /\bend of day\b/i.test(lower)) {
    const d = new Date(base);
    d.setHours(23, 59, 0, 0);
    return { start: base.getTime(), end: d.getTime(), confidence: 0.9, ambiguous: false, matchedPhrase: "today/eod" };
  }

  // "next week"
  if (/\bnext week\b/i.test(lower)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    return { start: d.getTime(), end: d.getTime(), confidence: 0.85, ambiguous: false, matchedPhrase: "next week" };
  }

  // "next month"
  if (/\bnext month\b/i.test(lower)) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + 1);
    return { start: d.getTime(), end: d.getTime(), confidence: 0.85, ambiguous: false, matchedPhrase: "next month" };
  }

  // "end of week" / "eow"
  if (/\bend of (the )?week\b/i.test(lower) || /\beow\b/i.test(lower)) {
    const d = new Date(base);
    const day = d.getDay();
    const diff = 5 - day;
    d.setDate(d.getDate() + (diff > 0 ? diff : diff + 7));
    d.setHours(17, 0, 0, 0);
    return { start: base.getTime(), end: d.getTime(), confidence: 0.85, ambiguous: false, matchedPhrase: "eow" };
  }

  // "by Friday" / "on Monday" etc.
  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    const regex = new RegExp(`\\b(?:by |before |on )?${dayName}\\b`, "i");
    if (regex.test(lower)) {
      const d = getNextWeekday(base, i, true);
      d.setHours(17, 0, 0, 0);
      return { start: base.getTime(), end: d.getTime(), confidence: 0.8, ambiguous: false, matchedPhrase: dayName };
    }
  }

  // "next Monday" etc.
  const nextDayMatch = lower.match(/\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (nextDayMatch) {
    const dayIdx = DAY_NAMES.indexOf(nextDayMatch[1]);
    const d = getNextWeekday(base, dayIdx, true);
    d.setDate(d.getDate() + 7);
    d.setHours(17, 0, 0, 0);
    return { start: d.getTime(), end: d.getTime(), confidence: 0.85, ambiguous: false, matchedPhrase: nextDayMatch[0] };
  }

  // "25 October" / "25 Oct"
  const dateMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthIdx = getMonthIndex(dateMatch[2]);
    const d = new Date(base);
    d.setMonth(monthIdx, day);
    d.setHours(17, 0, 0, 0);
    if (d.getTime() < messageTimestamp) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return { start: d.getTime(), end: d.getTime(), confidence: 0.9, ambiguous: false, matchedPhrase: dateMatch[0] };
  }

  // "October 25" / "Oct 25"
  const dateMatch2 = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (dateMatch2) {
    const monthIdx = getMonthIndex(dateMatch2[1]);
    const day = parseInt(dateMatch2[2], 10);
    const d = new Date(base);
    d.setMonth(monthIdx, day);
    d.setHours(17, 0, 0, 0);
    if (d.getTime() < messageTimestamp) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return { start: d.getTime(), end: d.getTime(), confidence: 0.9, ambiguous: false, matchedPhrase: dateMatch2[0] };
  }

  // "by midnight" / "by noon"
  const timeMatch = lower.match(/\bby\s+(midnight|noon|end of day|eod)\b/);
  if (timeMatch) {
    const d = new Date(base);
    d.setHours(23, 59, 0, 0);
    return { start: base.getTime(), end: d.getTime(), confidence: 0.85, ambiguous: false, matchedPhrase: timeMatch[0] };
  }

  // "by 5pm" / "by 14:30"
  const hourMatch = lower.match(/\bby\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1], 10);
    const minute = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    const ampm = hourMatch[3]?.toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    const d = new Date(base);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() < messageTimestamp) {
      d.setDate(d.getDate() + 1);
    }
    return { start: base.getTime(), end: d.getTime(), confidence: 0.8, ambiguous: false, matchedPhrase: hourMatch[0] };
  }

  return { start: null, end: null, confidence: 0, ambiguous: false, matchedPhrase: "" };
}

export function hasDateReference(text: string): boolean {
  const res = resolveTime(text, Date.now());
  return res.confidence > 0 && !res.ambiguous;
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export function formatDeadline(ts: number | null): string {
  if (ts === null) return "No deadline";
  const d = new Date(ts);
  const now = Date.now();
  const diff = ts - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
