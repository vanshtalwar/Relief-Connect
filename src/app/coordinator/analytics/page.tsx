"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { categoryLabels, urgencyMeta, Category, Urgency } from "@/lib/constants";

type AnalyticsData = {
  totalRequests: number;
  resolvedRequests: number;
  openRequests: number;
  activeRequests: number;
  activeVolunteersCount: number;
  resolutionRate: number;
  avgResponseTimeMinutes: number;
  categoryBreakdown: { category: string; count: number }[];
  urgencyBreakdown: { urgency: string; count: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json();
      })
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <AppShell
      title="Analytics Dashboard"
      subtitle="High-level metrics and performance tracking for emergency response operations."
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]/50">
            Loading analytics data...
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-red-400/30 bg-red-400/10 text-red-400">
            {error}
          </div>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Requests"
                value={data.totalRequests.toString()}
                trend={`${data.activeRequests} active`}
                color="blue"
              />
              <StatCard
                title="Resolution Rate"
                value={`${data.resolutionRate.toFixed(1)}%`}
                trend={`${data.resolvedRequests} resolved`}
                color="emerald"
              />
              <StatCard
                title="Avg Response Time"
                value={`${data.avgResponseTimeMinutes} min`}
                trend="Time to claim"
                color="amber"
              />
              <StatCard
                title="Active Volunteers"
                value={data.activeVolunteersCount.toString()}
                trend="Total pool"
                color="purple"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass-panel rounded-3xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">Requests by Category</h3>
                <div className="space-y-4">
                  {data.categoryBreakdown.map((item) => {
                    const percentage = data.totalRequests > 0 ? (item.count / data.totalRequests) * 100 : 0;
                    return (
                      <div key={item.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[color:var(--foreground)]">{categoryLabels[item.category as Category] || item.category}</span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">Requests by Urgency</h3>
                <div className="space-y-4">
                  {data.urgencyBreakdown.map((item) => {
                    const percentage = data.totalRequests > 0 ? (item.count / data.totalRequests) * 100 : 0;
                    const urgencyStyle = item.urgency === "CRITICAL" ? "bg-red-500" : item.urgency === "HIGH" ? "bg-orange-500" : item.urgency === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500";
                    return (
                      <div key={item.urgency}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[color:var(--foreground)]">{urgencyMeta[item.urgency as Urgency]?.label || item.urgency}</span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${urgencyStyle}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, trend, color }: { title: string; value: string; trend: string; color: "blue" | "emerald" | "amber" | "purple" }) {
  const colorStyles = {
    blue: "text-blue-500 dark:text-blue-400 border-blue-400/20 bg-blue-400/5",
    emerald: "text-emerald-500 dark:text-emerald-400 border-emerald-400/20 bg-emerald-400/5",
    amber: "text-amber-500 dark:text-amber-400 border-amber-400/20 bg-amber-400/5",
    purple: "text-purple-500 dark:text-purple-400 border-purple-400/20 bg-purple-400/5",
  };

  return (
    <div className={`glass-panel rounded-3xl p-5 border ${colorStyles[color]}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        {title}
      </h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-4xl font-bold tracking-tight ${colorStyles[color].split(" ")[0]}`}>
          {value}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {trend}
      </p>
    </div>
  );
}
