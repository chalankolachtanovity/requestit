"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LogoutButton() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/[0.06]"
    >
      Logout
    </button>
  );
}