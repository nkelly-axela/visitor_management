import { NextResponse } from "next/server";

/**
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on requests
 * it triggers for scheduled functions defined in vercel.json, as long as a
 * CRON_SECRET env var is set on the project. This checks that header so the
 * endpoint can't be triggered by anyone who finds the URL.
 */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
