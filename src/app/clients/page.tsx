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

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchClients = async () => {
    const url = search
      ? `/api/clients?q=${encodeURIComponent(search)}`
      : "/api/clients";
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => fetchClients(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setAddress("");
    setNotes("");
    setError("");
    setOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setName(c.name);
    setEmail(c.email || "");
    setPhone(c.phone || "");
    setCompany(c.company || "");
    setAddress(c.address || "");
    setNotes(c.notes || "");
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
    setSubmitting(true);
    const url = editing ? `/api/clients/${editing.id}` : "/api/clients";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Алдаа гарлаа");
      return;
    }
    closeModal();
    fetchClients();
  };

  const deleteClient = async (id: string) => {
    if (!confirm("Энэ харилцагчийг устгах уу? Холбоотой хэргүүд нөлөөлөгдөж болно.")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) fetchClients();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Харилцагчид
        </h1>
        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Харилцагч хайх…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={openCreate}>Харилцагч нэмэх</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Ачаалж байна…</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Имэйл</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Байгууллага</TableHead>
                <TableHead className="w-24">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.phone || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.company || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-primary"
                      onClick={() => openEdit(c)}
                    >
                      Засах
                    </Button>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteClient(c.id)}
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
            <DialogTitle>{editing ? "Харилцагч засах" : "Шинэ харилцагч"}</DialogTitle>
            <DialogDescription>
              {editing ? "Харилцагчийн мэдээллийг шинэчлэнэ." : "Шинэ харилцагч нэмнэ."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Нэр *</Label>
              <Input
                id="client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Имэйл</Label>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Утас</Label>
              <Input
                id="client-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-company">Байгууллага</Label>
              <Input
                id="client-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-address">Хаяг</Label>
              <Input
                id="client-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-notes">Тэмдэглэл</Label>
              <Input
                id="client-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
