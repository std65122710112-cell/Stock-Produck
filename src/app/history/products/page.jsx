"use client";

import React, { useEffect, useState, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    Package, MapPin, Calendar, ArrowUpRight,
    ArrowDownLeft, Database, Search, Activity,
    Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    History, LayoutGrid, ArrowDownCircle, ArrowUpCircle, Boxes
} from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function GlobalMovementHistoryPage() {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("ALL"); 
    const [filterDate, setFilterDate] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        setLoading(true);
        try {
            const res = await apiFetch("/inventory/movements");
            if (res.success) {
                setMovements(res.data || []);
            }
        } catch (e) {
            console.error("Load History Error:", e);
        } finally {
            setLoading(false);
        }
    }

    const filteredMovements = useMemo(() => {
        return movements.filter(m => {
            const s = searchTerm.toLowerCase();
            const matchSearch = !s ||
                m.product?.name?.toLowerCase().includes(s) ||
                m.product?.sku?.toLowerCase().includes(s) ||
                m.location?.code?.toLowerCase().includes(s) ||
                m.user?.firstName?.toLowerCase().includes(s);

            const matchType = filterType === "ALL" || m.type === filterType;

            let matchDate = true;
            if (filterDate) {
                const itemDate = new Date(m.createdAt).toISOString().split('T')[0];
                matchDate = itemDate === filterDate;
            }

            return matchSearch && matchType && matchDate;
        });
    }, [movements, searchTerm, filterType, filterDate]);

    // 📄 คำนวณสรุปยอดสำหรับกล่อง Summary
    const stats = useMemo(() => {
        const inbound = filteredMovements.filter(m => m.type === 'IN').reduce((sum, m) => sum + (m.quantity || 0), 0);
        const outbound = filteredMovements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);
        return { total: filteredMovements.length, inbound, outbound };
    }, [filteredMovements]);

    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
    const paginatedMovements = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredMovements.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredMovements, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, filterDate]);

    if (loading) return <SystemLoader />;

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="w-full max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                            <Activity className="w-6 h-6 text-[#1F3B8B]" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                ประวัติการเคลื่อนไหวรวม
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                                <Database className="w-4 h-4 text-slate-400" />
                                บันทึกการตรวจสอบรายการเคลื่อนไหวพัสดุทุกประเภท (Audit Trail)
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end print:hidden">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">หน้าปัจจุบัน</span>
                        <div className="bg-slate-900 text-white px-4 py-1.5 rounded-lg font-bold tabular-nums text-sm border border-slate-700 shadow-sm">
                            {currentPage} <span className="text-slate-500 mx-1">/</span> {totalPages || 1}
                        </div>
                    </div>
                </div>

                {/* --- SUMMARY CARDS SECTION --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard 
                        title="จำนวนรายการทั้งหมด" 
                        count={stats.total} 
                        unit="เอกสาร"
                        color="slate" 
                        icon={<LayoutGrid className="w-5 h-5 text-slate-600" />} 
                    />
                    <SummaryCard 
                        title="รวมจำนวนรับเข้า (Inbound)" 
                        count={stats.inbound} 
                        unit="หน่วย"
                        color="emerald" 
                        icon={<ArrowDownCircle className="w-5 h-5 text-emerald-600" />} 
                    />
                    <SummaryCard 
                        title="รวมจำนวนจ่ายออก (Outbound)" 
                        count={stats.outbound} 
                        unit="หน่วย"
                        color="blue" 
                        icon={<ArrowUpCircle className="w-5 h-5 text-blue-600" />} 
                    />
                </div>

                {/* --- FILTER PANEL --- */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 print:hidden">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหาด้วยรหัส SKU, ชื่อพัสดุ, ตำแหน่งจัดเก็บ หรือชื่อเจ้าหน้าที่..."
                                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1F3B8B] focus:bg-white focus:ring-4 focus:ring-[#1F3B8B]/5 font-bold text-sm transition-all placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative min-w-50">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#1F3B8B] font-bold text-sm text-slate-700 cursor-pointer"
                                >
                                    <option value="ALL">ทุกกิจกรรม (All Actions)</option>
                                    <option value="IN">รับสินค้าเข้า (IN)</option>
                                    <option value="OUT">จ่ายพัสดุออก (OUT)</option>
                                    <option value="TRANSFER">โอนย้าย (TRANSFER)</option>
                                    <option value="ADJUST">ปรับยอด (ADJUST)</option>
                                </select>
                            </div>

                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#1F3B8B] font-bold text-sm text-slate-700 cursor-pointer shadow-sm"
                            />
                        </div>

                        {(searchTerm || filterType !== "ALL" || filterDate) && (
                            <button
                                onClick={() => { setSearchTerm(""); setFilterType("ALL"); setFilterDate(""); }}
                                className="px-6 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-bold text-xs uppercase tracking-widest border border-rose-100 transition-colors"
                            >
                                ล้างตัวกรอง
                            </button>
                        )}
                    </div>
                </div>

                {/* --- DATA TABLE --- */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <th className="py-4 px-6 w-16 text-center">ลำดับ</th>
                                    <th className="py-4 px-6">วันที่ / เวลา</th>
                                    <th className="py-4 px-6">รายละเอียดพัสดุ</th>
                                    <th className="py-4 px-6">กิจกรรม</th>
                                    <th className="py-4 px-6">ตำแหน่งจัดเก็บ</th>
                                    <th className="py-4 px-6 text-center">จำนวน</th>
                                    <th className="py-4 px-6 text-right">ผู้ทำรายการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {paginatedMovements.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <History className="w-12 h-12 text-slate-200" />
                                                <p className="text-slate-400 font-medium text-sm">ไม่พบข้อมูลประวัติการเคลื่อนไหว</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedMovements.map((m, index) => {
                                        const rowNumber = ((currentPage - 1) * itemsPerPage) + index + 1;
                                        const isPositive = m.quantity > 0;

                                        return (
                                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-4 px-6 text-center">
                                                    <span className="text-[11px] font-bold text-slate-300 tabular-nums">{rowNumber}</span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col text-slate-600 text-xs">
                                                        <span className="font-bold tabular-nums">{new Date(m.createdAt).toLocaleDateString('th-TH')}</span>
                                                        <span className="opacity-70 font-medium">{new Date(m.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        {/* ไอคอนตามโจทย์ */}
                                                        <div className="p-2 bg-indigo-50 rounded-lg text-[#1F3B8B] border border-indigo-100 group-hover:bg-white transition-colors shadow-sm shrink-0">
                                                            <Boxes size={18} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mb-0.5">SKU: {m.product?.sku}</span>
                                                            <span className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-[#1F3B8B] uppercase" title={m.product?.name}>{m.product?.name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <MovementBadge type={m.type} />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">
                                                        <span className="font-bold text-slate-800 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-indigo-500" /> {m.location?.warehouse?.name || 'WH'}
                                                        </span>
                                                        <span className="pl-4">ตำแหน่ง: {m.location?.code}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`text-lg font-black tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isPositive ? `+${m.quantity}` : m.quantity}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs font-bold text-slate-700 uppercase">{m.user ? `${m.user.firstName}` : 'System'}</span>
                                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Verified</span>
                                                        </div>
                                                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 border border-white shadow-sm">
                                                            {m.user?.firstName?.[0] || 'S'}
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
                            แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMovements.length)} จากทั้งหมด {filteredMovements.length.toLocaleString()} รายการ
                        </p>
                        <div className="flex items-center gap-2">
                            <PaginationButton onClick={() => setCurrentPage(1)} disabled={currentPage === 1} icon={<ChevronsLeft className="w-4 h-4" />} />
                            <PaginationButton onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} icon={<ChevronLeft className="w-4 h-4" />} />
                            
                            <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm font-mono">
                                {currentPage} / {totalPages}
                            </div>

                            <PaginationButton onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} icon={<ChevronRight className="w-4 h-4" />} />
                            <PaginationButton onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} icon={<ChevronsRight className="w-4 h-4" />} />
                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}

// --- SUB-COMPONENTS ---

function SummaryCard({ title, count, unit, color, icon }) {
    const themes = {
        slate: "border-l-slate-400 bg-slate-50/50",
        emerald: "border-l-emerald-500 bg-emerald-50/30",
        blue: "border-l-blue-500 bg-blue-50/30",
    };
    return (
        <div className={`bg-white border border-slate-200 border-l-4 ${themes[color]} p-5 rounded-xl flex items-center gap-4 shadow-sm transition-all hover:shadow-md`}>
            <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100">{icon}</div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">{count.toLocaleString()}</span>
                    {unit && <span className="text-xs font-bold text-slate-400 uppercase">{unit}</span>}
                </div>
            </div>
        </div>
    );
}

function MovementBadge({ type }) {
    const configs = {
        IN: { label: "รับเข้า (IN)", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <ArrowDownLeft size={12} /> },
        OUT: { label: "จ่ายออก (OUT)", color: "bg-blue-50 text-blue-700 border-blue-200", icon: <ArrowUpRight size={12} /> },
        TRANSFER: { label: "โอนย้าย (TF)", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: <History size={12} /> },
        ADJUST: { label: "ปรับยอด (ADJ)", color: "bg-slate-50 text-slate-700 border-slate-200", icon: <Activity size={12} /> },
    };
    const config = configs[type] || { label: type, color: "bg-slate-50 text-slate-500 border-slate-200", icon: null };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-black uppercase ${config.color} shadow-sm`}>
            {config.icon}
            {config.label}
        </span>
    );
}

function PaginationButton({ onClick, disabled, icon }) {
    return (
        <button onClick={onClick} disabled={disabled} className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm">{icon}</button>
    );
}

function SystemLoader() {
    return (
        <div className="h-screen flex flex-col justify-center items-center bg-slate-50 gap-6">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Accessing Global Activity Registry...</p>
        </div>
    );
}