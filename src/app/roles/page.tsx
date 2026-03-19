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
import { cn } from "@/lib/utils";

const RESOURCES = [
  { key: "cases", label: "Хэргүүд" },
  { key: "steps", label: "Алхамууд (шат)" },
  { key: "clients", label: "Харилцагчид" },
  { key: "users", label: "Хэрэглэгчид" },
  { key: "roles", label: "Эрх (роль)" },
  { key: "caseTypes", label: "Хэргийн төрөл" },
] as const;

const ACTIONS = [
  { key: "create", label: "Үүсгэх" },
  { key: "read", label: "Унших" },
  { key: "update", label: "Засах" },
  { key: "delete", label: "Устгах" },
] as const;

export type PermissionsMap = Partial<
  Record<(typeof RESOURCES)[number]["key"], Partial<Record<(typeof ACTIONS)[number]["key"], boolean>>>
>;

function emptyPermissions(): PermissionsMap {
  const out: PermissionsMap = {};
  for (const r of RESOURCES) {
    out[r.key] = {};
    for (const a of ACTIONS) {
      (out[r.key] as Record<string, boolean>)[a.key] = false;
    }
  }
  return out;
}

function mergeWithDefaults(loaded: PermissionsMap | null): PermissionsMap {
  const base = emptyPermissions();
  if (!loaded || typeof loaded !== "object") return base;
  for (const r of RESOURCES) {
    const res = loaded[r.key];
    if (res && typeof res === "object") {
      for (const a of ACTIONS) {
        const val = (res as Record<string, boolean>)[a.key];
        (base[r.key] as Record<string, boolean>)[a.key] = val === true;
      }
    }
  }
  return base;
}

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions?: PermissionsMap | null;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionsMap>(emptyPermissions());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchRoles = async () => {
    const res = await fetch("/api/roles");
    const data = await res.json();
    if (res.ok) setRoles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPermissions(emptyPermissions());
    setError("");
    setOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setName(r.name);
    setDescription(r.description || "");
    setPermissions(mergeWithDefaults(r.permissions ?? null));
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
  };

  const setPerm = (resource: (typeof RESOURCES)[number]["key"], action: (typeof ACTIONS)[number]["key"], value: boolean) => {
    setPermissions((prev) => {
      const next = { ...prev };
      const res = { ...(next[resource] || {}) };
      (res as Record<string, boolean>)[action] = value;
      next[resource] = res;
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const url = editing ? `/api/roles/${editing.id}` : "/api/roles";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        permissions,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Request failed");
      return;
    }
    closeModal();
    fetchRoles();
  };

  const deleteRole = async (id: string) => {
    if (!confirm("Энэ ролийг устгах уу? Энэ эрхтэй хэрэглэгчдийг эхлээд өөр рол руу шилжүүлнэ үү.")) return;
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    if (res.ok) fetchRoles();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Эрх (роль) / Roles
        </h1>
        <Button onClick={openCreate}>Роль нэмэх</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Ачаалж байна…</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Тайлбар</TableHead>
                <TableHead className="w-24">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-primary"
                      onClick={() => openEdit(r)}
                    >
                      Засах
                    </Button>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteRole(r.id)}
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
        <DialogContent className="h-full min-h-screen overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Роль засах" : "Шинэ роль"}</DialogTitle>
            <DialogDescription>
              {editing ? "Роль болон эрхийг засна." : "Шинэ роль үүсгэж, CRUD эрх тохируулна."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Нэр</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">Тайлбар</Label>
              <Input
                id="role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Эрх (CRUD)</Label>
              <p className="text-xs text-muted-foreground">
                Ресурс бүр дээр үүсгэх, унших, засах, устгах эрхийг сонгоно.
              </p>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Ресурс</TableHead>
                      {ACTIONS.map((a) => (
                        <TableHead key={a.key} className="text-center w-20">
                          {a.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RESOURCES.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell className="font-medium text-sm">{r.label}</TableCell>
                        {ACTIONS.map((a) => (
                          <TableCell key={a.key} className="text-center">
                            <input
                              type="checkbox"
                              checked={!!(permissions[r.key] as Record<string, boolean>)?.[a.key]}
                              onChange={(e) => setPerm(r.key, a.key, e.target.checked)}
                              className={cn(
                                "h-4 w-4 rounded border-input accent-primary cursor-pointer",
                              )}
                              aria-label={`${r.label} - ${a.label}`}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Хаах
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
