"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    ArrowLeft, Hash, User, Calendar, ShieldCheck, Info, Package,
    Building2, CheckCircle2, XCircle, Clock, Database, ClipboardCheck, Truck, Briefcase, ShoppingBagm, FileSearch
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
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">กำลังโหลดข้อมูลรายการใบขอซื้อ...</p>
            </div>
        </AuthGate>
    );

    if (!pr) return (
        <AuthGate>
            <div className="p-20 text-center space-y-4">
                <XCircle className="w-16 h-16 text-rose-300 mx-auto" />
                <p className="text-rose-600 font-black uppercase tracking-widest text-xl">404 - ไม่พบข้อมูลใบขอซื้อ</p>
                <button onClick={() => router.back()} className="text-slate-500 underline font-bold uppercase text-sm hover:text-slate-700">ย้อนกลับไปหน้ารายการ</button>
            </div>
        </AuthGate>
    );

    const getStatusBadge = (status) => {
        const base = "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border shadow-sm flex items-center gap-2 w-fit";
        if (status === 'PENDING') return <span className={`${base} bg-amber-50 text-amber-600 border-amber-200`}><Clock className="w-4 h-4" /> รออนุมัติ</span>;
        if (status === 'APPROVED') return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-200`}><CheckCircle2 className="w-4 h-4" /> อนุมัติแล้ว</span>;
        return <span className={`${base} bg-rose-50 text-rose-600 border-rose-200`}><XCircle className="w-4 h-4" /> ปฏิเสธ</span>;
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            {/* 💡 ขยายกล่องให้กว้างขึ้น */}
            <div className="w-[98%] max-w-[1600px] mx-auto space-y-8 py-10 px-4 md:px-0 animate-in fade-in duration-500">

                {/* --- HEADER SECTION --- */}
                <div className="w-full flex flex-col gap-6 border-b border-slate-200 pb-6 px-6 md:px-10">

                    {/* แถวบน: ปุ่มย้อนกลับ */}
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="group flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm whitespace-nowrap w-fit"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                            ย้อนกลับ
                        </button>
                    </div>

                    {/* แถวล่าง: ส่วน Header (ไอคอน + ข้อความ) */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">

                        <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-200">
                            <FileSearch className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1.5">
                                <ClipboardCheck className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                    Procurement Management System
                                </p>
                            </div>

                            <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2 flex flex-wrap items-center gap-3">
                                รายละเอียดใบขอซื้อ (PR)
                            </h1>

                            <div className="flex items-center gap-2 pt-1 opacity-90">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                    ตรวจสอบรายละเอียดและสถานะใบขอซื้อพัสดุในระบบ
                                </p>
                            </div>
                        </div>

                    </div>

                </div>

                {/* --- THE MASTER DOCUMENT CONTAINER --- */}
                {/* 💡 เพิ่มเงาและขอบให้คมชัด */}
                <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-300 overflow-hidden flex flex-col">

                    {/* 1. ส่วนหัวเอกสาร (Document Header) */}
                    <div className="p-8 md:p-10 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8">

                        <div className="relative z-10">
                            <p className="text-[18px] font-black text-slate-950 uppercase tracking-wider mb-1">
                                เลขที่ใบขอซื้อ (PR Number):
                            </p>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl tabular-nums font-black tracking-tight text-[#1e3b8a] whitespace-nowrap">
                                {pr.prNumber}
                            </h2>
                        </div>

                        <div className="relative z-10 flex items-center justify-between md:justify-start gap-4 md:gap-6 bg-slate-50 px-6 py-4 rounded-2xl border-2 border-slate-200 w-full md:w-auto overflow-x-auto shadow-sm">
                            <div className="flex items-center gap-3 shrink-0">
                                <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider mb-0">สถานะเอกสาร:</p>
                                {getStatusBadge(pr.status)}
                            </div>

                            {pr.status === 'PENDING' && (
                                <div className="flex items-center gap-4 md:gap-6 shrink-0">
                                    <div className="w-px bg-slate-300 h-8"></div>
                                    <button
                                        onClick={() => router.push(`/purchase/pr/${id}/approve`)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all whitespace-nowrap"
                                    >
                                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" /> ดำเนินการพิจารณาอนุมัติ
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200/80"></div>

                    {/* 2. ข้อมูลผู้ขอซื้อ & วัตถุประสงค์ */}
                    {/* 💡 เพิ่ม bg-slate-50/80 ให้ส่วนพื้นหลัง เพื่อเน้นให้กล่องขาวเด้งขึ้นมา */}
                    <div className="p-8 md:p-10 bg-slate-50/80 space-y-8">
                        <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-4">
                            <div className="p-3 bg-indigo-100 rounded-xl"><User className="w-6 h-6 text-indigo-600" /></div>
                            <h3 className="text-base font-black text-slate-950 tracking-wide uppercase">ข้อมูลผู้ขอซื้อพัสดุ</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 💡 ใส่ border-2 และ shadow-md ให้กล่องคมชัด */}
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <User className="w-4 h-4 text-blue-500" /> ชื่อ-นามสกุล
                                </p>
                                <p className="text-lg font-black text-slate-900 mt-2">{pr.user?.firstName} {pr.user?.lastName}</p>
                                <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block uppercase tracking-widest mt-2 border border-blue-100">ID: Verified Staff</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    {/* 💡 ไอคอนสีเขียวอมฟ้า */}
                                    <Building2 className="w-4 h-4 text-teal-600" /> แผนกต้นสังกัด
                                </p>
                                <p className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 inline-block px-4 py-2 rounded-xl mt-2 shadow-sm uppercase tracking-wide">{pr.department?.name || 'Global Cost Center'}</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    {/* 💡 ไอคอนสีส้ม */}
                                    <Truck className="w-4 h-4 text-orange-500" /> ผู้จัดจำหน่ายที่แนะนำ
                                </p>
                                {pr.supplier ? (
                                    <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl shadow-sm mt-1">
                                        <p className="font-black text-slate-800 uppercase text-sm tracking-tight truncate" title={pr.supplier.name}>{pr.supplier.name}</p>
                                        <p className="text-[10px] font-bold text-slate-500 font-mono tracking-widest mt-1">[{pr.supplier.code}]</p>
                                    </div>
                                ) : (
                                    <p className="font-bold text-slate-400 text-xs italic bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-sm mt-1">ไม่ได้ระบุผู้จัดจำหน่าย</p>
                                )}
                            </div>
                        </div>

                        {/* 💡 กล่องวัตถุประสงค์ */}
                        <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-slate-200 shadow-md mt-4">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                {/* 💡 ไอคอนสีม่วง */}
                                <Briefcase className="w-5 h-5 text-purple-600" /> วัตถุประสงค์การขอซื้อ
                            </p>
                            <p className="text-base font-bold text-slate-800 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">"{pr.purpose}"</p>
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200/80"></div>

                    {/* 3. รายการพัสดุ (Items) */}
                    <div className="p-8 md:p-10 space-y-8 bg-slate-50/30">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-200 pb-5">
                            <h3 className="text-base font-black text-slate-950 tracking-wide flex items-center gap-3 uppercase">
                                {/* 💡 ไอคอนสีชมพู */}
                                <div className="p-2.5 bg-pink-100 rounded-xl"><Package className="w-6 h-6 text-pink-600" /></div>
                                รายละเอียดรายการพัสดุ (Items)
                            </h3>
                            <span className="bg-white border-2 border-slate-200 text-slate-700 text-xs px-5 py-2.5 rounded-xl font-black tracking-wide flex items-center gap-2 shadow-sm">
                                {/* 💡 ไอคอนสีเหลืองอำพัน */}
                                <Calendar className="w-4 h-4 text-amber-600" /> วันที่: {new Date(pr.createdAt).toLocaleDateString('th-TH')}
                            </span>
                        </div>

                        <div className="space-y-6">
                            {pr.items?.map((item) => (
                                /* 💡 กล่องรายการพัสดุคมชัดขึ้น */
                                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 md:p-8 rounded-3xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all shadow-md gap-6 bg-white">
                                    <div className="flex-1">
                                        <p className="font-black text-slate-950 text-base tracking-tight flex items-center gap-3 flex-wrap">
                                            <span className="text-slate-600 tabular-nums bg-slate-50 px-3 py-1.5 rounded-lg text-xs border border-slate-200 uppercase tracking-widest shadow-sm">[{item.product.sku}]</span>
                                            {item.product.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                        <div className="text-center bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex-1 sm:flex-none shadow-sm">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">จำนวน</p>
                                            <span className="text-2xl tabular-nums font-black text-slate-950">{item.quantity}</span>
                                        </div>
                                        <div className="text-center bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex-1 sm:flex-none shadow-sm">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">ราคาประเมิน/หน่วย</p>
                                            <span className="text-base tabular-nums font-bold text-slate-700">฿{Number(item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="text-right bg-emerald-50 px-6 py-4 rounded-2xl border-2 border-emerald-200 flex-1 sm:flex-none min-w-[140px] shadow-sm">
                                            <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">มูลค่ารวม</p>
                                            <span className="text-xl tabular-nums font-black text-emerald-700">฿{(item.estimatedPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200/80"></div>

                    {/* 4. ประวัติการพิจารณา (Decision History) */}
                    <div className="p-8 md:p-10 bg-slate-50/80 space-y-8">
                        <h3 className="text-base font-black text-slate-950 tracking-wide flex items-center gap-3 border-b-2 border-slate-200 pb-5 uppercase">
                            {/* 💡 ไอคอนสีเขียว */}
                            <div className="p-2.5 bg-emerald-100 rounded-xl"><ClipboardCheck className="w-6 h-6 text-emerald-600" /></div>
                            ประวัติการพิจารณา (Decision History)
                        </h3>
                        {/* 💡 กล่องคมชัดขึ้น */}
                        <div className="space-y-6 pl-4 mt-6 bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-md">
                            {pr.approvals?.map((app) => (
                                <div key={app.id} className="relative pl-8">
                                    <div className={`absolute left-0 top-1 bottom-0 w-1.5 rounded-full ${app.status === 'APPROVED' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                                        <p className={`text-sm font-black uppercase tracking-widest ${app.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {app.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                                        </p>
                                        <span className="text-sm font-mono text-slate-500 font-bold uppercase bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                            {new Date(app.actedAt).toLocaleString('th-TH')}
                                        </span>
                                    </div>
                                    <p className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-600" /> ผู้พิจารณา: {app.approver?.firstName}
                                    </p>
                                    {app.comments && (
                                        <div className="mt-4 p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 text-slate-700 text-sm font-bold leading-relaxed border-dashed shadow-inner">
                                            "{app.comments}"
                                        </div>
                                    )}
                                </div>
                            ))}
                            {(!pr.approvals || pr.approvals.length === 0) && (
                                <div className="text-center py-8 text-slate-400 italic text-sm font-bold tracking-wide bg-slate-50 rounded-2xl border-2 border-slate-100 border-dashed">
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