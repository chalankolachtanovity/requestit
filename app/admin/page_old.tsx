import SessionsList from "@/components/admin/SessionsList";

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/40">
            DJ Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold">Sessions</h1>
          <p className="mt-2 text-white/55">
            Vytvor session, otvor queue a zobraz si QR kód pre hostí.
          </p>
        </div>

        <SessionsList />
      </div>
    </main>
  );
}