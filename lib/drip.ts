/**
 * Drip feeding logic for lesson access control
 */

export type DripType = "immediate" | "date" | "days_after_enroll";

export interface DripValue {
  date?: string;
  days?: number;
}

/**
 * Compute when a lesson unlocks for a user based on enrollment date and drip settings
 */
export function computeUnlockedAt(
  enrolledAt: Date,
  dripType: DripType | string,
  dripValue?: DripValue | any
): Date {
  if (dripType === "immediate") {
    return enrolledAt;
  }

  if (dripType === "date" && dripValue?.date) {
    const d = new Date(dripValue.date);
    return isNaN(d.getTime()) ? enrolledAt : d;
  }

  if (dripType === "days_after_enroll") {
    const days = Number(dripValue?.days ?? 0);
    const d = new Date(enrolledAt);
    d.setDate(d.getDate() + days);
    return d;
  }

  return enrolledAt;
}

/**
 * Check if a lesson is currently unlocked
 */
export function isLessonUnlocked(
  enrolledAt: Date,
  dripType: DripType | string,
  dripValue?: DripValue | any
): boolean {
  const unlockedAt = computeUnlockedAt(enrolledAt, dripType, dripValue);
  return Date.now() >= unlockedAt.getTime();
}

/**
 * Get a human-readable description of when the lesson unlocks
 */
export function getUnlockDescription(
  dripType: DripType | string,
  dripValue?: DripValue | any
): string {
  if (dripType === "immediate") {
    return "Unlocks immediately";
  }

  if (dripType === "date" && dripValue?.date) {
    const d = new Date(dripValue.date);
    if (!isNaN(d.getTime())) {
      return `Unlocks on ${d.toLocaleDateString()}`;
    }
  }

  if (dripType === "days_after_enroll") {
    const days = Number(dripValue?.days ?? 0);
    if (days === 1) return "Unlocks 1 day after enrollment";
    return `Unlocks ${days} days after enrollment`;
  }

  return "Unlocks immediately";
}

/**
 * Format time remaining until unlock
 */
export function formatTimeUntilUnlock(unlockedAt: Date): string {
  const now = new Date();
  const diff = unlockedAt.getTime() - now.getTime();

  if (diff <= 0) return "Available now";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `Unlocks in ${days} day${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `Unlocks in ${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `Unlocks in ${minutes} minute${minutes > 1 ? "s" : ""}`;
}
