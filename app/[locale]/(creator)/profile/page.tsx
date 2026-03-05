"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import imageCompression from "browser-image-compression";

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONS = [
  "Sénégal",
  "Côte d'Ivoire",
  "Cameroun",
  "Mali",
  "Bénin",
  "Togo",
  "Guinée",
  "Burkina Faso",
  "Niger",
  "Congo",
  "Madagascar",
  "Antilles",
  "La Réunion",
  "Maroc",
  "Algérie",
  "Tunisie",
];

const SPECIALTY_OPTIONS = [
  "Plats traditionnels",
  "Street food",
  "Desserts",
  "Végétarien",
  "Vegan",
  "Grillade",
  "Sauces",
  "Petit-déjeuner",
  "Boissons",
  "Snacks",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const supabase = createClient();
  const { creator, setCreator } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [heritageRegion, setHeritageRegion] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newSpecialty, setNewSpecialty] = useState("");

  // Populate form from store
  useEffect(() => {
    if (!creator) return;
    setName(creator.name ?? "");
    setBio(creator.bio ?? "");
    setHeritageRegion(creator.heritage_region ?? "");
    setSpecialties(creator.specialties ?? []);
    setAvatarUrl(creator.profil_url ?? null);
  }, [creator]);

  // ── Avatar ──────────────────────────────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
    } catch {
      setErrorMsg("Impossible de traiter l'image.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile || !creator) return null;
    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const path = `creators/${creator.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl + `?t=${Date.now()}`;
  }

  // ── Specialties ─────────────────────────────────────────────────────────────

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function addCustomSpecialty() {
    const trimmed = newSpecialty.trim();
    if (!trimmed || specialties.includes(trimmed)) return;
    setSpecialties((prev) => [...prev, trimmed]);
    setNewSpecialty("");
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!creator) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar();
      }
      const { data, error } = await supabase
        .from("creator")
        .update({
          name: name.trim() || null,
          bio: bio.trim() || null,
          heritage_region: heritageRegion || null,
          specialties,
          profil_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creator.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      if (data) {
        setCreator(data);
        setAvatarUrl(newAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
      setSuccessMsg("Profil mis à jour avec succès !");
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const displayAvatar = avatarPreview ?? avatarUrl;
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* ── Avatar ── */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Photo de profil</h2>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-muted-foreground border-2 border-border">
                  {initials}
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Changer la photo
              </button>
              <p className="text-xs text-muted-foreground">JPG, PNG — compressée à 512px max.</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </section>

        {/* ── Infos de base ── */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Informations générales</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="name">
              Nom complet
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton nom ou pseudo"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="bio">
              Biographie
            </label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              placeholder="Présente-toi en quelques lignes…"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length} / 500</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="region">
              Région d'origine
            </label>
            <select
              id="region"
              value={heritageRegion}
              onChange={(e) => setHeritageRegion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sélectionne ta région</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ── Spécialités ── */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Spécialités culinaires</h2>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((s) => {
              const selected = specialties.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addCustomSpecialty(); }
              }}
              placeholder="Ajouter une spécialité personnalisée…"
              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={addCustomSpecialty}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Ajouter
            </button>
          </div>

          {specialties.filter((s) => !SPECIALTY_OPTIONS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {specialties
                .filter((s) => !SPECIALTY_OPTIONS.includes(s))
                .map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => toggleSpecialty(s)}
                      className="opacity-70 hover:opacity-100"
                      aria-label={`Retirer ${s}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>
          )}
        </section>

        {/* ── Feedback & Submit ── */}
        {successMsg && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">{successMsg}</p>
        )}
        {errorMsg && (
          <p className="text-sm text-destructive font-medium">{errorMsg}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer le profil"}
          </button>
        </div>
      </form>
    </div>
  );
}
