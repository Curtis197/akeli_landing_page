// components/creator/recipe-form/Step3Steps.tsx
"use client";

import { useId } from "react";
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
import type { RecipeFormState } from "./RecipeWizard";
import StepCard from "./StepCard";
import SectionHeaderRow from "./SectionHeaderRow";

type StepItem = RecipeFormState["steps"][number];

interface Step3Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  draftId: string | null;
}

export default function Step3Steps({ data, onChange, draftId }: Step3Props) {
  const dndId = useId();
  const steps = data.steps;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateSteps = (next: StepItem[]) => {
    let stepNum = 0;
    onChange({
      steps: next.map((s, i) => {
        if (!s.is_section_header) stepNum++;
        return { ...s, sort_order: i, step_number: s.is_section_header ? 0 : stepNum };
      }),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    updateSteps(arrayMove(steps, oldIndex, newIndex));
  };

  const removeItem = (id: string) =>
    updateSteps(steps.filter((s) => s.id !== id));

  const moveStep = (index: number, dir: "up" | "down") => {
    const newIndex = dir === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    updateSteps(arrayMove(steps, index, newIndex));
  };

  const updateStep = (updated: StepItem) =>
    updateSteps(steps.map((s) => (s.id === updated.id ? updated : s)));

  const addStep = () => {
    const newStep: StepItem = {
      id: crypto.randomUUID(),
      step_number: steps.filter((s) => !s.is_section_header).length + 1,
      title: undefined,
      content: "",
      image_url: undefined,
      timer_seconds: undefined,
      sort_order: steps.length,
      is_section_header: false,
      ingredient_ids: [],
    };
    updateSteps([...steps, newStep]);
  };

  const addSection = () => {
    const section: StepItem = {
      id: crypto.randomUUID(),
      step_number: 0,
      title: "Nouvelle section",
      content: undefined,
      sort_order: steps.length,
      is_section_header: true,
      ingredient_ids: [],
    };
    updateSteps([...steps, section]);
  };

  const nonSectionCount = steps.filter((s) => !s.is_section_header).length;
  const draggableIds = steps.map((s) => s.id);
  let displayStepNum = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Étapes de préparation
        </h2>
        <span
          className={`text-xs ${nonSectionCount < 3 ? "text-destructive" : "text-muted-foreground"}`}
        >
          {nonSectionCount} / minimum 3
        </span>
      </div>

      {steps.length > 0 && (
        <>
          {/* Desktop DnD */}
          <div className="hidden sm:block">
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={draggableIds}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {steps.map((step) => {
                    if (step.is_section_header) {
                      return (
                        <SectionHeaderRow
                          key={step.id}
                          id={step.id}
                          title={step.title ?? ""}
                          onChange={(t) =>
                            updateStep({ ...step, title: t })
                          }
                          onRemove={() => removeItem(step.id)}
                        />
                      );
                    }
                    displayStepNum++;
                    return (
                      <SortableStepCard
                        key={step.id}
                        step={step}
                        stepNumber={displayStepNum}
                        availableIngredients={data.ingredients}
                        draftId={draftId}
                        onChange={updateStep}
                        onRemove={() => removeItem(step.id)}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          {/* Mobile list */}
          <ul className="sm:hidden space-y-2">
            {steps.map((step, index) => {
              if (step.is_section_header) {
                return (
                  <SectionHeaderRow
                    key={step.id}
                    id={step.id}
                    isMobile
                    title={step.title ?? ""}
                    onChange={(t) => updateStep({ ...step, title: t })}
                    onRemove={() => removeItem(step.id)}
                    onMoveUp={index > 0 ? () => moveStep(index, "up") : undefined}
                    onMoveDown={index < steps.length - 1 ? () => moveStep(index, "down") : undefined}
                  />
                );
              }
              const num = steps
                .slice(0, index + 1)
                .filter((s) => !s.is_section_header).length;
              return (
                <StepCard
                  key={step.id}
                  step={step}
                  stepNumber={num}
                  availableIngredients={data.ingredients}
                  draftId={draftId}
                  onChange={updateStep}
                  onRemove={() => removeItem(step.id)}
                  dragHandleProps={undefined}
                />
              );
            })}
          </ul>
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addStep}
          className="flex-1 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Ajouter une étape
        </button>
        <button
          type="button"
          onClick={addSection}
          className="py-3 px-4 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Section
        </button>
      </div>
    </div>
  );
}

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableStepCard(props: {
  step: RecipeFormState["steps"][number];
  stepNumber: number;
  availableIngredients: RecipeFormState["ingredients"];
  draftId: string | null;
  onChange: (s: RecipeFormState["steps"][number]) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.step.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <StepCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners } as any}
      />
    </div>
  );
}
