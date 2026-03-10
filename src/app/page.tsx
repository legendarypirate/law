import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="mb-2 font-serif text-2xl font-semibold text-slate-800">
        Dashboard
      </h1>
      <p className="mb-8 text-slate-600">
        Law firm internal system — manage cases, clients, users, and roles.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card href="/cases" title="Cases" desc="View and manage matters" />
        <Card href="/clients" title="Clients" desc="Client directory" />
        <Card href="/users" title="Users" desc="Staff and permissions" />
        <Card href="/roles" title="Roles" desc="Role definitions" />
      </div>
    </div>
  );
}

function Card({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-200 hover:shadow"
    >
      <h2 className="font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </Link>
  );
}
