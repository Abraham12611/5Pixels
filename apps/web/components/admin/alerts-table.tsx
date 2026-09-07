"use client";

import { useTransition } from "react";
import { acknowledgeAlert, resolveAlert } from "@/lib/db/alerts";
import type { AdminAlert } from "@/lib/db/alerts";

interface AlertsTableProps {
  alerts: AdminAlert[];
}

function severityClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-rose-400";
    case "warning":
      return "text-amber-400";
    default:
      return "text-lime-400";
  }
}

export function AlertsTable({ alerts }: AlertsTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleAck = (id: string) => {
    startTransition(async () => {
      await acknowledgeAlert(id);
    });
  };

  const handleResolve = (id: string) => {
    startTransition(async () => {
      await resolveAlert(id);
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-text-secondary border-cream-100/10 border-b">
            <th className="pb-2 font-medium">Time</th>
            <th className="pb-2 font-medium">Rule</th>
            <th className="pb-2 font-medium">Severity</th>
            <th className="pb-2 font-medium">Message</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-cream-100/10 divide-y">
          {alerts.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-text-secondary py-6 text-center">
                No alerts.
              </td>
            </tr>
          ) : (
            alerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-charcoal-800/50 transition">
                <td className="py-3 text-cream-100 whitespace-nowrap">
                  {new Date(alert.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-3 font-mono text-xs text-cream-100">
                  {alert.rule}
                </td>
                <td
                  className={`py-3 font-medium capitalize ${severityClass(
                    alert.severity
                  )}`}
                >
                  {alert.severity}
                </td>
                <td className="py-3 text-cream-100 max-w-md">{alert.message}</td>
                <td className="py-3">
                  {alert.acknowledgedAt ? (
                    <span className="text-text-muted text-xs">Acknowledged</span>
                  ) : (
                    <button
                      onClick={() => handleAck(alert.id)}
                      disabled={isPending}
                      className="text-lime-400 hover:text-lime-300 mr-3 text-xs font-medium transition"
                    >
                      Ack
                    </button>
                  )}
                  {alert.resolvedAt ? (
                    <span className="text-text-muted text-xs">Resolved</span>
                  ) : (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={isPending}
                      className="text-rose-400 hover:text-rose-300 text-xs font-medium transition"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
