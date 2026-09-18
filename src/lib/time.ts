import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const LONDON_TZ = "Europe/London";

/** 'yyyy-MM-dd' for the given instant, in Europe/London local time. */
export function londonDateString(date: Date = new Date()): string {
  return formatInTimeZone(date, LONDON_TZ, "yyyy-MM-dd");
}

/** Hour (0-23) and minute in Europe/London local time for the given instant. */
export function londonHourMinute(date: Date = new Date()): { hour: number; minute: number } {
  const zoned = toZonedTime(date, LONDON_TZ);
  return { hour: zoned.getHours(), minute: zoned.getMinutes() };
}

/** Day of week in Europe/London local time: 0 = Sunday ... 6 = Saturday. */
export function londonDayOfWeek(date: Date = new Date()): number {
  return toZonedTime(date, LONDON_TZ).getDay();
}

/** True once local London time has reached (or passed) hour:minute, for same-day cron matching. */
export function isAtOrAfterLondonTime(date: Date, hour: number, minute: number): boolean {
  const now = londonHourMinute(date);
  return now.hour > hour || (now.hour === hour && now.minute >= minute);
}

export function formatLondon(date: string | Date, pattern = "d MMM yyyy, HH:mm"): string {
  return formatInTimeZone(new Date(date), LONDON_TZ, pattern);
}

/** UTC instant (ISO string) corresponding to 00:00 London local time on the given 'yyyy-MM-dd'. */
export function londonStartOfDayUtcIso(dateStr: string): string {
  return fromZonedTime(`${dateStr}T00:00:00`, LONDON_TZ).toISOString();
}
