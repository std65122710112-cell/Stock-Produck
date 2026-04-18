"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import {
    ShieldCheck, Search, User, Activity, Database,
    AlertCircle, Terminal, RefreshCw, Globe,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";

const PAGE_SIZE = 30;

// --- Helper Functions ---
function getSeverity(action = "", method = "", resource = "") {
    const text = `${action} ${method} ${resource}`.toLowerCase();
    if (text.includes("delete") || text.includes("remove") || text.includes("drop") || text.includes("revoke") || text.includes("deny") || text.includes("forbidden") || text.includes("failed") || text.includes("logout")) return "high";
    if (text.includes("update") || text.includes("edit") || text.includes("approve") || text.includes("transfer") || text.includes("adjust") || text.includes("patch") || text.includes("put")) return "medium";
    return "low";
}

function severityClasses(level) {
    if (level === "high") return "bg-rose-50 text-rose-700 border-rose-200";
    if (level === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function resourceClasses(resource, method) {
    const key = (resource || method || "").toLowerCase();
    if (key === "auth") return "bg-violet-50 text-violet-700 border-violet-200";
    if (key === "product") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (key === "report") return "bg-amber-50 text-amber-700 border-amber-200";
    if (key === "user") return "bg-sky-50 text-sky-700 border-sky-200";
    if (key === "inventory") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
}

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

    useEffect(() => {
        apiFetch("/audit/filters").then(data => data && setFilters(data));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        if (!liveRefresh) return;
        const interval = setInterval(() => fetchLogs(true), 15000);
        return () => clearInterval(interval);
    }, [liveRefresh, fetchLogs]);

    const handleFilterChange = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    return (
        <AuthGate>
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen ">

                {/* --- HEADER --- */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-200 pb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-200/50 flex items-center justify-center border border-slate-300 shadow-sm shrink-0">
                            <Terminal className="w-6 h-6 text-slate-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                ประวัติการใช้งานระบบ (Audit Log)
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                บันทึกความปลอดภัยและประวัติการทำรายการทั้งหมดในระบบ
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        
                        <button
                            onClick={() => fetchLogs()}
                            disabled={loading || refreshing}
                            className="flex flex-1 xl:flex-initial items-center justify-center gap-2 bg-[#1F3B8B] text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest shadow-md hover:bg-blue-900 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* --- FILTERS PANEL (ปรับปรุงช่องค้นหา) --- */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    
                    {/* แถวที่ 1: ช่องค้นหาแบบเต็มความกว้าง */}
                    <div className="relative group w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" size={20} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหาเลข IP, ผู้ใช้งาน, หรือรายละเอียดกิจกรรม..."
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1F3B8B] focus:bg-white focus:ring-4 focus:ring-[#1F3B8B]/5 font-bold text-sm transition-all"
                        />
                    </div>

                    {/* แถวที่ 2: ตัวกรองแบบ Grid 4 คอลัมน์ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        <FilterSelect icon={<User size={16} />} value={userFilter} onChange={handleFilterChange(setUserFilter)}>
                            <option value="all">ทุกผู้ใช้</option>
                            {filters.users.map(u => <option key={u.username} value={u.username}>{u.name}</option>)}
                        </FilterSelect>
                        
                        <FilterSelect icon={<Activity size={16} />} value={actionFilter} onChange={handleFilterChange(setActionFilter)}>
                            <option value="all">ทุกกิจกรรม</option>
                            {filters.actions.map(a => <option key={a} value={a}>{a}</option>)}
                        </FilterSelect>
                        
                        <FilterSelect icon={<Database size={16} />} value={resourceFilter} onChange={handleFilterChange(setResourceFilter)}>
                            <option value="all">ทุกหมวดหมู่</option>
                            {filters.resources.map(r => <option key={r} value={r}>{r}</option>)}
                        </FilterSelect>
                        
                        <FilterSelect icon={<AlertCircle size={16} />} value={severityFilter} onChange={handleFilterChange(setSeverityFilter)}>
                            <option value="all">ทุกระดับ</option>
                            <option value="low">ปกติ (Low)</option>
                            <option value="medium">ปานกลาง (Medium)</option>
                            <option value="high">เฝ้าระวัง (High)</option>
                        </FilterSelect>
                    </div>
                </div>

                {/* --- DATA TABLE --- */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
                    {loading && !refreshing && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                        </div>
                    )}
                    
                    <div className="overflow-x-auto min-h-[500px]">
                        <table className="min-w-full border-collapse text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <th className="py-4 px-6 w-16 text-center">ลำดับ</th>
                                    <th className="py-4 px-6 whitespace-nowrap">วันที่ / เวลา</th>
                                    <th className="py-4 px-6 whitespace-nowrap">ผู้ดำเนินการ</th>
                                    <th className="py-4 px-6 whitespace-nowrap">กิจกรรม (Action)</th>
                                    <th className="py-4 px-6 whitespace-nowrap text-center">หมวดหมู่</th>
                                    <th className="py-4 px-6 whitespace-nowrap text-center">ความเสี่ยง</th>
                                    <th className="py-4 px-6 whitespace-nowrap">ข้อมูลระบบ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {rows.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Terminal className="w-12 h-12 text-slate-200" />
                                                <p className="text-slate-400 font-medium text-sm">ไม่พบประวัติการใช้งานตามเงื่อนไขที่กำหนด</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r, index) => {
                                        const rowNumber = ((page - 1) * PAGE_SIZE) + index + 1;
                                        const sev = getSeverity(r.action, r.method, r.resource);
                                        return (
                                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-4 px-6 text-center">
                                                    <span className="text-[11px] font-bold text-slate-300 tabular-nums">{rowNumber}</span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col text-slate-600">
                                                        <span className="text-sm font-bold tabular-nums">
                                                            {new Date(r.createdAt).toLocaleDateString('th-TH')}
                                                        </span>
                                                        <span className="text-[10px] font-medium opacity-70">
                                                            {new Date(r.createdAt).toLocaleTimeString('th-TH', { hour12: false })} น.
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900">{r.user?.firstName || 'System'}</span>
                                                        <span className="text-[10px] font-bold text-[#1F3B8B] tracking-tight">@{r.user?.username || 'daemon'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-xs font-bold text-slate-700">{r.action}</span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest shadow-sm ${resourceClasses(r.resource, r.method)}`}>
                                                        {r.resource || r.method || "system"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest shadow-sm ${severityClasses(sev)}`}>
                                                        {sev}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-[11px] font-bold text-slate-600 tabular-nums flex items-center gap-1.5">
                                                            <Globe className="w-3 h-3 text-slate-400" /> {r.ip}
                                                        </div>
                                                        <div className="text-[9px] font-medium text-slate-400 uppercase truncate max-w-[150px]" title={r.userAgent}>
                                                            {r.userAgent || "-"}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- PAGINATION CONTROLS --- */}
                {!loading && totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 print:hidden">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            แสดง {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, totalRows)} จากทั้งหมด {totalRows.toLocaleString()} รายการ
                        </p>
                        <div className="flex items-center gap-2">
                            <PaginationButton onClick={() => setPage(1)} disabled={page === 1} icon={<ChevronsLeft className="w-4 h-4" />} />
                            <PaginationButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} icon={<ChevronLeft className="w-4 h-4" />} />
                            
                            <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm font-mono">
                                {page} / {totalPages}
                            </div>

                            <PaginationButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} icon={<ChevronRight className="w-4 h-4" />} />
                            <PaginationButton onClick={() => setPage(totalPages)} disabled={page === totalPages} icon={<ChevronsRight className="w-4 h-4" />} />
                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}

// --- SUB-COMPONENTS ---

// ปรับ Padding ของ Filter Dropdowns ให้สมส่วนกับความโค้งมนที่ใหญ่ขึ้น
function FilterSelect({ icon, value, onChange, children }) {
    return (
        <div className="relative min-w-[120px] w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                {icon}
            </div>
            <select
                value={value}
                onChange={onChange}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1F3B8B] font-bold text-xs text-slate-700 cursor-pointer shadow-sm appearance-none"
            >
                {children}
            </select>
        </div>
    );
}

function PaginationButton({ onClick, disabled, icon }) {
    return (
        <button onClick={onClick} disabled={disabled} className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm">
            {icon}
        </button>
    );
}