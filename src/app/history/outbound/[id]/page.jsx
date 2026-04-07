"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import {
    ArrowLeft, Truck, User, Calendar, Hash, Package, MapPin,
    ShieldCheck, Info, UserCheck, Database, MessageSquareText,
    CheckCircle2, Banknote, Building2, ClipboardList
} from "lucide-react";

export default function DeliveryOrderDetailPage({ params }) {
    const { id } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function loadDetail() {
            try {
                const res = await apiFetch(`/outbound/delivery-orders/${id}`, { method: "GET" });
                if (isMounted && res) {
                    setData(res.data || res);
                }
            } catch (error) {
                console.error("Load Error:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadDetail();
        return () => { isMounted = false; };
    }, [id]);

    const memoizedItems = useMemo(() => data?.items || [], [data]);

    // 💡 คำนวณยอดรวมจำนวนและมูลค่า
    const totalQty = useMemo(() => memoizedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [memoizedItems]);
    const totalValue = useMemo(() => memoizedItems.reduce((sum, item) => {
        const cost = item.product?.unitCost || 0;
        return sum + (Number(item.quantity) * cost);
    }, 0), [memoizedItems]);

    const formatNumber = (num) => Number(num).toLocaleString('th-TH');
    const formatCurrency = (num) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

    if (loading) return (
        <AuthGate>
            <div className="flex flex-col justify-center items-center h-[70vh] space-y-6">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1e3b8a] rounded-full animate-spin"></div>
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">กำลังเรียกข้อมูลเอกสาร...</p>
            </div>
        </AuthGate>
    );

    if (!data) return <div className="p-20 text-center font-black">ไม่พบข้อมูลเอกสาร</div>;

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <style jsx global>{`
                @media print {
                    @page { size: auto; margin: 10mm; }
                    body { background: white !important; }
                    .print-compact { zoom: 0.8; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="max-w-6xl mx-auto space-y-6 pb-20 print:pb-0 print:space-y-2 print-compact">
                <section className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative print:border-2 print:border-slate-950">

                    {/* Header: Document Info */}
                    <div className="p-10 md:p-12 border-b-2 border-slate-50 bg-slate-50/30 print:bg-white">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="space-y-3">
                                <h1 className="text-4xl font-black text-slate-950 tracking-tighter uppercase flex items-center gap-4">
                                    ใบนำจ่ายสินค้า (Delivery Order)
                                </h1>
                                <div className="flex flex-wrap gap-4">
                                    <p className="text-slate-500 text-sm font-bold flex items-center gap-2 italic">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> บันทึกการตัดสต๊อกสำเร็จ
                                    </p>
                                    <p className="text-indigo-600 text-sm font-bold flex items-center gap-2">
                                        <Building2 className="w-4 h-4" /> แผนก: {data.requisition?.department?.name || "ไม่ระบุแผนก"}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm print:border-2 print:border-slate-950">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">เลขที่ใบนำจ่าย</p>
                                <p className="text-3xl font-black text-[#1e3b8a] tabular-nums tracking-tighter leading-none text-center">{data.doNo}</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Grid: 4 Columns */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-50 border-b-2 border-slate-50 print:border-b-4 print:border-slate-900">
                        <div className="p-6 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> วันที่จ่ายออก</p>
                            <p className="text-sm font-black text-slate-900">{new Date(data.createdAt).toLocaleString('th-TH')}</p>
                        </div>
                        <div className="p-6 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> อ้างอิงใบเบิก</p>
                            <p className="text-sm font-black text-slate-900">{data.reference || "-"}</p>
                        </div>
                        <div className="p-6 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><ClipboardList className="w-3.5 h-3.5" /> วัตถุประสงค์</p>
                            <p className="text-sm font-bold text-slate-700 truncate">{data.requisition?.purpose || "เพื่อใช้งานในแผนก"}</p>
                        </div>

                    </div>

                    {/* Personnel Table */}
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-50 border-b-2 border-slate-50">
                        <div className="p-6 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">ผู้ขอเบิก</p>
                                <p className="text-xs font-black text-slate-800 uppercase">{data.requisition?.user?.firstName} {data.requisition?.user?.lastName}</p>
                            </div>
                        </div>
                        <div className="p-6 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><UserCheck className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">ผู้อนุมัติใบเบิก</p>
                                <p className="text-xs font-black text-slate-800 uppercase">{data.requisition?.approver?.firstName || "SYSTEM"} {data.requisition?.approver?.lastName || ""}</p>
                            </div>
                        </div>
                        <div className="p-6 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500"><ShieldCheck className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">เจ้าหน้าที่คลังผู้จ่าย</p>
                                <p className="text-xs font-black text-slate-800 uppercase">{data.user?.firstName} {data.user?.lastName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Items Table */}
                    <div className="p-8">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Package className="w-4 h-4" /> รายการพัสดุและมูลค่าเบิกจ่าย
                            </h2>
                        </div>

                        <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm print:border-2 print:border-slate-900">
                            <table className="min-w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 border-b-2 border-slate-100 print:bg-white print:border-b-2 print:border-slate-900">
                                    <tr className="text-[10px] font-black text-slate-950 uppercase tracking-widest">
                                        <th className="p-5 w-12 text-center">#</th>
                                        <th className="p-5">รายละเอียดพัสดุ</th>
                                        <th className="p-5">ตำแหน่งคลัง</th>
                                        <th className="p-5 text-right">จำนวน</th>
                                        <th className="p-5 text-right">ราคา/หน่วย</th>
                                        <th className="p-5 text-right pr-8">มูลค่ารวม</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                    {memoizedItems.map((item, idx) => {
                                        const unitCost = item.product?.unitCost || 0;
                                        const rowTotal = Number(item.quantity) * unitCost;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-5 text-center text-slate-300 font-black tabular-nums">{idx + 1}</td>
                                                <td className="p-5">
                                                    <div className="font-black text-slate-900">{item.product?.name}</div>
                                                    <div className="text-[9px] font-black text-blue-600 mt-1 uppercase">SKU: {item.product?.sku}</div>
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
                                                <td className="p-5 text-right font-black tabular-nums text-base">
                                                    {formatNumber(item.quantity)} <span className="text-[9px] text-slate-400 uppercase ml-1">{item.product?.unit?.name}</span>
                                                </td>
                                                <td className="p-5 text-right font-bold text-slate-500 tabular-nums">
                                                    {formatNumber(unitCost)}
                                                </td>
                                                <td className="p-5 text-right pr-8 font-black text-slate-900 tabular-nums">
                                                    {formatNumber(rowTotal)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary Section */}
                        <div className="mt-8 flex flex-col md:flex-row justify-end gap-4">
                            <div className="bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนรวมทั้งสิ้น</p>
                                <p className="text-2xl font-black text-slate-900 tabular-nums">{formatNumber(totalQty)}</p>
                            </div>
                            <div className="bg-indigo-600 px-8 py-4 rounded-2xl border border-indigo-700 flex items-center gap-6 shadow-xl shadow-indigo-100 print:bg-white print:border-2 print:border-slate-900 print:shadow-none">
                                <div className="text-white print:text-slate-900">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">มูลค่ารวมพัสดุที่เบิกจ่ายออก</p>
                                    <p className="text-3xl font-black tabular-nums leading-none mt-1">
                                        {formatCurrency(totalValue)}
                                    </p>
                                </div>
                                <Banknote className="w-8 h-8 text-indigo-300 print:text-slate-900 opacity-50" />
                            </div>
                        </div>

                        {/* ลายเซ็นต์สำหรับการพิมพ์ */}
                        <div className="hidden print:grid grid-cols-3 gap-12 mt-20 text-center">
                            <div className="space-y-10">
                                <div className="border-b border-slate-900 pb-2"></div>
                                <p className="text-[10px] font-black uppercase">ผู้ออกของ (Dispatcher)</p>
                            </div>
                            <div className="space-y-10">
                                <div className="border-b border-slate-900 pb-2"></div>
                                <p className="text-[10px] font-black uppercase">ผู้รับของ (Receiver)</p>
                            </div>
                            <div className="space-y-10">
                                <div className="border-b border-slate-900 pb-2"></div>
                                <p className="text-[10px] font-black uppercase">ผู้อนุมัติ (Authorized)</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </AuthGate>
    );
}