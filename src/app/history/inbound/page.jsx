"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
    ArrowDownLeft,
    Plus,
    FileText,
    ChevronRight,
    History,
    ClipboardCheck,
    Package,
    AlertCircle,
    Database,
    ShieldCheck
} from "lucide-react";

export default function GoodsReceiptHistoryPage() {
    // ใช้ Initial State เป็น Array ว่างเพื่อป้องกัน .map error
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);

    async function loadHistory() {
        try {
            // Security: apiFetch ควรมีการจัดการ Token และ Sanitization ภายในตัวอยู่แล้ว
            const data = await apiFetch("/inventory/receipt", { method: "GET" });

            // Security Check: ตรวจสอบโครงสร้างข้อมูลก่อนบันทึก
            if (data && Array.isArray(data)) {
                setReceipts(data);
            } else {
                setReceipts([]);
            }
        } catch (e) {
            console.error("Critical Security/Load Error:", e);
            setReceipts([]); // Fallback เป็นค่าว่างเพื่อความปลอดภัย
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadHistory(); }, []);

    // Security: ป้องกันการ Re-render ที่ไม่จำเป็นและปกป้องข้อมูลด้วย useMemo
    const memoizedReceipts = useMemo(() => receipts, [receipts]);

    return (
        <AuthGate>
            <div className="w-full space-y-8">

                {/* HEADER SECTION - TJC SIGNATURE STYLE */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-8 gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black uppercase tracking-wider w-fit shadow-sm">
                            <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                            ระบบควบคุมขาเข้า (Inbound Logistics Control)
                        </div>
                        <h4 className="text-4xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                            บันทึกการรับสินค้า (GR)
                        </h4>
                        <p className="text-slate-600 text-base font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 text-slate-400" />
                            ประวัติการนำสินค้าเข้าคลังและบันทึกการเพิ่มสต๊อกพัสดุ
                        </p>
                    </div>
                </div>

                {/* STATUS BAR - DESIGN DNA */}
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border-2 border-slate-100 shadow-sm">
                        <History className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide tabular-nums">
                            รายการทั้งหมด: {memoizedReceipts.length} เอกสาร
                        </span>
                    </div>

                </div>

                {/* MAIN DATA TABLE */}
                <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.1)]">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-900 font-black text-sm tracking-wide">
                                    <th className="p-6">วันที่รับเข้า / เวลา</th>
                                    <th className="p-6">เลขที่ใบรับสินค้า (GR)</th>
                                    <th className="p-6">อ้างอิงใบสั่งซื้อ (PO)</th>
                                    <th className="p-6 text-center">จำนวนรายการ</th>
                                    <th className="p-6">หมายเหตุตรวจสอบ</th>
                                    <th className="p-6 text-right">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1e3b8a] rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Syncing Inbound Registry...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : memoizedReceipts.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-40 text-center">
                                            <AlertCircle className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">ไม่พบข้อมูลประวัติการรับสินค้า</p>
                                        </td>
                                    </tr>
                                ) : (
                                    memoizedReceipts.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="tabular-nums text-sm font-bold text-slate-500 flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-emerald-500 transition-colors"></div>
                                                    {new Date(r.createdAt).toLocaleString('th-TH', {
                                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-black text-[#1e3b8a] uppercase tracking-tighter text-base tabular-nums">
                                                    {r.receiptNo}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                {r.purchaseOrder?.poNumber ? (
                                                    <div className="inline-flex items-center gap-2 bg-slate-50 text-slate-700 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-slate-200 tabular-nums shadow-sm">
                                                        <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
                                                        {r.purchaseOrder.poNumber}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-bold text-xs uppercase italic tracking-widest">---</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-xl border border-emerald-100 font-black text-xs uppercase tabular-nums shadow-sm">
                                                    <Package className="w-4 h-4 text-emerald-600" />
                                                    {r._count?.items || 0} รายการ
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-xs font-bold text-slate-500 truncate max-w-[200px] italic">
                                                    {r.remarks || "ไม่มีหมายเหตุ"}
                                                </p>
                                            </td>
                                            <td className="p-6 text-right">
                                                <Link
                                                    href={`/history/inbound/${r.id}`}
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