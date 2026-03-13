"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    ArrowLeft,
    Printer,
    ClipboardCheck,
    User,
    Calendar,
    AlertCircle,
    Info,
    Package,
    MapPin,
    ShieldCheck
} from "lucide-react";

export default function AdjustmentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [doc, setDoc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchDetail() {
            try {
                const res = await apiFetch(`/inventory/adjust/${id}`);
                setDoc(res);
            } catch (error) {
                alert("ไม่สามารถโหลดข้อมูลรายละเอียดได้ หรือคุณไม่มีสิทธิ์เข้าถึง");
                router.push('/dashboard/history');
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchDetail();
    }, [id, router]);

    const getReasonLabel = (code) => {
        const reasons = {
            'MISCOUNT': 'นับผิดพลาด',
            'DAMAGED': 'ชำรุด/เสียหาย',
            'LOST': 'สูญหาย',
            'FOUND': 'ค้นพบตกหล่น',
            'EXPIRED': 'หมดอายุ'
        };
        return reasons[code] || code;
    };

    if (isLoading) {
        return (
            <AuthGate>
                <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
                    {/* คง Spinner ไว้เพื่อให้รู้ว่าระบบยังทำงานอยู่ */}
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Registry...</p>
                </div>
            </AuthGate>
        );
    }

    if (!doc) return null;

    return (
        <AuthGate>
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Top Navigation & Actions (Static - No Animation) */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4 print:hidden">
                    <div className="space-y-1">
                        <button
                            onClick={() => router.back()}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-900 mb-2 flex items-center gap-1 uppercase tracking-widest"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to History
                        </button>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Registry Detail
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800">READ-ONLY</span>
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-slate-300" />
                            เอกสารประวัติปรับปรุงยอดสต๊อก (Immutable Audit Record)
                        </p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200"
                    >
                        <Printer className="w-4 h-4" />
                        พิมพ์เอกสารอ้างอิง
                    </button>
                </div>

                {/* Print-Only Header */}
                <div className="hidden print:flex flex-col space-y-4 mb-10 border-b-4 border-slate-900 pb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">TJC GROUP</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enterprise Inventory Control System</p>
                        </div>
                        <div className="text-right">
                            <h1 className="text-xl font-black uppercase tracking-tight">Stock Adjustment Report</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ref No: {doc.adjustNo}</p>
                        </div>
                    </div>
                </div>

                {/* Metadata Cards (Static Styles) */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 relative overflow-hidden">
                    {/* Visual Stamp (Static) */}
                    <div className="absolute -right-12 -bottom-12 opacity-[0.03] rotate-[-15deg] pointer-events-none">
                        <span className="text-[150px] font-black uppercase tracking-tighter">AUDITED</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Info className="w-3 h-3" /> ID. Number
                            </p>
                            <p className="text-xl font-black text-indigo-600 font-mono tracking-tighter">{doc.adjustNo}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Entry Date
                            </p>
                            <p className="text-sm font-black text-slate-800">{new Date(doc.createdAt).toLocaleString('th-TH')}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Reason Code
                            </p>
                            <div className="inline-block">
                                <span className="text-[10px] font-black text-white bg-slate-900 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-800">
                                    {getReasonLabel(doc.reasonCode)}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <User className="w-3 h-3" /> Auditor
                            </p>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1 whitespace-nowrap">
                                {doc.user?.firstName} {doc.user?.lastName}
                            </p>
                        </div>

                        <div className="col-span-2 md:col-span-4 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks & Observations</p>
                            <p className="text-xs text-slate-600 italic font-bold leading-relaxed">
                                {doc.remarks ? `"${doc.remarks}"` : '--- No additional remarks specified for this transaction ---'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Items Table (Performance Optimized) */}
                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden print:border-slate-900 print:rounded-none">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 print:bg-white print:border-slate-900">
                                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] print:text-slate-900">
                                    <th className="p-6">#</th>
                                    <th className="p-6 text-left">Asset / Specification</th>
                                    <th className="p-6 text-left">Facility Location</th>
                                    <th className="p-6 text-center">System Qty</th>
                                    <th className="p-6 text-center text-indigo-600">Actual Count</th>
                                    <th className="p-6 text-right">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 print:divide-slate-900">
                                {doc.items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-6 text-[10px] font-black text-slate-300">{index + 1}</td>
                                        <td className="p-6">
                                            <div className="flex items-start gap-3 whitespace-nowrap">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 uppercase tracking-tighter text-xs">
                                                        {item.product?.name}
                                                    </p>
                                                    <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5 tracking-widest italic uppercase">
                                                        SKU: {item.product?.sku}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <MapPin className="w-3 h-3 text-slate-300" />
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{item.location?.warehouse?.code}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Loc: {item.location?.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center text-slate-400 font-mono font-bold line-through decoration-slate-300 bg-slate-50/30">
                                            {item.oldQuantity}
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl font-mono font-black border border-indigo-100 text-lg shadow-sm">
                                                {item.newQuantity}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className={`inline-flex items-center gap-1 px-3 py-1.5 font-mono font-black rounded-xl text-xs uppercase tracking-widest ${item.diffQuantity > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    item.diffQuantity < 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                        'bg-slate-50 text-slate-400 border border-slate-100'
                                                }`}>
                                                {item.diffQuantity > 0 ? '+' : ''}{item.diffQuantity}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Security Compliance */}
                <div className="flex flex-col md:flex-row justify-between items-center px-8 py-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Certified Logistics Record - Internal Audit Sync OK
                        </span>
                    </div>
                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-2 md:mt-0">
                        Registry UUID: {id.toString().toUpperCase()}
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}