import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RequestsList from "@/components/admin/RequestsList";
import SessionSubnav from "@/components/admin/SessionSubnav";
import SessionRequestControls from "@/components/admin/SessionRequestControls";
import DashboardCredits from "@/components/admin/DashboardCredits";
import DashboardTopRight from "@/components/admin/DashboardTopRight";

type SessionMode = "classic" | "most_requested";

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
    .select("id, user_id, name, mode, requests_paused, is_active")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    notFound();
  }

  if (session.user_id !== user.id) {
    redirect("/dashboard");
  }

  const sessionMode: SessionMode =
    session.mode === "most_requested" ? "most_requested" : "classic";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 py-3">
          <Image
            src="/black/logo_black.png"
            alt="Requestit"
            width={130}
            height={30}
            priority
            className="h-14 w-auto"
          />

          <DashboardTopRight showBackToDashboard showCredits={false} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-3">
          <SessionSubnav sessionId={sessionId} />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">
              DJ Dashboard
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">
                {session.name ||
                  (sessionMode === "most_requested"
                    ? "Most Requested"
                    : "Queue")}
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

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  sessionMode === "most_requested"
                    ? "border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"
                    : "border border-violet-300/20 bg-violet-400/10 text-violet-200"
                }`}
              >
                {sessionMode === "most_requested"
                  ? "Most Requested"
                  : "Classic"}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm text-white/45">
              {sessionMode === "most_requested"
                ? "Pesničky sú zoradené podľa počtu requestov a nové hlasovania sa prijímajú automaticky."
                : "Spravuj queue requestov, prijímaj ich a rozhoduj o poradí prehrávania."}
            </p>
          </div>

          <DashboardCredits />
        </div>

        <SessionRequestControls
          sessionId={sessionId}
          initialPaused={session.requests_paused ?? false}
          isActive={session.is_active}
        />

        <RequestsList sessionId={sessionId} mode={sessionMode} />
      </div>
    </main>
  );
}
