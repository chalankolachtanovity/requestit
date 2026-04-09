import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import TransactionsList from "@/components/admin/TransactionsList";
import { getTransactionsData } from "@/lib/dashboard-data";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const transactions = await getTransactionsData(supabase);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">
          DJ Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold">Transactions</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/45">
          Review captured payments, track recent revenue, and keep an eye on what paid requests are doing over time.
        </p>
      </div>

      <TransactionsList initialTransactions={transactions} />
    </div>
  );
}
