"use client";

import { useEffect, useState } from "react";

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
  const [modal, setModal] = useState<"closed" | "create" | "edit">("closed");
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
    setModal("create");
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setEmail(u.email);
    setPassword("");
    setName(u.name);
    setRoleId(u.role.id);
    setIsActive(u.isActive);
    setError("");
    setModal("edit");
  };

  const closeModal = () => {
    setModal("closed");
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
      setError(data.error || "Request failed");
      return;
    }
    closeModal();
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-slate-800">Users</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Add user
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 font-medium text-slate-700">Name</th>
                <th className="p-3 font-medium text-slate-700">Email</th>
                <th className="p-3 font-medium text-slate-700">Role</th>
                <th className="p-3 font-medium text-slate-700">Status</th>
                <th className="p-3 font-medium text-slate-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role.name}</td>
                  <td className="p-3">
                    <span
                      className={
                        u.isActive
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-amber-600 hover:underline"
                    >
                      Edit
                    </button>
                    {" · "}
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== "closed" && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="font-serif text-lg font-semibold text-slate-800">
              {editing ? "Edit user" : "New user"}
            </h2>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                  readOnly={!!editing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Password {editing && "(leave blank to keep)"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required={!editing}
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              {editing && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </label>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editing ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
