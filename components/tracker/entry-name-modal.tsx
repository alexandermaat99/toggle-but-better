"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NameSuggestionField } from "./name-suggestion-field";

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
  const titleId = useId();
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
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-neutral-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>

        <div className="mt-5">
          <NameSuggestionField
            value={value}
            onChange={(next) => {
              setValue(next);
              setError(null);
            }}
            suggestions={suggestions}
            listOpen={listOpen}
            onListOpenChange={setListOpen}
            placeholder={placeholder}
            error={Boolean(error)}
            inputRef={inputRef}
            onSubmit={submit}
            onCancel={onCancel}
          />
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
