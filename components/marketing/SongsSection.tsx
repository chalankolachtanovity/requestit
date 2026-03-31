import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";

type Song = {
  title: string;
  artist: string;
  cover: string;
};

type Props = {
  t: {
    songsLabel: string;
    songsTitle: string;
    songsDescription: string;
    songsBadge: string;
    songsSearch: string;
  };
  songWall: Song[];
};

export default function SongsSection({ t, songWall }: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  // Duplikácia zoznamu pre ilúziu nekonečna
  const mobileSongs = useMemo(() => [...songWall, ...songWall], [songWall]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    let last = performance.now();
    const speed = 0.35; // px/ms (doladíš 0.25 - 0.5)

    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      if (!isPausedRef.current) {
        el.scrollLeft += dt * speed;

        // keď prejdeme prvú polovicu (originál set), skočíme späť bez viditeľného trhnutia
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
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
            <span>{t.songsBadge}</span>
          </div>
        </div>

        <div className="relative mt-8 sm:mt-10">
          {/* mobile hint */}
          <div className="mb-2 flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.14em] text-black/35 sm:hidden">
            <span>auto • potiahni</span>
            <span className="text-xs">→</span>
          </div>

          {/* MOBILE AUTO-INFINITE RAIL */}
          <div className="relative sm:hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#f6f6f3] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#f6f6f3] to-transparent" />

            <div
              ref={railRef}
              className="flex gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onTouchStart={() => {
                isPausedRef.current = true;
              }}
              onTouchEnd={() => {
                isPausedRef.current = false;
              }}
              onMouseEnter={() => {
                isPausedRef.current = true;
              }}
              onMouseLeave={() => {
                isPausedRef.current = false;
              }}
            >
              {mobileSongs.map((song, index) => (
                <div
                  key={`${song.title}-${song.artist}-${index}`}
                  className="min-w-[84%] rounded-2xl border border-black/10 bg-white/85 p-2.5 shadow-sm backdrop-blur"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-black/5">
                      <Image
                        src={song.cover}
                        alt={song.title}
                        fill
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
            </div>
          </div>

          {/* DESKTOP GRID */}
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
  );
}