import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SessionsList from "@/components/admin/SessionsList";
import DashboardTopRight from "@/components/admin/DashboardTopRight";
import DashboardSubnav from "@/components/admin/DashboardSubnav";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/40">
              DJ Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold">Sessions</h1>
            <p className="mt-2 text-white/55">{user.email}</p>
          </div>

          <DashboardTopRight />
        </div>

        <DashboardSubnav />
        <SessionsList />
      </div>
    </main>
  );
}
