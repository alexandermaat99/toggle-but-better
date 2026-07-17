"use client";

import { formatElapsedClock, formatStartedDate, sumLogMs } from "@/lib/format-time";
import type { ProjectWithOperations, TimeLog } from "@/lib/types";
import { OperationItem } from "./operation-item";

type ProjectBlockProps = {
  project: ProjectWithOperations;
  activeLog: TimeLog | null;
  isPaused: boolean;
  pausedMs: number;
  pauseStartedAt: number | null;
  onStart: (operationId: number) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onEditLog: (log: TimeLog) => void;
  onDeleteLog: (id: number) => void;
  onAddOperation: (projectId: number) => void;
  onRenameOperation: (operationId: number, name: string) => void;
  onDeleteOperation: (operationId: number) => void;
};

export function ProjectBlock({
  project,
  activeLog,
  isPaused,
  pausedMs,
  pauseStartedAt,
  onStart,
  onPause,
  onResume,
  onStop,
  onEditLog,
  onDeleteLog,
  onAddOperation,
  onRenameOperation,
  onDeleteOperation,
}: ProjectBlockProps) {
  const allLogs = project.operations.flatMap((op) => op.time_log);
  const closedProjectMs = sumLogMs(allLogs);

  return (
    <section className="space-y-3">
      <header className="space-y-0.5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            {project.project_name}
          </h2>
          <span className="text-2xl font-bold tracking-tight text-neutral-900">
            {formatElapsedClock(closedProjectMs)}
          </span>
        </div>
        <p className="text-sm text-neutral-400">
          started {formatStartedDate(project.created_at)}
        </p>
      </header>

      <div className="space-y-5 rounded-2xl border border-neutral-300 bg-white px-5 py-5">
        {project.operations.length === 0 ? (
          <p className="text-sm text-neutral-400">No operations yet.</p>
        ) : (
          project.operations.map((operation) => (
            <OperationItem
              key={operation.id}
              operation={operation}
              activeLog={
                activeLog?.operation_id === operation.id ? activeLog : null
              }
              isPaused={
                activeLog?.operation_id === operation.id ? isPaused : false
              }
              pausedMs={
                activeLog?.operation_id === operation.id ? pausedMs : 0
              }
              pauseStartedAt={
                activeLog?.operation_id === operation.id
                  ? pauseStartedAt
                  : null
              }
              onStart={onStart}
              onPause={onPause}
              onResume={onResume}
              onStop={onStop}
              onEditLog={onEditLog}
              onDeleteLog={onDeleteLog}
              onRename={onRenameOperation}
              onDelete={onDeleteOperation}
            />
          ))
        )}

        <button
          type="button"
          onClick={() => onAddOperation(project.id)}
          className="text-sm text-neutral-400 transition-colors hover:text-neutral-600"
        >
          + add operation
        </button>
      </div>
    </section>
  );
}
