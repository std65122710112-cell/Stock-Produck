"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from "@/lib/api";
import Link from 'next/link';
import {
    FileText,
    ChevronRight,
    AlertCircle,
    ClipboardList,
    UserCheck,
    Search,
    Clock,
    CheckCircle2,
    Package // เพิ่มไอคอน Package
} from "lucide-react";
import { Toaster } from "react-hot-toast";

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
        const baseClass = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-sm";
        switch (status) {
            case "PENDING":
                return <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}>รอตรวจนับ</span>;
            case "COUNTING":
                return <span className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200`}>กำลังตรวจนับ</span>;
            case "REVIEW":
                return <span className={`${baseClass} bg-purple-50 text-purple-700 border-purple-200`}><Clock className="w-3 h-3" /> รอตรวจสอบ</span>;
            case "COMPLETED":
                return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle2 className="w-3 h-3" /> เสร็จสิ้น</span>;
            default:
                return <span className={`${baseClass} bg-slate-50 text-slate-600 border-slate-200`}>{status || "-"}</span>;
        }
    };

    return (
        <div className="w-full space-y-6">
            <Toaster position="top-right" />

            {/* --- TOP CONTROL BAR --- */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" />
                    <input
                        type="text"
                        placeholder="ค้นหาเลขที่เอกสาร, หมายเหตุ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/5 outline-none font-bold text-sm transition-all shadow-sm"
                    />
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    พบทั้งหมด {filteredHistory.length} รายการ
                </div>
            </div>

            {/* --- DATA TABLE SECTION --- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                                <th className="py-4 px-6">วันที่ทำรายการ / เวลา</th>
                                <th className="py-4 px-6">เลขที่เอกสาร (CNT)</th>
                                <th className="py-4 px-6">สถานะ</th>
                                <th className="py-4 px-6 text-center">จำนวนรายการ</th>
                                <th className="py-4 px-6">ผู้สร้างเอกสาร</th>
                                <th className="py-4 px-6 text-right">ดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {isLoading ? (
                                <tr><td colSpan="6" className="py-20 text-center text-slate-400">กำลังดึงข้อมูลประวัติการตรวจนับ...</td></tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle className="w-12 h-12 text-slate-200" />
                                            <p className="text-slate-400 font-medium text-sm">ไม่พบข้อมูลประวัติการตรวจนับ</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {/* วันที่ / เวลา */}
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col text-slate-600">
                                                <span className="text-sm font-bold tabular-nums">
                                                    {new Date(doc.createdAt).toLocaleDateString('th-TH')}
                                                </span>
                                                <span className="text-[10px] font-medium opacity-70">
                                                    {new Date(doc.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </span>
                                            </div>
                                        </td>

                                        {/* CNT Number */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                                    <ClipboardList className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="font-bold text-[#1F3B8B] tabular-nums tracking-tight">
                                                    {doc.taskNo}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-6">
                                            {getStatusBadge(doc.status)}
                                        </td>

                                        {/* --- ส่วนที่แก้ไข: เพิ่มไอคอน Package ให้เหมือนหน้าอื่นๆ --- */}
                                        <td className="py-4 px-6 text-center">
                                            <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 font-bold text-xs tabular-nums">
                                                <Package className="w-3.5 h-3.5 text-slate-500" />
                                                {doc._count?.items ?? 0}
                                            </div>
                                        </td>

                                        {/* Creator */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {doc.creator ? `${doc.creator.firstName} ${doc.creator.lastName}` : "ผู้ใช้งานระบบ"}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 uppercase font-black">Authorized Creator</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Action */}
                                        <td className="py-4 px-6 text-right">
                                            <Link
                                                href={`/history/adjust/${doc.id}`}
                                                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-[#1F3B8B] px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 hover:border-[#1F3B8B] transition-all shadow-sm"
                                            >
                                                ดูรายละเอียด <ChevronRight className="w-3.5 h-3.5" />
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