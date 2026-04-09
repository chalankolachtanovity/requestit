import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SessionsList from "@/components/admin/SessionsList";
import { getSessionsData } from "@/lib/dashboard-data";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessions = await getSessionsData(supabase);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">
          DJ Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold">Sessions</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/45">
          Manage your live events, jump into active rooms, and keep completed nights close for a fast restart.
        </p>
      </div>

      <SessionsList initialSessions={sessions} />
    </div>
  );
}
