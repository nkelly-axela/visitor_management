import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { sendStaffNotSignedOutAlert } from "@/lib/resend";
import { isAtOrAfterLondonTime, londonDateString, londonStartOfDayUtcIso } from "@/lib/time";

const RUN_TYPE = "staff-not-signed-out";
const TARGET_HOUR = 17;
const TARGET_MINUTE = 15;

// Vercel Cron hits this twice a day (once for GMT, once for BST -- see vercel.json)
// at :15 past the hour. We only actually act once London local time has reached
// 17:15, and only once per day, using notification_runs as a dedupe ledger.
export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const now = new Date();
  if (!isAtOrAfterLondonTime(now, TARGET_HOUR, TARGET_MINUTE)) {
    return NextResponse.json({ skipped: "not yet 17:15 London time" });
  }

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
