"use client";

import { useState } from "react";

export function UserDirectory({ users }: { users: any[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage);

  const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const goToPrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));

  return (
    <section className="bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col mt-5">
      <div className="border-b border-[color:var(--border)] px-4 py-3 bg-[color:var(--surface)] flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-[color:var(--foreground)] tracking-wide">Registered Users Directory</h2>
        <span className="text-[11px] font-bold bg-[#38bdf8]/10 text-[#38bdf8] px-2 py-1 rounded-md border border-[#38bdf8]/20">Total: {users.length}</span>
      </div>
      {/* Desktop Table View */}
      <div className="hidden md:block p-4 overflow-x-auto">
        <table className="w-full text-left text-[13px] text-[color:var(--foreground)]/70 whitespace-nowrap">
          <thead className="text-[11px] uppercase tracking-wider text-[color:var(--foreground)]/50 border-b border-[color:var(--border)]">
            <tr>
              <th className="pb-3 pr-4 font-semibold">Name</th>
              <th className="pb-3 pr-4 font-semibold">Email</th>
              <th className="pb-3 pr-4 font-semibold">Role</th>
              <th className="pb-3 pr-4 font-semibold">Verified</th>
              <th className="pb-3 font-semibold text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-[color:var(--surface)]/50 transition-colors">
                <td className="py-3 pr-4 font-medium text-[color:var(--foreground)] flex items-center gap-2">
                  {user.image ? (
                    <img src={user.image} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-[color:var(--border)] flex items-center justify-center text-[10px] text-[color:var(--foreground)]/50">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {user.name}
                </td>
                <td className="py-3 pr-4">{user.email}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                    user.role === 'COORDINATOR' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    user.role === 'VOLUNTEER' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {user.isVerified ? (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.35 2.1 3.12-.4 1.15 2.93 2.8.94-.8 3.05 1.5 2.76-2.02 2.45.2 3.14-3.08.6-1.57 2.72L12 22l-2.35-2.1-3.12.4-1.15-2.93-2.8-.94.8-3.05-1.5-2.76 2.02-2.45-.2-3.14 3.08-.6 1.57-2.72L12 2zm-.25 14l5.25-5.25-1.41-1.41-3.84 3.83-1.84-1.83-1.41 1.41L11.75 16z"/></svg>
                      Yes
                    </span>
                  ) : (
                    <span className="text-[color:var(--foreground)]/40 text-xs">No</span>
                  )}
                </td>
                <td className="py-3 text-right tabular-nums text-[color:var(--foreground)]/50 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[color:var(--foreground)]/40">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden divide-y divide-[color:var(--border)]">
        {paginatedUsers.map((user) => (
          <div key={user.id} className="p-4 hover:bg-[color:var(--surface)]/50 transition-colors flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="h-8 w-8 rounded-full object-cover shadow-sm border border-[color:var(--border)]" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[color:var(--border)] flex items-center justify-center text-[12px] text-[color:var(--foreground)]/50 font-bold shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-[14px] text-[color:var(--foreground)]">{user.name}</div>
                  <div className="text-[12px] text-[color:var(--foreground)]/60 mt-0.5">{user.email}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[12px] bg-[color:var(--surface)]/50 p-2.5 rounded-lg border border-[color:var(--border)] mt-1">
              <div className="flex flex-col gap-1">
                <span className="text-[color:var(--foreground)]/50 text-[9px] uppercase font-bold tracking-wider">Role</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                  user.role === 'COORDINATOR' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  user.role === 'VOLUNTEER' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[color:var(--foreground)]/50 text-[9px] uppercase font-bold tracking-wider">Status</span>
                {user.isVerified ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.35 2.1 3.12-.4 1.15 2.93 2.8.94-.8 3.05 1.5 2.76-2.02 2.45.2 3.14-3.08.6-1.57 2.72L12 22l-2.35-2.1-3.12.4-1.15-2.93-2.8-.94.8-3.05-1.5-2.76 2.02-2.45-.2-3.14 3.08-.6 1.57-2.72L12 2zm-.25 14l5.25-5.25-1.41-1.41-3.84 3.83-1.84-1.83-1.41 1.41L11.75 16z"/></svg>
                    Verified
                  </span>
                ) : (
                  <span className="text-[color:var(--foreground)]/40 text-[11px]">Unverified</span>
                )}
              </div>
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[color:var(--foreground)]/50 text-[9px] uppercase font-bold tracking-wider">Joined</span>
                <span className="text-[color:var(--foreground)] font-medium tabular-nums text-[11px]">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
        {paginatedUsers.length === 0 && (
          <div className="p-8 text-center text-[13px] text-[color:var(--foreground)]/40">No users found.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border-t border-[color:var(--border)] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[color:var(--surface)]">
          <span className="text-xs text-[color:var(--foreground)]/60 text-center sm:text-left w-full sm:w-auto">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, users.length)} of {users.length} entries
          </span>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[color:var(--border)] text-[color:var(--foreground)] hover:bg-[color:var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[color:var(--border)] text-[color:var(--foreground)] hover:bg-[color:var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
