"use client";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Category = { id: string; name: string };
type CaseTypeItem = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  categories: Category[];
};

const QUICK_CATEGORIES = ["Маргаантай", "Маргаангүй"];

export default function CaseTypesPage() {
  const [types, setTypes] = useState<CaseTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaseTypeItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(0);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchTypes = async () => {
    const res = await fetch("/api/case-types");
    const data = await res.json();
    if (res.ok) setTypes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setOrder(types.length);
    setCategoryNames([]);
    setError("");
    setOpen(true);
  };

  const openEdit = (t: CaseTypeItem) => {
    setEditing(t);
    setName(t.name);
    setDescription(t.description || "");
    setOrder(t.order);
    setCategoryNames(t.categories.map((c) => c.name));
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
  };

  const addCategoryRow = () => {
    setCategoryNames((prev) => [...prev, ""]);
  };

  const setCategoryAt = (index: number, value: string) => {
    setCategoryNames((prev) =>
      prev.map((v, i) => (i === index ? value : v)),
    );
  };

  const removeCategoryAt = (index: number) => {
    setCategoryNames((prev) => prev.filter((_, i) => i !== index));
  };

  const addQuickCategory = (label: string) => {
    if (!categoryNames.includes(label)) {
      setCategoryNames((prev) => [...prev, label]);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const url = editing ? `/api/case-types/${editing.id}` : "/api/case-types";
    const method = editing ? "PUT" : "POST";
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      order: Number(order) || 0,
      categoryNames: categoryNames.map((n) => n.trim()).filter(Boolean),
    };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Алдаа гарлаа");
      return;
    }
    closeModal();
    fetchTypes();
  };

  const deleteType = async (id: string) => {
    if (!confirm("Энэ хэргийн төрлийг устгах уу? Буцааж болохгүй.")) return;
    const res = await fetch(`/api/case-types/${id}`, { method: "DELETE" });
    if (res.ok) fetchTypes();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Хэргийн төрөл
        </h1>
        <Button onClick={openCreate}>Хэргийн төрөл нэмэх</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Ачаалж байна…</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Нэр</TableHead>
                <TableHead>Ангилал</TableHead>
                <TableHead className="w-24">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground">{t.order}</TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.categories.length === 0
                      ? "—"
                      : t.categories.map((c) => c.name).join(", ")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-primary"
                      onClick={() => openEdit(t)}
                    >
                      Засах
                    </Button>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteType(t.id)}
                    >
                      Устгах
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="h-full min-h-screen overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Хэргийн төрөл засах" : "Шинэ хэргийн төрөл"}
            </DialogTitle>
            <DialogDescription>
              Хэргийн төрөл (жишээ: Эрүү, Иргэн захиргаа, Байгууллагын эрх зүйн
              үйлчилгээ, Зөвлөгөө, Консалтинг). Зарим төрөлд Маргаантай /
              Маргаангүй гэсэн ангилал нэмж болно.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ct-name">Нэр *</Label>
              <Input
                id="ct-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Жишээ: Эрүү, Иргэн захиргаа"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-desc">Тайлбар</Label>
              <Input
                id="ct-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Заавал биш"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-order">Дараалал</Label>
              <Input
                id="ct-order"
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ангилал (жишээ: Маргаантай, Маргаангүй)</Label>
              <div className="flex flex-wrap gap-1">
                {QUICK_CATEGORIES.map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addQuickCategory(q)}
                  >
                    + {q}
                  </Button>
                ))}
              </div>
              <div className="mt-2 space-y-2">
                {categoryNames.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={val}
                      onChange={(e) => setCategoryAt(idx, e.target.value)}
                      placeholder="Ангиллын нэр"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => removeCategoryAt(idx)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCategoryRow}
              >
                + Ангилал нэмэх
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
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
