// components/creator/post-form/Step1Content.tsx
"use client";

import { useLocale } from "next-intl";
import BlockEditor from "./BlockEditor";
import type { PostBlock } from "@/lib/validations/post.schema";

interface Step1ContentData {
  title: string;
  language: "fr" | "en";
  blocks: PostBlock[];
}

interface Step1ContentProps {
  data: Step1ContentData;
  onChange: (patch: Partial<Step1ContentData>) => void;
  postId: string | null;
  creatorId: string;
}

export default function Step1Content({ data, onChange, postId, creatorId }: Step1ContentProps) {
  const siteLocale = useLocale();
  const language = data.language || (siteLocale === "en" ? "en" : "fr");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Contenu</h2>

      <div>
        <label className="text-sm font-medium text-foreground">
          Titre <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Ex : Pourquoi le Ndolé est une recette de fête"
          className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Langue</label>
        <select
          value={language}
          onChange={(e) => onChange({ language: e.target.value as "fr" | "en" })}
          className="mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Corps de l'article</label>
        <BlockEditor
          blocks={data.blocks}
          postId={postId}
          creatorId={creatorId}
          onChange={(blocks) => onChange({ blocks })}
        />
      </div>
    </div>
  );
}
