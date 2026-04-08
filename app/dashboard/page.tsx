import Image from "next/image";
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
              <Image
                src="/black/logo_black.png"
                alt="Requestit"
                width={150}
                height={36}
                priority
                className="h-16 w-auto"
              />

          </div>

          <DashboardTopRight />
        </div>

        <DashboardSubnav />
        <SessionsList />
      </div>
    </main>
  );
}