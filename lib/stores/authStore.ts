"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface CreatorProfile {
  id: string;
  auth_id: string;
  name: string | null;
  bio: string | null;
  profil_url: string | null;
  heritage_region: string | null;
  specialties: string[];
  stripe_onboarding_complete: boolean;
  payment_enabled: boolean;
  total_earnings: number;
  recipe_count: number;
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
