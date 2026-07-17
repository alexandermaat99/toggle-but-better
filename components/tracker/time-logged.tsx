"use client";

import { Trash2 } from "lucide-react";
import {
  formatDurationShort,
  formatLogRange,
  workedMs,
} from "@/lib/format-time";
import type { TimeLog } from "@/lib/types";

type TimeLoggedProps = {
  log: TimeLog;
  onOpen: (log: TimeLog) => void;
  onDelete: (id: number) => void;
};

export function TimeLogged({ log, onOpen, onDelete }: TimeLoggedProps) {
  const durationMs = log.end_time
    ? workedMs(log.start_time, log.end_time, log.pause_ms ?? 0)
    : 0;

  return (
    <div className="group flex w-full items-center gap-2 rounded-md py-1.5 pl-1 text-sm text-neutral-800 transition hover:bg-neutral-50">
      <button
        type="button"
        onClick={() => onOpen(log)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <p className="min-w-0 flex-1 truncate">
          {log.description?.trim() ? (
            <>
              <span>{log.description.trim()}</span>
              <span className="text-neutral-500">
                {" "}
                - {formatLogRange(log.start_time, log.end_time)}
              </span>
            </>
          ) : (
            <span className="text-neutral-500">
              {formatLogRange(log.start_time, log.end_time)}
            </span>
          )}
        </p>
        {log.end_time ? (
          <span className="shrink-0 font-medium text-[#e812a4]">
            {formatDurationShort(durationMs)}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(log.id);
        }}
        className="shrink-0 pr-1 text-neutral-300 transition-colors hover:text-neutral-500"
        aria-label="Delete time entry"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
