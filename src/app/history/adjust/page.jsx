"use client";

import React, { useState, useEffect, useMemo } from 'react';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import Link from 'next/link';
import {
    History,
    FileText,
    ChevronRight,
    UserCheck,
    AlertCircle,
    Database,
    ClipboardList,
    Search
} from "lucide-react";

export default function CountTaskHistoryPage() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function fetchHistory() {
            try {
                const res = await apiFetch("/inventory/count-tasks");

                if (!isMounted) return;

                let cleanData = [];
                if (res?.success && Array.isArray(res.data)) {
                    cleanData = res.data;
                } else if (Array.isArray(res)) {
                    cleanData = res;
                } else if (Array.isArray(res?.data)) {
                    cleanData = res.data;
                }

                setHistory(cleanData);
            } catch (error) {
                console.error("Load Error:", error);
                if (isMounted) setHistory([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchHistory();
        return () => { isMounted = false; };
    }, []);

    const filteredHistory = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return history;

        return history.filter((doc) => {
            const fullName = doc.creator
                ? `${doc.creator.firstName || ""} ${doc.creator.lastName || ""}`.trim()
                : "ผู้ใช้งานระบบ";

            return (
                (doc.taskNo || "").toLowerCase().includes(keyword) ||
                (doc.remarks || "").toLowerCase().includes(keyword) ||
                (doc.status || "").toLowerCase().includes(keyword) ||
                fullName.toLowerCase().includes(keyword)
            );
        });
    }, [history, searchTerm]);

    const getStatusBadge = (status) => {
        switch (status) {
            case "PENDING":
                return (
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">
                        รอตรวจนับ
                    </span>
                );
            case "COUNTING":
                return (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">
                        กำลังตรวจนับ
                    </span>
                );
            case "REVIEW":
                return (
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-200">
                        รอตรวจสอบ
                    </span>
                );
            case "COMPLETED":
                return (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                        เสร็จสิ้น
                    </span>
                );
            default:
                return (
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                        {status || "-"}
                    </span>
                );
        }
    };

    return (
        <AuthGate>
            <div className="w-full space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-8 gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider w-fit shadow-sm">
                            <ClipboardList className="w-4 h-4 text-slate-500" />
                            Cycle Count Registry
                        </div>

                        <h4 className="text-4xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                            ประวัติการตรวจนับสต๊อก (CNT)
                        </h4>

                        <p className="text-slate-600 text-base font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 text-slate-400" />
                            ประวัติเอกสารตรวจนับสต๊อกและผลการตรวจนับทั้งหมด
                        </p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาเลขที่เอกสาร, หมายเหตุ, สถานะ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border-2 border-slate-100 shadow-sm">
                        <History className="w-5 h-5 text-slate-500" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide tabular-nums">
                            รายการทั้งหมด: {filteredHistory.length} เอกสาร
                        </span>
                    </div>
                </div>

                <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.1)] relative">
                    <div className="overflow-x-auto relative z-10">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-950 font-black text-sm tracking-wide">
                                    <th className="p-6">วันที่ทำรายการ / เวลา</th>
                                    <th className="p-6">เลขที่เอกสาร (CNT)</th>
                                 
                                    <th className="p-6">หมายเหตุ / เหตุผล</th>
                                    <th className="p-6 text-center">จำนวนรายการ</th>
                                    <th className="p-6">ผู้ตรวจสอบ</th>
                                    <th className="p-6 text-right">ดำเนินการ</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 bg-white">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="p-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">
                                                    Synchronizing Count Registry...
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-40 text-center">
                                            <AlertCircle className="w-16 h-16 text-rose-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">
                                                ไม่พบข้อมูลประวัติการตรวจนับ
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="tabular-nums text-sm font-bold text-slate-500 flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-slate-600 transition-colors"></div>
                                                    {new Date(doc.createdAt).toLocaleString('th-TH', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100 shadow-sm">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-black text-[#1e3b8a] uppercase tracking-tighter text-base tabular-nums">
                                                        {doc.taskNo || "-"}
                                                    </span>
                                                </div>
                                            </td>

                                            

                                            <td className="p-6">
                                                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest shadow-sm border border-orange-100">
                                                    {doc.remarks || "-"}
                                                </span>
                                            </td>

                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center justify-center min-w-[36px] h-9 px-3 rounded-xl bg-slate-100 text-slate-900 font-black text-sm tabular-nums border border-slate-200">
                                                    {doc._count?.items ?? 0}
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-50 p-2 rounded-full border border-indigo-100 group-hover:bg-white transition-colors shadow-sm">
                                                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-800 uppercase truncate tracking-tight">
                                                            {doc.creator
                                                                ? `${doc.creator.firstName || ""} ${doc.creator.lastName || ""}`.trim()
                                                                : "ผู้ใช้งานระบบ"}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                            ผู้สร้างเอกสาร
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-6 text-right">
                                                <Link
                                                    href={`/history/adjust/${doc.id}`}
                                                    className="inline-flex items-center gap-2 bg-white border-2 border-slate-100 text-[#1e3b8a] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1e3b8a] hover:text-white hover:border-[#1e3b8a] transition-all shadow-sm hover:shadow-xl hover:shadow-blue-900/20 active:scale-95"
                                                >
                                                    รายละเอียด <ChevronRight className="w-4 h-4" />
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