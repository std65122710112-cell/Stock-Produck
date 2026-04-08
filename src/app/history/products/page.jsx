"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import {
    History, Package, MapPin, Calendar, ArrowUpRight,
    ArrowDownLeft, Database, Search, RefreshCw, Activity,
    Filter, ChevronLeft, ChevronRight, Hash
} from "lucide-react";

export default function GlobalMovementHistoryPage() {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- States สำหรับตัวกรอง (Filters) ---
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("ALL"); // ALL, IN, OUT, TRANSFER, ADJUST
    const [filterDate, setFilterDate] = useState("");

    // --- States สำหรับแบ่งหน้า (Pagination) ---
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

    // 🔍 กรองข้อมูลก่อน (Search & Filters)
    const filteredMovements = useMemo(() => {
        return movements.filter(m => {
            // 1. กรองคำค้นหา (SKU, ชื่อ, ตำแหน่ง, ผู้ทำรายการ)
            const s = searchTerm.toLowerCase();
            const matchSearch = !s ||
                m.product?.name?.toLowerCase().includes(s) ||
                m.product?.sku?.toLowerCase().includes(s) ||
                m.location?.code?.toLowerCase().includes(s) ||
                m.user?.firstName?.toLowerCase().includes(s);

            // 2. กรองประเภทกิจกรรม
            const matchType = filterType === "ALL" || m.type === filterType;

            // 3. กรองวันที่ (ถ้าเลือก)
            let matchDate = true;
            if (filterDate) {
                const itemDate = new Date(m.createdAt).toISOString().split('T')[0];
                matchDate = itemDate === filterDate;
            }

            return matchSearch && matchType && matchDate;
        });
    }, [movements, searchTerm, filterType, filterDate]);

    // 📄 แบ่งหน้า (Pagination) จากข้อมูลที่กรองแล้ว
    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
    const paginatedMovements = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredMovements.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredMovements, currentPage]);

    // รีเซ็ตไปหน้าแรกเสมอถ้ามีการเปลี่ยนตัวกรอง
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, filterDate]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <RefreshCw className="animate-spin text-indigo-600" size={32} />
            <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Accessing Global Ledger...</p>
        </div>
    );

    return (
        <AuthGate>
            <div className="max-w-7xl mx-auto space-y-6 pb-20 pt-6 px-4">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">
                            <Activity size={16} /> Transaction Audit Trail
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                            ประวัติการเคลื่อนไหวรวม
                        </h1>
                        <p className="text-slate-500 font-bold text-sm">รายการ เข้า-ออก และโอนย้ายพัสดุทุกรายการภายในระบบ</p>
                    </div>

                    {/* Summary Stats (มุมขวาบน) */}
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center gap-6 shadow-lg shadow-slate-200">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Records</p>
                            <p className="text-2xl font-black font-mono">{filteredMovements.length}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-700"></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Page</p>
                            <p className="text-2xl font-black font-mono text-indigo-400">{currentPage}<span className="text-sm text-slate-500">/{totalPages || 1}</span></p>
                        </div>
                    </div>
                </div>

                {/* --- FILTER PANEL --- */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">

                    {/* Search */}
                    <div className="relative w-full md:flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหา SKU, ชื่อพัสดุ, ตำแหน่ง, เจ้าหน้าที่..."
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 font-bold text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Type */}
                    <div className="w-full md:w-48 relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm text-slate-700 appearance-none cursor-pointer"
                        >
                            <option value="ALL">ทุกประเภท (All)</option>
                            <option value="IN">รับเข้า (IN)</option>
                            <option value="OUT">จ่ายออก (OUT)</option>
                            <option value="TRANSFER">โอนย้าย (TRANSFER)</option>
                            <option value="ADJUST">ปรับยอด (ADJUST)</option>
                        </select>
                    </div>

                    {/* Filter Date */}
                    <div className="w-full md:w-48">
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm text-slate-700 cursor-pointer"
                        />
                    </div>

                    {/* Clear Button */}
                    {(searchTerm || filterType !== "ALL" || filterDate) && (
                        <button
                            onClick={() => { setSearchTerm(""); setFilterType("ALL"); setFilterDate(""); }}
                            className="w-full md:w-auto px-6 py-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
                        >
                            ล้างค่า
                        </button>
                    )}
                </div>

                {/* --- DATA TABLE --- */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-900 text-white">
                                <tr className="text-[10px] font-black uppercase tracking-[0.15em]">
                                    <th className="p-6 w-16 text-center">ลำดับ</th>
                                    <th className="p-6">วัน/เวลา</th>
                                    <th className="p-6">ข้อมูลพัสดุ (SKU / NAME)</th>
                                    <th className="p-6">กิจกรรม</th>
                                    <th className="p-6">ตำแหน่ง</th>
                                    <th className="p-6 text-center">จำนวน</th>
                                    <th className="p-6">ผู้รับผิดชอบ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedMovements.length === 0 ? (
                                    <tr><td colSpan="7" className="p-20 text-center text-slate-400 font-bold">ไม่พบรายการเคลื่อนไหว</td></tr>
                                ) : paginatedMovements.map((m, index) => {
                                    // คำนวณลำดับที่แท้จริง
                                    const rowNumber = ((currentPage - 1) * itemsPerPage) + index + 1;

                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/80 transition-all group">
                                            <td className="p-6 text-center">
                                                <span className="text-[10px] font-black text-slate-300 tabular-nums">{rowNumber}</span>
                                            </td>
                                            <td className="p-6 whitespace-nowrap">
                                                <p className="text-xs font-black text-slate-700 tabular-nums">{new Date(m.createdAt).toLocaleDateString('th-TH')}</p>
                                                <p className="text-[10px] font-bold text-slate-400 tabular-nums">{new Date(m.createdAt).toLocaleTimeString('th-TH')} น.</p>
                                            </td>
                                            <td className="p-6 min-w-[250px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-white transition-colors shadow-sm"><Package size={20} /></div>
                                                    <div>
                                                        <p className="text-xs font-black text-indigo-600 font-mono tracking-tighter uppercase">{m.product?.sku}</p>
                                                        <p className="text-sm font-bold text-slate-800 uppercase tracking-tight truncate max-w-[200px]" title={m.product?.name}>{m.product?.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <span className={`p-1.5 rounded-lg ${m.quantity > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        {m.quantity > 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                    </span>
                                                    <div>
                                                        <p className="text-xs font-black uppercase text-slate-700">{m.type}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.referenceType || 'Entry'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                                                        <MapPin size={12} className="text-indigo-500" />
                                                        {m.location?.code}
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                                                        {m.location?.warehouse?.name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`text-lg font-black font-mono ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-500 uppercase">
                                                        {m.user?.firstName?.[0] || '-'}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase italic">
                                                        {m.user ? `${m.user.firstName}` : 'System'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- PAGINATION CONTROLS --- */}
                {totalPages > 1 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-3xl shadow-sm">
                        <div className="text-xs font-bold text-slate-400 px-4">
                            แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMovements.length)} จากทั้งหมด <span className="text-slate-800 font-black">{filteredMovements.length}</span> รายการ
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="flex gap-1 px-2">
                                {/* สร้างปุ่มตัวเลขหน้าแบบย่อ */}
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    // โชว์เฉพาะหน้าแรก หน้าสุดท้าย และหน้าใกล้เคียง
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-xl text-xs font-black transition-colors ${currentPage === page ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <span key={page} className="w-8 h-8 flex items-center justify-center text-slate-300 font-bold">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="text-center pt-8 opacity-20">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] flex items-center justify-center gap-4">
                        <Database className="w-4 h-4" /> Secure Ledger Management • TJC Group 2026
                    </p>
                </div>
            </div>
        </AuthGate>
    );
}