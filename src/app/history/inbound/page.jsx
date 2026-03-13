"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
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
    Database
} from "lucide-react";

export default function GoodsReceiptHistoryPage() {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);

    async function loadHistory() {
        try {
            const data = await apiFetch("/inventory/receipt", { method: "GET" });
            setReceipts(data);
        } catch (e) {
            console.error("Load History Error", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadHistory(); }, []);

    return (
        <AuthGate>
            <div className="w-full space-y-8">

                {/* Header Section: Static Professional Look */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">
                            Inbound Logistics Control
                        </p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                            GR Registry
                        </h1>
                        <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            ประวัติการรับเข้าสินค้าและบันทึกการเพิ่มสต๊อก
                        </p>
                    </div>
                    <Link
                        href="/dashboard/inbound/create"
                        className="group flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100"
                    >
                        <Plus className="w-4 h-4" />
                        สร้างใบรับสินค้าใหม่
                    </Link>
                </div>

                {/* Status Bar (Static) */}
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <History className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                            Total: {receipts.length} Documents
                        </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                            Audit-Ready Registry
                        </span>
                    </div>
                </div>

                {/* Main Table Container (No Animation) */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                    <th className="p-6">วันที่รับเข้า / เวลา</th>
                                    <th className="p-6">เลขที่ใบรับสินค้า (GR)</th>
                                    <th className="p-6">อ้างอิงใบสั่งซื้อ (PO)</th>
                                    <th className="p-6 text-center">รายการ</th>
                                    <th className="p-6">หมายเหตุตรวจสอบ</th>
                                    <th className="p-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                                                <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Syncing Inbound Registry...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : receipts.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <AlertCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Receipt Records Found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    receipts.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                    {new Date(r.createdAt).toLocaleString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                        <ArrowDownLeft className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-black text-slate-800 uppercase tracking-tighter text-sm">
                                                        {r.receiptNo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {r.purchaseOrder?.poNumber ? (
                                                    <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-800">
                                                        <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                                                        {r.purchaseOrder.poNumber}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-bold text-[10px] uppercase italic">No Reference</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-slate-700 font-black text-[10px] uppercase">
                                                    <Package className="w-3 h-3" />
                                                    {r._count?.items || 0} Items
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-[11px] text-slate-500 font-bold truncate max-w-[200px] italic">
                                                    {r.remarks || "---"}
                                                </p>
                                            </td>
                                            <td className="p-6 text-right">
                                                <Link
                                                    href={`/history/inbound/${r.id}`}
                                                    className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white"
                                                >
                                                    Details <ChevronRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Bottom Assurance Note (Static) */}
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[2rem] flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                        <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Data Integrity Guaranteed</p>
                        <p className="text-[9px] text-emerald-600 font-bold uppercase">รายการทั้งหมดถูกตรวจสอบความถูกต้องของจำนวนสต๊อกและต้นทุนในระดับฐานข้อมูล</p>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}