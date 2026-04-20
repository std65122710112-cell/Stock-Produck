"use client";

import React, { useState, useEffect } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import {
    FileSpreadsheet, Download, Database, 
    FileText, Boxes, BarChart3, 
    TrendingUp, X, MapPin, CalendarRange, 
    ChevronRight, LayoutDashboard, PackageSearch, ArrowLeftRight, ClipboardList,
    Activity // 🟢 เพิ่มตัวนี้เข้าไปครับ (จุดที่ทำให้เกิด Error)
} from "lucide-react";

export default function ReportsPage() {
    const [masterData, setMasterData] = useState({ warehouses: [], zones: [] });
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [selectedZone, setSelectedZone] = useState("");
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [moveDateStart, setMoveDateStart] = useState("");
    const [moveDateEnd, setMoveDateEnd] = useState("");
    const [moveType, setMoveType] = useState("ALL");

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
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
                            <BarChart3 className="w-6 h-6 text-[#1F3B8B]" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                รายงานและบทวิเคราะห์
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                                <Database className="w-4 h-4 text-slate-400" />
                                ระบบออกเอกสารสรุปผลการดำเนินงานและสถิติพัสดุคงคลัง
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Inventory Performance Analytics
                    </div>
                </div>

                {/* --- REPORTS SELECTION GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    <ReportCard 
                        icon={<PackageSearch className="w-8 h-8 text-indigo-600" />}
                        bgIcon="bg-indigo-50 border-indigo-100"
                        title="รายงานพัสดุคงเหลือปัจจุบัน"
                        desc="สรุปยอดพัสดุคงคลังแบบละเอียดรายตำแหน่ง (Bin Location) พร้อมมูลค่าต้นทุนและจุดสั่งซื้อขั้นต่ำ"
                        onClick={() => setIsBalanceModalOpen(true)}
                        btnColor="text-indigo-600 border-indigo-100 hover:bg-[#1F3B8B] hover:text-white"
                    />

                    <ReportCard 
                        icon={<ArrowLeftRight className="w-8 h-8 text-emerald-600" />}
                        bgIcon="bg-emerald-50 border-emerald-100"
                        title="รายงานบัญชีความเคลื่อนไหว"
                        desc="ตรวจสอบประวัติการทำรายการย้อนหลังทั้งหมด ทั้งการรับเข้า จ่ายออก และการโอนย้ายพัสดุระหว่างคลัง"
                        onClick={() => setIsMovementModalOpen(true)}
                        btnColor="text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                    />
                </div>
            </div>

            {/* --- MODALS --- */}
            
            <ReportModal 
                isOpen={isBalanceModalOpen} 
                onClose={() => setIsBalanceModalOpen(false)}
                title="ตั้งค่ารายงานคงเหลือ"
                themeColor="indigo"
                icon={<Boxes size={18} />}
            >
                <div className="space-y-6">
                    <ModalSelect 
                        label="เลือกคลังสินค้า" 
                        value={selectedWarehouse} 
                        onChange={(e) => { setSelectedWarehouse(e.target.value); setSelectedZone(""); }}
                        options={masterData.warehouses.map(wh => ({ value: wh.id, label: `${wh.code} - ${wh.name}` }))}
                        placeholder="ทุกคลังสินค้า (Global View)"
                    />
                    <ModalSelect 
                        label="เลือกโซนจัดเก็บ" 
                        value={selectedZone} 
                        onChange={(e) => setSelectedZone(e.target.value)}
                        options={masterData.zones.filter(z => String(z.warehouseId) === String(selectedWarehouse)).map(z => ({ value: z.id, label: z.code }))}
                        placeholder="ทุกโซน (All Zones)"
                        disabled={!selectedWarehouse}
                    />
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <ExportBtn label="Excel (.xlsx)" color="bg-emerald-600" onClick={() => handleExportBalance('excel')} icon={<FileSpreadsheet size={16}/>} />
                        <ExportBtn label="PDF (.pdf)" color="bg-rose-600" onClick={() => handleExportBalance('pdf')} icon={<FileText size={16}/>} />
                    </div>
                </div>
            </ReportModal>

            <ReportModal 
                isOpen={isMovementModalOpen} 
                onClose={() => setIsMovementModalOpen(false)}
                title="ตั้งค่ารายงานความเคลื่อนไหว"
                themeColor="emerald"
                icon={<Activity size={18} />}
            >
                <div className="space-y-5">
                    <ModalSelect 
                        label="คลังสินค้าที่ต้องการตรวจสอบ" 
                        value={selectedWarehouse} 
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                        options={masterData.warehouses.map(wh => ({ value: wh.id, label: `${wh.code} - ${wh.name}` }))}
                        placeholder="ทุกคลังสินค้า"
                    />
                    <ModalSelect 
                        label="ประเภทกิจกรรม" 
                        value={moveType} 
                        onChange={(e) => setMoveType(e.target.value)}
                        options={[
                            { value: "ALL", label: "ทุกกิจกรรม (ALL)" },
                            { value: "IN", label: "รับเข้า (INBOUND)" },
                            { value: "OUT", label: "จ่ายออก (OUTBOUND)" },
                            { value: "ADJUST", label: "ปรับยอด (ADJUST)" },
                        ]}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">จากวันที่</label>
                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500" value={moveDateStart} onChange={e => setMoveDateStart(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ถึงวันที่</label>
                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500" value={moveDateEnd} onChange={e => setMoveDateEnd(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={handleExportMovement} className="w-full bg-emerald-600 text-white rounded-xl py-4 font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-emerald-700 transition-all mt-4 flex items-center justify-center gap-2">
                        <FileSpreadsheet size={16} /> สร้างไฟล์รายงาน EXCEL
                    </button>
                </div>
            </ReportModal>
        </AuthGate>
    );
}

// --- SUB-COMPONENTS ---

function ReportCard({ icon, bgIcon, title, desc, onClick, btnColor }) {
    return (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
            <div className="space-y-6">
                <div className={`p-5 w-fit rounded-2xl border ${bgIcon} shadow-sm group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
                    <p className="text-slate-500 leading-relaxed text-sm font-medium">{desc}</p>
                </div>
            </div>
            <button 
                onClick={onClick}
                className={`mt-10 w-full py-4 rounded-xl border-2 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${btnColor} shadow-sm`}
            >
                ตั้งค่าการส่งออกรายงาน <Download size={14} />
            </button>
        </div>
    );
}

function ReportModal({ isOpen, onClose, title, themeColor, icon, children }) {
    if (!isOpen) return null;
    const colors = {
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100"
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className={`p-6 flex justify-between items-center border-b ${colors[themeColor]}`}>
                    <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        {icon} {title}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="p-8">{children}</div>
            </div>
        </div>
    );
}

function ModalSelect({ label, value, onChange, options, placeholder = "เลือกข้อมูล...", disabled = false }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-[#1F3B8B] disabled:opacity-40 shadow-inner" 
                value={value} 
                onChange={onChange}
                disabled={disabled}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    );
}

function ExportBtn({ label, color, onClick, icon }) {
    return (
        <button 
            onClick={onClick}
            className={`${color} text-white rounded-xl py-4 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md active:scale-95`}
        >
            {icon} {label}
        </button>
    );
}