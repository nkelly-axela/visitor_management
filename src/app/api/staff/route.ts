import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

// GET /api/staff            -> full directory, admin only
// GET /api/staff?active=1   -> public: id/name/department only, for the kiosk autofill list
export async function GET(request: Request) {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "1";

  const supabase = createAdminSupabase();

  if (activeOnly) {
    const { data, error } = await supabase
      .from("office_staff")
      .select("id, name, department")
      .eq("active", true)
      .order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ staff: data });
  }

  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { data, error } = await supabase.from("office_staff").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const department = body.department ? String(body.department).trim() : null;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("office_staff")
    .insert({ name, email, department, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data }, { status: 201 });
}
