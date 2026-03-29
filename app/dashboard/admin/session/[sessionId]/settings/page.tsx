import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SessionSettingsPanel from "@/components/admin/SessionSettingsPanel";
import SessionSubnav from "@/components/admin/SessionSubnav";
import DashboardTopRight from "@/components/admin/DashboardTopRight";

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
    .select("id, user_id, name")
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

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">
              DJ Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold">Settings</h1>
          </div>

        </div>

        <SessionSettingsPanel sessionId={sessionId} />
      </div>
    </main>
  );
}
