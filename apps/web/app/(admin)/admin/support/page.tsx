import Link from "next/link";
import { requireAdmin } from "@/lib/db/admin";
import { searchUsers } from "@/lib/db/support";

export default async function AdminSupportSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const users = q ? await searchUsers(q) : [];

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Support</h1>
        <p className="text-text-secondary mt-2">
          Search users by email or user ID.
        </p>
      </div>

      <form
        method="GET"
        action="/admin/support"
        className="mb-8 flex max-w-xl gap-3"
      >
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="email or user ID"
          className="border-cream-100/10 bg-charcoal-850 text-cream-50 placeholder:text-text-muted flex-1 rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
        <button
          type="submit"
          className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 rounded-xl px-4 py-2 text-sm font-semibold transition"
        >
          Search
        </button>
      </form>

      {q ? (
        <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border">
          {users.length === 0 ? (
            <p className="text-text-secondary p-6">No users found.</p>
          ) : (
            <ul className="divide-cream-100/10 divide-y">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="text-cream-50 font-semibold">
                      {user.displayName ?? user.email}
                    </p>
                    <p className="text-text-muted text-sm">{user.email}</p>
                    <p className="text-text-muted text-xs font-mono mt-1">
                      {user.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.isOwner && (
                      <span className="bg-lime-400/10 text-lime-400 rounded-full px-2 py-0.5 text-xs font-medium">
                        owner
                      </span>
                    )}
                    {user.isAdmin && !user.isOwner && (
                      <span className="bg-amber-400/10 text-amber-400 rounded-full px-2 py-0.5 text-xs font-medium">
                        admin
                      </span>
                    )}
                    <Link
                      href={`/admin/support/${user.id}`}
                      className="text-lime-400 hover:text-lime-300 text-sm font-medium transition"
                    >
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </main>
  );
}
