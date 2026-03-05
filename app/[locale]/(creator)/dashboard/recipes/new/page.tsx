import RecipeWizard from "@/components/creator/recipe-form/RecipeWizard";

export const metadata = {
  title: "Nouvelle recette — Akeli Créateur",
};

export default function NewRecipePage() {
  return (
    <main className="py-6 px-4 sm:px-6">
      <RecipeWizard />
    </main>
  );
}
