// components/creator/post-form/BlockEditor.tsx
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
import BlockRenderer from "./BlockRenderer";
import type { PostBlock } from "@/lib/validations/post.schema";

interface BlockEditorProps {
  blocks: PostBlock[];
  postId: string | null;
  creatorId: string;
  onChange: (blocks: PostBlock[]) => void;
}

const BLOCK_TYPE_LABELS: { type: PostBlock["type"]; label: string }[] = [
  { type: "paragraph", label: "+ Paragraphe" },
  { type: "heading", label: "+ Titre" },
  { type: "quote", label: "+ Citation" },
  { type: "image", label: "+ Image" },
  { type: "image_gallery", label: "+ Galerie" },
  { type: "video_embed", label: "+ Vidéo" },
  { type: "recipe_embed", label: "+ Recette" },
  { type: "divider", label: "+ Séparateur" },
];

function makeBlock(type: PostBlock["type"]): PostBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "paragraph":
      return { id, type: "paragraph", text: "" };
    case "heading":
      return { id, type: "heading", level: 2, text: "" };
    case "quote":
      return { id, type: "quote", text: "" };
    case "divider":
      return { id, type: "divider" };
    case "image":
      return { id, type: "image", url: "" };
    case "image_gallery":
      return { id, type: "image_gallery", urls: ["", ""] };
    case "video_embed":
      return { id, type: "video_embed", url: "" };
    case "recipe_embed":
      return { id, type: "recipe_embed", recipe_id: "", recipe_title: "", recipe_image_url: null };
  }
}

export default function BlockEditor({ blocks, postId, creatorId, onChange }: BlockEditorProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(blocks, oldIndex, newIndex));
  };

  const updateBlock = (updated: PostBlock) =>
    onChange(blocks.map((b) => (b.id === updated.id ? updated : b)));

  const removeBlock = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  const addBlock = (type: PostBlock["type"]) => onChange([...blocks, makeBlock(type)]);

  return (
    <div className="space-y-4">
      {blocks.length > 0 && (
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  postId={postId}
                  creatorId={creatorId}
                  onChange={updateBlock}
                  onRemove={() => removeBlock(block.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPE_LABELS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="px-3 py-1.5 rounded-lg border-2 border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortableBlock({
  block,
  postId,
  creatorId,
  onChange,
  onRemove,
}: {
  block: PostBlock;
  postId: string | null;
  creatorId: string;
  onChange: (b: PostBlock) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-start gap-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground p-2 mt-1"
        aria-label="Réordonner"
      >
        ⠿
      </button>
      <div className="flex-1">
        <BlockRenderer block={block} postId={postId} creatorId={creatorId} onChange={onChange} onRemove={onRemove} />
      </div>
    </li>
  );
}
