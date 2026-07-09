"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AnalyticsDashboard({ summary }: { summary: { total: number; open: number; claimed: number; resolved: number; activeVolunteers: number; resolutionRate: number; requestSeries: Array<{ label: string; value: number }>; categorySeries: Array<{ name: string; value: number }> } }) {
  const router = useRouter();
  const pieColors = ["#38bdf8", "#0f766e", "#f97316", "#dc2626", "#16a34a", "#eab308"];

  const [modalFilter, setModalFilter] = useState<{ type: "category" | "date" | "status" | "all"; value: string } | null>(null);
  const [modalRequests, setModalRequests] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    if (!modalFilter) return;
    setIsModalLoading(true);
    
    // For 'all' filter, we don't pass a query param so it fetches all
    const query = modalFilter.type === "all" ? "" : `?${modalFilter.type}=${modalFilter.value}`;
    
    fetch(`/api/requests${query}`)
      .then(res => res.json())
      .then(data => {
        setModalRequests(data.requests || []);
      })
      .catch(err => console.error("Error fetching filtered requests:", err))
      .finally(() => setIsModalLoading(false));
  }, [modalFilter]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <StatGrid summary={summary} onStatClick={setModalFilter} />
      <div className="glass-panel rounded-3xl p-5">
        <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Requests over time</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <AreaChart
              data={summary.requestSeries}
              onClick={(data) => {
                const activeLabel = data?.activeLabel;
                if (activeLabel) {
                  setModalFilter({ type: "date", value: activeLabel });
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--foreground)" opacity={0.55} />
              <YAxis stroke="var(--foreground)" opacity={0.55} />
              <Tooltip contentStyle={{ background: "var(--panel-strong)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 16 }} />
              <Area type="monotone" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-panel rounded-3xl p-5">
        <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Requests by category</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart
              data={summary.categorySeries}
              onClick={(data) => {
                const activeLabel = data?.activeLabel;
                if (activeLabel) {
                  setModalFilter({ type: "category", value: activeLabel });
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--foreground)" opacity={0.55} />
              <YAxis stroke="var(--foreground)" opacity={0.55} />
              <Tooltip contentStyle={{ background: "var(--panel-strong)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 16 }} />
              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {summary.categorySeries.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {modalFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-[color:var(--background)] rounded-3xl border border-[color:var(--border)] shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-6 border-b border-[color:var(--border)]">
              <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
                {modalFilter.type === "category" ? `${modalFilter.value} requests` : 
                 modalFilter.type === "date" ? `Requests on ${modalFilter.value}` : 
                 modalFilter.type === "status" ? `${modalFilter.value} requests` : 
                 "All requests"}
              </h3>
              <button 
                onClick={() => setModalFilter(null)}
                className="text-slate-400 hover:text-slate-200 transition p-2 rounded-full hover:bg-[color:var(--surface-strong)]"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isModalLoading ? (
                <div className="text-center py-8 text-slate-500">Loading requests...</div>
              ) : modalRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No requests found for this filter.</div>
              ) : (
                modalRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-sky-500/30 transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-400">{req.category}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-200">{req.title}</h4>
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">{req.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full border ${req.status === 'OPEN' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : req.status === 'RESOLVED' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-sky-500/30 text-sky-400 bg-sky-500/10'}`}>
                        {req.status}
                      </span>
                      <button onClick={() => router.push(`/requests/${req.id}`)} className="text-sm font-medium text-sky-400 hover:text-sky-300 transition">View full details →</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatGrid({ summary, onStatClick }: { summary: { total: number; open: number; claimed: number; resolved: number; activeVolunteers: number; resolutionRate: number }; onStatClick: (filter: {type: any, value: string}) => void }) {
  const stats = [
    { label: "Total requests", value: summary.total, desc: "Cumulative requests logged", color: "text-slate-800 dark:text-slate-200 border-slate-700/50 hover:border-slate-400/30", filter: { type: "all", value: "All" } },
    { label: "Open status", value: summary.open, desc: "Pending volunteer review", color: "text-amber-400 border-amber-500/20 hover:border-amber-400/40", filter: { type: "status", value: "OPEN" } },
    { label: "Claimed / active", value: summary.claimed, desc: "Volunteers currently on-site", color: "text-sky-400 border-sky-500/20 hover:border-sky-400/40", filter: { type: "status", value: "CLAIMED" } },
    { label: "Resolved requests", value: summary.resolved, desc: "Disaster recovery complete", color: "text-emerald-400 border-emerald-500/20 hover:border-emerald-400/40", filter: { type: "status", value: "RESOLVED" } },
    { label: "Active volunteers", value: summary.activeVolunteers, desc: "Helpers deployed in field", color: "text-indigo-400 border-indigo-500/20 hover:border-indigo-400/40", filter: null },
    { label: "Resolution rate", value: `${summary.resolutionRate}%`, desc: "Disaster response success rate", color: "text-teal-400 border-teal-500/20 hover:border-teal-400/40", filter: null },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {stats.map((stat) => (
        <div 
          key={stat.label} 
          onClick={() => stat.filter && onStatClick(stat.filter)}
          className={`glass-panel rounded-3xl p-5 border transition duration-300 ${stat.filter ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${stat.color}`}
        >
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">{stat.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
          <p className="mt-1.5 text-xs text-slate-400/80">{stat.desc}</p>
        </div>
      ))}
    </div>
  );
}