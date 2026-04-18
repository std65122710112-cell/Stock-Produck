"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    ArrowLeft, Hash, User, Calendar, ShieldCheck, Package,
    Building2, CheckCircle2, XCircle, Clock, ClipboardCheck, Truck, Briefcase, FileSearch
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
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">กำลังโหลดข้อมูลรายการใบขอซื้อ...</p>
            </div>
        </AuthGate>
    );

    if (!pr) return (
        <AuthGate>
            <div className="p-20 text-center space-y-4">
                <XCircle className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-lg">404 - ไม่พบข้อมูลใบขอซื้อ</p>
                <button onClick={() => router.back()} className="text-[11px] text-[#1F3B8B] underline font-bold uppercase hover:text-blue-800">ย้อนกลับไปหน้ารายการ</button>
            </div>
        </AuthGate>
    );

    const getStatusBadge = (status) => {
        const baseClass = "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 w-fit";
        if (status === 'PENDING') return <span className={`${baseClass} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-3.5 h-3.5" /> รออนุมัติ</span>;
        if (status === 'APPROVED') return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว</span>;
        return <span className={`${baseClass} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-3.5 h-3.5" /> ปฏิเสธ</span>;
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 w-fit text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                                <FileSearch className="w-6 h-6 text-[#1F3B8B]" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                                    รายละเอียดใบขอซื้อ (PR)
                                </h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-1.5">
                                    <ClipboardCheck className="w-3.5 h-3.5" />
                                    Procurement Management System • ตรวจสอบรายละเอียดและสถานะใบขอซื้อพัสดุในระบบ
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- THE MASTER DOCUMENT CONTAINER --- */}
                <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col">

                    {/* 1. ส่วนหัวเอกสาร (Document Header) */}
                    <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">เลขที่ใบขอซื้อ (PR Number):</span>
                            <h2 className="text-2xl md:text-3xl font-black text-[#1F3B8B] tabular-nums whitespace-nowrap">
                                {pr.prNumber}
                            </h2>
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="flex items-center gap-3 shrink-0">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">สถานะเอกสาร:</p>
                                {getStatusBadge(pr.status)}
                            </div>

                            {pr.status === 'PENDING' && (
                                <div className="flex items-center gap-4 md:gap-6 shrink-0">
                                    <div className="hidden md:block w-px bg-slate-300 h-8"></div>
                                    <button
                                        onClick={() => router.push(`/purchase/pr/${id}/approve`)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap active:scale-95"
                                    >
                                        <ShieldCheck className="w-4 h-4" /> ดำเนินการพิจารณาอนุมัติ
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. ข้อมูลผู้ขอซื้อ & วัตถุประสงค์ */}
                    <div className="p-8 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col justify-center space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-blue-500" /> ชื่อ-นามสกุล</span>
                            <span className="text-base font-bold text-slate-900">{pr.user?.firstName} {pr.user?.lastName}</span>
                            <span className="text-[10px] font-bold text-[#1F3B8B] uppercase mt-0.5">ID: Verified Staff</span>
                        </div>
                        
                        <div className="flex flex-col justify-center space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-teal-600" /> แผนกต้นสังกัด</span>
                            <span className="text-base font-bold text-slate-900">{pr.department?.name || 'Global Cost Center'}</span>
                        </div>

                        <div className="flex flex-col justify-center space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-orange-500" /> ผู้จัดจำหน่ายที่แนะนำ</span>
                            {pr.supplier ? (
                                <>
                                    <span className="text-base font-bold text-slate-900 truncate" title={pr.supplier.name}>{pr.supplier.name}</span>
                                    <span className="text-[10px] font-bold text-[#1F3B8B] uppercase mt-0.5 tracking-wider">[{pr.supplier.code}]</span>
                                </>
                            ) : (
                                <span className="text-base font-bold text-slate-400 italic">ไม่ได้ระบุผู้จัดจำหน่าย</span>
                            )}
                        </div>
                    </div>

                    {/* วัตถุประสงค์ */}
                    <div className="p-8 border-b border-slate-200">
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Briefcase className="w-4 h-4 text-purple-600" /> วัตถุประสงค์การขอซื้อ
                            </p>
                            <p className="text-base text-slate-800 font-semibold leading-relaxed p-5 bg-slate-50 rounded-xl border border-slate-100 italic">
                                "{pr.purpose}"
                            </p>
                        </div>
                    </div>

                    {/* 3. รายการพัสดุ (Items) */}
                    <div className="px-8 py-8 border-b border-slate-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Package className="w-5 h-5 text-[#1F3B8B]" /> รายละเอียดรายการพัสดุ (Items)
                            </h3>
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">
                                <Calendar className="w-4 h-4 text-slate-400" /> วันที่: {new Date(pr.createdAt).toLocaleDateString('th-TH')}
                            </span>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold uppercase text-slate-600">
                                        <th className="p-4 text-center w-16">ลำดับ</th>
                                        <th className="p-4 text-left">รายการพัสดุ / SKU</th>
                                        <th className="p-4 text-center w-32">จำนวน</th>
                                        <th className="p-4 text-right">ราคาประเมิน/หน่วย</th>
                                        <th className="p-4 text-right">มูลค่ารวม</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pr.items?.map((item, idx) => {
                                        const rowTotal = item.estimatedPrice * item.quantity;
                                        return (
                                            <tr key={item.id} className="text-base hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                                                <td className="p-4">
                                                    <p className="font-bold text-slate-900">{item.product.name}</p>
                                                    <p className="text-xs text-blue-600 font-bold uppercase mt-0.5">SKU: {item.product.sku}</p>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-md font-bold text-[#1F3B8B]">{item.quantity}</span>
                                                </td>
                                                <td className="p-4 text-right tabular-nums font-semibold text-slate-700">
                                                    ฿{Number(item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-4 text-right tabular-nums font-bold text-slate-900">
                                                    ฿{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 4. ประวัติการพิจารณา (Decision History) */}
                    <div className="p-8 bg-slate-50/30">
                        <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-6">
                            <ClipboardCheck className="w-5 h-5 text-emerald-600" /> ประวัติการพิจารณา (Decision History)
                        </h3>
                        
                        <div className="space-y-6">
                            {pr.approvals?.map((app) => (
                                <div key={app.id} className="relative pl-6 border-l-2 border-slate-200">
                                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${app.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                        <p className={`text-[11px] font-bold uppercase tracking-widest ${app.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {app.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                                        </p>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                            {new Date(app.actedAt).toLocaleString('th-TH')}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-slate-500" /> ผู้พิจารณา: {app.approver?.firstName}
                                    </p>
                                    {app.comments && (
                                        <div className="mt-3 p-4 bg-white rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold italic shadow-sm">
                                            "{app.comments}"
                                        </div>
                                    )}
                                </div>
                            ))}
                            {(!pr.approvals || pr.approvals.length === 0) && (
                                <div className="text-center py-6 text-slate-400 italic text-sm font-bold tracking-wide">
                                    ยังไม่มีประวัติการพิจารณา
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AuthGate>
    );
}