"use client";

import { useEffect, useState } from "react";

type ProfileResponse = {
  profile: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
};

export default function EditProfileForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile");
        const result: ProfileResponse | { error: string } = await response.json();

        if (!response.ok || !("profile" in result)) {
          setMessage("Nepodarilo sa načítať profil.");
          return;
        }

        setDisplayName(result.profile.displayName ?? "");
        setEmail(result.profile.email ?? "");
      } catch (error) {
        console.error("PROFILE FETCH ERROR:", error);
        setMessage("Nepodarilo sa načítať profil.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Nepodarilo sa uložiť profil.");
        return;
      }

      setMessage("Profil uložený.");
    } catch (error) {
      console.error("PROFILE SAVE ERROR:", error);
      setMessage("Nepodarilo sa uložiť profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white/60">
        Načítavam profil...
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            Email
          </label>
          <input
            type="text"
            value={email}
            disabled
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/45 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            DJ meno
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Zadaj svoje DJ meno"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {saving ? "Ukladám..." : "Uložiť"}
          </button>

          {message ? (
            <p className="text-sm text-white/60">{message}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}