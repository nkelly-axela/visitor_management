import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome</h1>
          <p className="text-slate-600 mt-2">Please sign in below.</p>
        </div>

        <div className="grid gap-4">
          <Link href="/kiosk/staff" className="btn-primary text-lg py-5">
            Office Staff
          </Link>
          <Link href="/kiosk/guest" className="btn-secondary text-lg py-5">
            Visitor / Guest
          </Link>
        </div>

        <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-600 underline">
          Admin
        </Link>
      </div>
    </main>
  );
}
