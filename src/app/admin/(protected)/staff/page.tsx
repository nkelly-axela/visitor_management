"use client";

import { useEffect, useState } from "react";
import type { OfficeStaff } from "@/types/db";

export default function StaffAdminPage() {
  const [staff, setStaff] = useState<OfficeStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaff(data.staff ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, department: department || null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setName("");
    setEmail("");
    setDepartment("");
    load();
  }

  async function toggleActive(s: OfficeStaff) {
    await fetch(`/api/staff/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Office Staff</h1>

      <form className="card p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end" onSubmit={handleAdd}>
        <div className="sm:col-span-1">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="sm:col-span-1">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="label">Department</label>
          <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <button className="btn-primary sm:col-span-1" type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add staff"}
        </button>
        {error && <p className="text-red-600 text-sm sm:col-span-4">{error}</p>}
      </form>

      <div className="card p-4">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1.5 pr-4">Name</th>
                <th className="py-1.5 pr-4">Email</th>
                <th className="py-1.5 pr-4">Department</th>
                <th className="py-1.5 pr-4">Status</th>
                <th className="py-1.5 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4">{s.name}</td>
                  <td className="py-1.5 pr-4">{s.email}</td>
                  <td className="py-1.5 pr-4">{s.department ?? "—"}</td>
                  <td className="py-1.5 pr-4">
                    <span className={s.active ? "text-green-600" : "text-slate-400"}>
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4">
                    <button className="text-brand-600 hover:underline" onClick={() => toggleActive(s)}>
                      {s.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
