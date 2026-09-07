import { checkAndCreateAlerts, getAlertHistory } from "@/lib/db/alerts";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { AlertsTable } from "@/components/admin/alerts-table";

export default async function AdminAlertsPage() {
  await requireAdminOrOwner();

  const [active, history] = await Promise.all([
    checkAndCreateAlerts(),
    getAlertHistory(50),
  ]);

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Alerts</h1>
        <p className="text-text-secondary mt-2">
          Operational alerts generated from live system thresholds.
        </p>
      </div>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-100 text-lg font-semibold">
          Active alerts ({active.length})
        </h2>
        <div className="mt-4">
          <AlertsTable alerts={active} />
        </div>
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 mt-8 rounded-2xl border p-6">
        <h2 className="text-cream-100 text-lg font-semibold">History</h2>
        <div className="mt-4">
          <AlertsTable alerts={history} />
        </div>
      </section>
    </main>
  );
}
