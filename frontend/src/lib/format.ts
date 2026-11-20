/**
 * format.ts – Standardized formatters for distances, durations, loads, weather metrics, and dates.
 *
 * All numerals must use Geist Mono (font-mono) and tabular-nums when rendered in the UI.
 */

/**
 * Format route miles (e.g. 806.4 -> "806 mi" or 4.2 -> "4.2 mi").
 */
export function formatMiles(miles: number): string {
  if (!Number.isFinite(miles)) return "0 mi";
  if (miles < 10 && miles > 0) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles).toLocaleString("en-US")} mi`;
}

/**
 * Format duration in seconds into human-readable hours and minutes (e.g. 45864 -> "12h 44m").
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

/**
 * Format cargo weight in pounds (e.g. 42000 -> "42,000 lb").
 */
export function formatLoad(loadLb: number): string {
  if (!Number.isFinite(loadLb)) return "0 lb";
  return `${Math.round(loadLb).toLocaleString("en-US")} lb`;
}

/**
 * Format wind speed in mph (e.g. 39.4 -> "39 mph").
 */
export function formatMph(mph: number | null | undefined): string {
  if (mph === null || mph === undefined || !Number.isFinite(mph)) return "—";
  return `${Math.round(mph)} mph`;
}

/**
 * Format precipitation rate in inches per hour (e.g. 0.25 -> "0.25 in/hr").
 */
export function formatInHr(inches: number | null | undefined): string {
  if (inches === null || inches === undefined || !Number.isFinite(inches)) return "—";
  return `${inches.toFixed(2)} in/hr`;
}

/**
 * Format timestamp in the trip's destination / checkpoint local time zone.
 * Uses Intl.DateTimeFormat with IANA zone.
 */
export function formatEta(isoUtc: string, timeZone: string = "UTC"): string {
  if (!isoUtc) return "—";
  try {
    const date = new Date(isoUtc);
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoUtc;
  }
}

/**
 * Format day and time string (e.g. "Tue, Nov 25, 06:00").
 */
export function formatDayTime(isoString: string, timeZone: string = "UTC"): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format duration delta between route options (e.g. 2520 seconds -> "+42m slower", -1800 -> "-30m faster").
 */
export function formatDelta(diffSeconds: number): string {
  const totalMins = Math.round(diffSeconds / 60);
  if (Math.abs(totalMins) === 0) {
    return "same time";
  }
  const absMins = Math.abs(totalMins);
  const qualifier = diffSeconds > 0 ? "slower" : "faster";
  const sign = diffSeconds > 0 ? "+" : "-";

  if (absMins >= 60) {
    const hrs = (absMins / 60).toFixed(1);
    return `${sign}${hrs}h ${qualifier}`;
  }
  return `${sign}${absMins}m ${qualifier}`;
}
