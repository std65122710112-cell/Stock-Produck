"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";

const PAGE_SIZE = 30;

// --- 💡 Helper Functions: ต้องอยู่ด้านบนสุดนอก Component ---

function getSeverity(action = "", method = "", resource = "") {
    const text = `${action} ${method} ${resource}`.toLowerCase();
    if (text.includes("delete") || text.includes("remove") || text.includes("drop") || text.includes("revoke") || text.includes("deny") || text.includes("forbidden") || text.includes("failed") || text.includes("logout")) return "high";
    if (text.includes("update") || text.includes("edit") || text.includes("approve") || text.includes("transfer") || text.includes("adjust") || text.includes("patch") || text.includes("put")) return "medium";
    return "low";
}

function severityClasses(level) {
    if (level === "high") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    if (level === "medium") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
}

function resourceClasses(resource, method) {
    const key = (resource || method || "").toLowerCase();
    if (key === "auth") return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    if (key === "product") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    if (key === "report") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    if (key === "user") return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    if (key === "inventory") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (key === "get") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    if (key === "post") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (key === "put" || key === "patch") return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
    if (key === "delete") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

// --- Main Component ---

export default function AuditPage() {
    const [rows, setRows] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [userFilter, setUserFilter] = useState("all");
    const [actionFilter, setActionFilter] = useState("all");
    const [resourceFilter, setResourceFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [liveRefresh, setLiveRefresh] = useState(false);
    const [filters, setFilters] = useState({ users: [], actions: [], resources: [] });

    // ✅ ฟังก์ชันดึงข้อมูล (ย้าย Logic มาไว้ที่นี่เพื่อความลื่น)
    const fetchLogs = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const params = new URLSearchParams({
                page,
                limit: PAGE_SIZE,
                search: debouncedSearch,
                user: userFilter,
                action: actionFilter,
                resource: resourceFilter,
                severity: severityFilter
            });
            const res = await apiFetch(`/audit?${params.toString()}`);
            if (res) {
                setRows(res.data || []);
                setTotalRows(res.total || 0);
                setTotalPages(res.totalPages || 1);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, debouncedSearch, userFilter, actionFilter, resourceFilter, severityFilter]);

    // Initial Load Filters
    useEffect(() => {
        apiFetch("/audit/filters").then(data => data && setFilters(data));
    }, []);

    // Search Debounce (400ms)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Re-fetch when dependencies change
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Live Refresh Loop
    useEffect(() => {
        if (!liveRefresh) return;
        const interval = setInterval(() => fetchLogs(true), 15000);
        return () => clearInterval(interval);
    }, [liveRefresh, fetchLogs]);

    // Reset Page Helper
    const handleFilterChange = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    return (
        <AuthGate>
            <div className="w-full space-y-6 animate-in fade-in duration-700">
                {/* 1. Header & Live Toggle */}
                <section className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-md">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">System Monitoring</p>
                                {refreshing && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-indigo-500" />}
                            </div>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setLiveRefresh(!liveRefresh)}
                                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${liveRefresh ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"}`}
                            >
                                <span className={`h-2 w-2 rounded-full ${liveRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                                {liveRefresh ? "Auto-Sync ON" : "Auto-Sync OFF"}
                            </button>
                            <button
                                onClick={() => fetchLogs()}
                                disabled={loading}
                                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {loading ? "Syncing..." : "Sync Now"}
                            </button>
                        </div>
                    </div>

                    {/* 2. Filters Grid */}
                    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                        <div className="xl:col-span-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Search Keywords</label>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="IP, User, Action..."
                                className="mt-1.5 w-full rounded-2xl border-none bg-slate-100 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">User Account</label>
                            <select value={userFilter} onChange={handleFilterChange(setUserFilter)} className="mt-1.5 w-full rounded-2xl border-none bg-slate-100 px-4 py-3 text-sm outline-none cursor-pointer">
                                <option value="all">Everyone</option>
                                {filters.users.map(u => <option key={u.username} value={u.username}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Action Type</label>
                            <select value={actionFilter} onChange={handleFilterChange(setActionFilter)} className="mt-1.5 w-full rounded-2xl border-none bg-slate-100 px-4 py-3 text-sm outline-none cursor-pointer">
                                <option value="all">All Actions</option>
                                {filters.actions.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Resource</label>
                            <select value={resourceFilter} onChange={handleFilterChange(setResourceFilter)} className="mt-1.5 w-full rounded-2xl border-none bg-slate-100 px-4 py-3 text-sm outline-none cursor-pointer">
                                <option value="all">All Resources</option>
                                {filters.resources.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Severity</label>
                            <select value={severityFilter} onChange={handleFilterChange(setSeverityFilter)} className="mt-1.5 w-full rounded-2xl border-none bg-slate-100 px-4 py-3 text-sm outline-none cursor-pointer">
                                <option value="all">All Severities</option>
                                <option value="low">Low (Reads)</option>
                                <option value="medium">Medium (Edits)</option>
                                <option value="high">High (Danger)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* 3. Table Data Section */}
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all">
                    {/* Smooth Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px] transition-opacity duration-300">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                        </div>
                    )}

                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Actor</th>
                                    <th className="px-6 py-4">Activity</th>
                                    <th className="px-6 py-4">Object</th>
                                    <th className="px-6 py-4">Severity</th>
                                    <th className="px-6 py-4">Client Detail</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {rows.length > 0 ? rows.map((r) => {
                                    const sev = getSeverity(r.action, r.method, r.resource);
                                    return (
                                        <tr key={r.id} className="group hover:bg-slate-50 transition-colors duration-150">
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500 font-mono">
                                                {new Date(r.createdAt).toLocaleString('th-TH', { hour12: false })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{r.user?.firstName || 'System'}</span>
                                                    <span className="text-[10px] font-medium text-indigo-400">@{r.user?.username || 'daemon'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-slate-600">{r.action}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${resourceClasses(r.resource, r.method)}`}>
                                                    {r.resource || r.method || "system"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${severityClasses(sev)}`}>
                                                    {sev}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-mono text-slate-500 font-bold">{r.ip}</div>
                                                <div className="text-[9px] text-slate-400 uppercase truncate max-w-[150px]" title={r.userAgent}>{r.userAgent || "-"}</div>
                                            </td>
                                        </tr>
                                    );
                                }) : !loading && (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center text-slate-400 text-sm italic">
                                            No logs found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 4. Improved Pagination */}
                    <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Showing {Math.min(rows.length, PAGE_SIZE)} of {totalRows.toLocaleString()} entries
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase shadow-sm ring-1 ring-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                            >
                                First
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase shadow-sm ring-1 ring-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                            >
                                Prev
                            </button>

                            <div className="flex items-center gap-2 px-4">
                                <span className="text-xs font-bold text-slate-400">Page</span>
                                <span className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-black text-white">{page}</span>
                                <span className="text-xs font-bold text-slate-400">of {totalPages}</span>
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase shadow-sm ring-1 ring-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                            >
                                Next
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                className="rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase shadow-sm ring-1 ring-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}