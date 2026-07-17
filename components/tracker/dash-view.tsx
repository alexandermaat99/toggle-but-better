"use client";

import {
  formatDurationShort,
  formatElapsedClock,
  formatLogRange,
  sumLogMs,
  workedMs,
} from "@/lib/format-time";
import type { ClientWithProjects } from "@/lib/types";

type DashViewProps = {
  clients: ClientWithProjects[];
  firstName: string;
  onOpenClient: (clientId: number) => void;
};

type FlatEntry = {
  id: number;
  description: string;
  clientName: string;
  clientId: number;
  projectName: string;
  operationName: string;
  start_time: string;
  end_time: string;
  pause_ms: number;
  ms: number;
};

function collectEntries(clients: ClientWithProjects[]): FlatEntry[] {
  const entries: FlatEntry[] = [];
  for (const client of clients) {
    for (const project of client.projects ?? []) {
      for (const operation of project.operations ?? []) {
        for (const log of operation.time_log ?? []) {
          if (!log.end_time) continue;
          entries.push({
            id: log.id,
            description: log.description?.trim() || "",
            clientName: client.client_name,
            clientId: client.id,
            projectName: project.project_name,
            operationName: operation.operation_name || "Untitled operation",
            start_time: log.start_time,
            end_time: log.end_time,
            pause_ms: log.pause_ms ?? 0,
            ms: workedMs(log.start_time, log.end_time, log.pause_ms ?? 0),
          });
        }
      }
    }
  }
  return entries.sort(
    (a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function DashView({ clients, firstName, onOpenClient }: DashViewProps) {
  const entries = collectEntries(clients);
  const totalMs = entries.reduce((sum, e) => sum + e.ms, 0);
  const todayStart = startOfToday().getTime();
  const todayMs = entries
    .filter((e) => new Date(e.start_time).getTime() >= todayStart)
    .reduce((sum, e) => sum + e.ms, 0);

  const clientTotals = clients
    .map((client) => {
      const ms = (client.projects ?? []).reduce(
        (sum, project) =>
          sum +
          (project.operations ?? []).reduce(
            (opSum, operation) => opSum + sumLogMs(operation.time_log ?? []),
            0,
          ),
        0,
      );
      return { id: client.id, name: client.client_name, ms };
    })
    .filter((c) => c.ms > 0)
    .sort((a, b) => b.ms - a.ms);

  const recent = entries.slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Dash
        </h1>
        <p className="text-sm text-neutral-400">
          Hey {firstName} — here’s a quick look at your tracked time.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total time" value={formatElapsedClock(totalMs)} hint={formatDurationShort(totalMs)} />
        <StatCard label="Today" value={formatElapsedClock(todayMs)} hint={formatDurationShort(todayMs)} />
        <StatCard
          label="Clients"
          value={String(clients.length)}
          hint={`${clientTotals.length} with time logged`}
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">By client</h2>
        {clientTotals.length === 0 ? (
          <p className="text-sm text-neutral-400">No completed time yet.</p>
        ) : (
          <div className="rounded-2xl border border-neutral-300 bg-white px-5 py-4">
            <ul className="divide-y divide-neutral-100">
              {clientTotals.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => onOpenClient(client.id)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:opacity-80"
                  >
                    <span className="font-medium text-neutral-900">
                      {client.name}
                    </span>
                    <span className="tabular-nums text-[#e812a4]">
                      {formatElapsedClock(client.ms)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Recent entries</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Stop a timer to see recent work here.
          </p>
        ) : (
          <div className="rounded-2xl border border-neutral-300 bg-white px-5 py-4">
            <ul className="space-y-3">
              {recent.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    {entry.description ? (
                      <p className="truncate font-medium text-neutral-900">
                        {entry.description}
                      </p>
                    ) : null}
                    <p className="truncate text-neutral-400">
                      {entry.clientName} · {entry.projectName} ·{" "}
                      {entry.operationName}
                    </p>
                    <p className="text-neutral-400">
                      {formatLogRange(entry.start_time, entry.end_time)}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums text-[#e812a4]">
                    {formatDurationShort(entry.ms)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">
        {value}
      </p>
      <p className="mt-1 text-sm text-neutral-400">{hint}</p>
    </div>
  );
}
