"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Truck,
    FileText,
    ChevronRight,
    User,
    History,
    Plus,
    AlertCircle,
    Package,
    Database
} from "lucide-react";

export default function OutboundHistoryPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadHistory() {
            try {
                const data = await apiFetch("/outbound/delivery-orders", { method: "GET" });
                setOrders(data);
            } catch (e) {
                console.error("Load History Error", e);
            } finally {
                setLoading(false);
            }
        }
        loadHistory();
    }, []);

    return (
        <AuthGate>
            <div className="w-full space-y-8">

                {/* Header Section: Static Professional Look */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">
                            Outbound Logistics Control
                        </p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                            DO Registry
                        </h1>
                        <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            ประวัติการจ่ายพัสดุออกและบันทึกการตัดสต๊อก
                        </p>
                    </div>
                    <Link
                        href="/dashboard/outbound/create"
                        className="group flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-indigo-600"
                    >
                        <Plus className="w-4 h-4" />
                        จ่ายสินค้าออกใหม่
                    </Link>
                </div>

                {/* Status Bar (Static) */}
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <History className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                            Total: {orders.length} Deliveries
                        </span>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                            Real-time Verified Data
                        </span>
                    </div>
                </div>

                {/* Main Table Container (Performance Optimized) */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                    <th className="p-6">วันที่จ่ายพัสดุ / เวลา</th>
                                    <th className="p-6">เลขที่ใบ DO</th>
                                    <th className="p-6">อ้างอิง / โปรเจกต์ / หมายเหตุ</th>
                                    <th className="p-6 text-center">รายการ</th>
                                    <th className="p-6">ผู้ออกเอกสาร</th>
                                    <th className="p-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                                <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Syncing Outbound Data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <AlertCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Delivery Records Found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((o) => (
                                        <tr key={o.id} className="hover:bg-slate-50">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                    {new Date(o.createdAt).toLocaleString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-black text-slate-800 uppercase tracking-tighter text-sm">
                                                        {o.doNo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="max-w-xs space-y-1">
                                                    <p className="font-black text-slate-700 text-xs uppercase truncate">
                                                        {o.reference || "N/A"}
                                                    </p>
                                                    {o.remarks && (
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate italic">
                                                            📝 {o.remarks}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-slate-700 font-black text-[10px] uppercase">
                                                    <Package className="w-3 h-3" />
                                                    {o._count?.items || 0}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-slate-300" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-700 uppercase truncate">
                                                            {o.user ? `${o.user.firstName} ${o.user.lastName}` : "System User"}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Verified Staff</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <Link
                                                    href={`/history/outbound/${o.id}`}
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

                {/* Bottom Compliance Section (Static) */}
                <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl">
                                <FileText className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-widest text-sm">Logistics Integrity Verified</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">ทุกรายการจ่ายสินค้าถูกบันทึกเข้าระบบตรวจสอบสต๊อกแบบถาวร</p>
                            </div>
                        </div>
                        <Link href="/dashboard/reports" className="bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-none">
                            View Analytics Report
                        </Link>
                    </div>
                    {/* Background Icon (Static) */}
                    <Truck className="absolute -right-8 -bottom-8 w-32 h-32 text-white/5 -rotate-12" />
                </div>
            </div>
        </AuthGate>
    );
}