"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentAttemptId = searchParams.get("paymentAttemptId");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Presmerovávam späť na requesty...");

  useEffect(() => {
    const loadSessionSlug = async () => {
      try {
        if (!paymentAttemptId) {
          setMessage("Chýba paymentAttemptId v URL.");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/payment-attempt-session", {
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
          setMessage(result.error || "Nepodarilo sa načítať session.");
          setLoading(false);
          return;
        }

        setMessage("Platba bola zrušená. Presmerovávam späť na requesty...");

        if (result.slug) {
          setTimeout(() => {
            router.replace(`/${result.slug}`); // 🔥 TU ZMENA
          }, 1200);
        } else {
          router.replace("/");
        }
      } catch (error) {
        console.error("PAYMENT CANCEL PAGE ERROR:", error);
        setMessage("Nastala chyba pri načítaní session.");
      } finally {
        setLoading(false);
      }
    };

    loadSessionSlug();
  }, [paymentAttemptId, router]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-bold">Platba zrušená</h1>

        <p className="mt-4 text-white/70">{message}</p>

        {loading && (
          <p className="mt-2 text-sm text-white/50">Spracovávam...</p>
        )}
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