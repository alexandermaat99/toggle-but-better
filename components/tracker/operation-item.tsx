"use client";

import { Circle, Pause, Play, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatElapsedClock, sumLogMs, workedMs } from "@/lib/format-time";
import type { OperationWithLogs, TimeLog } from "@/lib/types";
import { TimeLogged } from "./time-logged";

type OperationItemProps = {
  operation: OperationWithLogs;
  activeLog: TimeLog | null;
  isPaused: boolean;
  pausedMs: number;
  pauseStartedAt: number | null;
  onStart: (operationId: number) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onEditLog: (log: TimeLog) => void;
  onRename: (operationId: number, name: string) => void;
  onDelete: (operationId: number) => void;
};

export function OperationItem({
  operation,
  activeLog,
  isPaused,
  pausedMs,
  pauseStartedAt,
  onStart,
  onPause,
  onResume,
  onStop,
  onEditLog,
  onRename,
  onDelete,
}: OperationItemProps) {
  const isThisActive = Boolean(activeLog);
  const isRecording = isThisActive && !isPaused;
  const closedLogs = operation.time_log.filter((log) => log.end_time);
  const closedMs = sumLogMs(closedLogs);
  const [, setTick] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(
    operation.operation_name ?? "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRecording || !activeLog) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [isRecording, activeLog]);

  useEffect(() => {
    if (!editing) return;
    setDraftName(operation.operation_name ?? "");
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [editing, operation.operation_name]);

  let liveMs = 0;
  if (activeLog) {
    if (isPaused && pauseStartedAt != null) {
      liveMs = workedMs(
        activeLog.start_time,
        new Date(pauseStartedAt),
        pausedMs,
      );
    } else {
      liveMs = workedMs(activeLog.start_time, new Date(), pausedMs);
    }
  }

  const displayTotal = closedMs + liveMs;

  function commitRename() {
    const next = draftName.trim();
    setEditing(false);
    if (!next || next === (operation.operation_name ?? "").trim()) return;
    onRename(operation.id, next);
  }

  function cancelRename() {
    setDraftName(operation.operation_name ?? "");
    setEditing(false);
  }

  return (
    <div className="group/operation space-y-1">
      <div className="flex items-center gap-3">
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelRename();
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-[#e812a4] bg-white px-2 py-0.5 text-base font-bold text-neutral-900 outline-none"
            aria-label="Edit operation name"
          />
        ) : (
          <h3
            className="cursor-default text-base font-bold text-neutral-900"
            title="Double-click to rename"
            onDoubleClick={() => setEditing(true)}
          >
            {operation.operation_name || "Untitled operation"}
          </h3>
        )}

        {!editing ? (
          <button
            type="button"
            onClick={() => onDelete(operation.id)}
            className="shrink-0 text-neutral-300 opacity-0 transition-all hover:text-neutral-500 group-hover/operation:opacity-100"
            aria-label="Delete operation"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}

        {isThisActive ? (
          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-base font-semibold tabular-nums text-[#e812a4]">
              {formatElapsedClock(liveMs)}
            </span>
            {isPaused ? (
              <button
                type="button"
                onClick={onResume}
                className="text-[#e812a4] transition-opacity hover:opacity-80"
                aria-label="Resume timer"
              >
                <Play className="size-5 fill-current" strokeWidth={0} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                className="text-[#e812a4] transition-opacity hover:opacity-80"
                aria-label="Pause timer"
              >
                <Pause className="size-5 fill-current" strokeWidth={0} />
              </button>
            )}
            <button
              type="button"
              onClick={onStop}
              className="text-[#e812a4] transition-opacity hover:opacity-80"
              aria-label="Stop timer"
            >
              <Circle className="size-4 fill-current" strokeWidth={0} />
            </button>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-base font-medium tabular-nums text-[#e812a4]">
              {formatElapsedClock(displayTotal)}
            </span>
            <button
              type="button"
              onClick={() => onStart(operation.id)}
              className="text-neutral-400 transition-colors hover:text-neutral-600"
              aria-label="Start timer"
            >
              <span className="flex size-7 items-center justify-center rounded-full border border-neutral-300">
                <Play
                  className="size-3.5 translate-x-px fill-current"
                  strokeWidth={0}
                />
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="pl-0.5">
        {closedLogs.map((log) => (
          <TimeLogged key={log.id} log={log} onOpen={onEditLog} />
        ))}
      </div>
    </div>
  );
}
