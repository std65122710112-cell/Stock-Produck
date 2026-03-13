"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    ArrowLeft, Hash, User, Calendar, ShieldCheck, Info, Package,
    Building2, CheckCircle2, XCircle, Clock, Database, ClipboardCheck, Truck
} from "lucide-react";

export default function PRDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [pr, setPr] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadDetail = async () => {
        try {
            const data = await apiFetch(`/api/purchase/pr/${id}`, { method: "GET" });
            setPr(data);
        } catch (e) {
            toast.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (id) loadDetail(); }, [id]);

    if (loading) return (
        <AuthGate>
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Accessing PR Registry...</p>
            </div>
        </AuthGate>
    );

    if (!pr) return (
        <AuthGate>
            <div className="p-20 text-center space-y-4">
                <XCircle className="w-16 h-16 text-rose-200 mx-auto" />
                <p className="text-rose-500 font-black uppercase tracking-widest text-xl">404 - PR RECORD NOT FOUND</p>
                <button onClick={() => router.back()} className="text-slate-500 underline font-bold uppercase text-xs">Return to registry</button>
            </div>
        </AuthGate>
    );

    const getStatusBadge = (status) => {
        const base = "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-2";
        if (status === 'PENDING') return <span className={`${base} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-3 h-3" /> Pending Review</span>;
        if (status === 'APPROVED') return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-3 h-3" /> Approved</span>;
        return <span className={`${base} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-3 h-3" /> Rejected</span>;
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-6">
                    <div className="space-y-1">
                        <button
                            onClick={() => router.back()}
                            className="text-[10px] font-black text-slate-400 hover:text-indigo-600 mb-3 flex items-center gap-1 uppercase tracking-widest transition-none"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to Registry
                        </button>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            PR Master Record
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-lg">OFFICIAL</span>
                        </h1>
                        <div className="flex items-center gap-4 mt-2">
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2 font-mono">
                                <Hash className="w-4 h-4 text-indigo-500" />
                                {pr.prNumber}
                            </p>
                            {getStatusBadge(pr.status)}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* 💡 ปุ่มพาไปหน้า Approval (แสดงเฉพาะตอน PENDING) */}
                        {pr.status === 'PENDING' && (
                            <button
                                onClick={() => router.push(`/purchase/pr/${id}/approve`)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg transition-all"
                            >
                                <ShieldCheck className="w-4 h-4" /> Process Approval
                            </button>
                        )}
                        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg">
                                {pr.user?.firstName?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Requested By</p>
                                <p className="font-black text-xs text-slate-800 uppercase tracking-tight">{pr.user?.firstName} {pr.user?.lastName}</p>
                                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter italic">ID: Verified Staff</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT CONTENT: DATA MANIFEST */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* ITEM LIST TABLE */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group">
                            <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Package className="w-4 h-4 text-indigo-500" /> Items Specification
                                </h2>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" /> Date: {new Date(pr.createdAt).toLocaleDateString('th-TH')}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-white border-b border-slate-100">
                                        <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                            <th className="p-6 text-left">Asset Identity</th>
                                            <th className="p-6 text-center">Req. Qty</th>
                                            <th className="p-6 text-right">Est. Unit Price</th>
                                            <th className="p-6 text-right text-indigo-600">Total Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 bg-white">
                                        {pr.items?.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 group/row transition-none">
                                                <td className="p-6">
                                                    <p className="font-mono font-black text-slate-800 uppercase text-xs tracking-tighter group-hover/row:text-indigo-600">
                                                        [{item.product.sku}]
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-500 uppercase mt-1 italic">{item.product.name}</p>
                                                </td>
                                                <td className="p-6 text-center font-mono font-black text-slate-700 text-lg">{item.quantity}</td>
                                                <td className="p-6 text-right font-mono font-bold text-slate-400 text-xs">
                                                    ฿{Number(item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-6 text-right">
                                                    <span className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-mono font-black text-sm">
                                                        ฿{(item.estimatedPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* METADATA CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Building2 className="w-3 h-3 text-indigo-500" /> Requested Department
                                </h3>
                                <p className="font-black text-indigo-600 uppercase text-sm tracking-tight">{pr.department?.name || "Global Cost Center"}</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Truck className="w-3 h-3 text-emerald-500" /> Suggested Vendor
                                </h3>
                                {pr.supplier ? (
                                    <div className="space-y-1">
                                        <p className="font-black text-emerald-600 uppercase text-sm tracking-tight truncate" title={pr.supplier.name}>{pr.supplier.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">[{pr.supplier.code}]</p>
                                    </div>
                                ) : (
                                    <p className="font-bold text-slate-400 text-sm italic">ไม่ได้ระบุ</p>
                                )}
                            </div>
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden md:col-span-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Info className="w-3 h-3 text-indigo-500" /> Operational Purpose
                                </h3>
                                <p className="font-bold text-slate-700 text-sm italic leading-relaxed">"{pr.purpose}"</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT CONTENT: DECISION HISTORY (Show Always) */}
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6 sticky top-6">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-100 pb-4">
                                <ClipboardCheck className="w-4 h-4 text-indigo-500" /> Decision History
                            </h3>
                            <div className="space-y-6">
                                {pr.approvals?.map((app) => (
                                    <div key={app.id} className="relative pl-6">
                                        <div className="absolute left-0 top-1 bottom-0 w-1 bg-indigo-500 rounded-full"></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${app.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {app.status}
                                            </p>
                                            <span className="text-[9px] font-mono text-slate-300 font-bold uppercase">
                                                {new Date(app.actedAt).toLocaleString('th-TH')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-black text-slate-700 uppercase leading-none">Reviewer: {app.approver?.firstName}</p>
                                        {app.comments && (
                                            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-500 text-xs font-bold leading-relaxed border-dashed">
                                                "{app.comments}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!pr.approvals || pr.approvals.length === 0) && (
                                    <div className="text-center py-6 text-slate-300 italic text-xs font-bold uppercase tracking-widest">
                                        No decisions logged
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-2 py-6 border-t border-slate-100">
                    <Database className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Validated TJC Document Registry</span>
                </div>
            </div>
        </AuthGate>
    );
}