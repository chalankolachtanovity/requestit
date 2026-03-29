"use client";

import { useState } from "react";

export default function SessionRequestControls({
  sessionId,
  initialPaused,
  isActive,
  onChanged,
}: {
  sessionId: string;
  initialPaused: boolean;
  isActive: boolean;
  onChanged?: (paused: boolean) => void;
}) {
  const [paused, setPaused] = useState(initialPaused);
  const [loading, setLoading] = useState(false);

  const updatePaused = async (nextPaused: boolean) => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/sessions/${sessionId}/requests-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paused: nextPaused,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Nepodarilo sa zmeniť stav requestov.");
        return;
      }

      setPaused(nextPaused);
      onChanged?.(nextPaused);
    } catch (error) {
      console.error("SESSION REQUEST CONTROLS ERROR:", error);
      alert("Nepodarilo sa zmeniť stav requestov.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div
        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
          !isActive
            ? "border border-white/10 bg-white/[0.04] text-white/55"
            : paused
            ? "border border-red-400/20 bg-red-500/10 text-red-300"
            : "border border-green-400/20 bg-green-500/10 text-green-300"
        }`}
      >
        {!isActive
          ? "Session ended"
          : paused
          ? "Requests paused"
          : "Requests live"}
      </div>

      <button
        onClick={() => updatePaused(true)}
        disabled={loading || paused || !isActive}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/[0.05] disabled:opacity-50"
      >
        <span>⏸</span>
        <span>Stop</span>
      </button>

      <button
        onClick={() => updatePaused(false)}
        disabled={loading || !paused || !isActive}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        <span>▶</span>
        <span>Resume</span>
      </button>
    </div>
  );
}
