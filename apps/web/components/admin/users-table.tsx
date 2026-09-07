"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "@/lib/db/admin-users";
import type { AdminUser } from "@/lib/db/admin-users";

interface UsersTableProps {
  users: AdminUser[];
}

export function UsersTable({ users }: UsersTableProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const toggle = async (
    userId: string,
    field: "isAdmin" | "isOwner" | "status",
    value: unknown
  ) => {
    setMessage("");
    const input: {
      userId: string;
      isAdmin?: boolean;
      isOwner?: boolean;
      status?: string;
    } = { userId };

    if (field === "isAdmin") input.isAdmin = value as boolean;
    if (field === "isOwner") input.isOwner = value as boolean;
    if (field === "status") input.status = value as string;

    startTransition(async () => {
      const result = await updateUserRole(input);
      if (!result.success) {
        setMessage(result.error ?? "Update failed.");
      } else {
        setMessage("User updated.");
      }
    });
  };

  return (
    <div>
      {message && (
        <p
          className={`mb-4 text-sm ${
            message === "User updated." ? "text-lime-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}

      <div className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="text-text-secondary border-cream-100/10 border-b bg-charcoal-900/50">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-cream-100/10 divide-y">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-text-secondary px-4 py-8 text-center"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-charcoal-800/50 transition">
                    <td className="text-cream-100 px-4 py-3">
                      {user.email ?? "no email"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.status ?? "active"}
                        disabled={pending}
                        onChange={(e) =>
                          toggle(user.id, "status", e.target.value)
                        }
                        className="border-cream-100/10 bg-charcoal-900 text-cream-50 rounded-lg border px-2 py-1 text-xs"
                      >
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                        <option value="deleted">deleted</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={user.isAdmin}
                        disabled={pending}
                        onChange={(e) =>
                          toggle(user.id, "isAdmin", e.target.checked)
                        }
                        className="h-5 w-5 rounded text-lime-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={user.isOwner}
                        disabled={pending}
                        onChange={(e) =>
                          toggle(user.id, "isOwner", e.target.checked)
                        }
                        className="h-5 w-5 rounded text-lime-500"
                      />
                    </td>
                    <td className="text-text-muted px-4 py-3 text-xs">
                      {new Date(user.createdAt).toLocaleDateString("en-US")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
