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
        const base = "px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border shadow-sm flex items-center gap-1.5 w-fit mx-auto";
        if (status === 'PENDING') return <span className={`${base} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-4 h-4" /> รออนุมัติ</span>;
        if (status === 'APPROVED') return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-4 h-4" /> อนุมัติแล้ว</span>;
        if (status === 'REJECTED') return <span className={`${base} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-4 h-4" /> ปฏิเสธ</span>;
        return <span className={`${base} bg-slate-50 text-slate-500 border-slate-200`}>{status}</span>;
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8 py-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    {/* กล่องใน: จัดตำแหน่งให้ชิดซ้าย (px-6 md:px-10) */}
                    <div className="w-full px-6 md:px-10 flex flex-col md:flex-row items-start md:items-center gap-6">

                        {/* 💡 ไอคอนหลัก: FileText (สื่อถึงเอกสารใบขอซื้อ PR) */}
                        <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                            <FileText className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                        </div>

                        {/* กลุ่มข้อความเรียงซ้อนกัน */}
                        <div className="flex flex-col">
                            {/* ภาษาอังกฤษด้านบน */}
                            <div className="flex items-center gap-2 mb-1.5">
                                <Database className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                    Procurement Management System
                                </p>
                            </div>

                            {/* หัวข้อหลัก (ตัวตรง หนาพิเศษ) */}
                            <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                รายการใบขอซื้อ (PR)
                            </h1>

                            {/* คำอธิบายด้านล่าง พร้อมไอคอนสีเขียวมรกต */}
                            <div className="flex items-center gap-2 pt-1 opacity-90">
                                <ListOrdered className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                    รายการประวัติใบขอซื้อพัสดุ (Purchase Requisition Queue)
                                </p>
                            </div>
                        </div>
                    </div>
                    <Link
                        href="/purchase/pr/create"
                        className="group flex items-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-xl shadow-slate-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5 shrink-0" />
                        <span>สร้างใบขอซื้อใหม่</span>
                    </Link>
                </div>

                {/* SUMMARY STATS */}
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-2 bg-indigo-50 px-5 py-2.5 rounded-2xl border-2 border-indigo-100 shadow-sm">
                        <History className="w-5 h-5 text-indigo-500" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            รายการทั้งหมด: {prs.length} เอกสาร
                        </span>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-2xl border-2 border-emerald-100 shadow-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            ตรวจสอบความถูกต้องสำเร็จ
                        </span>
                    </div>
                </div>

                {/* REGISTRY TABLE CONTAINER */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-900 font-black text-sm tracking-wide">
                                    <th className="p-6">วันที่ส่งคำขอ</th>
                                    <th className="p-6">เลขที่ใบขอซื้อ (PR)</th>
                                    <th className="p-6">วัตถุประสงค์ / โครงการ</th>
                                    <th className="p-6">ผู้ขอซื้อ / แผนก</th>
                                    <th className="p-6 text-center">สถานะ</th>
                                    <th className="p-6 text-right">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black text-sm mt-2">กำลังโหลดข้อมูลรายการใบขอซื้อ...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : prs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-500 font-black text-sm tracking-wide">ไม่พบประวัติรายการใบขอซื้อในระบบ</p>
                                        </td>
                                    </tr>
                                ) : (
                                    prs.map((r) => (
                                        <tr key={r.id} className="hover:bg-blue-50 transition-colors group cursor-default duration-200">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="font-mono text-sm text-slate-600 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                    {new Date(r.createdAt).toLocaleDateString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="tabular-nums font-black text-[#1e3b8a] uppercase text-base tracking-tight group-hover:text-blue-800 transition-colors">
                                                    {r.prNumber}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="max-w-[300px]">
                                                    <p className="font-bold text-slate-800 text-sm truncate">
                                                        "{r.purpose}"
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-500 mt-1.5 flex items-center gap-1">
                                                        <Hash className="w-3 h-3 text-slate-400" /> เอกสารภายใน TJC
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    {/* ✅ เพิ่มสีสันพาสเทลให้กับไอคอนคน */}
                                                    <div className="bg-indigo-100 p-2 rounded-full group-hover:bg-white transition-colors shadow-sm">
                                                        <User className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-slate-800 truncate">
                                                            {r.user?.firstName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-bold tracking-tight">
                                                            {r.department?.name || "ระบุไม่ได้"}
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
                                                    className="inline-flex items-center gap-2 bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-wider shadow-sm hover:shadow-md active:scale-95 w-fit"
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
                </section>


            </div>
        </AuthGate>
    );
}