/**
 * Timezone utilities for content scheduling
 * Handles timezone conversion and validation
 */

/**
 * Common timezones for content scheduling
 */
export const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)", offset: "+00:00" },
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "-05:00/-04:00" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "-06:00/-05:00" },
  { value: "America/Denver", label: "Mountain Time (MT)", offset: "-07:00/-06:00" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "-08:00/-07:00" },
  { value: "America/Phoenix", label: "Arizona (no DST)", offset: "-07:00" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)", offset: "-09:00/-08:00" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)", offset: "-10:00" },
  { value: "Europe/London", label: "London (GMT/BST)", offset: "+00:00/+01:00" },
  { value: "Europe/Paris", label: "Central European Time", offset: "+01:00/+02:00" },
  { value: "Asia/Tokyo", label: "Japan Standard Time", offset: "+09:00" },
  { value: "Australia/Sydney", label: "Australian Eastern Time", offset: "+10:00/+11:00" },
];

/**
 * Convert a date from one timezone to another
 * @param date - The date to convert
 * @param fromTimezone - Source timezone (IANA format, e.g., 'America/New_York')
 * @param toTimezone - Target timezone (IANA format, e.g., 'UTC')
 * @returns ISO 8601 date string in target timezone
 */
export function convertTimezone(
  date: Date | string,
  fromTimezone: string,
  toTimezone: string
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Format in source timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: fromTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(dateObj);
  const dateValues: Record<string, string> = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      dateValues[part.type] = part.value;
    }
  });

  // Create date in target timezone
  const isoString = `${dateValues.year}-${dateValues.month}-${dateValues.day}T${dateValues.hour}:${dateValues.minute}:${dateValues.second}`;

  // Convert to target timezone
  const targetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: toTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const targetParts = targetFormatter.formatToParts(new Date(isoString));
  const targetValues: Record<string, string> = {};

  targetParts.forEach((part) => {
    if (part.type !== "literal") {
      targetValues[part.type] = part.value;
    }
  });

  return `${targetValues.year}-${targetValues.month}-${targetValues.day}T${targetValues.hour}:${targetValues.minute}:${targetValues.second}Z`;
}

/**
 * Convert a scheduled time to UTC for database storage
 * Uses the toLocaleString trick to handle timezone conversions correctly
 *
 * @param localDateTime - Local date/time string (e.g., '2026-02-08T14:30:00')
 * @param timezone - Timezone of the local time (IANA format)
 * @returns UTC ISO 8601 string
 */
export function toUTC(localDateTime: string, timezone: string): string {
  // Parse the input
  const [datePart, timePart] = localDateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = (timePart || '00:00:00').split(":").map(Number);

  // Create arbitrary date in UTC
  const arbitraryUTC = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));

  // Get what this UTC time looks like in the target timezone
  const inTargetTZ = new Date(arbitraryUTC.toLocaleString('en-US', { timeZone: timezone }));

  // Get what this UTC time looks like in UTC (should be same)
  const inUTC = new Date(arbitraryUTC.toLocaleString('en-US', { timeZone: 'UTC' }));

  // Calculate the offset
  const offset = inTargetTZ.getTime() - inUTC.getTime();

  // Now create the user's intended time as if it were UTC
  const userTimeAsUTC = Date.UTC(year, month - 1, day, hour, minute, second);

  // Subtract the offset to get the true UTC time
  const trueUTC = new Date(userTimeAsUTC - offset);

  return trueUTC.toISOString();
}

/**
 * Convert a UTC time to local timezone
 * @param utcDateTime - UTC date/time string
 * @param timezone - Target timezone
 * @returns Local date/time string
 */
export function fromUTC(utcDateTime: string, timezone: string): string {
  const date = new Date(utcDateTime);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

/**
 * Get timezone offset in milliseconds
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return utcDate.getTime() - tzDate.getTime();
}

/**
 * Validate timezone string
 * @param timezone - Timezone to validate (IANA format)
 * @returns true if valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current timezone offset string (e.g., "-05:00")
 */
export function getTimezoneOffsetString(timezone: string, date: Date = new Date()): string {
  const offsetMs = getTimezoneOffset(timezone, date);
  const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
  const offsetMinutes = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));

  const sign = offsetMs >= 0 ? "+" : "-";
  return `${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
}

/**
 * Format date in specified timezone for display
 * @param date - Date to format
 * @param timezone - Timezone for display
 * @param format - Format style ('short', 'medium', 'long', 'full')
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  format: "short" | "medium" | "long" | "full" = "medium"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    dateStyle: format,
    timeStyle: format,
  };

  return new Intl.DateTimeFormat("en-US", options).format(dateObj);
}

/**
 * Get user's browser timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Check if date is in the future
 * @param date - Date to check
 * @param timezone - Timezone for comparison
 * @returns true if date is in the future
 */
export function isFutureDate(date: Date | string, timezone: string = "UTC"): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  // Convert both to UTC for comparison
  const dateUTC = new Date(dateObj.toLocaleString("en-US", { timeZone: "UTC" }));
  const nowUTC = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));

  return dateUTC > nowUTC;
}

/**
 * Calculate time until scheduled date
 * @param scheduledDate - The scheduled date
 * @returns Object with days, hours, minutes until scheduled time
 */
export function getTimeUntil(scheduledDate: Date | string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
} {
  const now = new Date();
  const target = typeof scheduledDate === "string" ? new Date(scheduledDate) : scheduledDate;

  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
}
