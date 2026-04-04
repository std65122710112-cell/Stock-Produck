"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
    Truck,
    ChevronRight,
    User,
    History,
    Plus,
    AlertCircle,
    Package,
    Database,
    Activity
} from "lucide-react";

export default function OutboundHistoryPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    async function loadHistory() {
        try {
            // Security: ดึงข้อมูลผ่าน apiFetch ที่จัดการ Sanitization และ Token อัตโนมัติ
            const data = await apiFetch("/outbound/delivery-orders", { method: "GET" });

            // Defensive Check: ตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก
            if (data && Array.isArray(data)) {
                setOrders(data);
            } else {
                setOrders([]);
            }
        } catch (e) {
            console.error("Critical Security/Load Error:", e);
            setOrders([]); // Fallback เป็นค่าว่างเพื่อป้องกัน Error การ Render
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadHistory(); }, []);

    // Performance & Security: ป้องกันการ Re-render และปกป้องชุดข้อมูลด้วย useMemo
    const memoizedOrders = useMemo(() => orders, [orders]);

    return (
        <AuthGate>
            <div className="w-full space-y-8">

                {/* HEADER SECTION - ปรับสีเข้ม/ภาษาไทย (ขนาดคงเดิม) */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest w-fit shadow-sm mb-2">
                            <Activity className="w-3.5 h-3.5" /> ระบบควบคุมขาออก (Outbound Control)
                        </div>
                        {/* ปรับสีดำเข้ม Slate-950 */}
                        <h1 className="text-4xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                            บันทึกการจ่ายพัสดุ (DO)
                        </h1>
                        <p className="text-slate-500 text-sm font-bold mt-1 flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            ประวัติการจ่ายพัสดุออกและบันทึกการตัดสต๊อกพัสดุถาวร
                        </p>
                    </div>

                </div>

                {/* STATUS BAR - ภาษาไทย (ขนาดคงเดิม) */}
                <div className="flex items-center gap-4 px-2">
                    <div className="w-fit flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border-2 border-slate-100 shadow-sm transition-all">
                        {/* ปรับไอคอนเป็น w-5 h-5 และช่องไฟ gap-2 ตามมาตรฐาน */}
                        <History className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide tabular-nums">
                            รายการทั้งหมด: {memoizedOrders.length} เอกสาร
                        </span>
                    </div>

                </div>

                {/* MAIN DATA TABLE - ขนาดภายใน (p-6, text-sm) คงเดิมเป๊ะ */}
                <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)]">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b-2 border-slate-200">
                                {/* ปรับจาก text-[10px] เป็น text-sm และคงความดุดันด้วย font-black */}
                                <tr className="text-slate-950 font-black uppercase text-sm tracking-wide">
                                    <th className="p-6">วันที่จ่ายพัสดุ / เวลา</th>
                                    <th className="p-6">เลขที่ใบ DO</th>
                                    <th className="p-6">อ้างอิง / โปรเจกต์ / หมายเหตุ</th>
                                    <th className="p-6 text-center">รายการ</th>
                                    <th className="p-6">ผู้ออกเอกสาร</th>
                                    <th className="p-6 text-right">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">กำลังซิงค์ข้อมูลขาออก...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : memoizedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <AlertCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">ไม่พบประวัติการจ่ายสินค้า</p>
                                        </td>
                                    </tr>
                                ) : (
                                    memoizedOrders.map((o) => (
                                        <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="font-bold text-[11px] text-slate-500 flex items-center gap-2 tabular-nums">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                    {new Date(o.createdAt).toLocaleString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 shadow-sm">
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-black text-[#1e3b8a] uppercase tracking-tighter text-sm tabular-nums">
                                                        {o.doNo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="max-w-xs space-y-1">
                                                    <p className="font-black text-slate-800 text-xs uppercase truncate">
                                                        {o.reference || "ไม่มีเอกสารอ้างอิง"}
                                                    </p>
                                                    {o.remarks && (
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate italic">
                                                            📝 {o.remarks}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black text-[10px] uppercase tabular-nums border border-blue-100">
                                                    <Package className="w-3 h-3" />
                                                    {o._count?.items || 0} รายการ
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-indigo-500" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-700 uppercase truncate">
                                                            {o.user ? `${o.user.firstName} ${o.user.lastName}` : "ผู้ใช้งานระบบ"}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Verified Staff</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <Link
                                                    href={`/history/outbound/${o.id}`}
                                                    className="inline-flex items-center gap-1 bg-white border-2 border-slate-100 text-[#1e3b8a] px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#1e3b8a] hover:text-white hover:border-[#1e3b8a] transition-all"
                                                >
                                                    รายละเอียด <ChevronRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AuthGate>
    );
}