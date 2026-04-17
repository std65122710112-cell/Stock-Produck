"use client";

import React, { useEffect, useState, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
    Truck,
    ChevronRight,
    AlertCircle,
    Package,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function OutboundHistoryPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    async function loadHistory() {
        try {
            const data = await apiFetch("/outbound/delivery-orders", { method: "GET" });
            if (data && Array.isArray(data)) {
                setOrders(data);
            } else {
                setOrders([]);
            }
        } catch (e) {
            console.error("Load Error:", e);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadHistory(); }, []);

    const memoizedOrders = useMemo(() => orders, [orders]);

    return (
        <div className="w-full">
            <Toaster position="top-right" />

            {/* --- DATA TABLE SECTION --- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                                <th className="py-4 px-6">วันที่จ่ายพัสดุ / เวลา</th>
                                <th className="py-4 px-6">เลขที่ใบจ่ายสินค้า (DO)</th>
                                <th className="py-4 px-6">อ้างอิง / โปรเจกต์</th>
                                <th className="py-4 px-6 text-center">จำนวนรายการ</th>
                                <th className="py-4 px-6">ผู้ออกเอกสาร</th>
                                <th className="py-4 px-6 text-right">ดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr><td colSpan="6" className="py-20 text-center text-slate-400">กำลังดึงข้อมูลประวัติขาออก...</td></tr>
                            ) : memoizedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle className="w-12 h-12 text-slate-200" />
                                            <p className="text-slate-400 font-medium text-sm">ไม่พบข้อมูลประวัติการจ่ายสินค้า</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                memoizedOrders.map((o) => (
                                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {/* วันที่ / เวลา */}
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col text-slate-600">
                                                <span className="text-sm font-bold tabular-nums">
                                                    {new Date(o.createdAt).toLocaleDateString('th-TH')}
                                                </span>
                                                <span className="text-[10px] font-medium opacity-70">
                                                    {new Date(o.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </span>
                                            </div>
                                        </td>

                                        {/* DO Number */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                                    <Truck className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="font-bold text-[#1F3B8B] tabular-nums tracking-tight">
                                                    {o.doNo}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Reference / Project */}
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col max-w-[200px]">
                                                <span className="text-xs font-bold text-slate-700 truncate">
                                                    {o.reference || "---"}
                                                </span>
                                                {o.remarks && (
                                                    <span className="text-[10px] text-slate-400 italic truncate" title={o.remarks}>
                                                        หมายเหตุ: {o.remarks}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Item Count */}
                                        <td className="py-4 px-6 text-center">
                                            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100 font-bold text-xs tabular-nums">
                                                <Package className="w-3.5 h-3.5" />
                                                {o._count?.items || 0}
                                            </div>
                                        </td>

                                        {/* Document Issuer */}
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">
                                                    {o.user ? `${o.user.firstName} ${o.user.lastName}` : "System User"}
                                                </span>
                                                <span className="text-[9px] text-slate-400 uppercase font-black">Authorized</span>
                                            </div>
                                        </td>

                                        {/* Action */}
                                        <td className="py-4 px-6 text-right">
                                            <Link
                                                href={`/history/outbound/${o.id}`}
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