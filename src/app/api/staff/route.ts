import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { sendStaffNotSignedOutAlert } from "@/lib/resend";
import { londonDateString, londonStartOfDayUtcIso } from "@/lib/time";

const RUN_TYPE = "staff-not-signed-out";

// Vercel Cron fires this once a day at 17:15 UTC -- i.e. 5:15pm GMT exactly, as
// specified (this does not shift for British Summer Time; Vercel's Hobby plan
// only allows one run/day, so a fixed UTC time is what the plan can support).
// notification_runs still guards against a duplicate send if this is ever
// triggered manually more than once on the same day.
export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const now = new Date();
  const supabase = createAdminSupabase();
  const runDate = londonDateString(now);

  const { error: claimError } = await supabase
    .from("notification_runs")
    .insert({ run_type: RUN_TYPE, run_date: runDate });
  if (claimError) {
    // Unique constraint violation means another invocation already ran today.
    return NextResponse.json({ skipped: "already sent today" });
  }

  const { data: openStaffVisits, error } = await supabase
    .from("visit_logs")
    .select("*")
    .eq("visitor_type", "staff")
    .is("signed_out_at", null)
    .gte("signed_in_at", londonStartOfDayUtcIso(runDate));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = await sendStaffNotSignedOutAlert(openStaffVisits ?? []);
  return NextResponse.json({ sent: true, count: openStaffVisits?.length ?? 0, result });
}
