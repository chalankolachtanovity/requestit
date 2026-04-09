import Image from "next/image";
import { redirect } from "next/navigation";
import DashboardTopRight from "@/components/admin/DashboardTopRight";
import DashboardHeaderNav from "@/components/admin/DashboardHeaderNav";
import { getDashboardOverview } from "@/lib/dashboard-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const overview = await getDashboardOverview(
    supabase,
    user.id,
    user.email ?? null
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Image
            src="/black/logo_black.png"
            alt="Requestit"
            width={130}
            height={30}
            priority
            className="h-14 w-auto"
          />

          <DashboardTopRight initialOverview={overview} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-3">
          <DashboardHeaderNav />
        </div>
      </div>

      {children}
    </main>
  );
}
