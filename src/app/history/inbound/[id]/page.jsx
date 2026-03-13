"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Printer,
    FileCheck,
    User,
    Calendar,
    Hash,
    Clipboard,
    Package,
    MapPin,
    DollarSign,
    ShieldCheck,
    Info
} from "lucide-react";

export default function GoodsReceiptDetailPage({ params }) {
    const { id } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDetail() {
            try {
                const res = await apiFetch(`/inventory/receipt/${id}`, { method: "GET" });
                setData(res);
            } catch (error) {
                console.error("Load Detail Error", error);
            } finally {
                setLoading(false);
            }
        }
        loadDetail();
    }, [id]);

    if (loading) {
        return (
            <AuthGate>
                <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
                    {/* คง Spinner ไว้เพื่อบอกสถานะ แต่ไม่มีเอฟเฟกต์ Fade */}
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Registry...</p>
                </div>
            </AuthGate>
        );
    }

    if (!data) {
        return (
            <AuthGate>
                <div className="p-20 text-center space-y-4">
                    <p className="text-rose-500 font-black uppercase tracking-widest text-xl">404 - Receipt Not Found</p>
                    <Link href="/history" className="text-slate-500 underline font-bold">กลับสู่หน้าประวัติ</Link>
                </div>
            </AuthGate>
        );
    }

    const totalQty = data.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
    const totalValue = data.items?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0) || 0;
    const formatCurrency = (num) => Number(num).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNumber = (num) => Number(num).toLocaleString('th-TH');

    return (
        <AuthGate>
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header Section (Static - No Animation) */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4 print:hidden">
                    <div className="space-y-1">
                        <Link
                            href="/history"
                            className="text-[10px] font-black text-slate-400 hover:text-slate-900 mb-2 flex items-center gap-1 uppercase tracking-widest"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to History
                        </Link>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Inbound Registry
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800">READ-ONLY</span>
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-slate-300" />
                            เอกสารบันทึกการรับสินค้าเข้าคลัง (Asset Entry Record)
                        </p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200"
                    >
                        <Printer className="w-4 h-4" />
                        พิมพ์ใบตรวจรับสินค้า
                    </button>
                </div>

                {/* Print-Only Header */}
                <div className="hidden print:flex flex-col space-y-4 mb-10 border-b-4 border-slate-900 pb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">TJC GROUP</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Supply Chain Management</p>
                        </div>
                        <div className="text-right">
                            <h1 className="text-xl font-black uppercase tracking-tight">Goods Receipt Note (GRN)</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document No: {data.receiptNo}</p>
                        </div>
                    </div>
                </div>

                {/* Info Cards Section (Static Styles) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-700 text-[9px] font-black px-4 py-1 rounded-bl-xl tracking-widest uppercase">Registry Info</div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Hash className="w-3 h-3" /> GR Number
                        </p>
                        <p className="text-2xl font-black text-emerald-600 font-mono tracking-tighter mb-4">{data.receiptNo}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Clipboard className="w-3 h-3" /> PO Reference
                        </p>
                        <p className="text-sm font-black text-slate-800 uppercase italic">
                            {data.purchaseOrder?.poNumber || <span className="text-slate-300">N/A (No PO Linked)</span>}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Transaction Date
                        </p>
                        <p className="text-sm font-black text-slate-800 mb-4">{new Date(data.createdAt).toLocaleString('th-TH')}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <User className="w-3 h-3" /> Received By
                        </p>
                        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100">
                            <span className="text-xs font-black uppercase tracking-tight">
                                {data.user ? `${data.user.firstName} ${data.user.lastName}` : data.receivedBy}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Observations & Remarks
                        </p>
                        <div className="text-xs font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[80px] italic leading-relaxed">
                            {data.remarks ? `"${data.remarks}"` : "--- No inspection notes provided ---"}
                        </div>
                    </div>
                </div>

                {/* Items Table (Optimized Performance) */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden relative group">
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.02] select-none overflow-hidden">
                        <div className="text-[120px] font-black -rotate-12 uppercase tracking-tighter">TJC INBOUND</div>
                    </div>

                    <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center relative z-10">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-500" />
                            Inventory Verification List
                        </h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Items Total: {data.items?.length || 0}</span>
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <table className="min-w-full text-sm">
                            <thead className="bg-white border-b border-slate-200">
                                <tr className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em]">
                                    <th className="p-6 text-left">Asset Specification</th>
                                    <th className="p-6 text-left">Facility Location</th>
                                    <th className="p-6 text-right">Quantity</th>
                                    <th className="p-6 text-right">Unit Cost</th>
                                    <th className="p-6 text-right text-slate-900">Subtotal (THB)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {data.items?.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-6">
                                            <div className="font-black text-xs text-slate-900 uppercase tracking-tight">
                                                {item.product?.name}
                                            </div>
                                            <div className="text-[10px] font-mono font-bold text-slate-400 mt-1 tracking-widest italic">
                                                SKU: {item.product?.sku}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <MapPin className="w-3 h-3 text-slate-300" />
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                                                        {item.location?.warehouse?.code || "GEN-WH"}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        Loc: {item.location?.code || "-"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className="font-mono font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg text-xs">
                                                {formatNumber(item.quantity)}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="font-mono font-bold text-slate-400 text-[11px] flex items-center justify-end gap-1">
                                                <DollarSign className="w-3 h-3" />
                                                {formatCurrency(item.unitCost)}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right font-black text-slate-900 font-mono text-xs">
                                            {formatCurrency(item.quantity * (item.unitCost || 0))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-900 border-t-2 border-slate-800 text-white">
                                <tr>
                                    <td colSpan="2" className="p-6 text-right uppercase tracking-[0.2em] text-[10px] text-slate-500 font-black">Grand Total Summary:</td>
                                    <td className="p-6 text-right">
                                        <div className="font-mono font-black text-emerald-400 text-lg">{formatNumber(totalQty)}</div>
                                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mt-0.5">Total Units</p>
                                    </td>
                                    <td className="p-6"></td>
                                    <td className="p-6 text-right">
                                        <div className="font-mono font-black text-emerald-400 text-xl">฿{formatCurrency(totalValue)}</div>
                                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mt-0.5">Inventory Value</p>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Footer Security Compliance (Static) */}
                <div className="flex flex-col md:flex-row justify-between items-center px-8 py-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Certified Logistics Record - Non Modifiable Entry
                        </span>
                    </div>
                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-2 md:mt-0">
                        Registry UUID: {id.toString().toUpperCase()} • TJC SYNC OK
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}