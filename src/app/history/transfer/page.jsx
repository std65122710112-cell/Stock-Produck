"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
    RefreshCw, Plus, ChevronRight, History, ArrowRightLeft,
    Package, AlertCircle, Database, UserCheck, Activity, Truck, CheckCircle2
} from "lucide-react";

export default function TransferHistoryPage() {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);

    async function loadHistory() {
        try {
            // 💡 แก้ URL ให้ตรงกับ Backend: /api/transfer/history
            const res = await apiFetch("/api/transfer/history", { method: "GET" });

            // 💡 รับข้อมูลจาก { success: true, data: [...] }
            const data = Array.isArray(res) ? res : res?.data || [];
            setTransfers(data);
        } catch (e) {
            console.error("Load Error:", e);
            setTransfers([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadHistory(); }, []);

    return (
        <AuthGate>
            <div className="w-full space-y-8 pb-20">
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-8 gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-wider">
                            <Activity className="w-4 h-4" /> Transfer Ledger
                        </div>
                        <h4 className="text-4xl font-black text-slate-950 tracking-tight">ประวัติการโอนย้าย</h4>
                        <p className="text-slate-500 text-base font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 text-slate-400" /> ตรวจสอบรายการเคลื่อนย้ายพัสดุระหว่างคลัง (Internal Movement)
                        </p>
                    </div>
                </div>

                {/* MAIN TABLE */}
                <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl relative">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-950 font-black text-xs uppercase tracking-widest">
                                    <th className="p-6">วันที่ / เวลา</th>
                                    <th className="p-6">เลขที่เอกสาร</th>
                                    <th className="p-6">สถานะ</th>
                                    <th className="p-6 text-center">จำนวนรายการ</th>
                                    <th className="p-6">ผู้ทำรายการ</th>
                                    <th className="p-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-20 text-center animate-pulse font-black text-slate-300">LOADING HISTORY...</td></tr>
                                ) : transfers.length === 0 ? (
                                    <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold">ไม่พบประวัติการทำรายการ</td></tr>
                                ) : (
                                    transfers.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-6 text-sm font-bold text-slate-500 tabular-nums">
                                                {new Date(t.createdAt).toLocaleString('th-TH')}
                                            </td>
                                            <td className="p-6">
                                                <span className="font-black text-indigo-600 font-mono text-base">{t.transferNo}</span>
                                            </td>
                                            <td className="p-6">
                                                {/* 💡 แสดงสถานะแบบมีสีสัน */}
                                                {t.status === 'SHIPPED' ? (
                                                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center gap-1 w-fit">
                                                        <Truck className="w-3 h-3" /> ระหว่างขนส่ง
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center gap-1 w-fit">
                                                        <CheckCircle2 className="w-3 h-3" /> สำเร็จแล้ว
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-center font-black text-slate-700">
                                                {t._count?.items || 0}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                                        {t.issuedUser?.firstName?.[0]}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">
                                                        {/* 💡 เปลี่ยนจาก t.user เป็น t.issuedUser */}
                                                        {t.issuedUser?.firstName} {t.issuedUser?.lastName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <Link href={`/history/transfer/${t.id}`} className="inline-flex items-center gap-2 text-indigo-600 font-black text-xs hover:underline">
                                                    ดูรายละเอียด <ChevronRight className="w-4 h-4" />
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