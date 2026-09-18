import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import type { VisitorType } from "@/types/db";

const VISITOR_TYPES: VisitorType[] = ["staff", "guest", "visitor"];

// Public, deliberately narrow: only ever returns currently-open visits, and
// only the fields the kiosk UI needs to let someone find their own record to sign out.
// Full history lives behind /api/audit/visits, which requires an admin session.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const officeStaffId = url.searchParams.get("officeStaffId");
  const typesParam = url.searchParams.get("type");
  const q = url.searchParams.get("q")?.trim();

  const supabase = createAdminSupabase();
  let query = supabase
    .from("visit_logs")
    .select("id, visitor_type, name, company, host_name, signed_in_at, office_staff_id")
    .is("signed_out_at", null)
    .order("signed_in_at", { ascending: false })
    .limit(50);

  if (officeStaffId) query = query.eq("office_staff_id", officeStaffId);

  if (typesParam) {
    const types = typesParam.split(",").filter((t): t is VisitorType => VISITOR_TYPES.includes(t as VisitorType));
    if (types.length) query = query.in("visitor_type", types);
  }

  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visits: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const visitorType = body.visitorType as VisitorType;

  if (!VISITOR_TYPES.includes(visitorType)) {
    return NextResponse.json({ error: "Invalid visitor type" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  if (visitorType === "staff") {
    const officeStaffId = String(body.officeStaffId ?? "");
    if (!officeStaffId) return NextResponse.json({ error: "officeStaffId is required" }, { status: 400 });

    const { data: staff, error: staffError } = await supabase
      .from("office_staff")
      .select("id, name, active")
      .eq("id", officeStaffId)
      .maybeSingle();
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 });
    if (!staff || !staff.active) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    const { data: existingOpen } = await supabase
      .from("visit_logs")
      .select("id")
      .eq("office_staff_id", officeStaffId)
      .is("signed_out_at", null)
      .maybeSingle();
    if (existingOpen) {
      return NextResponse.json({ error: "Already signed in. Please sign out first." }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("visit_logs")
      .insert({ visitor_type: "staff", office_staff_id: staff.id, name: staff.name })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ visit: data }, { status: 201 });
  }

  if (visitorType === "guest") {
    const name = String(body.name ?? "").trim();
    const purpose = String(body.purpose ?? "").trim();
    if (!name || !purpose) {
      return NextResponse.json({ error: "Name and purpose are required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("visit_logs")
      .insert({ visitor_type: "guest", name, purpose })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ visit: data }, { status: 201 });
  }

  // visitor
  const name = String(body.name ?? "").trim();
  const company = String(body.company ?? "").trim();
  const hostName = String(body.hostName ?? "").trim();
  const purpose = body.purpose ? String(body.purpose).trim() : null;
  if (!name || !company || !hostName) {
    return NextResponse.json({ error: "Name, company, and host are required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("visit_logs")
    .insert({ visitor_type: "visitor", name, company, host_name: hostName, purpose })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visit: data }, { status: 201 });
}
