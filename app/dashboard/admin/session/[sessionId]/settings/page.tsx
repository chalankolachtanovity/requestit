import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SessionSettingsPanel from "@/components/admin/SessionSettingsPanel";
import SessionSubnav from "@/components/admin/SessionSubnav";

type SessionMode = "classic" | "most_requested";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function AdminSessionSettingsPage({
  params,
}: PageProps) {
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
    .select("id, user_id, name, mode")
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
      <SessionSubnav sessionId={sessionId} />

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">
              DJ Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold">Settings</h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                {session.name || "Unnamed Event"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
              Typ eventu sa po vytvorení nemení. Tu upravuješ iba ostatné
              nastavenia session.
            </p>
          </div>
        </div>

        <SessionSettingsPanel
          sessionId={sessionId}
          mode={sessionMode}
        />
      </div>
    </main>
  );
}