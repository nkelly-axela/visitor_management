import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { sendWeeklyHrReport } from "@/lib/resend";
import {
  isAtOrAfterLondonTime,
  londonDateString,
  londonDayOfWeek,
  londonStartOfDayUtcIso,
  formatLondon,
} from "@/lib/time";

const RUN_TYPE = "weekly-hr-report";
const TARGET_HOUR = 17;
const TARGET_MINUTE = 30;
const FRIDAY = 5;

// Fires every Friday afternoon (see vercel.json). Summarises the Mon-Fri just gone
// for every active office staff member. Calendar (holiday/WFH) cross-checking is
// not wired up yet -- the email notes that explicitly so HR knows to verify manually.
export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const now = new Date();
  if (londonDayOfWeek(now) !== FRIDAY || !isAtOrAfterLondonTime(now, TARGET_HOUR, TARGET_MINUTE)) {
    return NextResponse.json({ skipped: "not yet Friday 17:30 London time" });
  }

  const supabase = createAdminSupabase();
  const runDate = londonDateString(now);

  const { error: claimError } = await supabase
    .from("notification_runs")
    .insert({ run_type: RUN_TYPE, run_date: runDate });
  if (claimError) {
    return NextResponse.json({ skipped: "already sent this week" });
  }

  const mondayIso = londonStartOfDayUtcIso(mondayOf(runDate));

  const [{ data: staff, error: staffError }, { data: visits, error: visitsError }] = await Promise.all([
    supabase.from("office_staff").select("id, name, department").eq("active", true).order("name"),
    supabase
      .from("visit_logs")
      .select("*")
      .eq("visitor_type", "staff")
      .gte("signed_in_at", mondayIso)
      .order("signed_in_at"),
  ]);

  if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 });
  if (visitsError) return NextResponse.json({ error: visitsError.message }, { status: 500 });

  const perStaff = (staff ?? []).map((s) => ({
    name: s.name,
    department: s.department,
    visits: (visits ?? []).filter((v) => v.office_staff_id === s.id),
  }));

  const weekLabel = `${formatLondon(mondayIso, "d MMM")} – ${formatLondon(now, "d MMM yyyy")}`;

  const result = await sendWeeklyHrReport({ weekLabel, perStaff });
  return NextResponse.json({ sent: true, staffCount: perStaff.length, result });
}

function mondayOf(fridayIsoDate: string): string {
  const [y, m, d] = fridayIsoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 4); // Friday - 4 days = Monday
  return date.toISOString().slice(0, 10);
}
