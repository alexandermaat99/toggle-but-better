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

  return <TrackerApp userId={userId} email={email} />;
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
