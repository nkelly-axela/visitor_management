import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.email === "string") updates.email = body.email.trim().toLowerCase();
  if (typeof body.department === "string" || body.department === null) {
    updates.department = body.department ? String(body.department).trim() : null;
  }
  if (typeof body.active === "boolean") updates.active = body.active;

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("office_staff")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const supabase = createAdminSupabase();
  // Soft-delete: deactivate rather than remove, so historical visit_logs keep a valid reference.
  const { error } = await supabase.from("office_staff").update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
