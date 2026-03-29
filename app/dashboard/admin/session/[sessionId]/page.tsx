import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RequestsList from "@/components/admin/RequestsList";
import SessionSubnav from "@/components/admin/SessionSubnav";
import SessionRequestControls from "@/components/admin/SessionRequestControls";
import DashboardCredits from "@/components/admin/DashboardCredits";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function AdminSessionPage({ params }: PageProps) {
  const { sessionId } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, user_id, name, requests_paused, is_active")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    notFound();
  }

  if (session.user_id !== user.id) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <SessionSubnav sessionId={sessionId} />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">
              DJ Dashboard
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">
                {session.name || "Queue"}
              </h1>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  session.is_active
                    ? "bg-green-400 text-black"
                    : "border border-white/15 text-white/60"
                }`}
              >
                {session.is_active ? "LIVE" : "ENDED"}
              </span>
            </div>
          </div>

          <DashboardCredits />
        </div>

        <SessionRequestControls
          sessionId={sessionId}
          initialPaused={session.requests_paused ?? false}
          isActive={session.is_active}
        />

        <RequestsList sessionId={sessionId} />
      </div>
    </main>
  );
}
