import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrackerApp } from "@/components/tracker/tracker-app";

async function TrackerLoader() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;
  const email =
    typeof data.claims.email === "string" ? data.claims.email : undefined;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: userData } = await supabase.auth.getUser();
  const meta = userData.user?.user_metadata as
    | { display_name?: string; full_name?: string }
    | undefined;
  const displayName =
    (typeof meta?.display_name === "string" && meta.display_name.trim()) ||
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    null;

  return (
    <TrackerApp userId={userId} email={email} initialDisplayName={displayName} />
  );
}

export default function ProtectedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] text-sm text-neutral-400">
          Loading…
        </div>
      }
    >
      <TrackerLoader />
    </Suspense>
  );
}
