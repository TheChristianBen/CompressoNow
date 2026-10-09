import { describe, it, expect } from "vitest";
import { resolveRelativeDate, hasDateReference, formatDeadline } from "@/lib/dateParser";

describe("dateParser", () => {
  const baseTime = new Date(2026, 9, 9, 14, 30, 0).getTime(); // Oct 9, 2026, 2:30 PM

  describe("resolveRelativeDate", () => {
    it("resolves 'tomorrow'", () => {
      const result = resolveRelativeDate("Please send this by tomorrow", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDate()).toBe(10);
      expect(d.getMonth()).toBe(9);
    });

    it("resolves 'today' / 'eod'", () => {
      const result = resolveRelativeDate("This is due eod", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getHours()).toBe(23);
      expect(d.getMinutes()).toBe(59);
    });

    it("resolves 'in 3 days'", () => {
      const result = resolveRelativeDate("We need this in 3 days", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDate()).toBe(12);
    });

    it("resolves 'in 2 weeks'", () => {
      const result = resolveRelativeDate("Deadline in 2 weeks", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDate()).toBe(23);
    });

    it("resolves 'by Friday' from a Wednesday", () => {
      // Oct 9 2026 is a Friday, so let's use Oct 7 (Wednesday)
      const wedTime = new Date(2026, 9, 7, 10, 0, 0).getTime();
      const result = resolveRelativeDate("Please finish by Friday", wedTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDay()).toBe(5); // Friday
      expect(d.getDate()).toBe(9);
    });

    it("resolves 'next week'", () => {
      const result = resolveRelativeDate("Let's do this next week", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDate()).toBe(16);
    });

    it("resolves 'end of week' / 'eow'", () => {
      // Oct 9 is Friday, eow should be today (Friday)
      const result = resolveRelativeDate("EOW deadline", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDay()).toBe(5);
    });

    it("resolves '25 October' date format", () => {
      const result = resolveRelativeDate("The event is on 25 October", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDate()).toBe(25);
      expect(d.getMonth()).toBe(9);
    });

    it("resolves 'October 30' date format", () => {
      const result = resolveRelativeDate("Launch on October 30", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDate()).toBe(30);
      expect(d.getMonth()).toBe(9);
    });

    it("resolves 'next Monday'", () => {
      const result = resolveRelativeDate("Let's meet next Monday", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getDay()).toBe(1); // Monday
    });

    it("resolves 'in 1 month'", () => {
      const result = resolveRelativeDate("Review in 1 month", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getMonth()).toBe(10); // November
    });

    it("returns null for no date reference", () => {
      const result = resolveRelativeDate("Just a regular message", baseTime);
      expect(result).toBeNull();
    });

    it("handles 'by midnight'", () => {
      const result = resolveRelativeDate("Submit by midnight", baseTime);
      expect(result).not.toBeNull();
      const d = new Date(result!);
      expect(d.getHours()).toBe(23);
      expect(d.getMinutes()).toBe(59);
    });
  });

  describe("hasDateReference", () => {
    it("detects 'tomorrow'", () => {
      expect(hasDateReference("See you tomorrow")).toBe(true);
    });

    it("detects 'by Friday'", () => {
      expect(hasDateReference("Finish by Friday")).toBe(true);
    });

    it("detects 'deadline'", () => {
      expect(hasDateReference("The deadline is next week")).toBe(true);
    });

    it("detects 'due'", () => {
      expect(hasDateReference("This is due tomorrow")).toBe(true);
    });

    it("returns false for no date reference", () => {
      expect(hasDateReference("Hello there how are you")).toBe(false);
    });
  });

  describe("formatDeadline", () => {
    it("formats overdue", () => {
      const past = Date.now() - 3 * 86400000;
      expect(formatDeadline(past)).toBe("Overdue by 3d");
    });

    it("formats today", () => {
      const now = Date.now();
      expect(formatDeadline(now)).toBe("Today");
    });

    it("formats null", () => {
      expect(formatDeadline(null)).toBe("No deadline");
    });

    it("formats tomorrow", () => {
      const tomorrow = Date.now() + 86400000;
      expect(formatDeadline(tomorrow)).toBe("Tomorrow");
    });
  });
});
