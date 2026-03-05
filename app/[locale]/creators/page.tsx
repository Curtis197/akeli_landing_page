"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorCard {
  id: string;
  name: string | null;
  bio: string | null;
  profil_url: string | null;
  heritage_region: string | null;
  specialties: string[];
  recipe_count: number;
  fan_mode: boolean;
}

const FAN_MODE_THRESHOLD = 30;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorsPage() {
  const supabase = createClient();

  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  useEffect(() => {
    supabase
      .from("creator")
      .select("id, name, bio, profil_url, heritage_region, specialties, recipe_count")
      .gt("recipe_count", 0)
      .order("recipe_count", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setCreators(
            data.map((c) => ({
              ...c,
              recipe_count: c.recipe_count ?? 0,
              specialties: c.specialties ?? [],
              fan_mode: (c.recipe_count ?? 0) >= FAN_MODE_THRESHOLD,
            }))
          );
        }
        setLoading(false);
      });
  }, [supabase]);

  // ── Derived filters ──────────────────────────────────────────────────────────

  const allRegions = Array.from(
    new Set(creators.map((c) => c.heritage_region).filter(Boolean) as string[])
  ).sort();

  const allSpecialties = Array.from(
    new Set(creators.flatMap((c) => c.specialties))
  ).sort();

  const displayed = creators.filter((c) => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (regionFilter && c.heritage_region !== regionFilter) return false;
    if (specialtyFilter && !c.specialties.includes(specialtyFilter)) return false;
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Créateurs Akeli</h1>
          <p className="text-muted-foreground">
            Découvrez les créateurs culinaires de la diaspora africaine.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Rechercher un créateur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Toutes les régions</option>
            {allRegions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Toutes les spécialités</option>
            {allSpecialties.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(search || regionFilter || specialtyFilter) && (
            <button
              onClick={() => { setSearch(""); setRegionFilter(""); setSpecialtyFilter(""); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center space-y-2">
            <p className="text-4xl">👨‍🍳</p>
            <p className="font-semibold text-foreground">Aucun créateur trouvé</p>
            <p className="text-sm text-muted-foreground">Essaie d'autres filtres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ─── CreatorCard ──────────────────────────────────────────────────────────────

function CreatorCard({ creator }: { creator: CreatorCard }) {
  const initials = (creator.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/creator/${creator.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all overflow-hidden"
    >
      {/* Cover band */}
      <div className="h-16 bg-gradient-to-br from-primary/20 to-primary/5 shrink-0" />

      {/* Content */}
      <div className="px-5 pb-5 -mt-8 flex flex-col gap-3">
        {/* Avatar */}
        <div className="flex items-end justify-between">
          {creator.profil_url ? (
            <img
              src={creator.profil_url}
              alt={creator.name ?? ""}
              className="w-16 h-16 rounded-full object-cover border-4 border-background shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-secondary border-4 border-background flex items-center justify-center text-lg font-bold text-muted-foreground shrink-0">
              {initials}
            </div>
          )}
          {creator.fan_mode && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
              ⭐ Mode Fan
            </span>
          )}
        </div>

        {/* Name & region */}
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {creator.name ?? "Créateur Akeli"}
          </p>
          {creator.heritage_region && (
            <p className="text-xs text-muted-foreground">{creator.heritage_region}</p>
          )}
        </div>

        {/* Bio */}
        {creator.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {creator.bio}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-1 border-t border-border mt-auto">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{creator.recipe_count}</strong> recette{creator.recipe_count !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-primary font-medium group-hover:underline">
            Voir le profil →
          </span>
        </div>
      </div>
    </Link>
  );
}
