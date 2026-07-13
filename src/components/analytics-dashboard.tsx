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
    <div className="flex flex-col gap-5">
      <StatGrid summary={summary} onStatClick={setModalFilter} />
      
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3 bg-[#13151A]">
            <h3 className="text-[13px] font-medium text-[#EDEDED] tracking-wide">Requests Over Time</h3>
          </div>
          <div className="p-5 h-72">
            <ResponsiveContainer>
              <AreaChart
                data={summary.requestSeries}
                onClick={(data) => {
                  const activeLabel = data?.activeLabel;
                  if (activeLabel !== undefined && activeLabel !== null) {
                    setModalFilter({ type: "date", value: String(activeLabel) });
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip contentStyle={{ background: "#13151A", border: "1px solid rgba(255,255,255,0.06)", color: "#EDEDED", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }} itemStyle={{ color: "#38bdf8" }} />
                <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} fill="#38bdf8" fillOpacity={0.1} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3 bg-[#13151A]">
            <h3 className="text-[13px] font-medium text-[#EDEDED] tracking-wide">Requests By Category</h3>
          </div>
          <div className="p-5 h-72">
            <ResponsiveContainer>
              <BarChart
                data={summary.categorySeries}
                onClick={(data) => {
                  const activeLabel = data?.activeLabel;
                  if (activeLabel !== undefined && activeLabel !== null) {
                    setModalFilter({ type: "category", value: String(activeLabel) });
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip contentStyle={{ background: "#13151A", border: "1px solid rgba(255,255,255,0.06)", color: "#EDEDED", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {summary.categorySeries.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {modalFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-[#1A1D24] rounded-xl border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)] bg-[#13151A]">
              <h3 className="text-[14px] font-medium text-[#EDEDED]">
                {modalFilter.type === "category" ? `${modalFilter.value} Requests` :
                  modalFilter.type === "date" ? `Requests on ${modalFilter.value}` :
                    modalFilter.type === "status" ? `${modalFilter.value} Requests` :
                      "All Requests"}
              </h3>
              <button
                onClick={() => setModalFilter(null)}
                className="text-[#737373] hover:text-[#EDEDED] transition-colors p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.04)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto safe-scrollbar p-5 space-y-3">
              {isModalLoading ? (
                <div className="text-center py-12 text-[13px] text-[#737373]">Loading requests...</div>
              ) : modalRequests.length === 0 ? (
                <div className="text-center py-12 text-[13px] text-[#737373]">No requests found for this filter.</div>
              ) : (
                modalRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8]">{req.category}</span>
                      <span className="text-[11px] text-[#737373]">
                        {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h4 className="text-[14px] font-medium text-[#EDEDED]">{req.title}</h4>
                    <p className="text-[13px] text-[#A0A0A0] line-clamp-2 mt-1.5 leading-relaxed">{req.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold rounded ${req.status === 'OPEN' ? 'text-[#D0A24C] bg-[#D0A24C]/10' : req.status === 'RESOLVED' ? 'text-[#3FA37E] bg-[#3FA37E]/10' : 'text-[#38bdf8] bg-[#38bdf8]/10'}`}>
                        {req.status}
                      </span>
                      <button onClick={() => router.push(`/requests/${req.id}`)} className="text-[12px] font-medium text-[#EDEDED] hover:text-[#38bdf8] transition-colors">View details →</button>
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

function StatGrid({ summary, onStatClick }: { summary: { total: number; open: number; claimed: number; resolved: number; activeVolunteers: number; resolutionRate: number }; onStatClick: (filter: { type: any, value: string }) => void }) {
  const stats = [
    { label: "Total requests", value: summary.total, desc: "Cumulative requests logged", color: "text-[#EDEDED]", filter: { type: "all", value: "All" } },
    { label: "Open status", value: summary.open, desc: "Pending volunteer review", color: "text-[#D0A24C]", filter: { type: "status", value: "OPEN" } },
    { label: "Claimed / active", value: summary.claimed, desc: "Volunteers currently on-site", color: "text-[#38bdf8]", filter: { type: "status", value: "CLAIMED" } },
    { label: "Resolved requests", value: summary.resolved, desc: "Disaster recovery complete", color: "text-[#3FA37E]", filter: { type: "status", value: "RESOLVED" } },
    { label: "Active volunteers", value: summary.activeVolunteers, desc: "Helpers deployed in field", color: "text-[#A78BFA]", filter: null },
    { label: "Resolution rate", value: `${summary.resolutionRate}%`, desc: "Disaster response success rate", color: "text-[#2DD4BF]", filter: null },
  ];

  return (
    <div className="grid gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          onClick={() => stat.filter && onStatClick(stat.filter)}
          className={`bg-[#1A1D24] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 transition-colors duration-200 shadow-sm ${stat.filter ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.03)]' : ''}`}
        >
          <p className="text-[10px] uppercase tracking-wider text-[#737373] font-medium">{stat.label}</p>
          <p className={`mt-3 text-2xl font-medium tracking-tight ${stat.color}`}>{stat.value}</p>
          <p className="mt-2 text-[11px] text-[#A0A0A0] leading-snug">{stat.desc}</p>
        </div>
      ))}
    </div>
  );
}