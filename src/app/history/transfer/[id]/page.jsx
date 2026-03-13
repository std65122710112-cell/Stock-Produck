"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import {
    ArrowLeft,
    Printer,
    RefreshCw,
    User,
    Calendar,
    Hash,
    Info,
    Package,
    MapPin,
    ShieldCheck,
    ArrowRightLeft
} from "lucide-react";

export default function TransferDetailPage({ params }) {
    const { id } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDetail() {
            try {
                const res = await apiFetch(`/inventory/transfer/${id}`, { method: "GET" });
                setData(res);
            } catch (error) {
                console.error("Error loading TO detail:", error);
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
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Accessing Transfer Record...</p>
                </div>
            </AuthGate>
        );
    }

    if (!data) {
        return (
            <AuthGate>
                <div className="p-20 text-center space-y-4">
                    <p className="text-rose-500 font-black uppercase tracking-widest text-xl">404 - Transfer Record Not Found</p>
                    <Link href="/history" className="text-slate-500 underline font-bold">กลับสู่หน้าประวัติ</Link>
                </div>
            </AuthGate>
        );
    }

    return (
        <AuthGate>
            <Toaster />
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header Action (Static - No Animation) */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4 print:hidden">
                    <div className="space-y-1">
                        <Link
                            href="/history"
                            className="text-[10px] font-black text-slate-400 hover:text-slate-900 mb-2 flex items-center gap-1 uppercase tracking-widest"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to History
                        </Link>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Transfer Detail
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800">READ-ONLY</span>
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-slate-300" />
                            ใบสั่งโอนย้ายพัสดุระหว่างคลัง (Internal Asset Relocation)
                        </p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200"
                    >
                        <Printer className="w-4 h-4" />
                        พิมพ์หลักฐานการตรวจสอบ
                    </button>
                </div>

                {/* Print-Only Official Header */}
                <div className="hidden print:flex flex-col space-y-4 mb-10 border-b-4 border-slate-900 pb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">TJC GROUP</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Internal Logistics & Inventory Control</p>
                        </div>
                        <div className="text-right">
                            <h1 className="text-xl font-black uppercase tracking-tight text-indigo-600">Stock Transfer Order</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TO Number: {data.transferNo}</p>
                        </div>
                    </div>
                </div>

                {/* Document Metadata Container (Static Styles) */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 relative overflow-hidden">
                    {/* Visual Stamp (Static) */}
                    <div className="absolute -right-12 -bottom-12 opacity-[0.03] rotate-[-15deg] pointer-events-none">
                        <span className="text-[150px] font-black uppercase tracking-tighter text-slate-900">TRANSFER</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> Transfer ID
                                </p>
                                <p className="text-2xl font-black text-indigo-600 font-mono tracking-tighter bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 inline-block">
                                    {data.transferNo}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Info className="w-3 h-3" /> Reason / Purpose
                                </p>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                    {data.reason || <span className="text-slate-300 italic">Not Specified</span>}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 border-l border-slate-100 pl-8">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Transaction Timestamp
                                </p>
                                <p className="text-sm font-black text-slate-800">{new Date(data.createdAt).toLocaleString('th-TH')}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Authorized Personnel
                                </p>
                                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm">
                                    <span className="text-xs font-black uppercase tracking-tight">
                                        {data.user ? `${data.user.firstName} ${data.user.lastName}` : "System Administrator"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center items-center bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100">
                            <ArrowRightLeft className="w-10 h-10 text-indigo-200 mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance Verified</p>
                        </div>
                    </div>
                </div>

                {/* Items Table Section (Optimized Performance) */}
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden relative">
                    <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center relative z-10">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-500" />
                            Relocation Inventory List
                        </h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Total Items: {data.items?.length || 0}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-white border-b border-slate-200">
                                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                    <th className="p-6">#</th>
                                    <th className="p-6">Asset Specification</th>
                                    <th className="p-6">Origin (Source)</th>
                                    <th className="p-6">Destination (Target)</th>
                                    <th className="p-6 text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {data.items.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-6 text-[10px] font-black text-slate-300">{idx + 1}</td>
                                        <td className="p-6">
                                            <div className="font-black text-xs text-slate-900 uppercase tracking-tight">
                                                {item.product.name}
                                            </div>
                                            <div className="text-[10px] font-mono font-bold text-slate-400 mt-1 tracking-widest italic uppercase">
                                                SKU: {item.product.sku}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="p-2 bg-rose-50 rounded-lg">
                                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{item.fromLocation.warehouse.name}</p>
                                                    <p className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter italic">
                                                        {item.fromLocation.zone?.name ? `Zone ${item.fromLocation.zone.name} | ` : ''} {item.fromLocation.code}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="p-2 bg-emerald-50 rounded-lg">
                                                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{item.toLocation.warehouse.name}</p>
                                                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter italic">
                                                        {item.toLocation.zone?.name ? `Zone ${item.toLocation.zone.name} | ` : ''} {item.toLocation.code}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="inline-flex items-center bg-slate-900 text-white px-4 py-2 rounded-2xl font-mono font-black text-lg">
                                                {item.quantity.toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Section (Static) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 mb-10">
                    <div className="flex flex-col justify-end space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Audit Integrity Verified</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] leading-relaxed max-w-sm">
                            This internal transfer record is part of the TJC official audit trail.
                            Quantity adjustments have been synchronized across all facilities.
                        </p>
                    </div>

                    <div className="flex justify-end gap-12 text-center items-end h-40">
                        <div className="space-y-3">
                            <div className="border-b-2 border-slate-200 w-48 pb-1">
                                <span className="text-slate-100 font-mono text-[8px]">SYSTEM VALIDATED</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Origin Dispatcher</p>
                        </div>
                        <div className="space-y-3">
                            <div className="border-b-2 border-slate-200 w-48 pb-1"></div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Destination Receiver</p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}