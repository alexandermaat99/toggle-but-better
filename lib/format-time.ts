export function msBetween(start: string | Date, end: string | Date = new Date()) {
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime());
}

/** Elapsed work time, excluding pauses. */
export function workedMs(
  start: string | Date,
  end: string | Date,
  pausedMs: number,
) {
  return Math.max(0, msBetween(start, end) - pausedMs);
}

export function sumLogMs(
  logs: {
    start_time: string;
    end_time: string | null;
    pause_ms?: number | null;
  }[],
) {
  return logs.reduce((total, log) => {
    if (!log.end_time) return total;
    return total + workedMs(log.start_time, log.end_time, log.pause_ms ?? 0);
  }, 0);
}

/** Closed entries: "42 sec", "12 min", or "12 Hours" */
export function formatDurationShort(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) {
    return `${Math.max(0, totalSeconds)} sec`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  return `${hours} ${hours === 1 ? "Hour" : "Hours"}`;
}

/** Running timer: "1:02:21" */
export function formatElapsedClock(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatClockAmPm(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? "p" : "a";
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")}${suffix}`;
}

/** "Fri, Jul 17 5:32p-6:44p" */
export function formatLogRange(start: string, end: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const day = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startClock = formatClockAmPm(startDate);
  const endClock = endDate ? formatClockAmPm(endDate) : "…";
  return `${day} ${startClock}-${endClock}`;
}

/** "Fri, July 17" */
export function formatStartedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });
}

export function firstNameFromEmail(email: string | undefined | null) {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "there";
  const token = local.split(/[._-]/)[0] ?? local;
  return token.charAt(0).toUpperCase() + token.slice(1);
}
