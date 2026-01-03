// Portal28 Academy - Schedule Parser
// Converts natural language schedules to next run times

interface ScheduleConfig {
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  hour?: number; // 0-23
  minute?: number; // 0-59
  interval?: "daily" | "weekly" | "monthly";
}

const DAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6
};

const TIMEZONE_OFFSETS: Record<string, number> = {
  et: -5, est: -5, edt: -4,
  ct: -6, cst: -6, cdt: -5,
  mt: -7, mst: -7, mdt: -6,
  pt: -8, pst: -8, pdt: -7,
  utc: 0, gmt: 0
};

export function parseScheduleText(text: string): ScheduleConfig {
  const normalized = text.toLowerCase().trim();
  const config: ScheduleConfig = {};

  // Parse day of week
  for (const [name, num] of Object.entries(DAYS)) {
    if (normalized.includes(name)) {
      config.dayOfWeek = num;
      config.interval = "weekly";
      break;
    }
  }

  // Parse time (e.g., "9am", "3pm", "15:30", "9:00 am")
  const timeMatch = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3]?.toLowerCase();

    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;

    config.hour = hour;
    config.minute = minute;
  }

  // Parse interval keywords
  if (normalized.includes("every day") || normalized.includes("daily")) {
    config.interval = "daily";
  } else if (normalized.includes("every week") || normalized.includes("weekly")) {
    config.interval = "weekly";
  } else if (normalized.includes("every month") || normalized.includes("monthly")) {
    config.interval = "monthly";
  }

  return config;
}

export function getNextRunTime(scheduleText: string, timezone: string = "America/New_York"): Date {
  const config = parseScheduleText(scheduleText);
  const now = new Date();
  
  // Start with current time
  let next = new Date(now);

  // Set time if specified
  if (config.hour !== undefined) {
    next.setHours(config.hour, config.minute || 0, 0, 0);
  }

  // Handle day of week for weekly schedules
  if (config.interval === "weekly" && config.dayOfWeek !== undefined) {
    const currentDay = next.getDay();
    let daysUntil = config.dayOfWeek - currentDay;
    
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
      daysUntil += 7;
    }
    
    next.setDate(next.getDate() + daysUntil);
  } else if (config.interval === "daily") {
    // If time has passed today, move to tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else {
    // Default: if time has passed, move to next occurrence
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

export function formatScheduleForDisplay(config: ScheduleConfig): string {
  const parts: string[] = [];

  if (config.interval === "weekly" && config.dayOfWeek !== undefined) {
    const dayName = Object.entries(DAYS).find(([, num]) => num === config.dayOfWeek)?.[0];
    parts.push(`Every ${dayName?.charAt(0).toUpperCase()}${dayName?.slice(1)}`);
  } else if (config.interval === "daily") {
    parts.push("Every day");
  } else if (config.interval === "monthly") {
    parts.push("Every month");
  }

  if (config.hour !== undefined) {
    const hour12 = config.hour % 12 || 12;
    const period = config.hour >= 12 ? "PM" : "AM";
    const minute = (config.minute || 0).toString().padStart(2, "0");
    parts.push(`at ${hour12}:${minute} ${period}`);
  }

  return parts.join(" ") || "Not scheduled";
}

export function scheduleTextToCron(text: string): string | null {
  const config = parseScheduleText(text);
  
  if (config.hour === undefined) return null;

  const minute = config.minute || 0;
  const hour = config.hour;
  const dayOfWeek = config.dayOfWeek !== undefined ? config.dayOfWeek : "*";
  
  // Format: minute hour day-of-month month day-of-week
  if (config.interval === "weekly" && config.dayOfWeek !== undefined) {
    return `${minute} ${hour} * * ${dayOfWeek}`;
  } else if (config.interval === "daily") {
    return `${minute} ${hour} * * *`;
  } else if (config.interval === "monthly") {
    return `${minute} ${hour} 1 * *`;
  }

  return `${minute} ${hour} * * *`;
}
