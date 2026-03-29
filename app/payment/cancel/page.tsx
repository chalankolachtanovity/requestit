"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const backHref = useMemo(() => {
    if (returnTo && returnTo.startsWith("/")) {
      return returnTo;
    }

    return "/";
  }, [returnTo]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-bold">Platba zrušená</h1>

        <p className="mt-4 text-white/70">Request nebol dokončený.</p>

        <p className="mt-2 text-sm text-white/50">
          Môžeš to skúsiť znova alebo vybrať inú pesničku.
        </p>

        <a
          href={backHref}
          className="mt-6 inline-block rounded-full border border-white/20 px-4 py-2 text-white hover:bg-white/10"
        >
          Späť na requesty
        </a>
      </div>
    </main>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black" />}>
      <PaymentCancelContent />
    </Suspense>
  );
}