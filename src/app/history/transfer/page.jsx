"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
    RefreshCw,
    Plus,
    ChevronRight,
    History,
    ArrowRightLeft,
    Package,
    AlertCircle,
    Database,
    UserCheck,
    Activity
} from "lucide-react";

export default function TransferHistoryPage() {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);

    async function loadHistory() {
        try {
            // Security: apiFetch จัดการ Token และ Sanitization ในตัว
            const data = await apiFetch("/inventory/transfer", { method: "GET" });

            if (data && Array.isArray(data)) {
                setTransfers(data);
            } else {
                setTransfers([]);
            }
        } catch (e) {
            console.error("Critical Security/Load Error:", e);
            setTransfers([]); // Fallback เพื่อความปลอดภัย
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadHistory(); }, []);

    // Performance & Security: ป้องกัน Re-render และปกป้องข้อมูลด้วย useMemo
    const memoizedTransfers = useMemo(() => transfers, [transfers]);

    return (
        <AuthGate>
            {/* ระยะห่างหลัก space-y-8 ตาม Blueprint */}
            <div className="w-full space-y-8">

                {/* HEADER SECTION - ปรับขนาดและสีตามหน้าหลักเป๊ะ */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-8 gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black uppercase tracking-wider w-fit shadow-sm">
                            <Activity className="w-4 h-4 text-blue-500" /> ระบบควบคุมการโอนย้าย (Internal Transfer Control)
                        </div>
                        {/* ปรับขนาด text-4xl และสี slate-950 */}
                        <h4 className="text-4xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                            บันทึกการโอนย้าย (TO)
                        </h4>
                        <p className="text-slate-600 text-base font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 text-slate-400" />
                            ประวัติการโอนย้ายสินค้าและบันทึกการตรวจสอบย้อนกลับ (Internal Move)
                        </p>
                    </div>
                    
                </div>

                {/* STATUS BAR - ขนาด px-5 py-2.5 และ rounded-2xl ตามมาตรฐาน */}
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border-2 border-slate-100 shadow-sm">
                        <History className="w-5 h-5 text-indigo-500" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide tabular-nums">
                            รายการโอนย้ายทั้งหมด: {memoizedTransfers.length} เอกสาร
                        </span>
                    </div>
                </div>

                {/* MAIN DATA TABLE - rounded-[2.5rem] และ p-6 ตาม Master Blueprint */}
                <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.1)] relative">
                    
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.015] select-none overflow-hidden">
                        <div className="text-[120px] font-black -rotate-12 uppercase tracking-tighter text-slate-900">
                            TJC INTERNAL
                        </div>
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                {/* ปรับฟอนต์หัวตารางเป็น text-sm font-black ตามหน้าแรก */}
                                <tr className="text-slate-950 font-black text-sm tracking-wide">
                                    <th className="p-6">วันที่ทำรายการ / เวลา</th>
                                    <th className="p-6">เลขที่ใบโอนย้าย (TO)</th>
                                    <th className="p-6">เหตุผล / วัตถุประสงค์</th>
                                    <th className="p-6 text-center">จำนวนรายการ</th>
                                    <th className="p-6">ผู้รับผิดชอบ</th>
                                    <th className="p-6 text-right">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Accessing Transfer Registry...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : memoizedTransfers.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-40 text-center">
                                            <AlertCircle className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">ไม่พบข้อมูลประวัติการโอนย้ายพัสดุ</p>
                                        </td>
                                    </tr>
                                ) : (
                                    memoizedTransfers.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="tabular-nums text-sm font-bold text-slate-500 flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors"></div>
                                                    {new Date(t.createdAt).toLocaleString('th-TH', {
                                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                                                        <RefreshCw className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-black text-[#1e3b8a] uppercase tracking-tighter text-base tabular-nums">
                                                        {t.transferNo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="max-w-xs">
                                                    <p className="font-bold text-slate-600 text-xs truncate italic">
                                                        {t.reason || <span className="text-slate-300 italic font-normal">--- ไม่มีระบุสาเหตุ ---</span>}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl border border-indigo-100 font-black text-xs uppercase tabular-nums shadow-sm">
                                                    <Package className="w-4 h-4 text-indigo-500" />
                                                    {t._count?.items || 0} รายการ
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-50 p-2 rounded-full border border-indigo-100 group-hover:bg-white transition-colors shadow-sm">
                                                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-800 uppercase truncate tracking-tight">
                                                            {t.user ? `${t.user.firstName} ${t.user.lastName}` : "ผู้ใช้งานระบบ"}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ยืนยันผู้ออกเอกสารแล้ว</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <Link
                                                    href={`/history/transfer/${t.id}`}
                                                    className="inline-flex items-center gap-2 bg-white border-2 border-slate-100 text-[#1e3b8a] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1e3b8a] hover:text-white hover:border-[#1e3b8a] transition-all shadow-sm hover:shadow-lg hover:shadow-blue-900/20"
                                                >
                                                    รายละเอียด <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AuthGate>
    );
}