import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import SearchBar from "@/components/guest/SearchBar";

type SessionMode = "classic" | "most_requested";

type PageProps = {
  params: Promise<{
    djSlug: string;
  }>;
};

export default async function DjPage({ params }: PageProps) {
  const { djSlug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      "id, name, mode, min_priority_amount_cents, is_active, requests_paused"
    )
    .eq("slug", djSlug)
    .single();

  if (sessionError || !session) {
    notFound();
  }

  const sessionMode: SessionMode =
    session.mode === "most_requested" ? "most_requested" : "classic";

  if (!session.is_active) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-6 text-center md:px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/65">
            <div className="h-2 w-2 rounded-full bg-white/30" />
            <span>Session ended</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            {session.name || "Session"}
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-6 text-white/50 md:text-base">
            Tento event už skončil a nové requesty sa už neprijímajú.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-3 md:px-6">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70">
            <div
              className={`h-2 w-2 rounded-full ${
                sessionMode === "most_requested" ? "bg-cyan-400" : "bg-red-500"
              }`}
            />
            <span>
              {sessionMode === "most_requested"
                ? "Live song requests"
                : "Live song requests"}
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            {session.name || "Live Session"}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55 md:text-base">
            {sessionMode === "most_requested"
              ? "Vyber pesničku a pridaj jej hlas. Zoznam sa bude radiť podľa počtu requestov."
              : "Vyber pesničku a dostaň ju do poradia. Priority request ťa posunie vyššie v poradí."}
          </p>
        </div>

        <SearchBar
          sessionId={session.id}
          minPriorityAmountCents={session.min_priority_amount_cents}
          mode={sessionMode}
        />
      </div>
    </main>
  );
}