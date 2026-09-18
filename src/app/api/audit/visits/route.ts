import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
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
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 1000);

  const supabase = createAdminSupabase();
  let query = supabase
    .from("visit_logs")
    .select("*")
    .order("signed_in_at", { ascending: false })
    .limit(limit);

  if (officeStaffId) query = query.eq("office_staff_id", officeStaffId);
  if (typesParam) {
    const types = typesParam.split(",").filter((t): t is VisitorType => VISITOR_TYPES.includes(t as VisitorType));
    if (types.length) query = query.in("visitor_type", types);
  }
  if (from) query = query.gte("signed_in_at", from);
  if (to) query = query.lte("signed_in_at", to);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visits: data });
}
