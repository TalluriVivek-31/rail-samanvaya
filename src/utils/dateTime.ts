// src/utils/dateTime.ts
// Indian Railways Timezone & Dynamic Runtime Clock Infrastructure
// Strict Asia/Kolkata (IST, UTC+05:30) operational time handling

import { useState, useEffect } from 'react';

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a Date, string, or timestamp into 24-hour IST time (e.g. "14:20:10 IST")
 */
export function formatIndianTime(
  dateInput: Date | string | number | null | undefined, 
  includeSeconds = true
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: false
    });
    const parts = formatter.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

    return includeSeconds
      ? `${parts.hour}:${parts.minute}:${parts.second} IST`
      : `${parts.hour}:${parts.minute} IST`;
  } catch {
    return '—';
  }
}

/**
 * Formats a Date, string, or timestamp into Indian date (e.g. "13 Sep 2026")
 */
export function formatIndianDate(
  dateInput: Date | string | number | null | undefined
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

    return `${parts.day} ${parts.month} ${parts.year}`;
  } catch {
    return '—';
  }
}

/**
 * Formats full Indian date & time (e.g. "13 Sep 2026 • 14:20:10 IST")
 */
export function formatIndianDateTime(
  dateInput: Date | string | number | null | undefined,
  includeSeconds = true
): string {
  if (!dateInput) return '—';
  const dateStr = formatIndianDate(dateInput);
  const timeStr = formatIndianTime(dateInput, includeSeconds);
  if (dateStr === '—' || timeStr === '—') return '—';
  return `${dateStr} • ${timeStr}`;
}

/**
 * Formats TopCommandBar Header Clock (e.g. "13 SEP 2026 | 14:20:10 IST")
 */
export function formatHeaderClock(dateInput?: Date | string | number | null): string {
  const safeInput = dateInput ?? new Date();
  const d = typeof safeInput === 'string' || typeof safeInput === 'number' ? new Date(safeInput) : safeInput;
  if (!d || isNaN(d.getTime())) return '—';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

    return `${parts.day} ${parts.month.toUpperCase()} ${parts.year} | ${parts.hour}:${parts.minute}:${parts.second} IST`;
  } catch {
    return '—';
  }
}

/**
 * Live Clock Hook: Continuously ticks every second with the true runtime clock.
 * Recalculated dynamically at runtime; never freezes or remains static.
 */
export function useLiveClock(intervalMs = 1000) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    // Tick immediately on next frame/interval
    const interval = setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return {
    now,
    formattedDate: formatIndianDate(now),
    formattedTime: formatIndianTime(now, true),
    formattedDateTime: formatIndianDateTime(now, true),
    headerClock: formatHeaderClock(now)
  };
}

export interface FormattedDelay {
  text: string;
  status: 'ON_TIME' | 'EARLY' | 'LATE' | 'UNAVAILABLE';
  colorClass: string;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Standardized Railway Delay Formatter:
 * Accepts delay in canonical seconds (delaySeconds) or fallback minutes (delayMinutes).
 * Correctly formats seconds, minutes, and hours according to Indian Railways standards:
 * - 0s -> "ON TIME"
 * - 103s (seconds) -> "+1m 43s LATE"
 * - 6180s (103m) -> "+1h 43m LATE"
 * - 6208s (103m 28s) -> "+1h 43m 28s LATE"
 * - negative values -> "-Xm EARLY" or "-Xh Ym EARLY"
 * - null/undefined/NaN -> "DELAY UNAVAILABLE"
 */
export function formatDelay(
  delaySeconds: number | null | undefined,
  delayMinutes?: number | null | undefined
): FormattedDelay {
  let sec: number | null = null;
  if (typeof delaySeconds === 'number' && !isNaN(delaySeconds)) {
    sec = Math.round(delaySeconds);
  } else if (typeof delayMinutes === 'number' && !isNaN(delayMinutes)) {
    sec = Math.round(delayMinutes * 60);
  }

  if (sec === null) {
    return {
      text: 'DELAY UNAVAILABLE',
      status: 'UNAVAILABLE',
      colorClass: 'bg-neutral-100 text-neutral-700 border-neutral-300',
      hours: 0,
      minutes: 0,
      seconds: 0
    };
  }

  if (sec === 0) {
    return {
      text: 'ON TIME',
      status: 'ON_TIME',
      colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      hours: 0,
      minutes: 0,
      seconds: 0
    };
  }

  const isEarly = sec < 0;
  const absSec = Math.abs(sec);
  const sign = isEarly ? '-' : '+';
  const label = isEarly ? 'EARLY' : 'LATE';

  const hours = Math.floor(absSec / 3600);
  const minutes = Math.floor((absSec % 3600) / 60);
  const seconds = absSec % 60;

  let durationText = '';
  if (hours > 0) {
    if (seconds > 0) {
      durationText = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      durationText = `${hours}h ${minutes}m`;
    } else {
      durationText = `${hours}h`;
    }
  } else if (minutes > 0) {
    if (seconds > 0) {
      durationText = `${minutes}m ${seconds}s`;
    } else {
      durationText = `${minutes}m`;
    }
  } else {
    durationText = `${seconds}s`;
  }

  const colorClass = isEarly
    ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
    : absSec <= 900 // <= 15 minutes
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-red-100 text-red-800 border-red-300';

  return {
    text: `${sign}${durationText} ${label}`,
    status: isEarly ? 'EARLY' : 'LATE',
    colorClass,
    hours,
    minutes,
    seconds
  };
}

