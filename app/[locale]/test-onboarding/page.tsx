import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import TestOnboarding from "@/components/onboarding/TestOnboarding";

export const metadata: Metadata = {
  title: "Analyse Nutritionnelle & Bilan Métabolique",
  description: "Faites votre analyse gratuite sur Akeli pour calculer votre BMR, TDEE, macronutriments, et obtenir vos portions personnalisées de recettes.",
};

export default function TestOnboardingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen py-10" style={{ backgroundColor: "var(--color-brand-cream)" }}>
        <TestOnboarding />
      </main>
    </>
  );
}
