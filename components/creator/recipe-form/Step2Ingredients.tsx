// components/creator/recipe-form/Step2Ingredients.tsx
"use client";

import { useState, useId, useEffect } from "react";
import { useLocale } from "next-intl";
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
import type { MeasurementUnit } from "@/lib/queries/measurement-units";
import type { IngredientResult, UnitConversion } from "@/lib/queries/ingredients";
import IngredientSearch from "./IngredientSearch";
import IngredientSubmitModal from "./IngredientSubmitModal";
import SectionHeaderRow from "./SectionHeaderRow";
import { getValidUnitsForIngredient, replaceIngredientInList } from "@/lib/utils/ingredient-edit";

type IngredientItem = RecipeFormState["ingredients"][number];

interface Step2Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  units: MeasurementUnit[];
  unitConversions: UnitConversion[];
}

const EMPTY_DRAFT = (): Omit<IngredientItem, "sort_order"> => ({
  id: crypto.randomUUID(),
  ingredient_id: "",
  name: "",
  quantity: 1,
  unit: "g",
  is_optional: false,
  is_section_header: false,
  calories_per_100g: null,
  protein_per_100g: null,
  carbs_per_100g: null,
  fat_per_100g: null,
  swappable_ingredients: [],
});

export default function Step2Ingredients({
  data,
  onChange,
  units,
  unitConversions,
}: Step2Props) {
  const locale = useLocale();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT());
  const [submitModalQuery, setSubmitModalQuery] = useState<string | null>(null);
  const [swappingForId, setSwappingForId] = useState<string | null>(null);
  const [isMetricUser, setIsMetricUser] = useState(true);
  const dndId = useId();

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMetricUser(!navigator.language.startsWith("en-US"));
    }
  }, []);

  const ingredients = data.ingredients;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateIngredients = (next: IngredientItem[]) => {
    onChange({ ingredients: next.map((ing, i) => ({ ...ing, sort_order: i })) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ingredients.findIndex((i) => i.id === active.id);
    const newIndex = ingredients.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    updateIngredients(arrayMove(ingredients, oldIndex, newIndex));
  };

  const moveItem = (index: number, dir: "up" | "down") => {
    const newIndex = dir === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= ingredients.length) return;
    updateIngredients(arrayMove(ingredients, index, newIndex));
  };

  const removeItem = (id: string) =>
    updateIngredients(ingredients.filter((i) => i.id !== id));

  const addSection = () => {
    const section: IngredientItem = {
      id: crypto.randomUUID(),
      ingredient_id: "",
      name: "",
      quantity: 0,
      unit: "",
      is_optional: false,
      sort_order: ingredients.length,
      is_section_header: true,
      title: "Nouvelle section",
      swappable_ingredients: [],
    };
    updateIngredients([...ingredients, section]);
  };

  const updateSectionTitle = (id: string, title: string) => {
    updateIngredients(
      ingredients.map((i) => (i.id === id ? { ...i, title } : i))
    );
  };

  const handleIngredientSelect = (ingredient: IngredientResult) => {
    const autoUnit = isMetricUser
      ? ingredient.default_metric_unit
      : ingredient.default_us_unit;

    const key = `name_${locale}` as keyof IngredientResult;
    const locName = (ingredient[key] as string) || ingredient.name_fr;

    setDraft((d) => ({
      ...d,
      ingredient_id: ingredient.id,
      name: locName,
      unit: autoUnit || "g",
      calories_per_100g: ingredient.calories_per_100g,
      protein_per_100g: ingredient.protein_per_100g,
      carbs_per_100g: ingredient.carbs_per_100g,
      fat_per_100g: ingredient.fat_per_100g,
    }));
  };

  const handleSave = () => {
    if (!draft.ingredient_id || !draft.quantity || !draft.unit) return;
    if (editingId) {
      updateIngredients(
        replaceIngredientInList(ingredients, editingId, { ...draft, sort_order: 0 })
      );
    } else {
      updateIngredients([
        ...ingredients,
        { ...draft, sort_order: ingredients.length },
      ]);
    }
    setDraft(EMPTY_DRAFT());
    setAdding(false);
    setEditingId(null);
  };

  const startEdit = (ingredient: IngredientItem) => {
    setAdding(false);
    setEditingId(ingredient.id);
    setDraft({
      id: ingredient.id,
      ingredient_id: ingredient.ingredient_id ?? "",
      name: ingredient.name ?? "",
      quantity: ingredient.quantity ?? 1,
      unit: ingredient.unit ?? "g",
      is_optional: ingredient.is_optional,
      is_section_header: false,
      calories_per_100g: ingredient.calories_per_100g ?? null,
      protein_per_100g: ingredient.protein_per_100g ?? null,
      carbs_per_100g: ingredient.carbs_per_100g ?? null,
      fat_per_100g: ingredient.fat_per_100g ?? null,
      swappable_ingredients: ingredient.swappable_ingredients ?? [],
    });
  };

  const nonSectionCount = ingredients.filter((i) => !i.is_section_header).length;
  const tooFew = nonSectionCount < 3;

  const draggableIds = ingredients.map((i) => i.id);

  const validUnits = getValidUnitsForIngredient(draft.ingredient_id ?? "", units, unitConversions);
  const unitOptions = validUnits.length > 0 ? validUnits : units.filter((u) => u.code === draft.unit);

  return (
    <div className="space-y-6">
      {submitModalQuery !== null && (
        <IngredientSubmitModal
          initialName={submitModalQuery}
          onClose={() => {
            setSubmitModalQuery(null);
            if (!swappingForId) setDraft(EMPTY_DRAFT());
          }}
        />
      )}

      {swappingForId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-foreground">
              Alternatives pour {ingredients.find(i => i.id === swappingForId)?.name}
            </h3>
            
            <div className="space-y-2">
              {ingredients.find(i => i.id === swappingForId)?.swappable_ingredients?.map((swap, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border">
                  <span className="text-sm font-medium text-foreground">{swap.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      updateIngredients(
                        ingredients.map((i) =>
                          i.id === swappingForId
                            ? {
                                ...i,
                                swappable_ingredients: i.swappable_ingredients?.filter((s) => s.id !== swap.id) || [],
                              }
                            : i
                        )
                      )
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >✕</button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">Ajouter une alternative :</p>
              <IngredientSearch
                isMetricUser={isMetricUser}
                onSelect={(ingredient) => {
                  const key = `name_${locale}` as keyof IngredientResult;
                  const locName = (ingredient[key] as string) || ingredient.name_fr;
                  updateIngredients(
                    ingredients.map((i) =>
                      i.id === swappingForId
                        ? {
                            ...i,
                            swappable_ingredients: [
                              ...(i.swappable_ingredients || []),
                              { id: ingredient.id, name: locName }
                            ],
                          }
                        : i
                    )
                  );
                }}
                onSubmitNew={(q) => {
                  setSubmitModalQuery(q);
                  setSwappingForId(null);
                }}
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setSwappingForId(null)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Ingrédients</h2>
        <span
          className={`text-xs ${tooFew ? "text-destructive" : "text-muted-foreground"}`}
        >
          {nonSectionCount} / minimum 3
        </span>
      </div>

      {ingredients.length > 0 && (
        <>
          {/* Desktop DnD (non-section items only) */}
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
                <ul className="space-y-1">
                  {ingredients.map((ing, index) =>
                    ing.is_section_header ? (
                      <SectionHeaderRow
                        key={ing.id}
                        id={ing.id}
                        title={ing.title ?? ""}
                        onChange={(t) => updateSectionTitle(ing.id, t)}
                        onRemove={() => removeItem(ing.id)}
                      />
                    ) : (
                      <SortableIngredientRow
                        key={ing.id}
                        ingredient={ing}
                        units={units}
                        onRemove={removeItem}
                        onQuantityChange={(id, q) =>
                          updateIngredients(
                            ingredients.map((i) =>
                              i.id === id ? { ...i, quantity: q } : i
                            )
                          )
                        }
                        onUnitChange={(id, u) =>
                          updateIngredients(
                            ingredients.map((i) =>
                              i.id === id ? { ...i, unit: u } : i
                            )
                          )
                        }
                        onOptionalChange={(id, v) =>
                          updateIngredients(
                            ingredients.map((i) =>
                              i.id === id ? { ...i, is_optional: v } : i
                            )
                          )
                        }
                        onSwapClick={setSwappingForId}
                        onEditClick={startEdit}
                      />
                    )
                  )}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          {/* Mobile list */}
          <ul className="sm:hidden space-y-1">
            {ingredients.map((ing, index) =>
              ing.is_section_header ? (
                <SectionHeaderRow
                  key={ing.id}
                  id={ing.id}
                  isMobile
                  title={ing.title ?? ""}
                  onChange={(t) => updateSectionTitle(ing.id, t)}
                  onRemove={() => removeItem(ing.id)}
                  onMoveUp={index > 0 ? () => moveItem(index, "up") : undefined}
                  onMoveDown={index < ingredients.length - 1 ? () => moveItem(index, "down") : undefined}
                />
              ) : (
                <li
                  key={ing.id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 text-muted-foreground disabled:opacity-50"
                      aria-label="Remonter l'ingrédient"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, "down")}
                      disabled={index === ingredients.length - 1}
                      className="p-0.5 text-muted-foreground disabled:opacity-50"
                      aria-label="Descendre l'ingrédient"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {ing.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ing.quantity}{" "}
                      {units.find((u) => u.code === ing.unit)?.name_fr ??
                        ing.unit}
                      {ing.is_optional && " · optionnel"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSwappingForId(ing.id)}
                    className="p-1 text-muted-foreground hover:text-primary relative"
                    title="Alternatives"
                  >
                    ⇄
                    {ing.swappable_ingredients?.length ? (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[10px] leading-none">
                        {ing.swappable_ingredients.length}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(ing)}
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Modifier"
                    aria-label="Modifier l'ingrédient"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(ing.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </button>
                </li>
              )
            )}
          </ul>
        </>
      )}

      {/* Add / edit ingredient form */}
      {adding || editingId ? (
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            {editingId ? "Modifier l'ingrédient" : "Ajouter un ingrédient"}
          </h3>

          <IngredientSearch
            isMetricUser={isMetricUser}
            onSelect={handleIngredientSelect}
            onSubmitNew={(q) => {
              setSubmitModalQuery(q);
              setAdding(false);
            }}
          />

          {draft.ingredient_id && (
            <>
              <p className="text-xs text-primary font-medium">
                ✓ {draft.name}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={draft.quantity}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        quantity: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Quantité"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <select
                    value={draft.unit}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, unit: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {unitOptions.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.name_fr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.is_optional}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, is_optional: e.target.checked }))
                  }
                  className="rounded accent-primary"
                />
                <span className="text-sm text-foreground">
                  Ingrédient optionnel
                </span>
              </label>
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.ingredient_id || !draft.quantity || !draft.unit}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              {editingId ? "Enregistrer" : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setEditingId(null);
                setDraft(EMPTY_DRAFT());
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex-1 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + Ajouter un ingrédient
          </button>
          <button
            type="button"
            onClick={addSection}
            className="py-3 px-4 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + Section
          </button>
        </div>
      )}

      {tooFew && nonSectionCount > 0 && (
        <p className="text-xs text-destructive">
          Minimum 3 ingrédients requis ({nonSectionCount}/3)
        </p>
      )}
    </div>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableIngredientRow({
  ingredient,
  units,
  onRemove,
  onQuantityChange,
  onUnitChange,
  onOptionalChange,
  onSwapClick,
  onEditClick,
}: {
  ingredient: IngredientItem;
  units: MeasurementUnit[];
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, q: number) => void;
  onUnitChange: (id: string, u: string) => void;
  onOptionalChange: (id: string, v: boolean) => void;
  onSwapClick: (id: string) => void;
  onEditClick: (ingredient: IngredientItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ingredient.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground p-1"
        aria-label="Réordonner"
      >
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {ingredient.name}
        </p>
      </div>
      <input
        type="number"
        min={0.01}
        step={0.01}
        value={ingredient.quantity}
        onChange={(e) =>
          onQuantityChange(ingredient.id, parseFloat(e.target.value) || 0)
        }
        className="w-20 px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="w-24 px-2 py-1 text-sm font-medium text-muted-foreground truncate">
        {units.find((u) => u.code === ingredient.unit)?.name_fr ?? ingredient.unit}
      </span>
      <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={ingredient.is_optional}
          onChange={(e) => onOptionalChange(ingredient.id, e.target.checked)}
          className="accent-primary"
        />
        opt.
      </label>
      <button
        type="button"
        onClick={() => onSwapClick(ingredient.id)}
        className="p-1 text-muted-foreground hover:text-primary relative"
        title="Alternatives"
      >
        ⇄
        {ingredient.swappable_ingredients?.length ? (
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[10px] leading-none">
            {ingredient.swappable_ingredients.length}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onEditClick(ingredient)}
        className="p-1 text-muted-foreground hover:text-primary"
        title="Modifier"
        aria-label="Modifier l'ingrédient"
      >
        ✎
      </button>
      <button
        type="button"
        onClick={() => onRemove(ingredient.id)}
        className="p-1 text-muted-foreground hover:text-destructive"
      >
        ✕
      </button>
    </li>
  );
}
