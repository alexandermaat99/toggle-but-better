"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import type { Client } from "@/lib/types";

export type NavView = "dash" | "report" | "client";

type ClientNavProps = {
  displayName: string;
  email?: string;
  clients: Client[];
  view: NavView;
  selectedClientId: number | null;
  onSelectDash: () => void;
  onSelectReport: () => void;
  onSelectClient: (id: number) => void;
  onAddClient: () => void;
  onEditDisplayName: () => void;
  onLogout: () => void;
};

function navItemClass(active: boolean) {
  return `text-left text-base transition-colors ${
    active
      ? "font-medium text-[#e812a4]"
      : "text-white/90 hover:text-white"
  }`;
}

export function ClientNav({
  displayName,
  email,
  clients,
  view,
  selectedClientId,
  onSelectDash,
  onSelectReport,
  onSelectClient,
  onAddClient,
  onEditDisplayName,
  onLogout,
}: ClientNavProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!profileRef.current?.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[220px] flex-col overflow-hidden bg-[#2a2a2a] text-white">
      <div className="shrink-0 px-5 pb-4 pt-8">
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-white/5"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="min-w-0">
              <span className="block truncate text-base font-medium">
                {displayName}
              </span>
              {email ? (
                <span className="mt-0.5 block truncate text-xs text-white/40">
                  {email}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-white/50 transition-transform ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#1f1f1f] py-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);
                  onEditDisplayName();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
              >
                <UserRound className="size-3.5" />
                Edit display name
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
              >
                <LogOut className="size-3.5" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-8">
        <nav className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Overview
            </p>
            <button
              type="button"
              onClick={onSelectDash}
              className={navItemClass(view === "dash")}
            >
              Dash
            </button>
            <button
              type="button"
              onClick={onSelectReport}
              className={navItemClass(view === "report")}
            >
              Report
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Clients
            </p>
            {clients.length === 0 ? (
              <p className="text-sm text-white/40">No clients yet</p>
            ) : (
              clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => onSelectClient(client.id)}
                  className={navItemClass(
                    view === "client" && client.id === selectedClientId,
                  )}
                >
                  {client.client_name}
                </button>
              ))
            )}
            <button
              type="button"
              onClick={onAddClient}
              className="text-left text-base text-white/90 transition-colors hover:text-white"
            >
              + add client
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}
