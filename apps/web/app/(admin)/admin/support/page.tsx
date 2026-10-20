import Link from "next/link";
import { requireAdmin } from "@/lib/db/admin";
import { Button } from "@/components/ui/button";
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
    <>
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
          className="border-cream-100/10 bg-charcoal-850 text-cream-50 placeholder:text-text-muted min-w-0 flex-1 rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
        <Button type="submit" variant="brand" size="sm">
          Search
        </Button>
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
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-cream-50 wrap-anywhere font-semibold">
                      {user.displayName ?? user.email}
                    </p>
                    <p className="text-text-muted wrap-anywhere text-sm">
                      {user.email}
                    </p>
                    <p className="text-text-muted mt-1 break-all font-mono text-xs">
                      {user.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {user.isOwner && (
                      <span className="bg-lime-400/10 text-lime-400 rounded-full px-2 py-0.5 text-xs font-medium">
                        owner
                      </span>
                    )}
                    {user.isAdmin && !user.isOwner && (
                      <span className="bg-warning/10 text-warning rounded-full px-2 py-0.5 text-xs font-medium">
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
    </>
  );
}
