import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import SearchBar from "@/components/guest/SearchBar";

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
    .select("id, name, min_priority_amount_cents, is_active, requests_paused")
    .eq("slug", djSlug)
    .single();

  if (sessionError || !session) {
    notFound();
  }

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
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 md:px-6">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>Live song requests</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            {session.name || "Live Session"}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55 md:text-base">
            Vyber pesničku, pošli request a dostaň ju do poradia. Priority request
            ťa vie posunúť vyššie.
          </p>
        </div>

        {session.requests_paused ? (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            Requesty sú momentálne pozastavené DJ-om.
          </div>
        ) : null}

        <SearchBar
          sessionId={session.id}
          minPriorityAmountCents={session.min_priority_amount_cents}
        />
      </div>
    </main>
  );
}