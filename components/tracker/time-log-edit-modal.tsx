"use client";

import { useEffect, useId, useState } from "react";
import {
  formatDurationShort,
  workedMs,
} from "@/lib/format-time";
import type { TimeLog } from "@/lib/types";
import { cn } from "@/lib/utils";

type TimeLogEditModalProps = {
  log: TimeLog | null;
  suggestions: string[];
  onSave: (update: {
    id: number;
    description: string;
    start_time: string;
    end_time: string;
  }) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fromLocalInputValue(local: string) {
  return new Date(local).toISOString();
}

export function TimeLogEditModal({
  log,
  suggestions,
  onSave,
  onDelete,
  onClose,
}: TimeLogEditModalProps) {
  const titleId = useId();
  const [description, setDescription] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    if (!log?.end_time) return;
    setDescription(log.description?.trim() || "");
    setStartLocal(toLocalInputValue(log.start_time));
    setEndLocal(toLocalInputValue(log.end_time));
    setError(null);
    setListOpen(false);
  }, [log]);

  useEffect(() => {
    if (!log) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [log, onClose]);

  if (!log?.end_time) return null;

  const previewMs = (() => {
    try {
      return workedMs(
        fromLocalInputValue(startLocal),
        fromLocalInputValue(endLocal),
        log.pause_ms ?? 0,
      );
    } catch {
      return 0;
    }
  })();

  const filtered = suggestions.filter((name) =>
    name.toLowerCase().includes(description.trim().toLowerCase()),
  );

  function submit() {
    const trimmed = description.trim();
    if (!trimmed) {
      setError("A name is required.");
      return;
    }
    if (!startLocal || !endLocal) {
      setError("Start and end times are required.");
      return;
    }
    const startIso = fromLocalInputValue(startLocal);
    const endIso = fromLocalInputValue(endLocal);
    if (Number.isNaN(new Date(startIso).getTime()) || Number.isNaN(new Date(endIso).getTime())) {
      setError("Invalid date or time.");
      return;
    }
    if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
      setError("End time must be after start time.");
      return;
    }

    onSave({
      id: log!.id,
      description: trimmed,
      start_time: startIso,
      end_time: endIso,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-neutral-900">
          Edit time entry
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Duration:{" "}
          <span className="font-medium text-[#e812a4]">
            {formatDurationShort(previewMs)}
          </span>
        </p>

        <div className="mt-5 space-y-4">
          <div className="relative">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Name
            </label>
            <input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
                setListOpen(true);
              }}
              onBlur={() => {
                window.setTimeout(() => setListOpen(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Editing Stuff"
              className={cn(
                "h-11 w-full rounded-xl border bg-white px-3 text-sm text-neutral-900 outline-none transition",
                error && !description.trim()
                  ? "border-red-400 focus:border-red-500"
                  : "border-neutral-300 focus:border-[#e812a4]",
              )}
              autoComplete="off"
            />
            {listOpen && filtered.length > 0 ? (
              <ul className="absolute z-10 mt-2 max-h-40 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                {filtered.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-neutral-800 transition hover:bg-neutral-50 hover:text-[#e812a4]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setDescription(name);
                        setListOpen(false);
                        setError(null);
                      }}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Start
              </label>
              <input
                type="datetime-local"
                step="1"
                value={startLocal}
                onChange={(e) => {
                  setStartLocal(e.target.value);
                  setError(null);
                  setListOpen(false);
                }}
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#e812a4]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                End
              </label>
              <input
                type="datetime-local"
                step="1"
                value={endLocal}
                onChange={(e) => {
                  setEndLocal(e.target.value);
                  setError(null);
                  setListOpen(false);
                }}
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#e812a4]"
              />
            </div>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDelete(log.id)}
            className="rounded-full px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Delete
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="rounded-full bg-[#e812a4] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#d01093]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
