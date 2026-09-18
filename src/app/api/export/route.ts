import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { toCsv } from "@/lib/csv";
import { formatLondon } from "@/lib/time";
import type { VisitorType } from "@/types/db";

const VISITOR_TYPES: VisitorType[] = ["staff", "guest", "visitor"];

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const url = new URL(request.url);
  const officeStaffId = url.searchParams.get("officeStaffId");
  const typesParam = url.searchParams.get("type");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const supabase = createAdminSupabase();
  let query = supabase
    .from("visit_logs")
    .select("*")
    .order("signed_in_at", { ascending: false })
    .limit(5000);

  if (officeStaffId) query = query.eq("office_staff_id", officeStaffId);
  if (typesParam) {
    const types = typesParam.split(",").filter((t): t is VisitorType => VISITOR_TYPES.includes(t as VisitorType));
    if (types.length) query = query.in("visitor_type", types);
  }
  if (from) query = query.gte("signed_in_at", from);
  if (to) query = query.lte("signed_in_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCsv(
    ["Type", "Name", "Company", "Purpose", "Host", "Signed in", "Signed out"],
    (data ?? []).map((v) => [
      v.visitor_type,
      v.name,
      v.company,
      v.purpose,
      v.host_name,
      formatLondon(v.signed_in_at),
      v.signed_out_at ? formatLondon(v.signed_out_at) : "still signed in",
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visitor-log-export.csv"`,
    },
  });
}
