import { createAdminSupabase } from "@/lib/supabase/server";
import { formatLondon } from "@/lib/time";
import type { VisitLog } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createAdminSupabase();
  const { data: open } = await supabase
    .from("visit_logs")
    .select("*")
    .is("signed_out_at", null)
    .order("signed_in_at", { ascending: false });

  const openVisits = (open ?? []) as VisitLog[];
  const staffIn = openVisits.filter((v) => v.visitor_type === "staff");
  const guestsIn = openVisits.filter((v) => v.visitor_type !== "staff");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="card p-4">
          <p className="text-slate-500 text-sm">Staff currently in</p>
          <p className="text-3xl font-bold">{staffIn.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-slate-500 text-sm">Guests / visitors currently in</p>
          <p className="text-3xl font-bold">{guestsIn.length}</p>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Currently signed in</h2>
        {openVisits.length === 0 ? (
          <p className="text-slate-400 text-sm">Nobody is currently signed in.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1.5 pr-4">Type</th>
                <th className="py-1.5 pr-4">Name</th>
                <th className="py-1.5 pr-4">Details</th>
                <th className="py-1.5 pr-4">Signed in</th>
              </tr>
            </thead>
            <tbody>
              {openVisits.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4 capitalize">{v.visitor_type}</td>
                  <td className="py-1.5 pr-4">{v.name}</td>
                  <td className="py-1.5 pr-4 text-slate-500">
                    {v.company ? `${v.company} ` : ""}
                    {v.host_name ? `→ ${v.host_name}` : ""}
                    {v.purpose ? v.purpose : ""}
                  </td>
                  <td className="py-1.5 pr-4">{formatLondon(v.signed_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
