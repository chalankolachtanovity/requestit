"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentAttemptId = searchParams.get("paymentAttemptId");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Potvrdzujem tvoj priority request...");
  const [slug, setSlug] = useState<string | null>(null);

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

        setMessage(
          "Tvoj priority request bol úspešne odoslaný DJ-ovi. Presmerovanie za pár sekúnd..."
        );

        if (result.slug) {
          setSlug(result.slug);

          setTimeout(() => {
            router.replace(`/${result.slug}`);
          }, 3000); // ⏳ 3 sekundy
        } else {
          router.replace("/");
        }
      } catch (error) {
        console.error("PAYMENT SUCCESS PAGE ERROR:", error);
        setMessage("Nastala chyba pri potvrdzovaní requestu.");
      } finally {
        setLoading(false);
      }
    };

    confirmPriorityRequest();
  }, [paymentAttemptId, router]);

  const handleBack = () => {
    if (slug) {
      router.replace(`/${slug}`);
    } else {
      router.replace("/");
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-bold">Platba úspešná</h1>

        <p className="mt-4 text-white/70">{message}</p>

        {loading && (
          <p className="mt-2 text-sm text-white/50">Spracovávam...</p>
        )}

        {!loading && (
          <button
            onClick={handleBack}
            className="mt-6 inline-block rounded-full bg-white px-4 py-2 text-black"
          >
            Späť na requesty
          </button>
        )}
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