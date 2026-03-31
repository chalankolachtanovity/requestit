"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Language = "sk" | "en";

type DemoRequest = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  type: "free" | "paid";
  amount?: string;
};

const copy = {
  sk: {
    credits: "Credits",
    queue: "To Be Played",
    incoming: "Incoming Requests",
    paid: "PAID",
    free: "FREE",
    playingSoon: "Playing soon",
    accept: "Accept",
    acceptCharge: "Accept & charge",
    guestTitle: "Guest page",
    guestSub: "Search and request songs live",
    request: "Request",
    priority: "Priority",
    sent: "Úspešne poslané",
    helper: "Klikni na request v mobile a potom ho prijmi v dashboarde.",
    queueEmpty: "Zatiaľ tu nič nie je.",
    incomingEmpty: "Žiadne nové requesty.",
    searchResults: "Search results",
  },
  en: {
    credits: "Credits",
    queue: "To Be Played",
    incoming: "Incoming Requests",
    paid: "PAID",
    free: "FREE",
    playingSoon: "Playing soon",
    accept: "Accept",
    acceptCharge: "Accept & charge",
    guestTitle: "Guest page",
    guestSub: "Search and request songs live",
    request: "Request",
    priority: "Priority",
    sent: "Sent successfully",
    helper: "Click a request on mobile, then accept it in the dashboard.",
    queueEmpty: "Nothing here yet.",
    incomingEmpty: "No new requests.",
    searchResults: "Search results",
  },
} satisfies Record<Language, Record<string, string>>;

function Cover({ src, alt, size = "md" }: { src: string; alt: string; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-10 w-10" : "h-11 w-11";
  return (
    <div className={`relative ${cls} overflow-hidden rounded-lg bg-white/10`}>
      <Image src={src} alt={alt} fill className="object-cover" />
    </div>
  );
}

function TypingCursor() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setShow((prev) => !prev), 550);
    return () => clearInterval(interval);
  }, []);

  return <span className={`ml-0.5 ${show ? "opacity-100" : "opacity-0"}`}>|</span>;
}

function PhonePreview({
  t,
  onAddFree,
  onAddPaid,
  sentType,
}: {
  t: Record<string, string>;
  onAddFree: () => void;
  onAddPaid: () => void;
  sentType: "free" | "paid" | null;
}) {
  const actionDisabled = sentType !== null;

  return (
    <div className="w-[290px] rounded-[2.6rem] border border-white/10 bg-[#0f0f12] p-2 shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
      <div className="rounded-[2.1rem] bg-[#181818] px-4 pb-4 pt-3 text-white">
        <div className="mb-4 flex justify-center">
          <div className="h-1.5 w-20 rounded-full bg-white/10" />
        </div>

        <div className="min-h-[480px]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                {t.guestTitle}
              </p>
              <p className="mt-1 text-sm font-semibold">{t.guestSub}</p>
            </div>

            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
            as it<TypingCursor />
          </div>

          <div className="mb-3">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              {t.searchResults}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <Cover src="/as-it-was.jpg" alt="As It Was" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">As It Was</p>
                <p className="truncate text-xs text-white/50">Harry Styles</p>
              </div>
            </div>

            {sentType ? (
              <div
                className={`mt-3 rounded-xl px-3 py-2 text-center text-xs font-medium ${
                  sentType === "paid"
                    ? "bg-green-500/[0.14] text-green-300"
                    : "bg-white/[0.08] text-white/80"
                }`}
              >
                {t.sent}
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onAddFree}
                  disabled={actionDisabled}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/75 transition hover:bg-white/[0.05] disabled:cursor-default disabled:opacity-50"
                >
                  {t.request}
                </button>
                <button
                  onClick={onAddPaid}
                  disabled={actionDisabled}
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black transition hover:opacity-95 disabled:cursor-default disabled:opacity-50"
                >
                  {t.priority}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcase({
  language,
  reveal,
}: {
  language: Language;
  reveal: number;
}) {
  const t = useMemo(() => copy[language], [language]);

  const [incoming, setIncoming] = useState<DemoRequest[]>([
    {
      id: "1",
      title: "Titanium",
      artist: "David Guetta",
      cover: "/titanium.jpg",
      type: "paid",
      amount: "10.00 €",
    },
    {
      id: "2",
      title: "Mr. Brightside",
      artist: "The Killers",
      cover: "/mr-brightside.jpg",
      type: "free",
    },
  ]);

  const [queue, setQueue] = useState<DemoRequest[]>([]);
  const [targetCredits, setTargetCredits] = useState(0);
  const [displayCredits, setDisplayCredits] = useState(0);
  const [sentType, setSentType] = useState<"free" | "paid" | null>(null);

  useEffect(() => {
    if (displayCredits === targetCredits) return;

    const direction = displayCredits < targetCredits ? 1 : -1;
    const interval = setInterval(() => {
      setDisplayCredits((prev) => {
        const next = prev + direction;
        if ((direction === 1 && next >= targetCredits) || (direction === -1 && next <= targetCredits)) {
          clearInterval(interval);
          return targetCredits;
        }
        return next;
      });
    }, 55);

    return () => clearInterval(interval);
  }, [displayCredits, targetCredits]);

  const addMobileFree = () => {
    const exists =
      incoming.some((r) => r.title === "As It Was" && r.type === "free") ||
      queue.some((r) => r.title === "As It Was" && r.type === "free") ||
      sentType !== null;

    if (exists) return;

    setIncoming((prev) => [
      ...prev,
      {
        id: "mobile-free",
        title: "As It Was",
        artist: "Harry Styles",
        cover: "/as-it-was.jpg",
        type: "free",
      },
    ]);
    setSentType("free");
  };

  const addMobilePaid = () => {
    const exists =
      incoming.some((r) => r.title === "As It Was" && r.type === "paid") ||
      queue.some((r) => r.title === "As It Was" && r.type === "paid") ||
      sentType !== null;

    if (exists) return;

    setIncoming((prev) => [
      {
        id: "mobile-paid",
        title: "As It Was",
        artist: "Harry Styles",
        cover: "/as-it-was.jpg",
        type: "paid",
        amount: "5.00 €",
      },
      ...prev,
    ]);
    setSentType("paid");
  };

  const acceptRequest = (request: DemoRequest) => {
    setIncoming((prev) => prev.filter((r) => r.id !== request.id));
    setQueue((prev) => [request, ...prev]);

    if (request.type === "paid") {
      const parsed = Number(request.amount?.replace(" €", "").replace(",", ".") ?? "0");
      setTargetCredits((prev) => prev + parsed);
    }
  };


  return (
    <div className="w-full max-w-[1100px]">
      <p className="mb-4 text-center text-xs text-white/45">{t.helper}</p>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_290px]">
        <div className="relative">
          <div className="mx-auto w-full rounded-t-[2rem] border border-white/10 bg-[#d8d8de] p-3 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
            <div className="rounded-[1.6rem] border border-black/10 bg-[#0f0f12] p-3">
              <div className="min-h-[520px] rounded-[1.1rem] bg-[#181818] p-5 text-white">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                      DJ Dashboard
                    </p>
                    <h3 className="mt-1 text-2xl font-bold">Friday Session</h3>
                  </div>

                  <div
                    className={`rounded-2xl border px-4 py-2 transition-all duration-700 ${
                      displayCredits > 0
                        ? "border-green-400/20 bg-green-500/[0.08] shadow-[0_0_28px_rgba(34,197,94,0.18)]"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                      {t.credits}
                    </p>
                    <p
                      className={`mt-1 text-lg font-bold transition-colors duration-500 ${
                        displayCredits > 0 ? "text-green-400" : "text-white"
                      }`}
                    >
                      {displayCredits.toFixed(2)} €
                    </p>
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
                    Queue
                  </span>
                  <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
                    Settings
                  </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                          Queue
                        </p>
                        <h4 className="mt-1 text-xl font-semibold">{t.queue}</h4>
                      </div>
                      <span className="text-sm text-white/35">{queue.length}</span>
                    </div>

                    {queue.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/45">
                        {t.queueEmpty}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {queue.map((item, index) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-300 ${
                              index === 0 ? "bg-green-400/[0.07]" : "hover:bg-white/[0.04]"
                            }`}
                          >
                            <Cover src={item.cover} alt={item.title} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{item.title}</p>
                              <p className="truncate text-xs text-white/50">{item.artist}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {index === 0 ? (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-black">
                                  {t.playingSoon}
                                </span>
                              ) : null}

                              {item.type === "paid" && item.amount ? (
                                <span className="text-xs font-semibold text-green-400">
                                  {item.amount}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                        Requests
                      </p>
                      <h4 className="mt-1 text-xl font-semibold">{t.incoming}</h4>
                    </div>

                    {incoming.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/45">
                        {t.incomingEmpty}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {incoming.map((item) => (
                          <div
  key={item.id}
  className={`rounded-2xl border px-3 py-3 transition-all duration-300 ${
    item.type === "paid"
      ? "border-green-400/20 bg-green-400/[0.07]"
      : "border-white/10 bg-white/[0.03]"
  }`}
>
  <div className="flex items-center gap-3">
    <Cover src={item.cover} alt={item.title} size="sm" />

    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            item.type === "paid"
              ? "bg-green-400 text-black"
              : "border border-white/10 text-white/60"
          }`}
        >
          {item.type === "paid" ? t.paid : t.free}
        </span>

        {item.amount ? (
          <span className="text-[11px] font-semibold text-green-300">
            {item.amount}
          </span>
        ) : null}
      </div>

      <p className="truncate text-sm font-semibold leading-tight">{item.title}</p>
      <p className="truncate text-xs text-white/50">{item.artist}</p>
    </div>

    <button
      onClick={() => acceptRequest(item)}
      className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ${
        item.type === "paid"
          ? "bg-white text-black hover:opacity-95"
          : "border border-white/10 text-white hover:bg-white/[0.05]"
      }`}
    >
      {item.type === "paid" ? t.acceptCharge : t.accept}
    </button>
  </div>
</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full rounded-b-[2rem] bg-[#c9c9cf] shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            <div className="h-4 w-full rounded-b-[2rem] bg-[#c9c9cf]" />
          </div>

          <div className="mx-auto mt-2 h-2 w-44 rounded-full bg-black/10" />
        </div>

        <div className="flex justify-center xl:justify-start">
          <PhonePreview
            t={t}
            onAddFree={addMobileFree}
            onAddPaid={addMobilePaid}
            sentType={sentType}
          />
        </div>
      </div>
    </div>
  );
}