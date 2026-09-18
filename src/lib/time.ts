import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const LONDON_TZ = "Europe/London";

/** 'yyyy-MM-dd' for the given instant, in Europe/London local time. */
export function londonDateString(date: Date = new Date()): string {
  return formatInTimeZone(date, LONDON_TZ, "yyyy-MM-dd");
}

export function formatLondon(date: string | Date, pattern = "d MMM yyyy, HH:mm"): string {
  return formatInTimeZone(new Date(date), LONDON_TZ, pattern);
}

/** UTC instant (ISO string) corresponding to 00:00 London local time on the given 'yyyy-MM-dd'. */
export function londonStartOfDayUtcIso(dateStr: string): string {
  return fromZonedTime(`${dateStr}T00:00:00`, LONDON_TZ).toISOString();
}
