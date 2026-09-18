"use client";

import { useEffect, useMemo, useState } from "react";
import type { OfficeStaff, VisitLog, VisitorType } from "@/types/db";

const TYPE_OPTIONS: { value: VisitorType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "staff", label: "Staff" },
  { value: "guest", label: "Guests" },
  { value: "visitor", label: "Visitors" },
];

export default function LogsAdminPage() {
  const [staff, setStaff] = useState<OfficeStaff[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<VisitorType | "all">("all");
  const [officeStaffId, setOfficeStaffId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []));
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (officeStaffId) params.set("officeStaffId", officeStaffId);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    if (q) params.set("q", q);
    return params.toString();
  }, [type, officeStaffId, from, to, q]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audit/visits?${query}`)
      .then((r) => r.json())
      .then((d) => setVisits(d.visits ?? []))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit &amp; Export</h1>
        <a className="btn-primary" href={`/api/export?${query}`}>
          Export CSV
        </a>
      </div>

      <div className="card p-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as VisitorType | "all")}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Person</label>
          <select className="input" value={officeStaffId} onChange={(e) => setOfficeStaffId(e.target.value)}>
            <option value="">All staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Search name</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name..." />
        </div>
      </div>

      <div className="card p-4">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : visits.length === 0 ? (
          <p className="text-slate-400 text-sm">No records match these filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1.5 pr-4">Type</th>
                <th className="py-1.5 pr-4">Name</th>
                <th className="py-1.5 pr-4">Company</th>
                <th className="py-1.5 pr-4">Purpose / Host</th>
                <th className="py-1.5 pr-4">Signed in</th>
                <th className="py-1.5 pr-4">Signed out</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4 capitalize">{v.visitor_type}</td>
                  <td className="py-1.5 pr-4">{v.name}</td>
                  <td className="py-1.5 pr-4">{v.company ?? "—"}</td>
                  <td className="py-1.5 pr-4">{v.purpose ?? v.host_name ?? "—"}</td>
                  <td className="py-1.5 pr-4">{new Date(v.signed_in_at).toLocaleString("en-GB")}</td>
                  <td className="py-1.5 pr-4">
                    {v.signed_out_at ? (
                      new Date(v.signed_out_at).toLocaleString("en-GB")
                    ) : (
                      <span className="text-amber-600">Still signed in</span>
                    )}
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
