"use client";

import { useEffect, useState } from "react";

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
  const [modal, setModal] = useState<"closed" | "create" | "edit">("closed");
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
    const url = search ? `/api/clients?q=${encodeURIComponent(search)}` : "/api/clients";
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
    setModal("create");
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
      setError(data.error || "Request failed");
      return;
    }
    closeModal();
    fetchClients();
  };

  const deleteClient = async (id: string) => {
    if (!confirm("Delete this client? Associated cases may be affected.")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) fetchClients();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-slate-800">Clients</h1>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={openCreate}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Add client
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
                <th className="p-3 font-medium text-slate-700">Name</th>
                <th className="p-3 font-medium text-slate-700">Email</th>
                <th className="p-3 font-medium text-slate-700">Phone</th>
                <th className="p-3 font-medium text-slate-700">Company</th>
                <th className="p-3 font-medium text-slate-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-slate-600">{c.email || "—"}</td>
                  <td className="p-3 text-slate-600">{c.phone || "—"}</td>
                  <td className="p-3 text-slate-600">{c.company || "—"}</td>
                  <td className="p-3">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-amber-600 hover:underline"
                    >
                      Edit
                    </button>
                    {" · "}
                    <button
                      onClick={() => deleteClient(c.id)}
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
              {editing ? "Edit client" : "New client"}
            </h2>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Company</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
