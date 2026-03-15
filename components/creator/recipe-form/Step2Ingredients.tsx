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
import { UNITS } from "@/lib/validations/recipe.schema";
import type { RecipeFormState } from "./RecipeWizard";

type Ingredient = RecipeFormState["ingredients"][number];

interface Step2Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
}

const EMPTY_INGREDIENT = (): Ingredient => ({
  id: crypto.randomUUID(),
  name: "",
  title: "",
  is_section_header: false,
  quantity: 1,
  unit: "g",
  is_optional: false,
  sort_order: 0,
});

export default function Step2Ingredients({ data, onChange }: Step2Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Ingredient>(EMPTY_INGREDIENT());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Ingredient | null>(null);
  const dndId = useId();

  const ingredients = data.ingredients;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateIngredients = (next: Ingredient[]) => {
    onChange({ ingredients: next.map((ing, i) => ({ ...ing, sort_order: i })) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = ingredients.findIndex((i) => i.id === active.id);
      const newIndex = ingredients.findIndex((i) => i.id === over.id);
      updateIngredients(arrayMove(ingredients, oldIndex, newIndex));
    }
  };

  const moveIngredient = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === ingredients.length - 1) return;
    updateIngredients(arrayMove(ingredients, index, direction === "up" ? index - 1 : index + 1));
  };

  const removeIngredient = (id: string) => {
    updateIngredients(ingredients.filter((i) => i.id !== id));
  };

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditDraft({ ...ing });
  };

  const saveEdit = () => {
    if (!editDraft) return;
    updateIngredients(ingredients.map((i) => i.id === editDraft.id ? editDraft : i));
    setEditingId(null);
    setEditDraft(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const handleAddIngredient = () => {
    if (draft.is_section_header) {
      if (!draft.title?.trim()) return;
    } else {
      if (!draft.name.trim()) return;
    }
    const newList = [...ingredients, { ...draft, sort_order: ingredients.length }];
    updateIngredients(newList);
    setDraft(EMPTY_INGREDIENT());
    setAdding(false);
  };

  // Only non-section rows count toward the minimum
  const realCount = ingredients.filter((i) => !i.is_section_header).length;
  const tooFew = realCount < 3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Ingrédients</h2>
        <span className={`text-xs ${tooFew ? "text-destructive" : "text-muted-foreground"}`}>
          {realCount} / minimum 3
        </span>
      </div>

      {/* Sortable list */}
      {ingredients.length > 0 && (
        <>
          {/* Desktop DnD */}
          <div className="hidden sm:block">
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ingredients.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {ingredients.map((ing) => (
                    <SortableIngredientRow
                      key={ing.id}
                      ingredient={ing}
                      onRemove={removeIngredient}
                      onEdit={startEdit}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          {/* Mobile list with arrows */}
          <ul className="sm:hidden space-y-2">
            {ingredients.map((ing, index) => (
              <li
                key={ing.id}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  ing.is_section_header
                    ? "bg-primary/5 border-primary/20"
                    : "bg-secondary/50 border-border"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveIngredient(index, "up")} disabled={index === 0}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                  <button type="button" onClick={() => moveIngredient(index, "down")} disabled={index === ingredients.length - 1}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  {ing.is_section_header ? (
                    <p className="text-sm font-semibold text-primary">{ing.title || "—"}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">{ing.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ing.quantity} {ing.unit}
                        {ing.is_optional && " (optionnel)"}
                      </p>
                    </>
                  )}
                </div>
                <button type="button" onClick={() => removeIngredient(ing.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors">✕</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Edit form */}
      {editingId && editDraft && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {editDraft.is_section_header ? "Modifier le titre de section" : "Modifier l'ingrédient"}
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editDraft.is_section_header}
                onChange={(e) => setEditDraft((d) => d ? { ...d, is_section_header: e.target.checked } : d)}
                className="rounded border-input accent-primary" />
              <span className="text-xs text-muted-foreground">Section</span>
            </label>
          </div>

          {editDraft.is_section_header ? (
            <input type="text" placeholder="Titre de la section"
              value={editDraft.title ?? ""}
              onChange={(e) => setEditDraft((d) => d ? { ...d, title: e.target.value } : d)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          ) : (
            <div className="space-y-3">
              <input type="text" placeholder="Nom de l'ingrédient *"
                value={editDraft.name}
                onChange={(e) => setEditDraft((d) => d ? { ...d, name: e.target.value } : d)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Quantité" min={0.01} step={0.01}
                  value={editDraft.quantity ?? ""}
                  onChange={(e) => setEditDraft((d) => d ? { ...d, quantity: parseFloat(e.target.value) || undefined } : d)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <select value={editDraft.unit ?? "g"}
                  onChange={(e) => setEditDraft((d) => d ? { ...d, unit: e.target.value } : d)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editDraft.is_optional}
                  onChange={(e) => setEditDraft((d) => d ? { ...d, is_optional: e.target.checked } : d)}
                  className="rounded border-input accent-primary" />
                <span className="text-sm text-foreground">Ingrédient optionnel</span>
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={saveEdit}
              disabled={editDraft.is_section_header ? !editDraft.title?.trim() : !editDraft.name.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
              Enregistrer
            </button>
            <button type="button" onClick={cancelEdit}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {draft.is_section_header ? "Titre de section" : "Ajouter un ingrédient"}
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_section_header}
                onChange={(e) => setDraft((d) => ({ ...d, is_section_header: e.target.checked }))}
                className="rounded border-input accent-primary"
              />
              <span className="text-xs text-muted-foreground">Section</span>
            </label>
          </div>

          {draft.is_section_header ? (
            <input
              type="text"
              placeholder="Titre de la section (ex: Pour la sauce)"
              value={draft.title ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nom de l'ingrédient *"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Quantité"
                  min={0.01}
                  step={0.01}
                  value={draft.quantity ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, quantity: parseFloat(e.target.value) || undefined }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  value={draft.unit ?? "g"}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.is_optional}
                  onChange={(e) => setDraft((d) => ({ ...d, is_optional: e.target.checked }))}
                  className="rounded border-input accent-primary"
                />
                <span className="text-sm text-foreground">Ingrédient optionnel</span>
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddIngredient}
              disabled={draft.is_section_header ? !draft.title?.trim() : !draft.name.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setDraft(EMPTY_INGREDIENT()); }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Ajouter un ingrédient
        </button>
      )}

      {tooFew && realCount > 0 && (
        <p className="text-xs text-destructive">
          Minimum 3 ingrédients requis ({realCount}/3)
        </p>
      )}
    </div>
  );
}

// ─── Sortable row (desktop) ────────────────────────────────────────────────────

function SortableIngredientRow({
  ingredient,
  onRemove,
  onEdit,
}: {
  ingredient: Ingredient;
  onRemove: (id: string) => void;
  onEdit: (ing: Ingredient) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ingredient.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (ingredient.is_section_header) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20"
      >
        <button type="button" {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-primary/40 hover:text-primary p-1" aria-label="Réordonner">
          ⠿
        </button>
        <span className="flex-1 text-sm font-semibold text-primary">{ingredient.title || "Section sans titre"}</span>
        <button type="button" onClick={() => onEdit(ingredient)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors text-xs">✎</button>
        <button type="button" onClick={() => onRemove(ingredient.id)}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors">✕</button>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
    >
      <button type="button" {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1" aria-label="Réordonner">
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{ingredient.name}</p>
        <p className="text-xs text-muted-foreground">
          {ingredient.quantity} {ingredient.unit}
          {ingredient.is_optional && " · optionnel"}
        </p>
      </div>
      <button type="button" onClick={() => onEdit(ingredient)}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors text-xs">✎</button>
      <button type="button" onClick={() => onRemove(ingredient.id)}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors">✕</button>
    </li>
  );
}
