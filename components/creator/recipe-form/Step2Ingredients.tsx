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
import { useAuthStore } from "@/lib/stores/authStore";
import { IngredientCombobox } from "@/components/creator/recipe/IngredientCombobox";
import { SectionHeaderRow } from "@/components/creator/recipe/SectionHeaderRow";
import { SubmitIngredientModal } from "@/components/creator/recipe/SubmitIngredientModal";
import { UNITS } from "@/lib/validations/recipe.schema";
import type { IngredientOption } from "@/hooks/use-ingredient-search";
import type { RecipeFormState } from "./RecipeWizard";

type IngredientItem = RecipeFormState["ingredients"][number];

interface Step2Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
}

// ─── Draft state for the "add" form ───────────────────────────────────────────

type AddMode = "ingredient" | "section";

interface AddIngredientDraft {
  ingredient: IngredientOption | null;
  quantity: string;
  unit: string;
  is_optional: boolean;
}

const EMPTY_DRAFT = (): AddIngredientDraft => ({
  ingredient: null,
  quantity: "",
  unit: "g",
  is_optional: false,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function Step2Ingredients({ data, onChange }: Step2Props) {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";

  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("ingredient");
  const [draft, setDraft] = useState<AddIngredientDraft>(EMPTY_DRAFT());
  const [draftSectionTitle, setDraftSectionTitle] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<IngredientItem | null>(null);

  // Submit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState("");

  const dndId = useId();
  const ingredients = data.ingredients;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateIngredients = (next: IngredientItem[]) => {
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

  const moveItem = (index: number, dir: "up" | "down") => {
    if (dir === "up" && index === 0) return;
    if (dir === "down" && index === ingredients.length - 1) return;
    updateIngredients(arrayMove(ingredients, index, dir === "up" ? index - 1 : index + 1));
  };

  const removeItem = (id: string) => {
    updateIngredients(ingredients.filter((i) => i.id !== id));
    if (editingId === id) { setEditingId(null); setEditItem(null); }
  };

  // ── Add ingredient ────────────────────────────────────────────────────────

  const handleAdd = () => {
    if (addMode === "section") {
      if (!draftSectionTitle.trim()) return;
      updateIngredients([
        ...ingredients,
        {
          id: crypto.randomUUID(),
          type: "section_header" as const,
          title: draftSectionTitle.trim(),
          sort_order: ingredients.length,
          is_section_header: true as const,
        },
      ]);
      setDraftSectionTitle("");
    } else {
      if (!draft.ingredient || !draft.quantity || !draft.unit) return;
      updateIngredients([
        ...ingredients,
        {
          id: crypto.randomUUID(),
          type: "ingredient" as const,
          ingredient: draft.ingredient,
          quantity: parseFloat(draft.quantity),
          unit: draft.unit,
          is_optional: draft.is_optional,
          sort_order: ingredients.length,
          is_section_header: false as const,
        },
      ]);
      setDraft(EMPTY_DRAFT());
    }
    setAdding(false);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const startEdit = (item: IngredientItem) => {
    setEditingId(item.id);
    setEditItem({ ...item });
  };

  const saveEdit = () => {
    if (!editItem) return;
    updateIngredients(ingredients.map((i) => (i.id === editItem.id ? editItem : i)));
    setEditingId(null);
    setEditItem(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditItem(null); };

  // ── Ingredient submission ─────────────────────────────────────────────────

  const handleNotFound = (query: string) => {
    setNotFoundQuery(query);
    setModalOpen(true);
  };

  const handleSubmitted = (ing: { id: string; name: string }) => {
    const option: IngredientOption = { id: ing.id, name: ing.name, category: null, status: "pending" };
    setDraft((d) => ({ ...d, ingredient: option }));
    setModalOpen(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const realCount = ingredients.filter((i) => !i.is_section_header).length;
  const tooFew = realCount < 3;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Ingrédients</h2>
        <span className={`text-xs ${tooFew ? "text-destructive" : "text-muted-foreground"}`}>
          {realCount} / minimum 3
        </span>
      </div>

      {/* Desktop DnD list */}
      {ingredients.length > 0 && (
        <>
          <div className="hidden sm:block">
            <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={ingredients.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {ingredients.map((ing) => (
                    <SortableRow
                      key={ing.id}
                      item={ing}
                      onRemove={removeItem}
                      onEdit={startEdit}
                      userId={userId}
                      onNotFound={handleNotFound}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          {/* Mobile list */}
          <ul className="sm:hidden space-y-2">
            {ingredients.map((ing, index) => (
              <li key={ing.id} className={`flex items-center gap-2 p-3 rounded-lg border ${
                ing.is_section_header ? "bg-primary/5 border-primary/20" : "bg-secondary/50 border-border"
              }`}>
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveItem(index, "up")} disabled={index === 0}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                  <button type="button" onClick={() => moveItem(index, "down")} disabled={index === ingredients.length - 1}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  {ing.is_section_header ? (
                    <p className="text-sm font-semibold text-primary">{ing.title || "—"}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">{ing.ingredient?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {ing.quantity} {ing.unit}{ing.is_optional && " · optionnel"}
                      </p>
                    </>
                  )}
                </div>
                <button type="button" onClick={() => startEdit(ing)}
                  className="p-1 text-muted-foreground hover:text-foreground text-xs">✎</button>
                <button type="button" onClick={() => removeItem(ing.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors">✕</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Edit panel */}
      {editingId && editItem && (
        <EditPanel
          item={editItem}
          userId={userId}
          onNotFound={handleNotFound}
          onChange={(patch) => setEditItem((prev) => prev ? { ...prev, ...patch } as IngredientItem : prev)}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      )}

      {/* Add form */}
      {adding ? (
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          {/* Mode toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {addMode === "section" ? "Titre de section" : "Ajouter un ingrédient"}
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={addMode === "section"}
                onChange={(e) => setAddMode(e.target.checked ? "section" : "ingredient")}
                className="rounded border-input accent-primary" />
              <span className="text-xs text-muted-foreground">Section</span>
            </label>
          </div>

          {addMode === "section" ? (
            <input type="text" placeholder="Titre de la section (ex: Pour la sauce)"
              value={draftSectionTitle}
              onChange={(e) => setDraftSectionTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="space-y-3">
              <IngredientCombobox
                value={draft.ingredient}
                onChange={(ing) => setDraft((d) => ({ ...d, ingredient: ing }))}
                creatorUserId={userId}
                onNotFound={handleNotFound}
              />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Quantité" min={0.01} step={0.01}
                  value={draft.quantity}
                  onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select value={draft.unit}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={draft.is_optional}
                  onChange={(e) => setDraft((d) => ({ ...d, is_optional: e.target.checked }))}
                  className="rounded border-input accent-primary" />
                <span className="text-sm text-foreground">Ingrédient optionnel</span>
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={handleAdd}
              disabled={addMode === "section" ? !draftSectionTitle.trim() : !draft.ingredient || !draft.quantity || !draft.unit}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
              Ajouter
            </button>
            <button type="button" onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT()); setDraftSectionTitle(""); }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          + Ajouter un ingrédient
        </button>
      )}

      {tooFew && realCount > 0 && (
        <p className="text-xs text-destructive">Minimum 3 ingrédients requis ({realCount}/3)</p>
      )}

      <SubmitIngredientModal
        open={modalOpen}
        initialName={notFoundQuery}
        creatorUserId={userId}
        onClose={() => setModalOpen(false)}
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function EditPanel({
  item,
  userId,
  onNotFound,
  onChange,
  onSave,
  onCancel,
}: {
  item: IngredientItem;
  userId: string;
  onNotFound: (q: string) => void;
  onChange: (patch: Partial<IngredientItem>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const canSave = item.is_section_header
    ? !!(item as any).title?.trim()
    : !!(item as any).ingredient && !!(item as any).quantity && !!(item as any).unit;

  return (
    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {item.is_section_header ? "Modifier le titre de section" : "Modifier l'ingrédient"}
        </h3>
      </div>

      {item.is_section_header ? (
        <input type="text" placeholder="Titre de la section"
          value={(item as any).title ?? ""}
          onChange={(e) => onChange({ title: e.target.value } as any)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <div className="space-y-3">
          <IngredientCombobox
            value={(item as any).ingredient ?? null}
            onChange={(ing) => onChange({ ingredient: ing } as any)}
            creatorUserId={userId}
            onNotFound={onNotFound}
          />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Quantité" min={0.01} step={0.01}
              value={(item as any).quantity ?? ""}
              onChange={(e) => onChange({ quantity: parseFloat(e.target.value) || undefined } as any)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select value={(item as any).unit ?? "g"}
              onChange={(e) => onChange({ unit: e.target.value } as any)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={(item as any).is_optional ?? false}
              onChange={(e) => onChange({ is_optional: e.target.checked } as any)}
              className="rounded border-input accent-primary" />
            <span className="text-sm text-foreground">Ingrédient optionnel</span>
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onSave} disabled={!canSave}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
          Enregistrer
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}

// ─── Sortable row (desktop) ────────────────────────────────────────────────────

function SortableRow({
  item,
  onRemove,
  onEdit,
  userId,
  onNotFound,
}: {
  item: IngredientItem;
  onRemove: (id: string) => void;
  onEdit: (item: IngredientItem) => void;
  userId: string;
  onNotFound: (q: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  if (item.is_section_header) {
    return (
      <li ref={setNodeRef} style={style}>
        <SectionHeaderRow
          value={item.title}
          onChange={() => onEdit(item)}
          onRemove={() => onRemove(item.id)}
          dragHandle={
            <button type="button" {...attributes} {...listeners}
              className="cursor-grab active:cursor-grabbing text-primary/40 hover:text-primary p-1" aria-label="Réordonner">
              ⠿
            </button>
          }
        />
        {/* Section title is edited via onEdit panel — clicking the text invokes edit */}
        <button type="button" onClick={() => onEdit(item)}
          className="sr-only">Modifier</button>
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style}
      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
      <button type="button" {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1" aria-label="Réordonner">
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.ingredient?.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} {item.unit}{item.is_optional && " · optionnel"}
          {item.ingredient?.status === "pending" && (
            <span className="ml-1 text-amber-600">⏳</span>
          )}
        </p>
      </div>
      <button type="button" onClick={() => onEdit(item)}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors text-xs">✎</button>
      <button type="button" onClick={() => onRemove(item.id)}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors">✕</button>
    </li>
  );
}
