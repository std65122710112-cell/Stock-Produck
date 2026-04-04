"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import {
    ArrowLeft,
    RefreshCw,
    User,
    Calendar,
    Hash,
    Info,
    Package,
    MapPin,
    ShieldCheck,
    ArrowRightLeft,
    CheckCircle2,
    Activity
} from "lucide-react";

export default function TransferDetailPage({ params }) {
    const { id } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true; // Security: ป้องกัน Memory Leak จาก Async Operation
        async function loadDetail() {
            try {
                // Security: ใช้ API Wrapper จัดการ Token ให้อัตโนมัติ
                const res = await apiFetch(`/inventory/transfer/${id}`, { method: "GET" });
                if (isMounted && res && typeof res === 'object') {
                    setData(res);
                }
            } catch (error) {
                console.error("Critical Security/Load Error:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadDetail();
        return () => { isMounted = false; };
    }, [id]);

    // Security & Performance: ล็อกข้อมูล Array ไว้ไม่ให้ Re-render ซ้ำซ้อน
    const memoizedItems = useMemo(() => data?.items || [], [data]);

    if (loading) {
        return (
            <AuthGate>
                <div className="flex flex-col justify-center items-center h-[70vh] space-y-6">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1e3b8a] rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">กำลังเรียกข้อมูลเอกสารโอนย้าย...</p>
                </div>
            </AuthGate>
        );
    }

    if (!data) {
        return (
            <AuthGate>
                <div className="p-20 text-center space-y-8 flex flex-col items-center">
                    <div className="bg-rose-50 w-24 h-24 rounded-[2rem] flex items-center justify-center border-2 border-rose-100 shadow-sm">
                        <ShieldCheck className="w-10 h-10 text-rose-500" />
                    </div>
                    <p className="text-slate-950 font-black uppercase tracking-tighter text-4xl">404 - ไม่พบเอกสารโอนย้าย</p>
                    <Link href="/history" className="bg-[#1e3b8a] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95">
                        กลับสู่หน้าประวัติ
                    </Link>
                </div>
            </AuthGate>
        );
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />

            {/* CSS สำหรับการสั่งพิมพ์ (Print Layout) */}
            <style jsx global>{`
                @media print {
                    @page { size: auto; margin: 10mm; }
                    body { background: white !important; }
                    .print-compact { zoom: 0.85; }
                }
            `}</style>

            <div className="max-w-6xl mx-auto space-y-6 pb-20 print:pb-0 print:space-y-2 print-compact">

                {/* TOP NAVIGATION (อยู่นอกกล่องกระดาษ) */}
                <div className="flex items-center justify-between px-4 print:hidden">
                    <Link
                        href="/history"
                        className="group flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> ย้อนกลับ
                    </Link>
                </div>

                {/* ========================================================= */}
                {/* MAIN DOCUMENT CONTAINER - กระดาษแผ่นเดียว (Single Box) */}
                {/* ========================================================= */}
                <section className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.08)] overflow-hidden relative print:shadow-none print:border-2 print:border-slate-950 print:rounded-3xl">

                    {/* 1. Header Part */}
                    <div className="p-10 md:p-12 border-b-2 border-slate-50 bg-slate-50/30 relative z-10 print:bg-white print:p-8 print:border-b-4 print:border-slate-900">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="space-y-3">
                                
                                <h1 className="text-4xl font-black text-slate-950 tracking-tighter uppercase flex items-center gap-4 print:text-3xl">
                                    รายละเอียดการโอนย้ายสินค้า
                                </h1>
                              
                                <p className="text-slate-500 text-sm font-bold flex items-center gap-2 italic print:text-xs">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    บันทึกการตัดยอดคงคลังแบบถาวร
                                </p>
                            </div>


                            <div className="md:ml-auto w-fit flex flex-col items-center justify-center space-y-2 bg-white px-8 py-5 rounded-[1.8rem] border border-slate-100 shadow-sm print:border-2 print:border-slate-900 print:shadow-none">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none text-center">
                                    เลขที่ใบโอนย้าย (TO NO.)
                                </p>
                                <p className="text-4xl font-black text-[#1e3b8a] tabular-nums tracking-tighter leading-none text-center">
                                    {data.transferNo}
                                </p>
                                <div className="w-12 h-1 bg-indigo-50 rounded-full mt-1"></div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Metadata Info Matrix (จัดเรียง 3 คอลัมน์) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-slate-50 border-b-2 border-slate-50 relative z-10 print:border-b-4 print:border-slate-900">
                        <div className="p-8 space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-500" /> วันที่ทำรายการ (DATE)
                            </p>
                            <p className="text-base font-black text-slate-900 tabular-nums">{new Date(data.createdAt).toLocaleString('th-TH')}</p>
                        </div>
                        <div className="p-8 space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Info className="w-4 h-4 text-amber-500" /> วัตถุประสงค์ (PURPOSE)
                            </p>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                                {data.reason || <span className="text-slate-300 italic">ไม่ระบุเหตุผล (NOT SPECIFIED)</span>}
                            </p>
                        </div>
                        <div className="p-8 space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4 text-indigo-500" /> ผู้ทำรายการ (ISSUER)
                            </p>
                            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl border border-indigo-100 shadow-sm">
                                <span className="text-xs font-black uppercase tracking-tight">
                                    {data.user ? `${data.user.firstName} ${data.user.lastName}` : "SYSTEM ADMINISTRATOR"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Items Table Section */}
                    <div className="p-8 md:p-10 relative z-10 print:p-6">
                        <div className="mb-8 flex items-center justify-between print:mb-4">
                            <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest flex items-center gap-2.5">
                                <Package className="w-5 h-5 text-[#1e3b8a]" />
                                รายการพัสดุที่โอนย้าย
                            </h2>
                            <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-1.5 rounded-full tabular-nums border border-indigo-100">
                                ทั้งหมด: {memoizedItems.length} รายการ
                            </span>
                        </div>

                        {/* ตารางโปร่งๆ Clean Look */}
                        <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm print:rounded-none print:border-2 print:border-slate-900 print:shadow-none">
                            <table className="min-w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 border-b-2 border-slate-200 print:bg-white print:border-b-2 print:border-slate-900">

                                    <tr className="text-xs font-black text-slate-950 uppercase tracking-widest">
                                        <th className="p-6 w-12 text-center">#</th>
                                        <th className="p-6">รายละเอียดพัสดุ</th>
                                        <th className="p-6">ต้นทาง</th>
                                        <th className="p-6">ปลายทาง</th>
                                        <th className="p-6 text-center">จำนวน</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                    {memoizedItems.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 text-center text-[11px] font-black text-slate-300 tabular-nums">{idx + 1}</td>
                                            <td className="p-6">
                                                <div className="font-black text-sm text-slate-950 uppercase tracking-tight">
                                                    {item.product.name}
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 mt-1.5 tabular-nums bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 print:bg-white print:border-none">
                                                    <Hash className="w-3 h-3" /> SKU: {item.product.sku}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {/* สี Rose (แดงพาสเทล) สื่อถึงการนำ "ออก" จากต้นทาง */}
                                                <div className="flex items-center gap-3 whitespace-nowrap">
                                                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100 shadow-sm print:hidden">
                                                        <MapPin className="w-4 h-4 text-rose-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-900 uppercase leading-tight mb-0.5">{item.fromLocation.warehouse.name}</p>
                                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest tabular-nums italic">
                                                            {item.fromLocation.zone?.name ? `ZONE ${item.fromLocation.zone.name} | ` : ''} LOC: {item.fromLocation.code}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {/* สี Emerald (เขียวพาสเทล) สื่อถึงการนำ "เข้า" สู่ปลายทาง */}
                                                <div className="flex items-center gap-3 whitespace-nowrap">
                                                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm print:hidden">
                                                        <MapPin className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-900 uppercase leading-tight mb-0.5">{item.toLocation.warehouse.name}</p>
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest tabular-nums italic">
                                                            {item.toLocation.zone?.name ? `ZONE ${item.toLocation.zone.name} | ` : ''} LOC: {item.toLocation.code}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center justify-center bg-slate-50 text-slate-950 min-w-[3rem] px-4 py-2 rounded-xl font-black tabular-nums text-lg border border-slate-200 shadow-inner print:border-none print:shadow-none">
                                                    {item.quantity.toLocaleString()}
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