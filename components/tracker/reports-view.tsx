"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  formatDurationShort,
  formatElapsedClock,
  formatLogRange,
  workedMs,
} from "@/lib/format-time";
import { downloadReportPdf } from "@/lib/report-pdf";
import type { ClientWithProjects } from "@/lib/types";
import { cn } from "@/lib/utils";

type ReportsViewProps = {
  clients: ClientWithProjects[];
};

type SpanMode = "week" | "month" | "custom";

type FlatLog = {
  id: number;
  description: string;
  operationName: string;
  projectName: string;
  clientId: number;
  clientName: string;
  start_time: string;
  end_time: string;
  pause_ms: number;
  ms: number;
};

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(d: Date) {
  const next = startOfDay(d);
  const day = next.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  next.setDate(next.getDate() + diff);
  return next;
}

function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

function startOfMonth(d: Date) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function collectFlatLogs(clients: ClientWithProjects[]): FlatLog[] {
  const logs: FlatLog[] = [];
  for (const client of clients) {
    for (const project of client.projects ?? []) {
      for (const operation of project.operations ?? []) {
        for (const log of operation.time_log ?? []) {
          if (!log.end_time) continue;
          logs.push({
            id: log.id,
            description: log.description?.trim() || "Untitled",
            operationName: operation.operation_name || "Untitled operation",
            projectName: project.project_name,
            clientId: client.id,
            clientName: client.client_name,
            start_time: log.start_time,
            end_time: log.end_time,
            pause_ms: log.pause_ms ?? 0,
            ms: workedMs(log.start_time, log.end_time, log.pause_ms ?? 0),
          });
        }
      }
    }
  }
  return logs.sort(
    (a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
}

function toggleInSet(set: Set<string>, value: string) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
          {label}
        </p>
        {selected.size > 0 ? (
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-xs text-neutral-400 transition hover:text-neutral-600"
          >
            Clear
          </button>
        ) : (
          <span className="text-xs text-neutral-300">All</span>
        )}
      </div>
      {options.length === 0 ? (
        <p className="text-sm text-neutral-400">None yet</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selected.has(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(toggleInSet(selected, option))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  active
                    ? "border-[#e812a4] bg-[#e812a4]/10 font-medium text-[#e812a4]"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReportsView({ clients }: ReportsViewProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | "all">(
    "all",
  );
  const [selectedEntryNames, setSelectedEntryNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedOperationNames, setSelectedOperationNames] = useState<
    Set<string>
  >(() => new Set());
  const [span, setSpan] = useState<SpanMode>("week");
  const [customFrom, setCustomFrom] = useState(() =>
    toDateInputValue(startOfMonth(new Date())),
  );
  const [customTo, setCustomTo] = useState(() =>
    toDateInputValue(new Date()),
  );

  const allLogs = useMemo(() => collectFlatLogs(clients), [clients]);

  const range = useMemo(() => {
    const now = new Date();
    if (span === "week") {
      return { start: startOfWeek(now), end: endOfWeek(now) };
    }
    if (span === "month") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    const from = customFrom
      ? startOfDay(new Date(`${customFrom}T00:00:00`))
      : startOfDay(now);
    const to = customTo
      ? endOfDay(new Date(`${customTo}T00:00:00`))
      : endOfDay(now);
    return {
      start: from,
      end: to.getTime() < from.getTime() ? endOfDay(from) : to,
    };
  }, [span, customFrom, customTo]);

  const clientScopedLogs = useMemo(() => {
    if (selectedClientId === "all") return allLogs;
    return allLogs.filter((log) => log.clientId === selectedClientId);
  }, [allLogs, selectedClientId]);

  const entryNameOptions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const log of clientScopedLogs) {
      if (seen.has(log.description)) continue;
      seen.add(log.description);
      names.push(log.description);
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [clientScopedLogs]);

  const operationNameOptions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const log of clientScopedLogs) {
      if (seen.has(log.operationName)) continue;
      seen.add(log.operationName);
      names.push(log.operationName);
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [clientScopedLogs]);

  const filteredLogs = useMemo(() => {
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();

    return clientScopedLogs.filter((log) => {
      const t = new Date(log.start_time).getTime();
      if (t < startMs || t > endMs) return false;
      if (
        selectedEntryNames.size > 0 &&
        !selectedEntryNames.has(log.description)
      ) {
        return false;
      }
      if (
        selectedOperationNames.size > 0 &&
        !selectedOperationNames.has(log.operationName)
      ) {
        return false;
      }
      return true;
    });
  }, [
    clientScopedLogs,
    range,
    selectedEntryNames,
    selectedOperationNames,
  ]);

  const totalMs = filteredLogs.reduce((sum, log) => sum + log.ms, 0);

  const grouped = useMemo(() => {
    type OpGroup = {
      name: string;
      ms: number;
      logs: FlatLog[];
    };
    type ProjectGroup = {
      name: string;
      ms: number;
      operations: Map<string, OpGroup>;
    };
    type ClientGroup = {
      id: number;
      name: string;
      ms: number;
      projects: Map<string, ProjectGroup>;
    };

    const clientsMap = new Map<number, ClientGroup>();

    for (const log of filteredLogs) {
      let client = clientsMap.get(log.clientId);
      if (!client) {
        client = {
          id: log.clientId,
          name: log.clientName,
          ms: 0,
          projects: new Map(),
        };
        clientsMap.set(log.clientId, client);
      }
      client.ms += log.ms;

      let project = client.projects.get(log.projectName);
      if (!project) {
        project = {
          name: log.projectName,
          ms: 0,
          operations: new Map(),
        };
        client.projects.set(log.projectName, project);
      }
      project.ms += log.ms;

      let operation = project.operations.get(log.operationName);
      if (!operation) {
        operation = { name: log.operationName, ms: 0, logs: [] };
        project.operations.set(log.operationName, operation);
      }
      operation.ms += log.ms;
      operation.logs.push(log);
    }

    return [...clientsMap.values()]
      .map((client) => ({
        ...client,
        projects: [...client.projects.values()]
          .map((project) => ({
            ...project,
            operations: [...project.operations.values()],
          }))
          .sort((a, b) => b.ms - a.ms),
      }))
      .sort((a, b) => b.ms - a.ms);
  }, [filteredLogs]);

  const rangeLabel =
    span === "week"
      ? "This week"
      : span === "month"
        ? "This month"
        : "Custom range";

  const rangeDates = `${range.start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${range.end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const clientLabel =
    selectedClientId === "all"
      ? "All clients"
      : (clients.find((c) => c.id === selectedClientId)?.client_name ??
        "Selected client");

  function handleDownloadPdf() {
    downloadReportPdf({
      clientLabel,
      rangeLabel,
      rangeDates,
      entryFilters: [...selectedEntryNames],
      operationFilters: [...selectedOperationNames],
      totalMs,
      groups: grouped,
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Report
          </h1>
          <p className="text-sm text-neutral-400">
            {rangeLabel}:{" "}
            <span className="font-medium text-[#e812a4]">
              {formatElapsedClock(totalMs)}
            </span>
            <span className="text-neutral-300">
              {" "}
              ({formatDurationShort(totalMs)})
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={filteredLogs.length === 0}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
            filteredLogs.length === 0
              ? "cursor-not-allowed border-neutral-200 text-neutral-300"
              : "border-neutral-900 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50",
          )}
        >
          <Download className="size-4" />
          Download PDF
        </button>
      </header>

      {/* Clients */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
          Clients
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedClientId("all");
              setSelectedEntryNames(new Set());
              setSelectedOperationNames(new Set());
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              selectedClientId === "all"
                ? "border-[#e812a4] bg-[#e812a4]/10 font-medium text-[#e812a4]"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400",
            )}
          >
            All
          </button>
          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => {
                setSelectedClientId(client.id);
                setSelectedEntryNames(new Set());
                setSelectedOperationNames(new Set());
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                selectedClientId === client.id
                  ? "border-[#e812a4] bg-[#e812a4]/10 font-medium text-[#e812a4]"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400",
              )}
            >
              {client.client_name}
            </button>
          ))}
        </div>
      </section>

      {/* Span */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
          Span
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["week", "Week"],
              ["month", "Month"],
              ["custom", "Custom"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpan(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                span === value
                  ? "border-[#e812a4] bg-[#e812a4]/10 font-medium text-[#e812a4]"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {span === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-400">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-[#e812a4]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-400">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-[#e812a4]"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">
            {range.start.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
            {" – "}
            {range.end.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </section>

      {/* Filters */}
      <section className="space-y-5 rounded-2xl border border-neutral-300 bg-white px-5 py-5">
        <MultiFilter
          label="Time log names"
          options={entryNameOptions}
          selected={selectedEntryNames}
          onChange={setSelectedEntryNames}
        />
        <MultiFilter
          label="Operations"
          options={operationNameOptions}
          selected={selectedOperationNames}
          onChange={setSelectedOperationNames}
        />
      </section>

      {/* Results */}
      {filteredLogs.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No time entries match these filters.
        </p>
      ) : (
        grouped.map((client) => (
          <section key={client.id} className="space-y-4">
            {selectedClientId === "all" ? (
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold text-neutral-900">
                  {client.name}
                </h2>
                <span className="text-lg font-semibold tabular-nums text-[#e812a4]">
                  {formatElapsedClock(client.ms)}
                </span>
              </div>
            ) : null}

            <div className="space-y-5 rounded-2xl border border-neutral-300 bg-white px-5 py-5">
              {client.projects.map((project) => (
                <div key={project.name} className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-neutral-900">
                      {project.name}
                    </h3>
                    <span className="text-sm font-medium tabular-nums text-neutral-700">
                      {formatElapsedClock(project.ms)}
                    </span>
                  </div>

                  {project.operations.map((operation) => (
                    <div key={operation.name} className="space-y-1.5 pl-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-neutral-800">
                          {operation.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-[#e812a4]">
                          {formatElapsedClock(operation.ms)}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {operation.logs.map((log) => (
                          <li
                            key={log.id}
                            className="flex items-center justify-between gap-3 text-sm text-neutral-500"
                          >
                            <span className="min-w-0 truncate">
                              {log.description} —{" "}
                              {formatLogRange(log.start_time, log.end_time)}
                            </span>
                            <span className="shrink-0 tabular-nums text-[#e812a4]">
                              {formatDurationShort(log.ms)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
