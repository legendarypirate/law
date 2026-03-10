"use client";

import { useEffect, useState } from "react";

type Client = { id: string; name: string; email: string | null };
type User = { id: string; name: string; email: string };
type CaseItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  client: Client;
  assignedTo: User | null;
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  PENDING: "Pending",
  CLOSED: "Closed",
};

export default function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<"closed" | "create" | "edit">("closed");
  const [editing, setEditing] = useState<CaseItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [clientId, setClientId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchCases = async () => {
    const url = statusFilter
      ? `/api/cases?status=${encodeURIComponent(statusFilter)}`
      : "/api/cases";
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) setCases(data);
    setLoading(false);
  };

  const fetchClients = async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    if (res.ok) {
      setClients(data);
      if (!clientId && data.length) setClientId(data[0].id);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) {
      setUsers(data);
      if (!assignedToId) setAssignedToId("");
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCases();
  }, [statusFilter]);

  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setStatus("OPEN");
    setClientId(clients[0]?.id || "");
    setAssignedToId("");
    setError("");
    setModal("create");
  };

  const openEdit = (c: CaseItem) => {
    setEditing(c);
    setTitle(c.title);
    setDescription(c.description || "");
    setStatus(c.status);
    setClientId(c.client.id);
    setAssignedToId(c.assignedTo?.id || "");
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
    const url = editing ? `/api/cases/${editing.id}` : "/api/cases";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        status,
        clientId,
        assignedToId: assignedToId || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Request failed");
      return;
    }
    closeModal();
    fetchCases();
  };

  const deleteCase = async (id: string) => {
    if (!confirm("Delete this case?")) return;
    const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
    if (res.ok) fetchCases();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-slate-800">Cases</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Add case
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 font-medium text-slate-700">Title</th>
                <th className="p-3 font-medium text-slate-700">Client</th>
                <th className="p-3 font-medium text-slate-700">Status</th>
                <th className="p-3 font-medium text-slate-700">Assigned to</th>
                <th className="p-3 font-medium text-slate-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3 text-slate-600">{c.client.name}</td>
                  <td className="p-3">
                    <span
                      className={
                        c.status === "CLOSED"
                          ? "text-slate-500"
                          : c.status === "IN_PROGRESS"
                            ? "text-amber-600"
                            : "text-slate-700"
                      }
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {c.assignedTo?.name ?? "—"}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-amber-600 hover:underline"
                    >
                      Edit
                    </button>
                    {" · "}
                    <button
                      onClick={() => deleteCase(c.id)}
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
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="font-serif text-lg font-semibold text-slate-800">
              {editing ? "Edit case" : "New case"}
            </h2>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
              <div>
                <label className="block text-sm font-medium text-slate-700">Client *</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Assigned to</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
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
