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

type InvestigatorActionTypeItem = {
  id: string;
  name: string;
  order: number;
};

export default function InvestigatorActionTypesPage() {
  const [items, setItems] = useState<InvestigatorActionTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvestigatorActionTypeItem | null>(null);
  const [name, setName] = useState("");
  const [order, setOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = async () => {
    const res = await fetch("/api/investigator-action-types");
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

  const openEdit = (item: InvestigatorActionTypeItem) => {
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
      ? `/api/investigator-action-types/${editing.id}`
      : "/api/investigator-action-types";
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
    if (!confirm("Энэ мөрдөгчийн ажиллагааны төрлийг устгах уу?")) return;
    const res = await fetch(`/api/investigator-action-types/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchItems();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Мөрдөгчийн ажиллагааны төрөл
        </h1>
        <Button onClick={openCreate}>Мөрдөгчийн ажиллагаа нэмэх</Button>
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
              {editing ? "Мөрдөгчийн ажиллагаа засах" : "Шинэ мөрдөгчийн ажиллагаа"}
            </DialogTitle>
            <DialogDescription>
              Мөрдөгчийн ажиллагааны нэрийг оруулна. Гомдол мэдээлэл таб дээр
              энэ жагсаалтаас сонголтоор харуулна (жишээ: Нас тогтоох, Хөрөнгийн
              үнэлгээ гаргуулах, Мөрдөгчийн магадлагаа).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="iat-name">Нэр *</Label>
              <Input
                id="iat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Жишээ: Нас тогтоох, Хөрөнгийн үнэлгээ гаргуулах"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iat-order">Дараалал</Label>
              <Input
                id="iat-order"
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
