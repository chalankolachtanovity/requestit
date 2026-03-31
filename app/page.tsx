"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProductShowcase from "@/components/marketing/ProductShowcase";

type Language = "sk" | "en";

const songWall = [
  { title: "Ready To Fly", artist: "Sub Focus, Dimension", cover: "/songs/fly.jpg" },
  { title: "Desire", artist: "Sub Focus, Dimension", cover: "/songs/desire.jpg" },
  { title: "On The Floor", artist: "Jennifer Lopez, Pitbull", cover: "/songs/floor.jpg" },
  { title: "Wake Me Up", artist: "Avicii", cover: "/songs/wake.jpg" },
  { title: "Hips Don't Lie", artist: "Shakira, Wyclef Jean", cover: "/songs/hips.jpg" },
  { title: "More Than You Know", artist: "Axwell /\\ Ingrosso", cover: "/songs/more.jpg" },
  { title: "I Gotta Feeling", artist: "Black Eyed Peas", cover: "/songs/feeling.jpg" },
  { title: "Don't You Worry Child - Radio Edit", artist: "Swedish House Mafia, John Martin", cover: "/songs/child.jpg" },
  { title: "Feel So Close - Radio Edit", artist: "Calvin Harris", cover: "/songs/close.jpg" },
  { title: "No Money", artist: "Galantis", cover: "/songs/money.jpg" },
  { title: "Summer", artist: "Calvin Harris", cover: "/songs/summer.jpg" },
  { title: "Youngblood", artist: "5 Seconds of Summer", cover: "/songs/young.jpg" },
  { title: "Can't Hold Us", artist: "Macklemore & Ryan Lewis", cover: "/songs/hold.jpg" },
];

const content = {
  sk: {
    login: "Login",
    signup: "Sign up",
    cta: "Začať zdarma",
    secondary: "Prihlásiť sa",
    badge: "Pre DJ-ov a eventy",
    title: "Live song requesty pre DJ-ov.",
    description: "QR pre hostí. Jedna queue. Vyberaj si to, čo chceš hrať.",
    songsLabel: "Databáza skladieb",
    songsTitle: "100 000+ skladieb pripravených na vyhľadávanie",
    songsDescription: "Rýchle vyhľadávanie skladieb pre live eventy.",
    songsBadge: "Vyhľadávanie v štýle Spotify",
    songsSearch: "Nájsť",
    paymentsLabel: "Platby",
    paymentsTitle: "Rýchle a bezpečné platby",
    paymentsDescription: "Prijímaj requesty s okamžitou platbou.",
    stripeTitle: "",
    stripeSubtitle: "Zabezpečené cez Stripe",
    applePay: "Apple Pay",
    googlePay: "Google Pay",
    howLabel: "Ako to funguje",
    howTitle: "Všetko len v 3 jednoduchých krokoch",
    howStep1Title: "Vytvor svoj event",
    howStep1Text: "Spusti session a zdieľaj QR kód pre hostí.",
    howStep2Title: "Počkaj na requesty od hostí",
    howStep2Text: "Naskenujú QR, vyhľadajú skladbu a pošlú request za pár sekúnd.",
    howStep3Title: "Ovládaj queue",
    howStep3Text: "Schvaľuj requesty, rieš priority a zarábaj.",
    footerRights: "Všetky práva vyhradené.",
    footerContact: "Kontakt",
  },
  en: {
    login: "Login",
    signup: "Sign up",
    cta: "Start free",
    secondary: "Log in",
    badge: "For DJs and events",
    title: "Live song requests for DJs.",
    description: "Guest QR. One queue. Full control.",
    songsLabel: "Song database",
    songsTitle: "100,000+ songs ready to search",
    songsDescription: "Fast track search built for live events.",
    songsBadge: "Spotify-style search",
    songsSearch: "Search",
    paymentsLabel: "Payments",
    paymentsTitle: "Fast and secure payments",
    paymentsDescription: "Accept song requests with instant checkout.",
    stripeTitle: "",
    stripeSubtitle: "Secured with Stripe",
    applePay: "Apple Pay",
    googlePay: "Google Pay",
    howLabel: "How it works",
    howTitle: "Start in 3 simple steps",
    howStep1Title: "Create your event",
    howStep1Text: "Start a session and get a QR code for your guests.",
    howStep2Title: "Guests send requests",
    howStep2Text: "They scan, search, and request songs in seconds.",
    howStep3Title: "Control the queue",
    howStep3Text: "Accept requests, manage priority, and keep the flow going.",
    footerRights: "All rights reserved.",
    footerContact: "Contact",
  },
} satisfies Record<Language, Record<string, string>>;

function AmbientGlow({ className }: { className: string }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{
        background:
          "conic-gradient(from 120deg at 50% 50%, rgba(102,231,255,0.22), rgba(168,85,247,0.20), rgba(244,114,182,0.16), rgba(253,224,71,0.14), rgba(102,231,255,0.22))",
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
    <div className="inline-flex items-center rounded-full border border-black/10 bg-white/75 p-1 shadow-sm backdrop-blur">
      <button
        onClick={() => setLanguage("sk")}
        className={`min-h-[38px] rounded-full px-3 py-1.5 text-sm transition ${
          language === "sk"
            ? "bg-[#111111] text-white"
            : "text-black/60 hover:bg-black/[0.05]"
        }`}
      >
        SK
      </button>
      <button
        onClick={() => setLanguage("en")}
        className={`min-h-[38px] rounded-full px-3 py-1.5 text-sm transition ${
          language === "en"
            ? "bg-[#111111] text-white"
            : "text-black/60 hover:bg-black/[0.05]"
        }`}
      >
        EN
      </button>
    </div>
  );
}

function Metric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-lg font-semibold leading-none text-[#111111]">{value}</p>
      <p className="mt-1 text-xs text-black/55">{label}</p>
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
  const reveal = Math.min(scrollY / 900, 1);

  return (
    <main className="relative overflow-x-clip bg-[#f6f6f3] text-[#111111]">
      <div className="absolute inset-0 overflow-hidden">
        <AmbientGlow className="-left-24 top-0 h-72 w-72 opacity-75 sm:h-96 sm:w-96" />
        <AmbientGlow className="-right-16 top-16 h-80 w-80 opacity-70 sm:h-[28rem] sm:w-[28rem]" />
        <AmbientGlow className="left-1/3 top-[38rem] h-80 w-80 opacity-60 sm:top-[34rem] sm:h-[32rem] sm:w-[32rem]" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden sm:h-11 sm:w-11">
                <Image
                  src="/logo.png"
                  alt="Sound Queue logo"
                  fill
                  sizes="(max-width: 640px) 36px, 44px"
                  className="object-cover"
                  priority
                />
              </div>

              <Image
                src="/logo_text.png"
                alt="Sound Queue"
                width={260}
                height={84}
                sizes="(max-width: 640px) 128px, (max-width: 768px) 180px, 260px"
                className="h-8 w-auto sm:h-14 md:h-16"
                priority
              />
            </div>

            <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-end">
              <LanguageSwitch language={language} setLanguage={setLanguage} />

              <Link
                href="/login"
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-black/10 bg-white/85 px-4 py-2 text-sm text-black/75 shadow-sm backdrop-blur transition hover:bg-white"
              >
                {t.login}
              </Link>

              <Link
                href="/signup"
                className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t.signup}
              </Link>
            </div>
          </header>
        </div>

        <section className="px-4 pb-10 pt-8 sm:px-6 sm:pt-10 md:pt-12">
          <div className="mx-auto max-w-7xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs text-black/60 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#66e7ff]" />
              <span>{t.badge}</span>
            </div>

            <h1 className="mx-auto max-w-3xl text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
              {t.title}
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm text-black/60 sm:text-base">
              {t.description}
            </p>

            <div className="mt-6">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#111111] px-7 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Get started
              </Link>
            </div>

            <div className="mt-8 sm:mt-10">
              <div className="mt-8 flex justify-center sm:mt-10">
                <ProductShowcase language={language} reveal={1} />
              </div>
            </div>
          </div>
        </section>

        <section className="px-3 pb-12 pt-8 sm:px-6 sm:pb-24 sm:pt-14">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.22em] text-black/35 sm:text-[11px]">
                {t.songsLabel}
              </p>

              <h2 className="mx-auto mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-[#111111] sm:mt-3 sm:text-4xl md:text-5xl">
                {t.songsTitle}
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-xs leading-5 text-black/55 sm:mt-4 sm:text-base sm:leading-6">
                {t.songsDescription}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs text-black/65 shadow-sm backdrop-blur sm:mt-5 sm:px-4 sm:py-2 sm:text-sm">
                <svg
                  viewBox="0 0 168 168"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle cx="84" cy="84" r="84" fill="#1ED760" />
                  <path
                    d="M119.6 117.3a5.2 5.2 0 0 1-7.1 1.7c-19.4-11.8-43.8-14.5-72.3-8a5.2 5.2 0 0 1-2.3-10.2c31.2-7.1 58.4-4 80 9.1a5.2 5.2 0 0 1 1.7 7.4Z"
                    fill="#111111"
                  />
                  <path
                    d="M129.8 94.3a6.4 6.4 0 0 1-8.8 2.1c-22.2-13.6-56.1-17.5-82.4-9.6a6.4 6.4 0 1 1-3.7-12.3c30.3-9.1 68-4.6 92.8 10.6a6.4 6.4 0 0 1 2.1 9.2Z"
                    fill="#111111"
                  />
                  <path
                    d="M130.7 70.4c-26.5-15.8-70.2-17.3-95.5-9.6a7.7 7.7 0 1 1-4.4-14.8c29-8.7 77.2-7 107.8 11.2a7.7 7.7 0 1 1-7.9 13.2Z"
                    fill="#111111"
                  />
                </svg>
                <span>{t.songsBadge}</span>
              </div>
            </div>

            <div className="relative mt-8 sm:mt-10">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-24 bg-[linear-gradient(180deg,#f6f6f3,rgba(246,246,243,0))] sm:block" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-24 bg-[linear-gradient(0deg,#f6f6f3,rgba(246,246,243,0))] sm:block" />

              <div className="mb-2 flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.14em] text-black/35 sm:hidden">
                <span>potiahni</span>
                <span className="text-xs">→</span>
              </div>

              <div className="relative sm:hidden">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#f6f6f3] to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#f6f6f3] to-transparent" />

                <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {songWall.map((song, index) => (
                    <div
                      key={`${song.title}-${index}`}
                      className="min-w-[84%] snap-start rounded-2xl border border-black/10 bg-white/85 p-2.5 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-black/5">
                          <Image
                            src={song.cover}
                            alt={song.title}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#111111]">
                            {song.title}
                          </p>
                          <p className="truncate text-[11px] text-black/50">
                            {song.artist}
                          </p>
                        </div>

                        <div className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] text-black/45">
                          {t.songsSearch}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div
                    aria-hidden="true"
                    className="min-w-[24%] snap-start rounded-2xl border border-dashed border-black/10 bg-white/40"
                  />
                </div>
              </div>

              <div className="hidden grid-cols-2 gap-2 sm:grid sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {songWall.map((song, index) => (
                  <div
                    key={`${song.title}-${index}`}
                    className={`group rounded-2xl border border-black/10 bg-white/75 p-2.5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white sm:rounded-[1.5rem] sm:p-3 ${
                      index % 5 === 0 ? "lg:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-black/5 sm:h-16 sm:w-16 sm:rounded-xl">
                        <Image
                          src={song.cover}
                          alt={song.title}
                          fill
                          sizes="(max-width: 640px) 44px, 64px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#111111] sm:text-base">
                          {song.title}
                        </p>
                        <p className="truncate text-[11px] text-black/50 sm:text-sm">
                          {song.artist}
                        </p>
                      </div>

                      <div className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] text-black/45 sm:px-3 sm:py-1 sm:text-[11px]">
                        {t.songsSearch}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/35">
              {t.paymentsLabel}
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">
              {t.paymentsTitle}
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-black/55 sm:text-base">
              {t.paymentsDescription}
            </p>

            <div className="mt-10 flex flex-wrap items-stretch justify-center gap-5">
              <div className="w-full max-w-[260px] rounded-[28px] border border-black/10 bg-white/90 px-6 py-7 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col items-center text-center">
                  <img
                    src="/payments/stripe.png"
                    alt="Stripe"
                    className="mb-5 h-12 w-auto object-contain"
                  />
                  <p className="text-base font-semibold text-[#111111]">{t.stripeTitle}</p>
                  <p className="mt-1 text-sm text-black/50">{t.stripeSubtitle}</p>
                </div>
              </div>

              <div className="w-full max-w-[260px] rounded-[28px] border border-black/10 bg-white/90 px-6 py-7 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col items-center text-center">
                  <img
                    src="/payments/apple.jpg"
                    alt="Apple Pay"
                    className="mb-5 h-12 w-auto object-contain"
                  />
                  <p className="text-base font-semibold text-[#111111]">{t.applePay}</p>
                </div>
              </div>

              <div className="w-full max-w-[260px] rounded-[28px] border border-black/10 bg-white/90 px-6 py-7 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col items-center text-center">
                  <img
                    src="/payments/google.png"
                    alt="Google Pay"
                    className="mb-5 h-12 w-auto object-contain"
                  />
                  <p className="text-base font-semibold text-[#111111]">{t.googlePay}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/35">
              {t.howLabel}
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">
              {t.howTitle}
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-black/10 bg-white/90 p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white">
                  1
                </div>
                <p className="text-lg font-semibold text-[#111111]">{t.howStep1Title}</p>
                <p className="mt-2 text-sm leading-6 text-black/55">{t.howStep1Text}</p>
              </div>

              <div className="rounded-[28px] border border-black/10 bg-white/90 p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white">
                  2
                </div>
                <p className="text-lg font-semibold text-[#111111]">{t.howStep2Title}</p>
                <p className="mt-2 text-sm leading-6 text-black/55">{t.howStep2Text}</p>
              </div>

              <div className="rounded-[28px] border border-black/10 bg-white/90 p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white">
                  3
                </div>
                <p className="text-lg font-semibold text-[#111111]">{t.howStep3Title}</p>
                <p className="mt-2 text-sm leading-6 text-black/55">{t.howStep3Text}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="px-4 pb-10 pt-12 sm:px-6">
          <div className="mx-auto max-w-6xl border-t border-black/10 pt-6">
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <p className="text-sm text-black/50">
                © {new Date().getFullYear()} soundq. {t.footerRights}
              </p>

              <div className="flex items-center gap-5 text-sm text-black/60">
                <a
                  href="mailto:samuelzatko07@gmail.com"
                  className="transition hover:text-black"
                >
                  {t.footerContact}
                </a>

                <a
                  href="https://instagram.com/sound.queue/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-black"
                >
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}