"use client";

import { ChartBar } from "@phosphor-icons/react";

export interface UsageDay {
  date: string;
  credits: number;
}

interface UsageCardProps {
  days: UsageDay[];
}

function usageBarHeight(usage: number, maxUsage: number): string {
  if (usage <= 0) return "0px";
  if (maxUsage <= 0) return "0px";
  const percent = Math.min(100, (usage / maxUsage) * 100);
  return `${percent}%`;
}

export function UsageCard({ days }: UsageCardProps) {
  const maxUsage = Math.max(...days.map((day) => day.credits));

  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
      <div className="flex items-start gap-3">
        <div className="bg-lime-500/20 text-lime-300 rounded-xl p-2.5">
          <ChartBar size={22} weight="fill" />
        </div>
        <div>
          <h2 className="text-cream-100 text-lg font-semibold">Usage</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Credit spend over the last 7 days.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-cream-100/10 bg-charcoal-900 p-5">
        {days.every((day) => day.credits === 0) ? (
          <div className="py-10 text-center">
            <p className="text-text-secondary">No usage data yet</p>
            <p className="text-text-muted mt-1 text-sm">
              Spend credits on presets to see the breakdown.
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-24 items-end justify-between gap-2">
              {days.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center h-full justify-end gap-1.5">
                  <div
                    className="w-full max-w-[36px] rounded-t-lg bg-lime-400 transition-all hover:bg-lime-300"
                    style={{
                      height: usageBarHeight(day.credits, maxUsage),
                    }}
                  />
                  <span className="text-text-muted text-[11px]">
                    {day.date}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
