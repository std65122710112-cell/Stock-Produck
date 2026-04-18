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
    History,
    FileText,
    ListOrdered
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
        const baseClass = "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 w-fit mx-auto";
        if (status === 'PENDING') return <span className={`${baseClass} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-3.5 h-3.5" /> รออนุมัติ</span>;
        if (status === 'APPROVED') return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว</span>;
        if (status === 'REJECTED') return <span className={`${baseClass} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-3.5 h-3.5" /> ปฏิเสธ</span>;
        return <span className={`${baseClass} bg-slate-50 text-slate-600 border-slate-200`}>{status}</span>;
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            {/* ปรับขยายความกว้างตรงนี้: อิงตามโครงสร้าง Container ธีมหลัก */}
            <div className="w-[98%] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                            <FileText className="w-6 h-6 text-[#1F3B8B]" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                รายการใบขอซื้อ (PR)
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5" />
                                Procurement Management System • รายการประวัติใบขอซื้อพัสดุ (Purchase Requisition Queue)
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-4 w-full md:w-auto">
                        <Link
                            href="/purchase/pr/create"
                            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-emerald-700 shadow-sm active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> สร้างใบขอซื้อใหม่
                        </Link>
                    </div>
                </div>

                {/* SUMMARY STATS (ปรับให้เป็น Grid Card แบบธีมหลัก) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 border-l-4 border-l-slate-400 p-5 rounded-xl flex items-center gap-4 shadow-sm transition-all hover:shadow-md">
                        <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100">
                            <History className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">รายการทั้งหมด</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900 tabular-nums">{prs.length}</span>
                                <span className="text-xs font-bold text-slate-500 uppercase">เอกสาร</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50/30 border border-emerald-200 border-l-4 border-l-emerald-500 p-5 rounded-xl flex items-center gap-4 shadow-sm">
                        <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-600 tracking-tight">ตรวจสอบความถูกต้องสำเร็จ</p>
                    </div>
                </div>

                {/* REGISTRY TABLE CONTAINER */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่ส่งคำขอ</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เลขที่ใบขอซื้อ (PR)</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วัตถุประสงค์ / โครงการ</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ขอซื้อ / แผนก</th>
                                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-medium text-sm mt-2">กำลังโหลดข้อมูลรายการใบขอซื้อ...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : prs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center text-slate-400 font-medium italic">
                                            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                            ไม่พบประวัติรายการใบขอซื้อในระบบ
                                        </td>
                                    </tr>
                                ) : (
                                    prs.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-4 px-6">
                                                <span className="text-xs font-bold text-slate-600 tabular-nums">
                                                    {new Date(r.createdAt).toLocaleDateString('th-TH')}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mb-0.5">
                                                    {r.prNumber}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-800 line-clamp-1">"{r.purpose}"</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                                                        <Hash className="w-3 h-3" /> เอกสารภายใน TJC
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">{r.user?.firstName}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {r.department?.name || "ระบุไม่ได้"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex justify-center">
                                                    {getStatusBadge(r.status)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <Link
                                                    href={`/purchase/pr/${r.id}`}
                                                    className="text-[11px] font-bold text-[#1F3B8B] hover:underline flex items-center gap-1 ml-auto justify-end"
                                                >
                                                    ดูรายละเอียด <ChevronRight className="w-4 h-4" />
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
        </AuthGate>
    );
}