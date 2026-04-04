"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
    ShieldCheck,
    Activity,
    Hash
} from "lucide-react";

export default function AdjustmentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [doc, setDoc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchDetail() {
            try {
                // Security: เรียกผ่าน API Wrapper และใช้ ID จาก Params โดยตรง
                const res = await apiFetch(`/inventory/adjust/${id}`);
                if (res && typeof res === 'object') {
                    setDoc(res);
                }
            } catch (error) {
                console.error("Security/Load Error:", error);
                router.push('/history');
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchDetail();
    }, [id, router]);

    const getReasonLabel = (code) => {
        const reasons = {
            'MISCOUNT': 'นับจำนวนผิดพลาด',
            'DAMAGED': 'พัสดุชำรุด/เสียหาย',
            'LOST': 'พัสดุสูญหาย',
            'FOUND': 'ตรวจพบพัสดุตกหล่น',
            'EXPIRED': 'พัสดุหมดอายุ'
        };
        return reasons[code] || code;
    };

    if (isLoading) {
        return (
            <AuthGate>
                <div className="flex flex-col justify-center items-center h-[70vh] space-y-6">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1e3b8a] rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">กำลังเรียกข้อมูลเอกสารตรวจสอบ...</p>
                </div>
            </AuthGate>
        );
    }

    if (!doc) return null;

    return (
        <AuthGate>
            {/* CSS สำหรับการปริ้นงาน Audit ให้คมชัด */}
            <style jsx global>{`
                @media print {
                    @page { size: auto; margin: 10mm; }
                    body { background: white !important; }
                    .print-compact { zoom: 0.9; }
                }
            `}</style>

            <div className="max-w-6xl mx-auto space-y-6 pb-20 print:pb-0 print:space-y-2 print-compact">

                {/* TOP NAVIGATION */}
                <div className="flex items-center justify-between px-4 print:hidden">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> ย้อนกลับ
                    </button>
                </div>

                {/* MAIN DOCUMENT CONTAINER - รวมทุกอย่างในกล่องเดียว */}
                <section className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.1)] overflow-hidden relative print:shadow-none print:border-slate-950 print:rounded-3xl">
                    
                    {/* 1. Header Part (ภูมิหลังจางๆ) */}
                    <div className="p-10 md:p-12 border-b-2 border-slate-50 bg-slate-50/30 relative z-10 print:bg-white print:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="space-y-4">
                                
                                <h1 className="text-4xl font-black text-slate-950 tracking-tight flex items-center gap-3 print:text-3xl">
                                    รายละเอียดการปรับยอด
                                </h1>
                                <p className="text-slate-500 text-sm font-bold flex items-center gap-2 italic print:text-xs">
                                    <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                                    บันทึกประวัติการปรับปรุงสต๊อกถาวร (Immutable Audit Record)
                                </p>
                            </div>

                            <div className="text-left md:text-right space-y-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-w-[250px] print:border-2 print:border-slate-900">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขที่เอกสาร (ADJ No.)</p>
                                {/* ตัวเลขแบบ tabular-nums (0 ไม่มีขีด) */}
                                <p className="text-3xl font-black text-[#1e3b8a] tabular-nums tracking-tighter leading-none">{doc.adjustNo}</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Metadata Info Matrix (4 Columns) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-50 border-b-2 border-slate-50 relative z-10 print:border-b-4 print:border-slate-900">
                        <div className="p-8 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" /> วันที่ทำรายการ
                            </p>
                            <p className="text-sm font-black text-slate-800 tabular-nums">{new Date(doc.createdAt).toLocaleString('th-TH')}</p>
                        </div>
                        <div className="p-8 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-orange-500" /> สาเหตุการปรับยอด
                            </p>
                            <span className="inline-block bg-orange-50 text-orange-600 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100 shadow-sm">
                                {getReasonLabel(doc.reasonCode)}
                            </span>
                        </div>
                        <div className="p-8 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-indigo-500" /> ผู้ตรวจสอบ (Auditor)
                            </p>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                {doc.user?.firstName} {doc.user?.lastName}
                            </p>
                        </div>
                        <div className="p-8 space-y-2 bg-slate-50/30 print:bg-white">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-slate-500" /> หมายเหตุระบบ
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                                {doc.remarks ? `"${doc.remarks}"` : "ไม่มีบันทึกเพิ่มเติม"}
                            </p>
                        </div>
                    </div>

                    {/* 3. Items Table Section */}
                    <div className="p-8 md:p-10 relative z-10 print:p-6">
                        <div className="mb-6 flex items-center justify-between print:mb-4">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Package className="w-4 h-4 text-[#1e3b8a]" /> รายการพัสดุที่ปรับปรุงยอด
                            </h2>
                            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full tabular-nums border border-slate-100">
                                ทั้งหมด: {doc.items?.length || 0} รายการ
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 shadow-sm print:rounded-none print:border-2 print:border-slate-900">
                            <table className="min-w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-100 print:bg-white print:border-b-2 print:border-slate-900">
                                    <tr className="text-[10px] font-black text-slate-950 uppercase tracking-widest">
                                        <th className="p-6">รายละเอียดพัสดุ</th>
                                        <th className="p-6">ตำแหน่งจัดเก็บ</th>
                                        <th className="p-6 text-center">ยอดเดิมในระบบ</th>
                                        <th className="p-6 text-center">จำนวนที่นับจริง</th>
                                        <th className="p-6 text-right">ผลต่าง (Variance)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                    {doc.items?.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="font-black text-sm text-slate-950 uppercase tracking-tight">
                                                    {item.product?.name}
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 mt-1.5 tabular-nums">
                                                    <Hash className="w-3 h-3" /> SKU: {item.product?.sku}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2.5">
                                                    <MapPin className="w-4 h-4 text-indigo-600 print:hidden" />
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                                                            {item.location?.warehouse?.code || "WH-DEFAULT"}
                                                        </p>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase">
                                                            Loc: {item.location?.code || "-"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center text-slate-400 font-black tabular-nums line-through decoration-slate-300">
                                                {item.oldQuantity}
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl font-black tabular-nums text-lg border border-indigo-100 shadow-sm print:bg-white print:border-none">
                                                    {item.newQuantity}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className={`inline-flex items-center gap-1 px-3 py-1.5 font-black rounded-xl text-xs uppercase tracking-widest tabular-nums ${
                                                    item.diffQuantity > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
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

                    
                </section>
            </div>
        </AuthGate>
    );
}