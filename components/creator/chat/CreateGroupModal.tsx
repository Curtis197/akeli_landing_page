"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/i18n/navigation";
import { createGroup } from "@/lib/queries/chat";

const schema = z.object({
  name: z.string().min(1).max(80),
  isPublic: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function CreateGroupModal({ open, onClose, currentUserId }: CreateGroupModalProps) {
  const t = useTranslations("chat");
  const supabase = createClient();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", isPublic: true },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const isPublic = watch("isPublic");

  async function onSubmit(data: FormData) {
    console.log("[CreateGroupModal] onSubmit called", data);
    setSubmitError(null);
    try {
      const newId = await createGroup(supabase, data.name, data.isPublic);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(("/chat/" + newId) as any);
      reset();
      onClose();
    } catch (err: any) {
      console.error("Failed to create group:", err);
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      setSubmitError(msg || t("groups.createError"));
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">{t("createGroup")}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Group name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("groups.groupName")}</label>
            <input
              {...register("name")}
              placeholder="Ex: Recettes du dimanche"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">{t("groups.visibility")}</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isPublic ? t("groups.public") : t("groups.private")}
              </span>
              <button
                type="button"
                onClick={() => setValue("isPublic", !isPublic)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isPublic ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isPublic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <p className="text-xs text-destructive text-center">{submitError}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {t("groups.create")}
          </button>
        </form>
      </div>
    </div>
  );
}
