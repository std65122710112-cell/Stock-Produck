"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ClipboardList,
    Plus,
    Database,
    Search,
    Clock,
    CheckCircle2,
    XCircle,
    User,
    Hash,
    ShieldCheck,
    ChevronRight,
    History
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function PRListPage() {
    const [prs, setPrs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPRs() {
            try {
                const data = await apiFetch("/api/purchase/pr", { method: "GET" });
                setPrs(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Load PR Error", e);
                toast.error("ไม่สามารถโหลดรายการใบขอซื้อได้");
            } finally {
                setLoading(false);
            }
        }
        loadPRs();
    }, []);

    const getStatusBadge = (status) => {
        const base = "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 w-fit mx-auto";
        if (status === 'PENDING') return <span className={`${base} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-3 h-3" /> Pending</span>;
        if (status === 'APPROVED') return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-3 h-3" /> Approved</span>;
        if (status === 'REJECTED') return <span className={`${base} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-3 h-3" /> Rejected</span>;
        return <span className={`${base} bg-slate-50 text-slate-400 border-slate-200`}>{status}</span>;
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Procurement Management</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            PR Registry
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            TJC GROUP: รายการใบขอซื้อพัสดุ (Purchase Requisition Queue)
                        </p>
                    </div>
                    <Link
                        href="/purchase/pr/create"
                        className="group flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-none"
                    >
                        <Plus className="w-4 h-4" />
                        สร้างใบขอซื้อใหม่
                    </Link>
                </div>

                {/* SUMMARY STATS (Static) */}
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <History className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                            Total: {prs.length} Requests
                        </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            Audit Trail Active
                        </span>
                    </div>
                </div>

                {/* REGISTRY TABLE CONTAINER */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                    <th className="p-6">Requested Date</th>
                                    <th className="p-6">PR Number</th>
                                    <th className="p-6">Purpose / Project</th>
                                    <th className="p-6">Requester Info</th>
                                    <th className="p-6 text-center">Status</th>
                                    <th className="p-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing PR Registry...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : prs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <ClipboardList className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">No PR Documents Found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    prs.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 transition-none group cursor-default">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500"></div>
                                                    {new Date(r.createdAt).toLocaleDateString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-mono font-black text-indigo-600 uppercase text-sm tracking-tighter group-hover:text-indigo-700">
                                                    {r.prNumber}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="max-w-[300px]">
                                                    <p className="font-bold text-slate-700 text-xs truncate uppercase tracking-tight">
                                                        {r.purpose}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Ref: Internal PR Record</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-slate-300" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-700 uppercase truncate">
                                                            {r.user?.firstName}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                            {r.department?.name || "GEN-DEPT"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                {getStatusBadge(r.status)}
                                            </td>
                                            <td className="p-6 text-right">
                                                <Link
                                                    href={`/purchase/pr/${r.id}`}
                                                    className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white transition-none shadow-sm"
                                                >
                                                    View Detail <ChevronRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* FOOTER AUDIT NOTE */}
                <div className="flex justify-center items-center gap-2 py-4">
                    <ShieldCheck className="w-3 h-3 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">
                        Procurement ledger entries are subject to regular audit reviews
                    </span>
                </div>
            </div>
        </AuthGate>
    );
}