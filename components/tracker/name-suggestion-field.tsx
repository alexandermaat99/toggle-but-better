"use client";

import { useId, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type NameSuggestionFieldProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  listOpen: boolean;
  onListOpenChange: (open: boolean) => void;
  placeholder?: string;
  error?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onSubmit?: () => void;
  onCancel?: () => void;
  id?: string;
};

export function filterSuggestions(suggestions: string[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return suggestions;
  return suggestions.filter((name) => name.toLowerCase().includes(q));
}

export function NameSuggestionField({
  value,
  onChange,
  suggestions,
  listOpen,
  onListOpenChange,
  placeholder = "e.g. Editing Stuff",
  error = false,
  inputRef: externalRef,
  onSubmit,
  onCancel,
  id,
}: NameSuggestionFieldProps) {
  const autoId = useId();
  const listId = useId();
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const fieldId = id ?? `${autoId}-field`;

  const filtered = filterSuggestions(suggestions, value);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={fieldId}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onListOpenChange(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit?.();
            }
            if (e.key === "Escape") onCancel?.();
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
          onClick={() => onListOpenChange(!listOpen)}
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
            <li key={name.toLowerCase()} role="option">
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm text-neutral-800 transition hover:bg-neutral-50 hover:text-[#e812a4]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(name);
                  onListOpenChange(false);
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
  );
}
