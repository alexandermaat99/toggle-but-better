"use client";

import {
  formatDurationShort,
  formatLogRange,
  workedMs,
} from "@/lib/format-time";
import type { TimeLog } from "@/lib/types";

type TimeLoggedProps = {
  log: TimeLog;
  onOpen: (log: TimeLog) => void;
};

export function TimeLogged({ log, onOpen }: TimeLoggedProps) {
  const durationMs = log.end_time
    ? workedMs(log.start_time, log.end_time, log.pause_ms ?? 0)
    : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(log)}
      className="group flex w-full items-center gap-3 rounded-md py-1.5 pl-1 text-left text-sm text-neutral-800 transition hover:bg-neutral-50"
    >
      <p className="min-w-0 flex-1 truncate">
        <span>{log.description?.trim() || "Untitled"}</span>
        <span className="text-neutral-500">
          {" "}
          - {formatLogRange(log.start_time, log.end_time)}
        </span>
      </p>
      {log.end_time ? (
        <span className="shrink-0 font-medium text-[#e812a4]">
          {formatDurationShort(durationMs)}
        </span>
      ) : null}
    </button>
  );
}
