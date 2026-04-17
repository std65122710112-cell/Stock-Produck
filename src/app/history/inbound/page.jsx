"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
    ChevronRight,
    ClipboardCheck,
    Package,
    AlertCircle,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function GoodsReceiptHistoryPage() {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);

    async function loadHistory() {
        try {
            const data = await apiFetch("/inventory/receipt", { method: "GET" });
            if (data && Array.isArray(data)) {
                setReceipts(data);
            } else {
                setReceipts([]);
            }
        } catch (e) {
            console.error("Load Error:", e);
            setReceipts([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadHistory(); }, []);

    const memoizedReceipts = useMemo(() => receipts, [receipts]);

    return (
        <div className="w-full">
            <Toaster position="top-right" />

            {/* --- DATA TABLE SECTION --- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                                <th className="py-4 px-6">วันที่รับเข้า / เวลา</th>
                                <th className="py-4 px-6">เลขที่ใบรับสินค้า (GR)</th>
                                <th className="py-4 px-6">อ้างอิงใบสั่งซื้อ (PO)</th>
                                <th className="py-4 px-6 text-center">จำนวนรายการ</th>
                                <th className="py-4 px-6">หมายเหตุ</th>
                                <th className="py-4 px-6 text-right">ดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                // เรียกใช้ Skeleton ของคุณที่นี่
                                <tr><td colSpan="6" className="py-20 text-center text-slate-400">กำลังดึงข้อมูล...</td></tr>
                            ) : memoizedReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle className="w-12 h-12 text-slate-200" />
                                            <p className="text-slate-400 font-medium text-sm">ไม่พบข้อมูลประวัติการรับสินค้า</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                memoizedReceipts.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {/* วันที่ / เวลา */}
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col text-slate-600">
                                                <span className="text-sm font-bold tabular-nums">
                                                    {new Date(r.createdAt).toLocaleDateString('th-TH')}
                                                </span>
                                                <span className="text-[10px] font-medium opacity-70">
                                                    {new Date(r.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </span>
                                            </div>
                                        </td>

                                        {/* GR Number */}
                                        <td className="py-4 px-6">
                                            <span className="font-bold text-[#1F3B8B] tabular-nums tracking-tight">
                                                {r.receiptNo}
                                            </span>
                                        </td>

                                        {/* PO Reference */}
                                        <td className="py-4 px-6">
                                            {r.purchaseOrder?.poNumber ? (
                                                <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-bold tabular-nums">
                                                    <ClipboardCheck className="w-3 h-3 text-slate-500" />
                                                    {r.purchaseOrder.poNumber}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs italic">- ไม่มีอ้างอิง -</span>
                                            )}
                                        </td>

                                        {/* Item Count */}
                                        <td className="py-4 px-6 text-center">
                                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100 font-bold text-xs tabular-nums">
                                                <Package className="w-3.5 h-3.5" />
                                                {r._count?.items || 0}
                                            </div>
                                        </td>

                                        {/* Remarks */}
                                        <td className="py-4 px-6">
                                            <p className="text-xs text-slate-500 truncate max-w-[180px]" title={r.remarks}>
                                                {r.remarks || "---"}
                                            </p>
                                        </td>

                                        {/* Action */}
                                        <td className="py-4 px-6 text-right">
                                            <Link
                                                href={`/history/inbound/${r.id}`}
                                                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-[#1F3B8B] px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 hover:border-[#1F3B8B] transition-all shadow-sm"
                                            >
                                                View <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}