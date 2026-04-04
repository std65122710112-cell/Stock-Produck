"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    FileSpreadsheet, Download, Database, BarChart3,
    ShieldCheck, FileText, History, PieChart,
    CheckCircle2, X, CalendarRange, MapPin, Activity, Boxes
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
        const toastId = toast.loading(`กำลังเตรียมไฟล์รายงาน ${type.toUpperCase()}...`);
        try {
            const token = getAccessToken();
            const params = new URLSearchParams({ warehouseId: selectedWarehouse, zoneId: selectedZone });

            const response = await fetch(`${API_BASE}/api/reports/export/inventory/${type}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `รายงานสต๊อกคงเหลือ_${new Date().getTime()}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
            a.click();
            toast.success("ดาวน์โหลดรายงานสำเร็จ", { id: toastId });
            setIsBalanceModalOpen(false);
        } catch (e) { toast.error("ส่งออกข้อมูลล้มเหลว", { id: toastId }); }
    };

    // 📈 2. ฟังก์ชันโหลดรายงาน "ความเคลื่อนไหว" (Movement Ledger)
    const handleExportMovement = async () => {
        const toastId = toast.loading(`กำลังสร้างรายงานบัญชีความเคลื่อนไหว...`);
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
            a.download = `รายงานความเคลื่อนไหวพัสดุ_${new Date().getTime()}.xlsx`;
            a.click();

            toast.success("ดาวน์โหลดสำเร็จ", { id: toastId });
            setIsMovementModalOpen(false);
        } catch (e) { toast.error("ส่งออกข้อมูลล้มเหลว", { id: toastId }); }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4">

                {/* HEADER SECTION - ปรับตามธีม SR (หัวข้อเข้ม/Description เอียง) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-100 pb-8 gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest w-fit shadow-sm">
                            <Activity className="w-3.5 h-3.5" /> ระบบจัดการข้อมูลและสถิติ (INVENTORY ANALYTICS)
                        </div>
                        <h1 className="text-5xl font-black text-slate-950 tracking-tighter uppercase flex items-center gap-4">
                            รายงานสรุปผล

                        </h1>
                        <p className="text-slate-500 text-lg font-bold flex items-center gap-2 italic">
                            <Database className="w-5 h-5 text-slate-300" />
                            ศูนย์รวมรายงานและการวิเคราะห์ข้อมูลพัสดุในคลัง
                        </p>
                    </div>
                </div>

                {/* REPORTS GRID - ใช้ความโค้งมนระดับสูงและเงาพาสเทล */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                    {/* 📦 CARD 1: STOCK BALANCE */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.08)] relative overflow-hidden group">


                        <div className="flex flex-col h-full space-y-8">
                            <div className="flex items-center gap-5">
                                <div className="p-5 bg-indigo-50 rounded-[1.5rem] border border-indigo-100">
                                    {/* เปลี่ยนจาก PieChart เป็น Boxes เพื่อสื่อถึงสต๊อกสินค้าคงคลัง */}
                                    <Boxes className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">รายงานสต๊อกคงเหลือ</h2>
                                </div>
                            </div>

                            <p className="text-base text-slate-500 font-bold leading-relaxed flex-1">
                                สรุปยอดสินค้าคงเหลือปัจจุบันแบบละเอียด แยกตามคลังสินค้าและตำแหน่งจัดเก็บ (Bin Location) พร้อมตรวจสอบมูลค่าต้นทุน
                            </p>

                            <button
                                onClick={() => setIsBalanceModalOpen(true)}

                                className="w-full bg-white text-[#1e3b8a] border-2 border-blue-100 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1e3b8a] hover:text-white hover:border-[#1e3b8a] transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-lg hover:shadow-blue-900/20 active:scale-95"
                            >
                                <FileSpreadsheet className="w-4 h-4 opacity-70" />
                                ตั้งค่าการส่งออกรายงาน
                                <Download className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* 🚛 CARD 2: MOVEMENT HISTORY */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.08)] relative overflow-hidden group">
                        <div className="flex flex-col h-full space-y-8">
                            <div className="flex items-center gap-5">
                                <div className="p-5 bg-emerald-50 rounded-[1.5rem] border border-emerald-100">
                                    {/* เปลี่ยนจาก History เป็น Activity เพื่อสื่อถึง "กิจกรรมความเคลื่อนไหว" ของสต๊อก */}
                                    <Activity className="w-8 h-8 text-emerald-600" />
                                </div>
                                <div>
                                    {/* ปรับสีเป็น slate-950 เพื่อให้เข้มดุดันตามธีมหน้าที่แล้ว */}
                                    <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight leading-none">
                                        รายงานความเคลื่อนไหว
                                    </h2>
                                </div>
                            </div>

                            <p className="text-base text-slate-500 font-bold leading-relaxed flex-1">
                                ตรวจสอบประวัติการทำธุรกรรมทั้งหมด ทั้งการรับเข้า (Inbound), การจ่ายออก (Outbound), และการปรับยอดพัสดุ (Adjust)
                            </p>

                            <button
                                onClick={() => setIsMovementModalOpen(true)}

                                className="w-full bg-white text-emerald-600 border-2 border-emerald-100 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-lg hover:shadow-emerald-900/20 active:scale-95"
                            >
                                <CalendarRange className="w-4 h-4 opacity-70" />
                                ตั้งค่าการส่งออกรายงาน
                                <Download className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>


            </div>

            {/* ============================================================== */}
            {/* 💡 MODAL: การส่งออก (ใช้ดีไซน์โค้งมนพาสเทล) */}
            {/* ============================================================== */}

            {/* Modal สต๊อกคงเหลือ */}
            {isBalanceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 border border-slate-100">
                        <div className="bg-indigo-50 p-8 flex justify-between items-center border-b border-indigo-100">
                            <div>
                                <h2 className="text-lg font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                                    <PieChart className="w-5 h-5" /> ตั้งค่าการส่งออก
                                </h2>

                            </div>
                            <button onClick={() => setIsBalanceModalOpen(false)} className="p-2 bg-indigo-100/50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> เลือกคลังสินค้า (Warehouse)</label>
                                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" value={selectedWarehouse} onChange={e => { setSelectedWarehouse(e.target.value); setSelectedZone(""); }}>
                                    <option value="">ทุกคลังสินค้า (All Warehouses)</option>
                                    {masterData.warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> เลือกโซน (Zone)</label>
                                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner disabled:opacity-40" value={selectedZone} disabled={!selectedWarehouse} onChange={e => setSelectedZone(e.target.value)}>
                                    <option value="">ทุกโซน (All Zones)</option>
                                    {masterData.zones.filter(z => String(z.warehouseId) === String(selectedWarehouse)).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                                </select>
                            </div>

                            <div className="pt-4 grid grid-cols-2 gap-4">
                                {/* ปุ่มแรก: ปรับเป็นสีเขียว (Emerald) สำหรับ Excel */}
                                <button
                                    onClick={() => handleExportBalance('excel')}
                                    className="bg-emerald-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                                >
                                    EXCEL
                                </button>

                                {/* ปุ่มที่สอง: ปรับเป็นสีแดง (Rose) สำหรับ PDF */}
                                <button
                                    onClick={() => handleExportBalance('pdf')}
                                    className="bg-rose-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-900/20 transition-all active:scale-95"
                                >
                                    PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ความเคลื่อนไหว */}
            {isMovementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 border border-slate-100">
                        <div className="bg-emerald-50 p-8 flex justify-between items-center border-b border-emerald-100">
                            <div>
                                <h2 className="text-lg font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                                    <CalendarRange className="w-5 h-5" /> ตั้งค่าความเคลื่อนไหว
                                </h2>

                            </div>
                            <button onClick={() => setIsMovementModalOpen(false)} className="p-2 bg-emerald-100/50 hover:bg-emerald-100 text-emerald-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> เลือกคลังสินค้า (Warehouse)</label>
                                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black text-slate-700 outline-none focus:border-emerald-500 shadow-inner" value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
                                    <option value="">ทุกคลังสินค้า (All Warehouses)</option>
                                    {masterData.warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ประเภทความเคลื่อนไหว</label>
                                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black text-slate-700 outline-none focus:border-emerald-500 shadow-inner" value={moveType} onChange={e => setMoveType(e.target.value)}>
                                    <option value="ALL">ทุกประเภท (ALL)</option>
                                    <option value="IN">รับเข้า (RECEIVE)</option>
                                    <option value="OUT">จ่ายออก (DISPATCH)</option>
                                    <option value="ADJUST">ปรับยอด (ADJUST)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ตั้งแต่วันที่</label>
                                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black text-slate-700 outline-none tabular-nums shadow-inner" value={moveDateStart} onChange={e => setMoveDateStart(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ถึงวันที่</label>
                                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black text-slate-700 outline-none tabular-nums shadow-inner" value={moveDateEnd} onChange={e => setMoveDateEnd(e.target.value)} />
                                </div>
                            </div>

                            <button onClick={handleExportMovement} className="w-full bg-emerald-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all mt-4 active:scale-95">ดาวน์โหลดไฟล์ EXCEL</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthGate>
    );
}