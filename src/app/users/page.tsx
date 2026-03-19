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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Role = { id: string; name: string };
type User = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  role: Role;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) setUsers(data);
    setLoading(false);
  };

  const fetchRoles = async () => {
    const res = await fetch("/api/roles");
    const data = await res.json();
    if (res.ok) {
      setRoles(data);
      if (!roleId && data.length) setRoleId(data[0].id);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setEmail("");
    setPassword("");
    setName("");
    setRoleId(roles[0]?.id || "");
    setIsActive(true);
    setError("");
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setEmail(u.email);
    setPassword("");
    setName(u.name);
    setRoleId(u.role.id);
    setIsActive(u.isActive);
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
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PUT" : "POST";
    const body: Record<string, unknown> = {
      email: email.trim(),
      name: name.trim() || email.trim(),
      roleId,
      isActive,
    };
    if (password) body.password = password;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Алдаа гарлаа");
      return;
    }
    closeModal();
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Энэ хэрэглэгчийг устгах уу?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Хэрэглэгчид
        </h1>
        <Button onClick={openCreate}>Хэрэглэгч нэмэх</Button>
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
                <TableHead>Эрх</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="w-24">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.role.name}</TableCell>
                  <TableCell>
                    <span
                      className={
                        u.isActive ? "text-emerald-600" : "text-muted-foreground"
                      }
                    >
                      {u.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-primary"
                      onClick={() => openEdit(u)}
                    >
                      Засах
                    </Button>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteUser(u.id)}
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
            <DialogTitle>{editing ? "Хэрэглэгч засах" : "Шинэ хэрэглэгч"}</DialogTitle>
            <DialogDescription>
              {editing ? "Хэрэглэгчийн мэдээллийг шинэчлэнэ." : "Шинэ хэрэглэгч үүсгэнэ."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-email">Имэйл</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!editing}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-name">Нэр</Label>
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">
                Нууц үг {editing && "(өөрчлөхгүй бол хоосон үлдээнэ)"}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editing}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Эрх</Label>
              <Select
                value={roleId}
                onValueChange={setRoleId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Эрх сонгох" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="user-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="user-active" className="font-normal">
                  Идэвхтэй
                </Label>
              </div>
            )}
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
