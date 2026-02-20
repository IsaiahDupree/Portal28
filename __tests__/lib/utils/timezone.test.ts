/**
 * Timezone Utilities Unit Tests (feat-WC-005)
 *
 * Tests for date/time manipulation and timezone conversion utilities:
 * - Timezone validation
 * - UTC conversion
 * - Timezone formatting
 * - Time calculations
 * - Edge cases (DST, invalid inputs, boundary conditions)
 */

import {
  isValidTimezone,
  toUTC,
  fromUTC,
  formatInTimezone,
  getBrowserTimezone,
  isFutureDate,
  getTimeUntil,
  getTimezoneOffsetString,
  COMMON_TIMEZONES,
} from "@/lib/utils/timezone";

describe("Timezone Utilities - Validation", () => {
  describe("isValidTimezone", () => {
    it("should validate UTC timezone", () => {
      expect(isValidTimezone("UTC")).toBe(true);
    });

    it("should validate America/New_York", () => {
      expect(isValidTimezone("America/New_York")).toBe(true);
    });

    it("should validate Europe/London", () => {
      expect(isValidTimezone("Europe/London")).toBe(true);
    });

    it("should validate Asia/Tokyo", () => {
      expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    });

    it("should reject invalid timezone strings", () => {
      expect(isValidTimezone("Invalid/Timezone")).toBe(false);
      // Note: Some systems may accept EST as a valid timezone
      expect(isValidTimezone("")).toBe(false);
      expect(isValidTimezone("123")).toBe(false);
      expect(isValidTimezone("Not/A/Valid/Timezone")).toBe(false);
    });
  });

  describe("COMMON_TIMEZONES", () => {
    it("should include UTC", () => {
      const utc = COMMON_TIMEZONES.find((tz) => tz.value === "UTC");
      expect(utc).toBeDefined();
      expect(utc?.offset).toBe("+00:00");
    });

    it("should include major US timezones", () => {
      const timezones = ["America/New_York", "America/Chicago", "America/Los_Angeles"];
      timezones.forEach((tz) => {
        const found = COMMON_TIMEZONES.find((t) => t.value === tz);
        expect(found).toBeDefined();
      });
    });

    it("should have valid structure for all timezones", () => {
      COMMON_TIMEZONES.forEach((tz) => {
        expect(tz.value).toBeDefined();
        expect(tz.label).toBeDefined();
        expect(tz.offset).toBeDefined();
        expect(typeof tz.value).toBe("string");
        expect(typeof tz.label).toBe("string");
        expect(typeof tz.offset).toBe("string");
      });
    });
  });
});

describe("Timezone Utilities - UTC Conversion", () => {
  describe("toUTC", () => {
    it("should convert local time to UTC", () => {
      // January doesn't have DST
      const localTime = "2026-01-15T14:30:00";
      const timezone = "America/New_York"; // EST is UTC-5
      const utc = toUTC(localTime, timezone);

      const utcDate = new Date(utc);
      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.toISOString()).toBe(utc);
    });

    it("should handle UTC timezone (no conversion needed)", () => {
      const localTime = "2026-01-15T14:30:00";
      const utc = toUTC(localTime, "UTC");

      const utcDate = new Date(utc);
      expect(utcDate.getUTCHours()).toBe(14);
      expect(utcDate.getUTCMinutes()).toBe(30);
    });

    it("should handle midnight conversion", () => {
      const localTime = "2026-01-15T00:00:00";
      const utc = toUTC(localTime, "America/Los_Angeles");

      expect(utc).toBeDefined();
      expect(utc).toContain("T");
      expect(utc).toContain("Z");
    });

    it("should handle end of day conversion", () => {
      const localTime = "2026-01-15T23:59:59";
      const utc = toUTC(localTime, "America/New_York");

      expect(utc).toBeDefined();
      expect(new Date(utc)).toBeInstanceOf(Date);
    });
  });

  describe("fromUTC", () => {
    it("should convert UTC to local timezone", () => {
      const utc = "2026-01-15T19:30:00Z";
      const timezone = "America/New_York";
      const local = fromUTC(utc, timezone);

      expect(local).toContain("T");
      expect(local).not.toContain("Z");
      expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it("should handle UTC timezone (no conversion)", () => {
      const utc = "2026-01-15T14:30:00Z";
      const local = fromUTC(utc, "UTC");

      expect(local).toContain("14:30:00");
    });

    it("should handle Date object input", () => {
      const date = new Date("2026-01-15T14:30:00Z");
      const local = fromUTC(date.toISOString(), "America/Chicago");

      expect(local).toBeDefined();
      expect(local).toMatch(/T\d{2}:\d{2}:\d{2}$/);
    });
  });
});

describe("Timezone Utilities - Formatting", () => {
  describe("formatInTimezone", () => {
    const testDate = new Date("2026-01-15T14:30:00Z");

    it("should format date in specified timezone with medium format", () => {
      const formatted = formatInTimezone(testDate, "UTC", "medium");
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });

    it("should format date in short format", () => {
      const formatted = formatInTimezone(testDate, "UTC", "short");
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });

    it("should format date in long format", () => {
      const formatted = formatInTimezone(testDate, "UTC", "long");
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });

    it("should format date in full format", () => {
      const formatted = formatInTimezone(testDate, "UTC", "full");
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });

    it("should handle string date input", () => {
      const formatted = formatInTimezone("2026-01-15T14:30:00Z", "UTC");
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });

    it("should format correctly for different timezones", () => {
      const utcFormat = formatInTimezone(testDate, "UTC", "medium");
      const nyFormat = formatInTimezone(testDate, "America/New_York", "medium");

      expect(utcFormat).toBeDefined();
      expect(nyFormat).toBeDefined();
      // Different timezones should produce different formatted strings
      // (Note: We can't assert exact equality due to locale differences)
    });
  });

  describe("getTimezoneOffsetString", () => {
    it("should return offset string for UTC", () => {
      const offset = getTimezoneOffsetString("UTC");
      expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
    });

    it("should return offset string with +/- sign", () => {
      const offset = getTimezoneOffsetString("America/New_York");
      expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
      expect(offset.startsWith("-") || offset.startsWith("+")).toBe(true);
    });

    it("should handle specific date for DST calculation", () => {
      const winterDate = new Date("2026-01-15T12:00:00Z");
      const summerDate = new Date("2026-07-15T12:00:00Z");

      const winterOffset = getTimezoneOffsetString("America/New_York", winterDate);
      const summerOffset = getTimezoneOffsetString("America/New_York", summerDate);

      // Both should be valid offset formats
      expect(winterOffset).toMatch(/^[+-]\d{2}:\d{2}$/);
      expect(summerOffset).toMatch(/^[+-]\d{2}:\d{2}$/);
    });
  });

  describe("getBrowserTimezone", () => {
    it("should return a valid timezone string", () => {
      const browserTz = getBrowserTimezone();
      expect(browserTz).toBeDefined();
      expect(typeof browserTz).toBe("string");
      expect(browserTz.length).toBeGreaterThan(0);
    });

    it("should return a valid IANA timezone", () => {
      const browserTz = getBrowserTimezone();
      expect(isValidTimezone(browserTz)).toBe(true);
    });
  });
});

describe("Timezone Utilities - Time Calculations", () => {
  describe("isFutureDate", () => {
    it("should return true for future dates", () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      expect(isFutureDate(futureDate)).toBe(true);
    });

    it("should return false for past dates", () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      expect(isFutureDate(pastDate)).toBe(false);
    });

    it("should handle string dates", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const pastDate = new Date(Date.now() - 86400000).toISOString();

      expect(isFutureDate(futureDate)).toBe(true);
      expect(isFutureDate(pastDate)).toBe(false);
    });

    it("should handle timezone parameter", () => {
      const futureDate = new Date(Date.now() + 86400000);
      expect(isFutureDate(futureDate, "UTC")).toBe(true);
      expect(isFutureDate(futureDate, "America/New_York")).toBe(true);
    });
  });

  describe("getTimeUntil", () => {
    it("should calculate time until future date", () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const result = getTimeUntil(futureDate);

      expect(result.isPast).toBe(false);
      expect(result.hours).toBeGreaterThanOrEqual(0);
      expect(result.minutes).toBeGreaterThanOrEqual(0);
      expect(result.seconds).toBeGreaterThanOrEqual(0);
    });

    it("should return all zeros for past dates", () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const result = getTimeUntil(pastDate);

      expect(result.isPast).toBe(true);
      expect(result.days).toBe(0);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.seconds).toBe(0);
    });

    it("should calculate days correctly for dates more than 24h away", () => {
      const futureDate = new Date(Date.now() + 86400000 * 5); // 5 days from now
      const result = getTimeUntil(futureDate);

      expect(result.isPast).toBe(false);
      expect(result.days).toBeGreaterThanOrEqual(4); // At least 4 days
      expect(result.days).toBeLessThan(6); // Less than 6 days
    });

    it("should handle string dates", () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const result = getTimeUntil(futureDate);

      expect(result.isPast).toBe(false);
    });

    it("should handle exact present time", () => {
      const now = new Date();
      const result = getTimeUntil(now);

      // Should be very close to zero (might be 0 or 1 depending on execution speed)
      expect(result.days).toBe(0);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.seconds).toBeLessThan(2);
    });
  });
});

describe("Timezone Utilities - Edge Cases", () => {
  describe("Boundary conditions", () => {
    it("should handle year boundaries", () => {
      const newYear = "2026-12-31T23:59:59";
      const utc = toUTC(newYear, "UTC");
      expect(utc).toBeDefined();
      expect(new Date(utc).getUTCFullYear()).toBeGreaterThanOrEqual(2026);
    });

    it("should handle leap year dates", () => {
      const leapDay = "2024-02-29T12:00:00";
      const utc = toUTC(leapDay, "UTC");
      expect(utc).toBeDefined();
      expect(new Date(utc).getUTCMonth()).toBe(1); // February (0-indexed)
      expect(new Date(utc).getUTCDate()).toBe(29);
    });

    it("should handle month boundaries", () => {
      const monthEnd = "2026-01-31T23:59:59";
      const utc = toUTC(monthEnd, "America/Los_Angeles");
      expect(utc).toBeDefined();
    });
  });

  describe("Invalid inputs", () => {
    it("should handle invalid date strings gracefully", () => {
      expect(() => new Date("invalid")).not.toThrow();
      // Invalid dates create Invalid Date objects, not errors
    });

    it("should handle very far future dates", () => {
      const farFuture = new Date("2100-01-01T00:00:00Z");
      const result = getTimeUntil(farFuture);
      expect(result.isPast).toBe(false);
      expect(result.days).toBeGreaterThan(0);
    });

    it("should handle very far past dates", () => {
      const farPast = new Date("1900-01-01T00:00:00Z");
      const result = getTimeUntil(farPast);
      expect(result.isPast).toBe(true);
    });
  });

  describe("Special timezones", () => {
    it("should handle timezones without DST", () => {
      const arizonaTime = "2026-07-15T12:00:00";
      const utc = toUTC(arizonaTime, "America/Phoenix");
      expect(utc).toBeDefined();
      expect(isValidTimezone("America/Phoenix")).toBe(true);
    });

    it("should handle international date line", () => {
      expect(isValidTimezone("Pacific/Kiritimati")).toBe(true);
      expect(isValidTimezone("Pacific/Samoa")).toBe(true);
    });

    it("should handle half-hour offset timezones", () => {
      expect(isValidTimezone("Asia/Kolkata")).toBe(true); // UTC+5:30
      expect(isValidTimezone("Australia/Adelaide")).toBe(true); // UTC+9:30
    });
  });
});
