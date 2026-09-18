import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase, getCurrentAdmin } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const admin = await getCurrentAdmin();

  if (!admin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">Access denied</h1>
        <p className="text-slate-600 max-w-sm">
          Your account ({user.email}) is signed in but is not registered as an admin. Ask an existing admin to add
          you to the <code className="bg-slate-100 px-1 rounded">admins</code> table.
        </p>
        <SignOutButton />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-slate-200 p-4 flex flex-col gap-1">
        <p className="font-bold text-lg mb-4">Admin</p>
        <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-slate-100">
          Dashboard
        </Link>
        <Link href="/admin/staff" className="px-3 py-2 rounded-lg hover:bg-slate-100">
          Office Staff
        </Link>
        <Link href="/admin/logs" className="px-3 py-2 rounded-lg hover:bg-slate-100">
          Audit & Export
        </Link>
        <Link href="/" className="px-3 py-2 rounded-lg hover:bg-slate-100 mt-4 text-slate-500">
          Kiosk view
        </Link>
        <div className="mt-auto pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-2 truncate">{admin.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
