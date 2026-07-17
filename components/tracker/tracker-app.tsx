"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { firstNameFromEmail } from "@/lib/format-time";
import type {
  ClientWithProjects,
  ProjectWithOperations,
  TimeLog,
} from "@/lib/types";
import { ClientNav, type NavView } from "./client-nav";
import { ConfirmModal } from "./confirm-modal";
import { DashView } from "./dash-view";
import { EntryNameModal } from "./entry-name-modal";
import { ProjectBlock } from "./project-block";
import { ReportsView } from "./reports-view";
import { TimeLogEditModal } from "./time-log-edit-modal";

type TrackerAppProps = {
  userId: string;
  email: string | undefined;
};

const clientSelect = `
  id,
  created_at,
  client_name,
  user_id,
  projects (
    id,
    created_at,
    project_name,
    projct_description,
    client_id,
    operations (
      id,
      project_id,
      created_at,
      operation_name,
      operation_description,
      time_log (
        id,
        created_at,
        operation_id,
        description,
        start_time,
        end_time,
        pause_ms
      )
    )
  )
`;

function sortTree(clients: ClientWithProjects[]): ClientWithProjects[] {
  return clients
    .map((client) => ({
      ...client,
      projects: (client.projects ?? [])
        .map((project) => ({
          ...project,
          operations: (project.operations ?? [])
            .map((operation) => ({
              ...operation,
              time_log: [...(operation.time_log ?? [])].sort(
                (a, b) =>
                  new Date(b.start_time).getTime() -
                  new Date(a.start_time).getTime(),
              ),
            }))
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            ),
        }))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    }))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
}

function findOpenLog(clients: ClientWithProjects[]): TimeLog | null {
  for (const client of clients) {
    for (const project of client.projects ?? []) {
      for (const operation of project.operations ?? []) {
        for (const log of operation.time_log ?? []) {
          if (!log.end_time) return log;
        }
      }
    }
  }
  return null;
}

function collectPastOperationNames(clients: ClientWithProjects[]) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const client of clients) {
    for (const project of client.projects ?? []) {
      for (const operation of project.operations ?? []) {
        const name = operation.operation_name?.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        names.push(name);
      }
    }
  }
  return names;
}

/** Unique past entry names, preferring the current operation first. */
function collectPastEntryNames(
  clients: ClientWithProjects[],
  preferOperationId?: number | null,
) {
  type NamedLog = {
    description: string;
    start_time: string;
    operation_id: number | null;
  };

  const named: NamedLog[] = [];
  for (const client of clients) {
    for (const project of client.projects ?? []) {
      for (const operation of project.operations ?? []) {
        for (const log of operation.time_log ?? []) {
          const description = log.description?.trim();
          if (!description) continue;
          named.push({
            description,
            start_time: log.start_time,
            operation_id: log.operation_id,
          });
        }
      }
    }
  }

  named.sort(
    (a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );

  const seen = new Set<string>();
  const names: string[] = [];

  const pushUnique = (logs: NamedLog[]) => {
    for (const log of logs) {
      const key = log.description.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(log.description);
    }
  };

  if (preferOperationId != null) {
    pushUnique(named.filter((log) => log.operation_id === preferOperationId));
  }
  pushUnique(named);

  return names;
}

export function TrackerApp({ userId, email }: TrackerAppProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [view, setView] = useState<NavView>("dash");
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  // Pause is UI-only — same open time_log stays in the DB until stop.
  const [isPaused, setIsPaused] = useState(false);
  const [pausedMs, setPausedMs] = useState(0);
  const [pauseStartedAt, setPauseStartedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameModal, setNameModal] = useState<{
    suggestions: string[];
    title: string;
    description: string;
    confirmLabel: string;
    placeholder: string;
  } | null>(null);
  const nameModalResolver = useRef<((value: string | null) => void) | null>(
    null,
  );
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const confirmModalResolver = useRef<((value: boolean) => void) | null>(null);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [creatingLogForOperationId, setCreatingLogForOperationId] = useState<
    number | null
  >(null);

  function resetPauseState() {
    setIsPaused(false);
    setPausedMs(0);
    setPauseStartedAt(null);
  }

  function totalPausedMs(at = Date.now()) {
    if (isPaused && pauseStartedAt != null) {
      return pausedMs + (at - pauseStartedAt);
    }
    return pausedMs;
  }

  function requestEntryName(
    suggestions: string[],
    options?: {
      title?: string;
      description?: string;
      confirmLabel?: string;
      placeholder?: string;
    },
  ) {
    return new Promise<string | null>((resolve) => {
      nameModalResolver.current = resolve;
      setNameModal({
        suggestions,
        title: options?.title ?? "Name this time entry",
        description:
          options?.description ?? "Required before this entry is saved.",
        confirmLabel: options?.confirmLabel ?? "Save entry",
        placeholder: options?.placeholder ?? "e.g. Editing Stuff",
      });
    });
  }

  function finishNameModal(value: string | null) {
    nameModalResolver.current?.(value);
    nameModalResolver.current = null;
    setNameModal(null);
  }

  function requestConfirm(title: string, message: string) {
    return new Promise<boolean>((resolve) => {
      confirmModalResolver.current = resolve;
      setConfirmModal({ title, message });
    });
  }

  function finishConfirmModal(value: boolean) {
    confirmModalResolver.current?.(value);
    confirmModalResolver.current = null;
    setConfirmModal(null);
  }

  const load = useCallback(
    async (options?: { preservePause?: boolean }) => {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("clients")
        .select(clientSelect)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const tree = sortTree((data ?? []) as ClientWithProjects[]);
      const openLog = findOpenLog(tree);
      setClients(tree);
      setActiveLog(openLog);
      setSelectedClientId((current) => {
        if (current && tree.some((c) => c.id === current)) return current;
        return tree[0]?.id ?? null;
      });

      if (!options?.preservePause) {
        setPausedMs(openLog?.pause_ms ?? 0);
        setIsPaused(false);
        setPauseStartedAt(null);
      } else if (!openLog) {
        setIsPaused(false);
        setPausedMs(0);
        setPauseStartedAt(null);
      }

      setLoading(false);
    },
    [supabase, userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const projects: ProjectWithOperations[] = selectedClient?.projects ?? [];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  async function handleAddClient() {
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const client of clients) {
      const name = client.client_name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(name);
    }

    const name = await requestEntryName(suggestions, {
      title: "Add client",
      description: "Name this client.",
      confirmLabel: "Add client",
      placeholder: "e.g. Purple Pumpkin",
    });
    if (!name) return;

    const { error: insertError } = await supabase.from("clients").insert({
      client_name: name,
      user_id: userId,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    await load({ preservePause: true });
  }

  async function handleAddProject() {
    if (!selectedClientId) {
      setError("Add a client first.");
      return;
    }

    const seen = new Set<string>();
    const suggestions: string[] = [];
    const pushName = (name: string | null | undefined) => {
      const trimmed = name?.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push(trimmed);
    };

    const selected = clients.find((c) => c.id === selectedClientId);
    for (const project of selected?.projects ?? []) {
      pushName(project.project_name);
    }
    for (const client of clients) {
      if (client.id === selectedClientId) continue;
      for (const project of client.projects ?? []) {
        pushName(project.project_name);
      }
    }

    const name = await requestEntryName(suggestions, {
      title: "Add project",
      description: "Name this project.",
      confirmLabel: "Add project",
      placeholder: "e.g. Coding this Shiz",
    });
    if (!name) return;

    const { error: insertError } = await supabase.from("projects").insert({
      project_name: name,
      client_id: selectedClientId,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    await load({ preservePause: true });
  }

  async function handleAddOperation(projectId: number) {
    const name = await requestEntryName(collectPastOperationNames(clients), {
      title: "Add operation",
      description: "Name this operation. You can reuse a past name from the list.",
      confirmLabel: "Add operation",
      placeholder: "e.g. Design the Project",
    });
    if (!name) return;

    const { error: insertError } = await supabase.from("operations").insert({
      operation_name: name,
      project_id: projectId,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    await load({ preservePause: true });
  }

  async function handleRenameOperation(operationId: number, name: string) {
    const { error: updateError } = await supabase
      .from("operations")
      .update({ operation_name: name })
      .eq("id", operationId);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load({ preservePause: true });
  }

  async function handleDeleteOperation(operationId: number) {
    const confirmed = await requestConfirm(
      "Delete operation?",
      "This will also delete all time entries under it. This can’t be undone.",
    );
    if (!confirmed) return;

    // Remove child logs first in case there's no cascade
    const { error: logsError } = await supabase
      .from("time_log")
      .delete()
      .eq("operation_id", operationId);

    if (logsError) {
      setError(logsError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from("operations")
      .delete()
      .eq("id", operationId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (activeLog?.operation_id === operationId) {
      setActiveLog(null);
      resetPauseState();
      await load();
      return;
    }

    await load({ preservePause: true });
  }

  async function handleDeleteProject(projectId: number) {
    const confirmed = await requestConfirm(
      "Delete project?",
      "This will also delete all operations and time entries under it. This can’t be undone.",
    );
    if (!confirmed) return;

    const project = clients
      .flatMap((c) => c.projects)
      .find((p) => p.id === projectId);
    const operationIds = (project?.operations ?? []).map((op) => op.id);

    if (operationIds.length > 0) {
      const { error: logsError } = await supabase
        .from("time_log")
        .delete()
        .in("operation_id", operationIds);

      if (logsError) {
        setError(logsError.message);
        return;
      }

      const { error: opsError } = await supabase
        .from("operations")
        .delete()
        .eq("project_id", projectId);

      if (opsError) {
        setError(opsError.message);
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const activeUnderProject =
      activeLog?.operation_id != null &&
      operationIds.includes(activeLog.operation_id);

    if (activeUnderProject) {
      setActiveLog(null);
      resetPauseState();
      await load();
      return;
    }

    await load({ preservePause: true });
  }

  async function closeActiveLog() {
    if (!activeLog) return false;

    const now = Date.now();
    const finalPauseMs = totalPausedMs(now);

    const { error: updateError } = await supabase
      .from("time_log")
      .update({
        end_time: new Date(now).toISOString(),
        pause_ms: finalPauseMs,
      })
      .eq("id", activeLog.id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setActiveLog(null);
    resetPauseState();
    return true;
  }

  async function insertLog(operationId: number) {
    const { data, error: insertError } = await supabase
      .from("time_log")
      .insert({
        operation_id: operationId,
        description: null,
        start_time: new Date().toISOString(),
        pause_ms: 0,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    resetPauseState();
    setActiveLog(data as TimeLog);
    await load();
  }

  async function handleStart(operationId: number) {
    if (activeLog) {
      const closed = await closeActiveLog();
      if (!closed) return;
    }

    await insertLog(operationId);
  }

  function handlePause() {
    if (!activeLog || isPaused) return;
    setIsPaused(true);
    setPauseStartedAt(Date.now());
  }

  async function handleResume() {
    if (!activeLog || !isPaused || pauseStartedAt == null) return;

    const nextPauseMs = pausedMs + (Date.now() - pauseStartedAt);
    setPausedMs(nextPauseMs);
    setPauseStartedAt(null);
    setIsPaused(false);

    const { error: updateError } = await supabase
      .from("time_log")
      .update({ pause_ms: nextPauseMs })
      .eq("id", activeLog.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setActiveLog({ ...activeLog, pause_ms: nextPauseMs });
  }

  async function handleStop() {
    if (activeLog) {
      const closed = await closeActiveLog();
      if (!closed) return;
    } else {
      resetPauseState();
    }
    await load();
  }

  async function handleDeleteLog(id: number) {
    // Close edit modal first so the confirm dialog is visible
    setEditingLog(null);

    const confirmed = await requestConfirm(
      "Delete time entry?",
      "This can’t be undone.",
    );
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("time_log")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (activeLog?.id === id) {
      setActiveLog(null);
      resetPauseState();
      await load();
      return;
    }

    await load({ preservePause: true });
  }

  async function handleSaveLog(update: {
    id: number;
    description: string | null;
    start_time: string;
    end_time: string;
  }) {
    const { error: updateError } = await supabase
      .from("time_log")
      .update({
        description: update.description,
        start_time: update.start_time,
        end_time: update.end_time,
      })
      .eq("id", update.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingLog(null);
    await load({ preservePause: true });
  }

  async function handleCreateLog(draft: {
    description: string | null;
    start_time: string;
    end_time: string;
  }) {
    if (creatingLogForOperationId == null) return;

    const { error: insertError } = await supabase.from("time_log").insert({
      operation_id: creatingLogForOperationId,
      description: draft.description,
      start_time: draft.start_time,
      end_time: draft.end_time,
      pause_ms: 0,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCreatingLogForOperationId(null);
    await load({ preservePause: true });
  }

  return (
    <div className="h-dvh overflow-hidden bg-[#f7f7f7] text-neutral-900">
      <ClientNav
        firstName={firstNameFromEmail(email)}
        email={email}
        clients={clients}
        view={view}
        selectedClientId={selectedClientId}
        onSelectDash={() => setView("dash")}
        onSelectReport={() => setView("report")}
        onSelectClient={(id) => {
          setSelectedClientId(id);
          setView("client");
        }}
        onAddClient={handleAddClient}
        onLogout={handleLogout}
      />

      <main className="ml-[220px] h-dvh overflow-y-auto overscroll-contain px-10 py-10">
        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : view === "dash" ? (
          <DashView
            clients={clients}
            firstName={firstNameFromEmail(email)}
            onOpenClient={(id) => {
              setSelectedClientId(id);
              setView("client");
            }}
          />
        ) : view === "report" ? (
          <ReportsView clients={clients} />
        ) : !selectedClient ? (
          <div className="flex flex-1 flex-col items-start justify-center">
            <p className="text-lg text-neutral-500">
              Add a client to start tracking.
            </p>
            <button
              type="button"
              onClick={handleAddClient}
              className="mt-4 rounded-full border border-neutral-900 bg-white px-5 py-2 text-sm font-medium shadow-sm transition hover:bg-neutral-50"
            >
              + add client
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12">
              {projects.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  No projects for {selectedClient.client_name} yet.
                </p>
              ) : (
                projects.map((project) => (
                  <ProjectBlock
                    key={project.id}
                    project={project}
                    activeLog={activeLog}
                    isPaused={isPaused}
                    pausedMs={pausedMs}
                    pauseStartedAt={pauseStartedAt}
                    onStart={handleStart}
                    onPause={handlePause}
                    onResume={handleResume}
                    onStop={handleStop}
                    onEditLog={(log) => {
                      setCreatingLogForOperationId(null);
                      setEditingLog(log);
                    }}
                    onAddLog={(operationId) => {
                      setEditingLog(null);
                      setCreatingLogForOperationId(operationId);
                    }}
                    onDeleteLog={handleDeleteLog}
                    onAddOperation={handleAddOperation}
                    onRenameOperation={handleRenameOperation}
                    onDeleteOperation={handleDeleteOperation}
                    onDeleteProject={handleDeleteProject}
                  />
                ))
              )}
            </div>

            <div className="mx-auto mt-10 flex w-full max-w-3xl justify-center pb-4">
              <button
                type="button"
                onClick={handleAddProject}
                className="rounded-full border border-neutral-900 bg-white px-6 py-2.5 text-sm font-medium shadow-[0_2px_6px_rgba(0,0,0,0.12)] transition hover:bg-neutral-50"
              >
                + add project
              </button>
            </div>
          </>
        )}
      </main>

      <EntryNameModal
        open={nameModal != null}
        title={nameModal?.title}
        description={nameModal?.description}
        confirmLabel={nameModal?.confirmLabel}
        placeholder={nameModal?.placeholder}
        suggestions={nameModal?.suggestions ?? []}
        onConfirm={finishNameModal}
        onCancel={() => finishNameModal(null)}
      />

      <ConfirmModal
        open={confirmModal != null}
        title={confirmModal?.title ?? ""}
        message={confirmModal?.message ?? ""}
        onConfirm={() => finishConfirmModal(true)}
        onCancel={() => finishConfirmModal(false)}
      />

      <TimeLogEditModal
        open={editingLog != null || creatingLogForOperationId != null}
        mode={creatingLogForOperationId != null ? "create" : "edit"}
        log={editingLog}
        suggestions={collectPastEntryNames(
          clients,
          creatingLogForOperationId ?? editingLog?.operation_id,
        )}
        onSave={handleSaveLog}
        onCreate={handleCreateLog}
        onDelete={handleDeleteLog}
        onClose={() => {
          setEditingLog(null);
          setCreatingLogForOperationId(null);
        }}
      />
    </div>
  );
}
