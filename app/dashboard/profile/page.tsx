import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EditProfileForm from "@/components/admin/EditProfileForm";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/40">
            DJ Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold">Edit Profile</h1>
        </div>

        <EditProfileForm />
      </div>
    </main>
  );
}