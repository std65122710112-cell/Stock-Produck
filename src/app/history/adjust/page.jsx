"use client";

import React, { useState, useEffect } from 'react';
import { apiFetch } from "@/lib/api";
import Link from 'next/link';
import { History, FileText, ChevronRight, UserCheck, AlertCircle } from "lucide-react";

export default function AdjustmentHistoryPage() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchHistory() {
            try {
                const res = await apiFetch("/inventory/adjust");
                if (isMounted) setHistory(Array.isArray(res) ? res : (res.data || []));
            } catch (error) {
                console.error("Failed to load adjustment history");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchHistory();
        return () => { isMounted = false; };
    }, []);

    const getReasonLabel = (code) => {
        const reasons = {
            'MISCOUNT': 'นับผิดพลาด',
            'DAMAGED': 'ชำรุด/เสียหาย',
            'LOST': 'สูญหาย',
            'FOUND': 'ค้นพบตกหล่น',
            'EXPIRED': 'หมดอายุ'
        };
        return reasons[code] || code;
    };

    return (
        <div className="w-full space-y-8">

            {/* Header Section: Static Design */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Stock Control & Audit</p>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                        Adjustment Registry
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">ประวัติการปรับปรุงยอดพัสดุและผลต่างสต๊อก</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Total: {history.length} Documents</span>
                </div>
            </div>

            {/* Table Container: High-end Static Design */}
            <section className="overflow-hidden rounded-[28px] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                <th className="p-6">วันที่ทำรายการ / เวลา</th>
                                <th className="p-6">เลขที่เอกสาร</th>
                                <th className="p-6">สาเหตุ (Reason)</th>
                                <th className="p-6 text-center">จำนวนรายการ</th>
                                <th className="p-6">ผู้ทำรายการ (Auditor)</th>
                                <th className="p-6 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center text-slate-300 font-black uppercase tracking-[0.3em]">
                                        Synchronizing Registry...
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-32 text-center">
                                        <AlertCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Adjustment Records Found</p>
                                    </td>
                                </tr>
                            ) : (
                                history.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/80">
                                        <td className="p-6">
                                            <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                                {new Date(doc.createdAt).toLocaleString('th-TH')}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <span className="font-black text-slate-800 uppercase tracking-tighter text-sm">
                                                    {doc.adjustNo}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                {getReasonLabel(doc.reasonCode)}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black text-xs">
                                                {doc._count?.items || 0}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <UserCheck className="w-4 h-4 text-slate-300" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-slate-700 uppercase truncate">
                                                        {doc.user?.firstName || 'System'} {doc.user?.lastName || ''}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Verified Personnel</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <Link
                                                href={`/history/adjust/${doc.id}`}
                                                className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 shadow-sm"
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

            {/* Static Verification Note */}
            <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-[0.1em]">
                    All adjustments are server-verified and logged in the Audit Trail for compliance.
                </p>
            </div>
        </div>
    );
}