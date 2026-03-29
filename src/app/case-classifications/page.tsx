"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sortCaseClassifications } from "@/lib/caseClassifications";
import { cn } from "@/lib/utils";

type CaseClassificationItem = {
  id: string;
  name: string;
  order: number;
};

function SortableRow({
  item,
  onEdit,
  onDelete,
}: {
  item: CaseClassificationItem;
  onEdit: (item: CaseClassificationItem) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 border-b border-border py-2.5 pl-1 pr-2 last:border-0",
        isDragging && "z-10 rounded-md bg-muted/80 shadow-sm ring-1 ring-border"
      )}
    >
      <button
        type="button"
        className={cn(
          "touch-none shrink-0 cursor-grab rounded-md p-1.5 text-muted-foreground",
          "hover:bg-muted hover:text-foreground active:cursor-grabbing"
        )}
        {...attributes}
        {...listeners}
        aria-label="Чирж дараалал өөрчлөх"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="min-w-8 text-center text-xs tabular-nums text-muted-foreground">
        {item.order + 1}
      </span>
      <span className="min-w-0 flex-1 font-medium">{item.name}</span>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="link"
          className="h-auto p-0 text-primary"
          onClick={() => onEdit(item)}
        >
          Засах
        </Button>
        <span className="text-muted-foreground">·</span>
        <Button
          variant="link"
          className="h-auto p-0 text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
        >
          Устгах
        </Button>
      </div>
    </div>
  );
}

export default function CaseClassificationsPage() {
  const [items, setItems] = useState<CaseClassificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaseClassificationItem | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reorderError, setReorderError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = async () => {
    const res = await fetch("/api/case-classifications");
    const data = await res.json();
    if (res.ok && Array.isArray(data)) {
      setItems(sortCaseClassifications(data as CaseClassificationItem[]));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setError("");
    setOpen(true);
  };

  const openEdit = (item: CaseClassificationItem) => {
    setEditing(item);
    setName(item.name);
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Нэр оруулна уу.");
      return;
    }
    setSubmitting(true);
    const url = editing
      ? `/api/case-classifications/${editing.id}`
      : "/api/case-classifications";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editing
          ? { name: name.trim() }
          : { name: name.trim(), order: items.length }
      ),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Алдаа гарлаа");
      return;
    }
    closeModal();
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Энэ хэргийн зүйлчлэлийг устгах уу?")) return;
    const res = await fetch(`/api/case-classifications/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchItems();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setReorderError("");
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map((row, index) => ({
      ...row,
      order: index,
    }));
    const previous = items;
    setItems(reordered);
    try {
      const res = await fetch("/api/case-classifications/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setItems(previous);
        setReorderError(typeof data?.error === "string" ? data.error : "Дараалал хадгалагдсангүй");
        return;
      }
      if (Array.isArray(data)) {
        setItems(sortCaseClassifications(data as CaseClassificationItem[]));
      }
    } catch {
      setItems(previous);
      setReorderError("Сүлжээний алдаа");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Хэргийн зүйлчлэл
        </h1>
        <Button onClick={openCreate}>Хэргийн зүйлчлэл нэмэх</Button>
      </div>

      <p className="mb-4 max-w-xl text-sm text-muted-foreground">
        Дарааллыг өөрчлөхийн тулд мөрийг чирж зөөнө. Хэрэг нэмэх болон анхан шатны шүүхийн
        алхмууд энэ дарааллаар сонголтонд харагдана.
      </p>

      {reorderError && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {reorderError}
        </p>
      )}

      {loading ? (
        <p className="text-muted-foreground">Ачаалж байна…</p>
      ) : (
        <Card className="p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Одоогоор бүртгэл байхгүй.
                </p>
              ) : (
                items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    onEdit={openEdit}
                    onDelete={deleteItem}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Хэргийн зүйлчлэл засах" : "Шинэ хэргийн зүйлчлэл"}
            </DialogTitle>
            <DialogDescription>
              Хэргийн зүйлчлэлийн нэрийг оруулна. Дарааллыг жагсаалтын дээр чирж тохируулна.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cc-name">Нэр *</Label>
              <Input
                id="cc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Жишээ: Иргэний маргаан, Эрүүгийн хэрэг"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Цуцлах
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Хадгалж байна…" : editing ? "Хадгалах" : "Үүсгэх"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
