"use client";

import { useState, useEffect } from "react";

type Props = {
  targetDate: string | Date; // ISO string or Date object
  onExpire?: () => void;
  className?: string;
  size?: "small" | "medium" | "large";
  showLabels?: boolean;
  compact?: boolean;
};

export default function CountdownTimer({
  targetDate,
  onExpire,
  className = "",
  size = "medium",
  showLabels = false,
  compact = false
}: Props) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    function calculateTimeLeft() {
      const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0
        });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, total: diff });
    }

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (!timeLeft) return null;

  if (timeLeft.total === 0) {
    return (
      <div className={`text-red-600 font-semibold ${className}`}>
        Offer Expired
      </div>
    );
  }

  const sizeClasses = {
    small: "text-sm",
    medium: "text-lg",
    large: "text-2xl"
  };

  const unitSizeClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base"
  };

  if (compact) {
    // Compact format: "2d 5h 30m" or "5h 30m 15s" or "30m 15s"
    const parts: string[] = [];

    if (timeLeft.days > 0) {
      parts.push(`${timeLeft.days}d`);
      parts.push(`${timeLeft.hours}h`);
      parts.push(`${timeLeft.minutes}m`);
    } else if (timeLeft.hours > 0) {
      parts.push(`${timeLeft.hours}h`);
      parts.push(`${timeLeft.minutes}m`);
      parts.push(`${timeLeft.seconds}s`);
    } else {
      parts.push(`${timeLeft.minutes}m`);
      parts.push(`${timeLeft.seconds}s`);
    }

    return (
      <div className={`font-mono font-semibold ${sizeClasses[size]} ${className}`}>
        {parts.join(" ")}
      </div>
    );
  }

  // Full format with boxes
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {timeLeft.days > 0 && (
        <>
          <TimeUnit value={timeLeft.days} label="Days" size={size} showLabel={showLabels} />
          <Separator size={size} />
        </>
      )}

      <TimeUnit value={timeLeft.hours} label="Hours" size={size} showLabel={showLabels} />
      <Separator size={size} />

      <TimeUnit value={timeLeft.minutes} label="Minutes" size={size} showLabel={showLabels} />
      <Separator size={size} />

      <TimeUnit value={timeLeft.seconds} label="Seconds" size={size} showLabel={showLabels} />
    </div>
  );
}

function TimeUnit({
  value,
  label,
  size,
  showLabel
}: {
  value: number;
  label: string;
  size: "small" | "medium" | "large";
  showLabel: boolean;
}) {
  const sizeClasses = {
    small: "text-sm w-8 h-8",
    medium: "text-lg w-12 h-12",
    large: "text-2xl w-16 h-16"
  };

  const labelClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base"
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          ${sizeClasses[size]}
          bg-black text-white rounded-lg
          flex items-center justify-center
          font-mono font-bold
        `}
      >
        {value.toString().padStart(2, "0")}
      </div>
      {showLabel && (
        <span className={`${labelClasses[size]} text-gray-600 mt-1`}>
          {label}
        </span>
      )}
    </div>
  );
}

function Separator({ size }: { size: "small" | "medium" | "large" }) {
  const sizeClasses = {
    small: "text-sm",
    medium: "text-lg",
    large: "text-2xl"
  };

  return (
    <div className={`font-mono font-bold ${sizeClasses[size]}`}>
      :
    </div>
  );
}

// Utility hook for use in other components
export function useCountdown(targetDate: string | Date) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    function calculateTimeLeft() {
      const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      setTimeLeft(Math.max(0, diff));
    }

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
