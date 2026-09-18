import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase/server";
import type { AdminRow } from "@/types/db";

export async function requireAdmin(): Promise<{ admin: AdminRow } | { error: NextResponse }> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: NextResponse.json({ error: "Admin authentication required" }, { status: 401 }) };
  }
  return { admin };
}
