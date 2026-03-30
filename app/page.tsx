"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProductShowcase from "@/components/marketing/ProductShowcase";

type Language = "sk" | "en";

const content = {
  sk: {
    login: "Login",
    signup: "Sign up",
    cta: "Začať",
    secondary: "Prihlásiť sa",
    badge: "Live song requesty pre DJ-ov a eventy",
    title: "Requesty na pesničky pre DJ-ov. Bez chaosu.",
    description:
      "Vytvor session, zdieľaj QR kód a prijímaj requesty aj platené priority v jednom prehľadnom dashboarde.",
    pill1: "QR access",
    pill2: "Priority requests",
    pill3: "Live queue control",
    explainTitle: "Ako to funguje",
    explain1Title: "Vytvor session",
    explain1Text: "Spustíš event a dostaneš vlastný link alebo QR kód pre hostí.",
    explain2Title: "Hostia pošlú request",
    explain2Text: "Na mobile si nájdu pesničku alebo pridajú vlastnú.",
    explain3Title: "Ty riadiš queue",
    explain3Text: "Requesty prijímaš, presúvaš do poradia a priority ti zvyšujú credits.",
    previewTitle: "RequestIt in action",
    brand: "Hudobné requesty jednoducho",
    bottomLine: "One simple flow for guests. One clean dashboard for DJs.",
  },
  en: {
    login: "Login",
    signup: "Sign up",
    cta: "Get started",
    secondary: "Log in",
    badge: "Live song requests for DJs and events",
    title: "Song requests for DJs. Without the chaos.",
    description:
      "Create a session, share a QR code, and manage normal requests plus paid priority in one clean dashboard.",
    pill1: "QR access",
    pill2: "Priority requests",
    pill3: "Live queue control",
    explainTitle: "How it works",
    explain1Title: "Create a session",
    explain1Text: "Start an event and get a unique link or QR code for guests.",
    explain2Title: "Guests send requests",
    explain2Text: "They search for a song on mobile or add their own.",
    explain3Title: "You control the queue",
    explain3Text: "Accept requests, move them into the queue, and earn from priority.",
    previewTitle: "RequestIt in action",
    brand: "Song requests made simple",
    bottomLine: "One simple flow for guests. One clean dashboard for DJs.",
  },
} satisfies Record<Language, Record<string, string>>;

function GradientOrb({ className }: { className: string }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(87,232,255,0.22), rgba(168,85,247,0.18), rgba(244,114,182,0.18), rgba(253,224,71,0.14))",
      }}
    />
  );
}

function LanguageSwitch({
  language,
  setLanguage,
}: {
  language: Language;
  setLanguage: (lang: Language) => void;
}) {
  return (
    <div className="flex items-center rounded-full border border-black/10 bg-white/70 p-1 shadow-sm backdrop-blur">
      <button
        onClick={() => setLanguage("sk")}
        className={`min-h-[40px] rounded-full px-3 py-1.5 text-sm transition ${
          language === "sk"
            ? "bg-[#111111] text-white"
            : "text-black/60 hover:bg-black/[0.04]"
        }`}
      >
        SK
      </button>

      <button
        onClick={() => setLanguage("en")}
        className={`min-h-[40px] rounded-full px-3 py-1.5 text-sm transition ${
          language === "en"
            ? "bg-[#111111] text-white"
            : "text-black/60 hover:bg-black/[0.04]"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("sk");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const t = useMemo(() => content[language], [language]);
  const reveal = Math.min(scrollY / 1000, 1);

  return (
    <main className="relative overflow-x-clip bg-[#f7f7f5] text-[#121212]">
      <div className="absolute inset-0 overflow-hidden">
        <GradientOrb className="-left-28 top-8 h-64 w-64 opacity-70 sm:-left-20 sm:top-10 sm:h-72 sm:w-72 sm:opacity-80" />
        <GradientOrb className="-right-12 top-0 h-72 w-72 opacity-60 sm:right-0 sm:h-80 sm:w-80 sm:opacity-70" />
        <GradientOrb className="left-1/3 top-[560px] h-80 w-80 opacity-50 sm:top-[540px] sm:h-96 sm:w-96 sm:opacity-60" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm sm:h-11 sm:w-11">
                <Image
                  src="/logo.png"
                  alt="RequestIt logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight sm:text-lg">RequestIt</p>
                <p className="truncate text-xs text-black/45">{t.brand}</p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
              <LanguageSwitch language={language} setLanguage={setLanguage} />

              <Link
                href="/login"
                className="min-h-[42px] rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm text-black/75 shadow-sm backdrop-blur transition hover:bg-white"
              >
                {t.login}
              </Link>

              <Link
                href="/signup"
                className="min-h-[42px] rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t.signup}
              </Link>
            </div>
          </header>
        </div>

        <section className="px-4 pb-12 pt-8 sm:px-6 sm:pb-14 sm:pt-10 md:pt-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-start gap-10 sm:gap-12 md:gap-14 md:grid-cols-[1.05fr_0.95fr]">
              <div>
                <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1.5 text-[11px] leading-5 text-black/60 shadow-sm backdrop-blur sm:text-xs">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[#66e7ff]" />
                  <span className="truncate sm:whitespace-normal">{t.badge}</span>
                </div>

                <h1 className="max-w-3xl text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl md:text-6xl">
                  {t.title}
                </h1>

                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-black/62 sm:mt-6 sm:text-base md:text-lg">
                  {t.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
                  <span className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs text-black/70 shadow-sm sm:px-4 sm:text-sm">
                    {t.pill1}
                  </span>
                  <span className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs text-black/70 shadow-sm sm:px-4 sm:text-sm">
                    {t.pill2}
                  </span>
                  <span className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs text-black/70 shadow-sm sm:px-4 sm:text-sm">
                    {t.pill3}
                  </span>
                </div>

                <div className="mt-7 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#111111] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    {t.cta}
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm text-black/75 shadow-sm transition hover:bg-white"
                  >
                    {t.secondary}
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="relative overflow-hidden rounded-[1.6rem] border border-black/10 bg-white/75 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_35%)]" />

                  <div className="relative">
                    <div className="mb-5 flex items-center gap-3 sm:mb-6 sm:gap-4">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-black/8 bg-white sm:h-14 sm:w-14">
                        <Image
                          src="/logo.png"
                          alt="RequestIt logo"
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/35 sm:text-xs">
                          RequestIt
                        </p>
                        <p className="mt-1 truncate text-lg font-semibold sm:text-xl">
                          {t.explainTitle}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-3xl border border-black/8 bg-white/80 p-4 shadow-sm">
                        <p className="text-sm font-semibold">{t.explain1Title}</p>
                        <p className="mt-1 text-sm leading-6 text-black/55">
                          {t.explain1Text}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-black/8 bg-white/80 p-4 shadow-sm">
                        <p className="text-sm font-semibold">{t.explain2Title}</p>
                        <p className="mt-1 text-sm leading-6 text-black/55">
                          {t.explain2Text}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-black/8 bg-white/80 p-4 shadow-sm">
                        <p className="text-sm font-semibold">{t.explain3Title}</p>
                        <p className="mt-1 text-sm leading-6 text-black/55">
                          {t.explain3Text}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-black/8 bg-[linear-gradient(135deg,rgba(102,231,255,0.12),rgba(168,85,247,0.10),rgba(244,114,182,0.10),rgba(253,224,71,0.10))] px-4 py-4 text-sm leading-6 text-black/60 sm:mt-6">
                      {t.bottomLine}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="relative z-20 px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-10"
          style={{
            opacity: 0.82 + reveal * 0.18,
            transition: "opacity 300ms ease",
          }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 text-center sm:mb-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/35 sm:text-xs">
                {t.previewTitle}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl md:text-5xl">
                Live dashboard + guest mobile flow
              </h2>
            </div>

            <div className="rounded-[1.8rem] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.55))] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.10)] backdrop-blur-xl sm:rounded-[2.5rem] sm:p-4 md:p-6">
              <ProductShowcase language={language} reveal={reveal} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}