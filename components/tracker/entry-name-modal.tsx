"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type EntryNameModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  placeholder?: string;
  initialValue?: string;
  suggestions: string[];
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

export function EntryNameModal({
  open,
  title = "Name this time entry",
  description = "Required before this entry is saved.",
  confirmLabel = "Save entry",
  placeholder = "e.g. Editing Stuff",
  initialValue = "",
  suggestions,
  onConfirm,
  onCancel,
}: EntryNameModalProps) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    setError(null);
    setListOpen(false);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, initialValue]);

  if (!open) return null;

  const filtered = suggestions.filter((name) =>
    name.toLowerCase().includes(value.trim().toLowerCase()),
  );

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("A name is required.");
      inputRef.current?.focus();
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={inputId}
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={inputId} className="text-lg font-bold text-neutral-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>

        <div className="relative mt-5">
          <label htmlFor={`${inputId}-field`} className="sr-only">
            Entry name
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id={`${inputId}-field`}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
                setListOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") onCancel();
              }}
              placeholder={placeholder}
              className={cn(
                "h-11 w-full rounded-xl border bg-white px-3 text-sm text-neutral-900 outline-none transition",
                error
                  ? "border-red-400 focus:border-red-500"
                  : "border-neutral-300 focus:border-[#e812a4]",
              )}
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={listOpen}
            />
            <button
              type="button"
              onClick={() => setListOpen((open) => !open)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-300 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
              aria-label="Show past names"
              aria-expanded={listOpen}
              aria-controls={listId}
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  listOpen && "rotate-180",
                )}
              />
            </button>
          </div>

          {listOpen && filtered.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-10 mt-2 max-h-48 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
            >
              {filtered.map((name) => (
                <li key={name} role="option" aria-selected={value === name}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm text-neutral-800 transition hover:bg-neutral-50 hover:text-[#e812a4]"
                    onClick={() => {
                      setValue(name);
                      setError(null);
                      setListOpen(false);
                      inputRef.current?.focus();
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {listOpen && filtered.length === 0 && suggestions.length > 0 ? (
            <p className="absolute z-10 mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-400 shadow-lg">
              No matching past names
            </p>
          ) : null}
        </div>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-[#e812a4] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#d01093]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
