"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    FileSpreadsheet, Download, Database, BarChart3,
    ShieldCheck, FileText, History, PieChart,
    CheckCircle2, X, CalendarRange, MapPin
} from "lucide-react";

export default function ReportsPage() {
    // 💡 State สำหรับ Master Data (คลัง/โซน)
    const [masterData, setMasterData] = useState({ warehouses: [], zones: [] });
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [selectedZone, setSelectedZone] = useState("");

    // 💡 State สำหรับจัดการเปิด/ปิด Modal
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

    // 💡 State สำหรับ Filter ของ Movement
    const [moveDateStart, setMoveDateStart] = useState("");
    const [moveDateEnd, setMoveDateEnd] = useState("");
    const [moveType, setMoveType] = useState("ALL");

    // โหลดข้อมูลคลังและโซนตอนเปิดหน้า
    useEffect(() => {
        async function loadMaster() {
            try {
                const [w, z] = await Promise.all([
                    apiFetch("/master/warehouses").catch(() => []),
                    apiFetch("/master/zones").catch(() => [])
                ]);
                setMasterData({ warehouses: w, zones: z });
            } catch (e) { console.error(e); }
        }
        loadMaster();
    }, []);

    // 📊 1. ฟังก์ชันโหลดรายงาน "สต๊อกคงเหลือ" (Excel/PDF)
    const handleExportBalance = async (type) => {
        const toastId = toast.loading(`กำลังเตรียมไฟล์ ${type.toUpperCase()}...`);
        try {
            const token = getAccessToken();
            const params = new URLSearchParams({ warehouseId: selectedWarehouse, zoneId: selectedZone });

            // ใช้ API_BASE ตรงๆ ตามที่แก้ล่าสุด (ไม่มี /api ซ้ำ)
            const response = await fetch(`${API_BASE}/api/reports/export/inventory/${type}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Stock_Balance_Report_${new Date().getTime()}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
            a.click();
            toast.success("ดาวน์โหลดสำเร็จ", { id: toastId });
            setIsBalanceModalOpen(false); // ปิด Popup
        } catch (e) { toast.error("ส่งออกข้อมูลล้มเหลว", { id: toastId }); }
    };

    // 📈 2. ฟังก์ชันโหลดรายงาน "ความเคลื่อนไหว" (Movement Ledger)
    const handleExportMovement = async () => {
        const toastId = toast.loading(`Generating Ledger Report...`);
        try {
            const token = getAccessToken();
            const params = new URLSearchParams({
                startDate: moveDateStart,
                endDate: moveDateEnd,
                type: moveType,
                warehouseId: selectedWarehouse
            });

            const response = await fetch(`${API_BASE}/api/reports/export/movement/excel?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Movement_Ledger_${new Date().getTime()}.xlsx`;
            a.click();

            toast.success("ดาวน์โหลดประวัติความเคลื่อนไหวสำเร็จ", { id: toastId });
            setIsMovementModalOpen(false); // ปิด Popup
        } catch (e) { toast.error("ส่งออกข้อมูลล้มเหลว", { id: toastId }); }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Data & Analytics Hub</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Reporting
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-lg uppercase">Audit Ready</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            TJC GROUP: ศูนย์รวมรายงานและการวิเคราะห์ข้อมูล
                        </p>
                    </div>
                </div>

                {/* REPORTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* 📦 CARD 1: STOCK BALANCE */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black px-6 py-2 rounded-bl-3xl tracking-[0.15em] uppercase">Inventory Valuation</div>

                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-50 rounded-2xl">
                                    <PieChart className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">รายงานสต๊อกคงเหลือ</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5 tracking-wider">Current Stock & Valuation</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 font-bold leading-relaxed flex-1">
                                สรุปยอดสินค้าคงเหลือปัจจุบันแบบละเอียด แยกตามคลังสินค้าและตำแหน่งจัดเก็บ (Bin Location) พร้อมมูลค่าต้นทุนประเมินล่าสุด
                            </p>

                            <button
                                onClick={() => setIsBalanceModalOpen(true)}
                                className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-100"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                                Configure Export
                                <Download className="w-3 h-3 opacity-50" />
                            </button>
                        </div>
                    </div>

                    {/* 🚛 CARD 2: MOVEMENT HISTORY */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black px-6 py-2 rounded-bl-3xl tracking-[0.15em] uppercase">Logistics Ledger</div>

                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-emerald-50 rounded-2xl">
                                    <History className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">รายงานความเคลื่อนไหว</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5 tracking-wider">Transaction Activity Log</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 font-bold leading-relaxed flex-1">
                                ประวัติการทำธุรกรรมทั้งหมดในระบบ ทั้งการรับเข้า (Inbound), การจ่ายออก (Outbound), และการปรับปรุงยอด (Adjust)
                            </p>

                            <button
                                onClick={() => setIsMovementModalOpen(true)}
                                className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-100"
                            >
                                <CalendarRange className="w-4 h-4 text-emerald-400" />
                                Configure Export
                                <Download className="w-3 h-3 opacity-50" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ANALYTICS NOTE */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Classification: Confidential</p>
                            <p className="text-xs font-bold text-slate-600 mt-0.5">ข้อมูลรายงานนี้ถูกสร้างขึ้นแบบ Real-time จากฐานข้อมูลกลางของระบบ</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">System v2.2 Compliant</span>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-2 py-4">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">
                        All analytical exports are subject to enterprise security protocols
                    </span>
                </div>
            </div>

            {/* ============================================================== */}
            {/* 💡 MODAL 1: สต๊อกคงเหลือ (Balance) */}
            {/* ============================================================== */}
            {isBalanceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                                    <PieChart className="w-5 h-5" /> Export Balance
                                </h2>
                                <p className="text-[10px] font-medium text-indigo-200 mt-1 uppercase tracking-widest">Filter by Location</p>
                            </div>
                            <button onClick={() => setIsBalanceModalOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Warehouse</label>
                                <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" value={selectedWarehouse} onChange={e => { setSelectedWarehouse(e.target.value); setSelectedZone(""); }}>
                                    <option value="">ทุกคลังสินค้า (All Warehouses)</option>
                                    {masterData.warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Zone</label>
                                <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-40" value={selectedZone} disabled={!selectedWarehouse} onChange={e => setSelectedZone(e.target.value)}>
                                    <option value="">ทุกโซน (All Zones)</option>
                                    {masterData.zones.filter(z => String(z.warehouseId) === String(selectedWarehouse)).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                                </select>
                            </div>

                            <div className="pt-4 grid grid-cols-2 gap-3">
                                <button onClick={() => handleExportBalance('excel')} className="w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-xl py-3 font-black text-xs uppercase tracking-[0.1em] transition-all flex justify-center items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4" /> EXCEL
                                </button>
                                <button onClick={() => handleExportBalance('pdf')} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl py-3 font-black text-xs uppercase tracking-[0.1em] transition-all flex justify-center items-center gap-2">
                                    <FileText className="w-4 h-4" /> PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 💡 MODAL 2: ประวัติความเคลื่อนไหว (Movement) */}
            {/* ============================================================== */}
            {isMovementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                                    <CalendarRange className="w-5 h-5" /> Export Ledger
                                </h2>
                                <p className="text-[10px] font-medium text-emerald-200 mt-1 uppercase tracking-widest">Select Date Range & Filters</p>
                            </div>
                            <button onClick={() => setIsMovementModalOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Warehouse</label>
                                <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500" value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
                                    <option value="">ทุกคลังสินค้า (All Warehouses)</option>
                                    {masterData.warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Movement Type</label>
                                <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500" value={moveType} onChange={e => setMoveType(e.target.value)}>
                                    <option value="ALL">ALL (ทุกประเภท)</option>
                                    <option value="IN">RECEIVE (รับเข้า)</option>
                                    <option value="OUT">DISPATCH (เบิกออก)</option>
                                    <option value="ADJUST">ADJUST (ปรับปรุงยอด)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                                    <input type="date" className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500" value={moveDateStart} onChange={e => setMoveDateStart(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Date</label>
                                    <input type="date" className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500" value={moveDateEnd} onChange={e => setMoveDateEnd(e.target.value)} />
                                </div>
                            </div>

                            <button onClick={handleExportMovement} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-4 font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/30 transition-all flex justify-center items-center gap-2 mt-4">
                                <Download className="w-4 h-4" /> Download Excel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthGate>
    );
}