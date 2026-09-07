import { requireOwner } from "@/lib/db/admin";
import { getAdminUsers } from "@/lib/db/admin-users";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  await requireOwner();
  const users = await getAdminUsers();

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">User roles</h1>
        <p className="text-text-secondary mt-2">
          Manage admin and owner privileges. Only the owner can access this
          page.
        </p>
      </div>

      <UsersTable users={users} />
    </main>
  );
}
