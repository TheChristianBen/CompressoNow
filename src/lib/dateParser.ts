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

function getNextWeekday(currentDate: Date, targetDay: number): Date {
  const result = new Date(currentDate);
  const currentDay = result.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  result.setDate(result.getDate() + diff);
  return result;
}

export function resolveRelativeDate(
  text: string,
  messageTimestamp: number
): number | null {
  const now = new Date(messageTimestamp);
  const lower = text.toLowerCase();

  const inMatch = lower.match(/\bin (\d+) (day|week|month|year)s?\b/);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const d = new Date(now);
    if (unit === "day") d.setDate(d.getDate() + n);
    else if (unit === "week") d.setDate(d.getDate() + n * 7);
    else if (unit === "month") d.setMonth(d.getMonth() + n);
    else if (unit === "year") d.setFullYear(d.getFullYear() + n);
    return d.getTime();
  }

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  if (/\btoday\b/.test(lower) || /\btonight\b/.test(lower) || /\beod\b/.test(lower)) {
    return new Date(now).setHours(23, 59, 0, 0);
  }

  if (/\bnext week\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.getTime();
  }

  if (/\bend of (the )?week\b/.test(lower) || /\beow\b/.test(lower)) {
    const d = new Date(now);
    const day = d.getDay();
    const diff = 5 - day;
    d.setDate(d.getDate() + (diff > 0 ? diff : diff + 7));
    d.setHours(17, 0, 0, 0);
    return d.getTime();
  }

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    const regex = new RegExp(`\\b(?:by |before |on )?${dayName}\\b`);
    if (regex.test(lower)) {
      return getNextWeekday(now, i).getTime();
    }
  }

  const nextDayMatch = lower.match(/\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (nextDayMatch) {
    const dayIdx = DAY_NAMES.indexOf(nextDayMatch[1]);
    const d = getNextWeekday(now, dayIdx);
    d.setDate(d.getDate() + 7);
    return d.getTime();
  }

  const dateMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthIdx = getMonthIndex(dateMatch[2]);
    const d = new Date(now);
    d.setMonth(monthIdx, day);
    d.setHours(17, 0, 0, 0);
    if (d.getTime() < messageTimestamp) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d.getTime();
  }

  const dateMatch2 = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (dateMatch2) {
    const monthIdx = getMonthIndex(dateMatch2[1]);
    const day = parseInt(dateMatch2[2], 10);
    const d = new Date(now);
    d.setMonth(monthIdx, day);
    d.setHours(17, 0, 0, 0);
    if (d.getTime() < messageTimestamp) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d.getTime();
  }

  const timeMatch = lower.match(/\bby\s+(midnight|noon|end of day|eod)\b/);
  if (timeMatch) {
    return new Date(now).setHours(23, 59, 0, 0);
  }

  const hourMatch = lower.match(/\bby\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1], 10);
    const minute = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    const ampm = hourMatch[3]?.toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    const d = new Date(now);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() < messageTimestamp) {
      d.setDate(d.getDate() + 1);
    }
    return d.getTime();
  }

  return null;
}

export function hasDateReference(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(tomorrow|today|tonight|eod|eow|next week|next month)\b/.test(lower) ||
    /\bin \d+ (day|week|month|year)s?\b/.test(lower) ||
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(lower) ||
    /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(lower) ||
    /\bby\s+/.test(lower) ||
    /\bdeadline\b/.test(lower) ||
    /\bdue\b/.test(lower)
  );
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
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return date;
}
