import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { AdminRow } from "@/types/db";

/**
 * Session-aware client (anon key + request cookies). Use this only to find
 * out who is signed in via Supabase Auth (admin login). It is subject to
 * RLS, which denies everything by default -- use `createAdminSupabase` for data.
 *
 * Deliberately untyped (no Database generic): the installed supabase-js/ssr
 * versions' internal generic constraints are brittle without types generated
 * from a live project (`supabase gen types`). Row shapes are enforced at the
 * application layer instead, via the interfaces in `@/types/db`.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render; middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. Bypasses RLS entirely. Server-only -- never import
 * this from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Returns the signed-in admin's row from `admins`, or null if not an admin. */
export async function getCurrentAdmin(): Promise<AdminRow | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminSupabase();
  const { data } = await admin.from("admins").select("*").eq("id", user.id).maybeSingle();
  return (data as AdminRow | null) ?? null;
}
