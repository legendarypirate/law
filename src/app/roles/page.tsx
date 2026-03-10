"use client";

import { useEffect, useState } from "react";

type Role = { id: string; name: string; description: string | null };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"closed" | "create" | "edit">("closed");
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
    setError("");
    setModal("create");
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setName(r.name);
    setDescription(r.description || "");
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
    const url = editing ? `/api/roles/${editing.id}` : "/api/roles";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
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
    if (!confirm("Delete this role? Users with this role must be reassigned first.")) return;
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    if (res.ok) fetchRoles();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-slate-800">Roles</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Add role
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
                <th className="p-3 font-medium text-slate-700">Description</th>
                <th className="p-3 font-medium text-slate-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-slate-500">{r.description || "—"}</td>
                  <td className="p-3">
                    <button
                      onClick={() => openEdit(r)}
                      className="text-amber-600 hover:underline"
                    >
                      Edit
                    </button>
                    {" · "}
                    <button
                      onClick={() => deleteRole(r.id)}
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
              {editing ? "Edit role" : "New role"}
            </h2>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={2}
                />
              </div>
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
