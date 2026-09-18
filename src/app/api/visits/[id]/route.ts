import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

// Public sign-out endpoint: kiosk calls this with the visit id the person picked
// from their own open-visit list (see GET /api/visits). It can only ever set
// signed_out_at on an already-open record, so it cannot rewrite history.
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from("visit_logs")
    .select("id, signed_out_at")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  if (existing.signed_out_at) {
    return NextResponse.json({ error: "Already signed out" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("visit_logs")
    .update({ signed_out_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visit: data });
}
