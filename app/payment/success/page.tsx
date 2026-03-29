"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const paymentAttemptId = searchParams.get("paymentAttemptId");
  const returnTo = searchParams.get("returnTo");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Potvrdzujem tvoj priority request...");

  const backHref = useMemo(() => {
    if (returnTo && returnTo.startsWith("/")) {
      return returnTo;
    }

    return "/";
  }, [returnTo]);

  useEffect(() => {
    const confirmPriorityRequest = async () => {
      try {
        if (!paymentAttemptId) {
          setMessage("Chýba paymentAttemptId v URL.");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/confirm-priority-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentAttemptId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Nepodarilo sa potvrdiť request.");
          setLoading(false);
          return;
        }

        setMessage("Tvoj priority request bol úspešne odoslaný DJ-ovi.");
      } catch (error) {
        console.error("PAYMENT SUCCESS PAGE ERROR:", error);
        setMessage("Nastala chyba pri potvrdzovaní requestu.");
      } finally {
        setLoading(false);
      }
    };

    confirmPriorityRequest();
  }, [paymentAttemptId]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-bold">Platba úspešná</h1>

        <p className="mt-4 text-white/70">{message}</p>

        {loading ? (
          <p className="mt-2 text-sm text-white/50">Spracovávam...</p>
        ) : null}

        <a
          href={backHref}
          className="mt-6 inline-block rounded-full bg-white px-4 py-2 text-black"
        >
          Späť na requesty
        </a>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}