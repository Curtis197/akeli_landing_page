// app/[locale]/(creator)/dashboard/posts/new/page.tsx
import PostWizard from "@/components/creator/post-form/PostWizard";

export const metadata = {
  title: "Nouvel article — Akeli Créateur",
};

export default function NewPostPage() {
  return (
    <main className="py-6 px-4 sm:px-6">
      <PostWizard />
    </main>
  );
}
