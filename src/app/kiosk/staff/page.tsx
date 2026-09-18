"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface StaffOption {
  id: string;
  name: string;
  department: string | null;
}

interface OpenVisit {
  id: string;
  name: string;
  signed_in_at: string;
}

export default function StaffKioskPage() {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StaffOption | null>(null);
  const [openVisit, setOpenVisit] = useState<OpenVisit | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/staff?active=1")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []))
      .catch(() => setMessage({ kind: "error", text: "Could not load staff list." }));
  }, []);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return staff.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, staff]);

  async function selectStaff(s: StaffOption) {
    setSelected(s);
    setQuery(s.name);
    setMessage(null);
    setOpenVisit(undefined);
    const res = await fetch(`/api/visits?officeStaffId=${s.id}`);
    const data = await res.json();
    setOpenVisit(data.visits?.[0] ?? null);
  }

  function reset() {
    setSelected(null);
    setQuery("");
    setOpenVisit(undefined);
  }

  async function handleSignIn() {
    if (!selected) return;
    setSubmitting(true);
    setMessage(null);
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorType: "staff", officeStaffId: selected.id }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? "Something went wrong." });
      return;
    }
    setMessage({ kind: "success", text: `Welcome, ${selected.name}. You're signed in.` });
    reset();
  }

  async function handleSignOut() {
    if (!openVisit) return;
    setSubmitting(true);
    setMessage(null);
    const res = await fetch(`/api/visits/${openVisit.id}`, { method: "PATCH" });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? "Something went wrong." });
      return;
    }
    setMessage({ kind: "success", text: `See you later, ${selected?.name}. You're signed out.` });
    reset();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Office Staff Sign In / Out</h1>
          <p className="text-slate-600 mt-1">Start typing your name and select yourself from the list.</p>
        </div>

        <div className="card p-6 space-y-4">
          <div className="relative">
            <label className="label">Your name</label>
            <input
              className="input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setOpenVisit(undefined);
              }}
              placeholder="Start typing..."
              autoComplete="off"
            />
            {query && !selected && matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full card max-h-56 overflow-auto">
                {matches.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-100"
                      onClick={() => selectStaff(s)}
                    >
                      {s.name}
                      {s.department && <span className="text-slate-400 text-sm"> &middot; {s.department}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query && !selected && matches.length === 0 && (
              <p className="text-sm text-slate-400 mt-1">No matching staff found.</p>
            )}
          </div>

          {selected && openVisit === undefined && <p className="text-sm text-slate-500">Checking status...</p>}

          {selected && openVisit === null && (
            <button className="btn-primary w-full" disabled={submitting} onClick={handleSignIn}>
              {submitting ? "Signing in..." : `Sign in as ${selected.name}`}
            </button>
          )}

          {selected && openVisit && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Signed in at {new Date(openVisit.signed_in_at).toLocaleTimeString("en-GB")}.
              </p>
              <button className="btn-danger w-full" disabled={submitting} onClick={handleSignOut}>
                {submitting ? "Signing out..." : `Sign out ${selected.name}`}
              </button>
            </div>
          )}

          {message && (
            <p className={message.kind === "success" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {message.text}
            </p>
          )}
        </div>

        <Link href="/" className="block text-center text-sm text-slate-400 hover:text-slate-600 underline">
          Back
        </Link>
      </div>
    </main>
  );
}
