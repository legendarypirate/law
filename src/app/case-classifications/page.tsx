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

type CaseClassificationItem = {
  id: string;
  name: string;
  order: number;
};

export default function CaseClassificationsPage() {
  const [items, setItems] = useState<CaseClassificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaseClassificationItem | null>(null);
  const [name, setName] = useState("");
  const [order, setOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = async () => {
    const res = await fetch("/api/case-classifications");
    const data = await res.json();
    if (res.ok) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setOrder(items.length);
    setError("");
    setOpen(true);
  };

  const openEdit = (item: CaseClassificationItem) => {
    setEditing(item);
    setName(item.name);
    setOrder(item.order);
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
      body: JSON.stringify({ name: name.trim(), order: Number(order) || 0 }),
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

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Хэргийн зүйлчлэл
        </h1>
        <Button onClick={openCreate}>Хэргийн зүйлчлэл нэмэх</Button>
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
                <TableHead className="w-24">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">
                    {item.order}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-primary"
                      onClick={() => openEdit(item)}
                    >
                      Засах
                    </Button>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteItem(item.id)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Хэргийн зүйлчлэл засах" : "Шинэ хэргийн зүйлчлэл"}
            </DialogTitle>
            <DialogDescription>
              Хэргийн зүйлчлэлийн нэрийг оруулна. Хэрэг нэмэх/засах үед энэ
              жагсаалтаас сонгоно.
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
            <div className="space-y-2">
              <Label htmlFor="cc-order">Дараалал</Label>
              <Input
                id="cc-order"
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 0)}
              />
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
