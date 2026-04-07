"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    ArrowLeft,
    ClipboardCheck,
    User,
    Calendar,
    AlertCircle,
    Info,
    Package,
    MapPin,
    Hash
} from "lucide-react";

export default function CountTaskDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [doc, setDoc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchDetail() {
            try {
                const res = await apiFetch(`/inventory/count-tasks/${id}`);

                if (res?.success && res.data) {
                    setDoc(res.data);
                } else if (res && typeof res === "object") {
                    setDoc(res.data || res);
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

    const getStatusLabel = (status) => {
        const map = {
            PENDING: "รอตรวจนับ",
            COUNTING: "กำลังตรวจนับ",
            REVIEW: "รอตรวจสอบ",
            COMPLETED: "เสร็จสิ้น"
        };
        return map[status] || status || "-";
    };

    if (isLoading) {
        return (
            <AuthGate>
                <div className="flex flex-col justify-center items-center h-[70vh] space-y-6">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1e3b8a] rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">
                        กำลังเรียกข้อมูลเอกสารตรวจนับ...
                    </p>
                </div>
            </AuthGate>
        );
    }

    if (!doc) return null;

    return (
        <AuthGate>
            <style jsx global>{`
                @media print {
                    @page { size: auto; margin: 10mm; }
                    body { background: white !important; }
                    .print-compact { zoom: 0.9; }
                }
            `}</style>

            <div className="max-w-6xl mx-auto space-y-6 pb-20 print:pb-0 print:space-y-2 print-compact">
                <div className="flex items-center justify-between px-4 print:hidden">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        ย้อนกลับ
                    </button>
                </div>

                <section className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.1)] overflow-hidden relative print:shadow-none print:border-slate-950 print:rounded-3xl">
                    <div className="p-10 md:p-12 border-b-2 border-slate-50 bg-slate-50/30 relative z-10 print:bg-white print:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="space-y-4">
                                <h1 className="text-4xl font-black text-slate-950 tracking-tight flex items-center gap-3 print:text-3xl">
                                    รายละเอียดการตรวจนับ
                                </h1>
                                <p className="text-slate-500 text-sm font-bold flex items-center gap-2 italic print:text-xs">
                                    <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                                    บันทึกผลการตรวจนับสต๊อก
                                </p>
                            </div>

                            <div className="text-left md:text-right space-y-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-w-[250px] print:border-2 print:border-slate-900">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    เลขที่เอกสาร (CNT No.)
                                </p>
                                <p className="text-3xl font-black text-[#1e3b8a] tabular-nums tracking-tighter leading-none">
                                    {doc.taskNo || "-"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-50 border-b-2 border-slate-50 relative z-10 print:border-b-4 print:border-slate-900">
                        <div className="p-8 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                วันที่ทำรายการ
                            </p>
                            <p className="text-sm font-black text-slate-800 tabular-nums">
                                {doc.createdAt ? new Date(doc.createdAt).toLocaleString('th-TH') : "-"}
                            </p>
                        </div>

                        <div className="p-8 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                                สถานะเอกสาร
                            </p>
                            <span className="inline-block bg-blue-300 text-blue-700 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-300 shadow-sm">
                                {getStatusLabel(doc.status)}
                            </span>
                        </div>

                        <div className="p-8 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-indigo-500" />
                                ผู้ทำรายการ
                            </p>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                {doc.creator
                                    ? `${doc.creator.firstName || ""} ${doc.creator.lastName || ""}`.trim()
                                    : "ผู้ใช้งานระบบ"}
                            </p>
                        </div>

                        <div className="p-8 space-y-2 bg-slate-50/30 print:bg-white">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-slate-500" />
                                หมายเหตุ
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                                {doc.remarks ? `"${doc.remarks}"` : "ไม่มีบันทึกเพิ่มเติม"}
                            </p>
                        </div>
                    </div>

                    <div className="p-8 md:p-10 relative z-10 print:p-6">
                        <div className="mb-6 flex items-center justify-between print:mb-4">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Package className="w-4 h-4 text-[#1e3b8a]" />
                                รายการพัสดุที่ตรวจนับ
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
                                        <th className="p-6 text-center">ยอดระบบ</th>
                                        <th className="p-6 text-center">ยอดนับจริง</th>
                                        <th className="p-6 text-right">ผลต่าง</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                    {doc.items?.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="font-black text-sm text-slate-950 uppercase tracking-tight">
                                                    {item.product?.name || "-"}
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 mt-1.5 tabular-nums">

                                                    {item.product?.sku || "-"}
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="flex items-center gap-2.5">
                                                    <MapPin className="w-4 h-4 text-indigo-600 print:hidden" />
                                                    <div>
                                                        {/* 1. แสดงชื่อเต็มของคลังสินค้า */}
                                                        <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">
                                                            {item.location?.warehouse?.name || item.location?.warehouse?.code || "คลังสินค้าไม่ระบุชื่อ"}
                                                        </p>

                                                        {/* 2. แสดงชื่อโซน และ ชื่อตำแหน่ง (หรือรหัสตำแหน่ง) */}
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase flex flex-wrap gap-1">
                                                            <span>โซน: {item.location?.zone?.name || item.location?.zone?.code || "-"}</span>
                                                            <span className="text-slate-300">|</span>
                                                            <span>ตำแหน่ง: {item.location?.name || item.location?.code || "-"}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center text-slate-500 font-black tabular-nums">
                                                {item.systemQty ?? 0}
                                            </td>

                                            <td className="p-6 text-center">
                                                <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl font-black tabular-nums text-lg border border-indigo-100 shadow-sm print:bg-white print:border-none">
                                                    {item.countedQty ?? "-"}
                                                </span>
                                            </td>

                                            <td className="p-6 text-right">
                                                <div
                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 font-black rounded-xl text-xs uppercase tracking-widest tabular-nums ${Number(item.diffQty) > 0
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            : Number(item.diffQty) < 0
                                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                                : 'bg-slate-50 text-slate-400 border border-slate-100'
                                                        }`}
                                                >
                                                    {Number(item.diffQty) > 0 ? '+' : ''}{item.diffQty ?? 0}
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