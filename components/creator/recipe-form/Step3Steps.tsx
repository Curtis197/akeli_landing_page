"use client";

import { useState, useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SectionHeaderRow } from "@/components/creator/recipe/SectionHeaderRow";
import type { RecipeFormState } from "./RecipeWizard";

type Step = RecipeFormState["steps"][number];

interface Step3Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
}

type AddMode = "step" | "section";

export default function Step3Steps({ data, onChange }: Step3Props) {
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("step");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftSectionTitle, setDraftSectionTitle] = useState("");
  const dndId = useId();

  const steps = data.steps;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateSteps = (next: Step[]) => {
    onChange({ steps: next.map((s, i) => ({ ...s, sort_order: i })) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      updateSteps(arrayMove(steps, oldIndex, newIndex));
    }
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === steps.length - 1) return;
    updateSteps(arrayMove(steps, index, direction === "up" ? index - 1 : index + 1));
  };

  const removeStep = (id: string) => {
    updateSteps(steps.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, patch: Partial<Step>) => {
    updateSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } as Step : s)));
  };

  const updateSectionTitle = (id: string, title: string) => {
    updateSteps(steps.map((s) => s.id === id ? { ...s, title } : s));
  };

  const handleAdd = () => {
    if (addMode === "section") {
      if (!draftSectionTitle.trim()) return;
      updateSteps([
        ...steps,
        {
          id: crypto.randomUUID(),
          type: "section_header" as const,
          title: draftSectionTitle.trim(),
          sort_order: steps.length,
          is_section_header: true as const,
        },
      ]);
      setDraftSectionTitle("");
    } else {
      if (draftContent.trim().length < 5) return;
      updateSteps([
        ...steps,
        {
          id: crypto.randomUUID(),
          type: "step" as const,
          title: draftTitle.trim() || undefined,
          content: draftContent.trim(),
          sort_order: steps.length,
          is_section_header: false as const,
        },
      ]);
      setDraftTitle("");
      setDraftContent("");
    }
    setAdding(false);
  };

  // Only count real steps (not section headers)
  const realStepCount = steps.filter((s) => !s.is_section_header).length;
  const tooFew = realStepCount < 2;

  // Sequential step number (ignoring section headers)
  let stepCounter = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Étapes de préparation</h2>
        <span className={`text-xs ${tooFew ? "text-destructive" : "text-muted-foreground"}`}>
          {realStepCount} / minimum 2
        </span>
      </div>

      {/* Desktop DnD list */}
      {steps.length > 0 && (
        <>
          <div className="hidden sm:block">
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-3">
                  {steps.map((step) => {
                    if (!step.is_section_header) stepCounter++;
                    return (
                      <SortableStepRow
                        key={step.id}
                        step={step}
                        stepNumber={stepCounter}
                        onRemove={removeStep}
                        onUpdate={updateStep}
                        onTitleChange={updateSectionTitle}
                      />
                    );
                  })}
                </ol>
              </SortableContext>
            </DndContext>
          </div>

          {/* Mobile list */}
          <ol className="sm:hidden space-y-3">
            {(() => {
              let mobileCounter = 0;
              return steps.map((step, index) => {
                if (!step.is_section_header) mobileCounter++;
                return (
                  <li key={step.id} className={`rounded-xl border p-3 space-y-2 ${
                    step.is_section_header
                      ? "bg-primary/5 border-primary/20"
                      : "bg-secondary/30 border-border"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button type="button" onClick={() => moveStep(index, "up")} disabled={index === 0}
                          className="p-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                        <button type="button" onClick={() => moveStep(index, "down")} disabled={index === steps.length - 1}
                          className="p-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                      </div>
                      {step.is_section_header ? (
                        <span className="text-primary/50 text-xs select-none">▸</span>
                      ) : (
                        <span className="text-sm font-bold text-primary min-w-[24px]">{mobileCounter}.</span>
                      )}
                      <button type="button" onClick={() => removeStep(step.id)}
                        className="ml-auto p-1 text-muted-foreground hover:text-destructive transition-colors">✕</button>
                    </div>
                    {step.is_section_header ? (
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateSectionTitle(step.id, e.target.value)}
                        className="w-full bg-transparent border-b border-dashed border-primary/30 text-sm font-semibold text-foreground focus:outline-none focus:border-primary py-0.5"
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Titre de l'étape (optionnel)"
                          value={(step as any).title ?? ""}
                          onChange={(e) => updateStep(step.id, { title: e.target.value || undefined } as any)}
                          className="w-full px-2 py-1.5 text-sm font-medium bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <textarea
                          value={(step as any).content}
                          onChange={(e) => updateStep(step.id, { content: e.target.value } as any)}
                          rows={3}
                          className="w-full px-2 py-1 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </>
                    )}
                  </li>
                );
              });
            })()}
          </ol>
        </>
      )}

      {/* Add form */}
      {adding ? (
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {addMode === "section" ? "Titre de section" : `Étape ${realStepCount + 1}`}
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={addMode === "section"}
                onChange={(e) => setAddMode(e.target.checked ? "section" : "step")}
                className="rounded border-input accent-primary" />
              <span className="text-xs text-muted-foreground">Section</span>
            </label>
          </div>

          {addMode === "section" ? (
            <input
              type="text"
              placeholder="Titre de la section (ex: Préparation)"
              value={draftSectionTitle}
              onChange={(e) => setDraftSectionTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Titre de l'étape (optionnel)"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={4}
                placeholder="Décris cette étape de préparation (minimum 5 caractères)..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              {draftContent.length > 0 && draftContent.length < 5 && (
                <p className="text-xs text-destructive">Minimum 5 caractères ({draftContent.length}/5)</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={handleAdd}
              disabled={addMode === "section" ? !draftSectionTitle.trim() : draftContent.trim().length < 5}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
              Ajouter
            </button>
            <button type="button" onClick={() => { setAdding(false); setDraftTitle(""); setDraftContent(""); setDraftSectionTitle(""); }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          + Ajouter une étape
        </button>
      )}

      {tooFew && realStepCount > 0 && (
        <p className="text-xs text-destructive">Minimum 2 étapes requises ({realStepCount}/2)</p>
      )}
    </div>
  );
}

// ─── Sortable row (desktop) ────────────────────────────────────────────────────

function SortableStepRow({
  step,
  stepNumber,
  onRemove,
  onUpdate,
  onTitleChange,
}: {
  step: Step;
  stepNumber: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Step>) => void;
  onTitleChange: (id: string, title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (step.is_section_header) {
    return (
      <li ref={setNodeRef} style={style}>
        <SectionHeaderRow
          value={step.title}
          onChange={(val) => onTitleChange(step.id, val)}
          onRemove={() => onRemove(step.id)}
          placeholder="Titre de section (ex: Préparation)"
          dragHandle={
            <button type="button" {...attributes} {...listeners}
              className="cursor-grab active:cursor-grabbing text-primary/40 hover:text-primary p-1" aria-label="Réordonner">
              ⠿
            </button>
          }
        />
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style}
      className="flex items-start gap-3 p-3 rounded-xl border border-border bg-secondary/30">
      <button type="button" {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 mt-1" aria-label="Réordonner">
        ⠿
      </button>
      <span className="text-sm font-bold text-primary min-w-[24px] mt-2">{stepNumber}.</span>
      <div className="flex-1 space-y-2">
        <input
          type="text"
          placeholder="Titre de l'étape (optionnel)"
          value={(step as any).title ?? ""}
          onChange={(e) => onUpdate(step.id, { title: e.target.value || undefined } as any)}
          className="w-full px-2 py-1.5 text-sm font-medium bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={(step as any).content}
          onChange={(e) => onUpdate(step.id, { content: e.target.value } as any)}
          rows={3}
          className="w-full px-2 py-1 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <button type="button" onClick={() => onRemove(step.id)}
        className="p-1 mt-1 text-muted-foreground hover:text-destructive transition-colors">✕</button>
    </li>
  );
}
