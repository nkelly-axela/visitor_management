"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Mode = "signin" | "signout";
type GuestKind = "visitor" | "guest";

interface StaffOption {
  id: string;
  name: string;
}

interface OpenVisit {
  id: string;
  visitor_type: GuestKind;
  name: string;
  company: string | null;
  signed_in_at: string;
}

export default function GuestKioskPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [kind, setKind] = useState<GuestKind>("visitor");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [hostName, setHostName] = useState("");
  const [purpose, setPurpose] = useState("");

  const [search, setSearch] = useState("");
  const [openVisits, setOpenVisits] = useState<OpenVisit[]>([]);

  useEffect(() => {
    fetch("/api/staff?active=1")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []));
  }, []);

  useEffect(() => {
    if (mode !== "signout") return;
    const q = search.trim();
    if (!q) {
      setOpenVisits([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/visits?type=guest,visitor&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setOpenVisits(d.visits ?? []));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, mode]);

  function resetForm() {
    setName("");
    setCompany("");
    setHostName("");
    setPurpose("");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const body =
      kind === "visitor"
        ? { visitorType: "visitor", name, company, hostName, purpose: purpose || undefined }
        : { visitorType: "guest", name, purpose };

    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? "Something went wrong." });
      return;
    }
    setMessage({ kind: "success", text: `Thanks, ${name}. You're signed in. Please take a seat.` });
    resetForm();
  }

  async function handleSignOut(visit: OpenVisit) {
    setSubmitting(true);
    setMessage(null);
    const res = await fetch(`/api/visits/${visit.id}`, { method: "PATCH" });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? "Something went wrong." });
      return;
    }
    setMessage({ kind: "success", text: `Goodbye, ${visit.name}. You're signed out.` });
    setSearch("");
    setOpenVisits([]);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Visitor / Guest</h1>
        </div>

        <div className="flex gap-2">
          <button
            className={mode === "signin" ? "btn-primary flex-1" : "btn-secondary flex-1"}
            onClick={() => {
              setMode("signin");
              setMessage(null);
            }}
          >
            Sign In
          </button>
          <button
            className={mode === "signout" ? "btn-primary flex-1" : "btn-secondary flex-1"}
            onClick={() => {
              setMode("signout");
              setMessage(null);
            }}
          >
            Sign Out
          </button>
        </div>

        {mode === "signin" && (
          <form className="card p-6 space-y-4" onSubmit={handleSignIn}>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                className={kind === "visitor" ? "btn-primary flex-1 py-1.5" : "btn-secondary flex-1 py-1.5"}
                onClick={() => setKind("visitor")}
              >
                Visitor
              </button>
              <button
                type="button"
                className={kind === "guest" ? "btn-primary flex-1 py-1.5" : "btn-secondary flex-1 py-1.5"}
                onClick={() => setKind("guest")}
              >
                Other Guest
              </button>
            </div>

            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            {kind === "visitor" ? (
              <>
                <div>
                  <label className="label">Company</label>
                  <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Who are you here to see?</label>
                  <input
                    className="input"
                    list="host-list"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    required
                  />
                  <datalist id="host-list">
                    {staff.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Purpose of visit (optional)</label>
                  <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                </div>
              </>
            ) : (
              <div>
                <label className="label">Purpose of visit</label>
                <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
              </div>
            )}

            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {mode === "signout" && (
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Search your name</label>
              <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
            <ul className="space-y-2">
              {openVisits.map((v) => (
                <li key={v.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                  <div>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-sm text-slate-500">
                      {v.company ? `${v.company} · ` : ""}
                      Signed in {new Date(v.signed_in_at).toLocaleTimeString("en-GB")}
                    </p>
                  </div>
                  <button className="btn-danger py-1.5" disabled={submitting} onClick={() => handleSignOut(v)}>
                    Sign Out
                  </button>
                </li>
              ))}
              {search.trim() && openVisits.length === 0 && (
                <p className="text-sm text-slate-400">No matching signed-in visitor found.</p>
              )}
            </ul>
          </div>
        )}

        {message && (
          <p
            className={
              (message.kind === "success" ? "text-green-600" : "text-red-600") + " font-medium text-center"
            }
          >
            {message.text}
          </p>
        )}

        <Link href="/" className="block text-center text-sm text-slate-400 hover:text-slate-600 underline">
          Back
        </Link>
      </div>
    </main>
  );
}
