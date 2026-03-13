"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    ClipboardList,
    Plus,
    History,
    User,
    Hash,
    AlertTriangle,
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Truck,
    ChevronRight,
    Search,
    Package,
    Database
} from "lucide-react";

export default function StockRequisitionListPage() {
    const [requisitions, setRequisitions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchRequisitions() {
            try {
                const res = await apiFetch("/outbound/requisitions");
                setRequisitions(Array.isArray(res) ? res : []);
            } catch (error) {
                toast.error("ไม่สามารถโหลดรายการใบเบิกได้");
            } finally {
                setIsLoading(false);
            }
        }
        fetchRequisitions();
    }, []);

    const getStatusBadge = (status) => {
        const baseClass = "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 w-fit mx-auto";
        switch (status) {
            case 'PENDING':
                return <span className={`${baseClass} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-3 h-3" /> รออนุมัติ</span>;
            case 'APPROVED':
                return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว</span>;
            case 'REJECTED':
                return <span className={`${baseClass} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-3 h-3" /> ไม่อนุมัติ</span>;
            case 'DISPATCHED':
                return <span className={`${baseClass} bg-indigo-50 text-indigo-600 border-indigo-100`}><Truck className="w-3 h-3" /> จ่ายของแล้ว</span>;
            default:
                return <span className={`${baseClass} bg-slate-50 text-slate-400 border-slate-200`}>{status}</span>;
        }
    };

    const getPriorityBadge = (priority) => {
        if (priority === 'URGENT') return <span className="flex items-center gap-1.5 text-rose-600 font-black text-[10px] tracking-tighter uppercase bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100"><AlertTriangle className="w-3 h-3" /> URGENT</span>;
        if (priority === 'HIGH') return <span className="flex items-center gap-1.5 text-amber-600 font-black text-[10px] tracking-tighter uppercase bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100"><Clock className="w-3 h-3" /> HIGH</span>;
        return <span className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] tracking-tighter uppercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> NORMAL</span>;
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory Outbound Archive</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            SR Registry
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            TJC GROUP: รายการประวัติใบขอเบิกพัสดุ (Requisition Queue)
                        </p>
                    </div>
                    <Link
                        href="/inventory/requisition/create"
                        className="group flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-none"
                    >
                        <Plus className="w-4 h-4" />
                        สร้างใบขอเบิกใหม่
                    </Link>
                </div>

                {/* STATUS SUMMARY BAR (Static) */}
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <History className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                            Queue: {requisitions.length} Documents
                        </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            Authorized Personnel Only
                        </span>
                    </div>
                </div>

                {/* DATA TABLE CONTAINER (Performance Optimized) */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                    <th className="p-6">วันที่ขอเบิก</th>
                                    <th className="p-6">เลขที่ SR</th>
                                    <th className="p-6">วัตถุประสงค์ / โครงการ</th>
                                    <th className="p-6">ผู้ขอเบิก / แผนก</th>
                                    <th className="p-6 text-center">ความเร่งด่วน</th>
                                    <th className="p-6 text-center">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Accessing SR Registry...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : requisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <ClipboardList className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Requisition Records Found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    requisitions.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50 group cursor-default">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-none"></div>
                                                    {new Date(req.createdAt).toLocaleDateString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 uppercase tracking-tighter text-sm font-mono group-hover:text-indigo-600 transition-none">
                                                        {req.srNumber}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 flex items-center gap-1">
                                                        <Package className="w-3 h-3" /> {req._count?.items || 0} Items
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="max-w-[250px]">
                                                    <p className="font-bold text-slate-700 text-xs truncate">"{req.purpose}"</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Ref: {req.referenceNo || "---"}</p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-slate-300" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-700 uppercase truncate">
                                                            {req.user?.firstName}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                            {req.department?.name || "GEN-DEPT"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex justify-center w-full">
                                                    {getPriorityBadge(req.priority)}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex justify-center w-full">
                                                    {getStatusBadge(req.status)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* BOTTOM COMPLIANCE NOTE (Static) */}
                <div className="flex flex-col md:flex-row justify-between items-center px-8 py-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 text-nowrap">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Certified Internal Requisition Record - TJC SYNC OK
                        </span>
                    </div>
                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-2 md:mt-0">
                        Total Registry Entries: {requisitions.length}
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}