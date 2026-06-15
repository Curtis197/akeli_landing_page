"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  username: string | null;
  heritage_region: string | null;
  specialties: string[];
  specialty_codes: string[];
  language_codes: string[];
  recipe_count: number;
  fan_count: number;
  total_revenue: number;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  website_url: string | null;
}

interface AuthState {
  user: User | null;
  creator: CreatorProfile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setCreator: (creator: CreatorProfile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  creator: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setCreator: (creator) => set({ creator }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, creator: null, isLoading: false }),
}));
