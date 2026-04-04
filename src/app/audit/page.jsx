"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import {
    ShieldCheck,
    Search,
    User,
    Activity,
    Database,
    AlertCircle,
    Terminal,
    RefreshCw,
    Clock,
    Globe,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";

const PAGE_SIZE = 30;

// --- 💡 Helper Functions: การจัดการสีสถานะ (คงเดิม) ---

function getSeverity(action = "", method = "", resource = "") {
    const text = `${action} ${method} ${resource}`.toLowerCase();
    if (text.includes("delete") || text.includes("remove") || text.includes("drop") || text.includes("revoke") || text.includes("deny") || text.includes("forbidden") || text.includes("failed") || text.includes("logout")) return "high";
    if (text.includes("update") || text.includes("edit") || text.includes("approve") || text.includes("transfer") || text.includes("adjust") || text.includes("patch") || text.includes("put")) return "medium";
    return "low";
}

function severityClasses(level) {
    if (level === "high") return "bg-rose-50 text-rose-700 border-2 border-rose-100";
    if (level === "medium") return "bg-amber-50 text-amber-700 border-2 border-amber-100";
    return "bg-emerald-50 text-emerald-700 border-2 border-emerald-100";
}

function resourceClasses(resource, method) {
    const key = (resource || method || "").toLowerCase();
    if (key === "auth") return "bg-violet-50 text-violet-700 border-2 border-violet-100";
    if (key === "product") return "bg-emerald-50 text-emerald-700 border-2 border-emerald-100";
    if (key === "report") return "bg-amber-50 text-amber-700 border-2 border-amber-100";
    if (key === "user") return "bg-sky-50 text-sky-700 border-2 border-sky-100";
    if (key === "inventory") return "bg-blue-50 text-blue-700 border-2 border-blue-100";
    return "bg-slate-100 text-slate-700 border-2 border-slate-200";
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
            <div className="w-full space-y-8 pb-10">

                {/* 1. Header & Live Toggle - ปรับสีดำเข้มและดีไซน์พรีเมียม */}
                <section className="rounded-[2.5rem] border-2 border-slate-100 bg-white p-8 shadow-sm transition-all hover:shadow-md">
                    {/* 1. กล่องนอกสุด: ขีดเส้นยาวพาดทั้งหน้าจอ และเอาการบีบกลางออกเพื่อให้ชิดซ้าย */}
                    <div className="w-full border-b-2 border-slate-100 mb-10">

                        {/* 2. กล่องใน: เปลี่ยนจาก mx-auto เป็นการระบุ Padding (px-8) แทนเพื่อให้ชิดซ้ายสุด */}
                        <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between pb-6 gap-6">

                            {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า (ตอนนี้จะอยู่ชิดซ้ายสุดแล้ว) --- */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                {/* กล่องไอคอน */}
                                <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                    <Activity className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                                </div>

                                {/* กลุ่มข้อความ */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <ShieldCheck className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                            Security Management
                                        </p>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                        ประวัติการใช้งานระบบ
                                    </h1>
                                    <div className="flex items-center gap-2 pt-1 opacity-90">
                                        <Terminal className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                            ตรวจสอบประวัติกิจกรรมและเหตุการณ์ความปลอดภัยย้อนหลังในระบบ
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* --- ส่วนขวา: กลุ่มปุ่มคำสั่ง (คงเดิม ไม่ปรับเปลี่ยนลอจิก) --- */}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => setLiveRefresh(!liveRefresh)}
                                    className={`flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${liveRefresh
                                            ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-100 shadow-sm shadow-emerald-200/50"
                                            : "bg-slate-50 text-slate-500 border-2 border-slate-100"
                                        }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${liveRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                                    {liveRefresh ? "ซิงค์อัตโนมัติ: เปิด" : "ซิงค์อัตโนมัติ: ปิด"}
                                </button>

                                <button
                                    onClick={() => fetchLogs()}
                                    disabled={loading}
                                    className="flex items-center gap-2.5 rounded-full bg-[#1F3B8B] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#1F3B8B]/30 transition-all hover:bg-[#152968] active:scale-95 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    {loading ? "กำลังซิงค์..." : "ดึงข้อมูลล่าสุด"}
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* 2. Filters Grid - ปรับแต่ง UI ช่องกรอก */}
                    <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1 flex items-center gap-1.5 mb-2">
                                <Search className="w-3 h-3 text-sky-500" /> ค้นหาคำสำคัญ
                            </label>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="เลข IP, ผู้ใช้งาน, กิจกรรม..."
                                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1 flex items-center gap-1.5 mb-2">
                                <User className="w-3 h-3 text-indigo-500" /> บัญชีผู้ใช้
                            </label>
                            <select value={userFilter} onChange={handleFilterChange(setUserFilter)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black outline-none cursor-pointer appearance-none focus:border-indigo-500 transition-all">
                                <option value="all">ทุกคน (Everyone)</option>
                                {filters.users.map(u => <option key={u.username} value={u.username}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1 flex items-center gap-1.5 mb-2">
                                <Activity className="w-3 h-3 text-emerald-500" /> ประเภทกิจกรรม
                            </label>
                            <select value={actionFilter} onChange={handleFilterChange(setActionFilter)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black outline-none cursor-pointer appearance-none focus:border-indigo-500 transition-all">
                                <option value="all">กิจกรรมทั้งหมด</option>
                                {filters.actions.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1 flex items-center gap-1.5 mb-2">
                                <Database className="w-3 h-3 text-amber-500" /> หมวดหมู่ข้อมูล
                            </label>
                            <select value={resourceFilter} onChange={handleFilterChange(setResourceFilter)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black outline-none cursor-pointer appearance-none focus:border-indigo-500 transition-all">
                                <option value="all">ทุกแหล่งข้อมูล</option>
                                {filters.resources.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1 flex items-center gap-1.5 mb-2">
                                <AlertCircle className="w-3 h-3 text-rose-500" /> ระดับความรุนแรง
                            </label>
                            <select value={severityFilter} onChange={handleFilterChange(setSeverityFilter)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black outline-none cursor-pointer appearance-none focus:border-indigo-500 transition-all">
                                <option value="all">ระดับทั้งหมด</option>
                                <option value="low">ปกติ (Reads)</option>
                                <option value="medium">ปานกลาง (Edits)</option>
                                <option value="high">เฝ้าระวัง (Danger)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* 3. Table Data Section - ตารางแบบพรีเมียม */}
                <div className="relative overflow-hidden rounded-[3rem] border-2 border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
                    {loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm transition-opacity">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                        </div>
                    )}

                    <div className="overflow-x-auto min-h-[500px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b-2 border-slate-100">
                                {/* เปลี่ยนจาก text-[10px] เป็น text-xs เพื่อให้ใหญ่ขึ้นเล็กน้อย */}
                                <tr className="text-xs font-black uppercase tracking-[0.15em] text-slate-950">
                                    <th className="px-8 py-6 whitespace-nowrap">วันที่-เวลา </th>
                                    <th className="px-8 py-6 whitespace-nowrap">ผู้ดำเนินการ </th>
                                    <th className="px-8 py-6 whitespace-nowrap">กิจกรรม</th>
                                    <th className="px-8 py-6 whitespace-nowrap">เป้าหมาย </th>
                                    <th className="px-8 py-6 whitespace-nowrap">สถานะ</th>
                                    <th className="px-8 py-6 whitespace-nowrap">ข้อมูลอุปกรณ์</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {rows.length > 0 ? rows.map((r) => {
                                    const sev = getSeverity(r.action, r.method, r.resource);
                                    return (
                                        <tr key={r.id} className="group hover:bg-slate-50/80 transition-all duration-150">
                                            <td className="px-8 py-5 text-[11px] font-black text-slate-500 tabular-nums">
                                                <div className="flex items-center gap-2">
                                                    {/* เปลี่ยนจาก text-sky-500 เป็น text-red-500 */}
                                                    <Clock className="w-3.5 h-3.5 text-red-500" />
                                                    {new Date(r.createdAt).toLocaleString('th-TH', { hour12: false })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900">{r.user?.firstName || 'System'}</span>
                                                    <span className="text-[10px] font-bold text-[#1F3B8B] tracking-wider">@{r.user?.username || 'daemon'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-bold text-slate-600">{r.action}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${resourceClasses(r.resource, r.method)}`}>
                                                    {r.resource || r.method || "system"}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${severityClasses(sev)}`}>
                                                    {sev}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[11px] font-black text-slate-600 tabular-nums flex items-center gap-1.5">
                                                        <Globe className="w-3 h-3 text-slate-300" /> {r.ip}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[180px] italic" title={r.userAgent}>{r.userAgent || "-"}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : !loading && (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center text-slate-300 flex flex-col items-center gap-4">
                                            <Terminal className="w-12 h-12 opacity-20" />
                                            <p className="text-[11px] font-black uppercase tracking-[0.4em] italic">ไม่พบข้อมูลบันทึกตามเงื่อนไขที่เลือก</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 4. Improved Pagination - Redesigned for Usability */}
                    <div className="flex flex-col gap-6 border-t-2 border-slate-100 bg-white px-8 py-6 md:flex-row md:items-center md:justify-between">

                        {/* ฝั่งซ้าย: สรุปข้อมูล */}
                        <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                            แสดง <span className="text-base font-black text-[#1F3B8B] tabular-nums">{Math.min(rows.length, PAGE_SIZE)}</span>
                            จากทั้งหมด <span className="text-base font-black text-[#1F3B8B] tabular-nums">{totalRows.toLocaleString()}</span> รายการ
                        </div>

                        {/* ฝั่งขวา: แผงควบคุม (Control Dock) */}
                        <div className="flex items-center p-1.5 bg-slate-50 border-2 border-slate-100 rounded-2xl w-fit">

                            {/* ปุ่ม First */}
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                title="หน้าแรก"
                                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all active:scale-95"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </button>

                            {/* ปุ่ม Prev */}
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
                            </button>

                            {/* ตัวบอกหน้าปัจจุบัน (Indicator) */}
                            <div className="flex items-center gap-2 px-3 border-x-2 border-slate-200/60 mx-1">
                                {/* ปรับสีพื้นหลังเป็นน้ำเงินเข้ม bg-[#1F3B8B] */}
                                <span className="flex items-center justify-center min-w-[2.5rem] h-8 rounded-lg bg-[#1F3B8B] text-white text-xs font-black shadow-md tabular-nums">
                                    {page}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest tabular-nums">
                                    / {totalPages}
                                </span>
                            </div>

                            {/* ปุ่ม Next */}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all active:scale-95"
                            >
                                ถัดไป <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* ปุ่ม Last */}
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                title="หน้าสุดท้าย"
                                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all active:scale-95"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </button>

                        </div>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}