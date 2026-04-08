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
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Truck,
    ChevronRight,
    Package,
    ArrowUpRight,
    ArrowLeft,
    Building2,
    Briefcase,
    MessageSquareText,
    Info,
    Calendar,
    Wallet
} from "lucide-react";

export default function StockRequisitionListPage() {
    const [requisitions, setRequisitions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 💡 เพิ่ม State สำหรับจัดการ View Mode และข้อมูลที่เลือก
    const [viewMode, setViewMode] = useState('LIST');
    const [selectedSR, setSelectedSR] = useState(null);

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

    // 💡 ฟังก์ชันสลับหน้าไปดูรายละเอียด
    const handleSelectSR = (sr) => {
        setSelectedSR(sr);
        setViewMode('DETAIL');
        window.scrollTo(0, 0);
    };

    const getStatusBadge = (status) => {
        // 💡 เปลี่ยนจาก mx-auto เป็น ml-0 เพื่อให้ป้ายชิดซ้ายตรงกับไอคอนนาฬิกาด้านบน
        const baseClass = "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-2 w-fit ml-0";

        switch (status) {
            case 'PENDING':
                return <span className={`${baseClass} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-4 h-4" /> รออนุมัติ</span>;
            case 'APPROVED':
                return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-4 h-4" /> อนุมัติแล้ว</span>;
            case 'REJECTED':
                return <span className={`${baseClass} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-4 h-4" /> ไม่อนุมัติ</span>;
            case 'DISPATCHED':
                return <span className={`${baseClass} bg-indigo-50 text-indigo-600 border-indigo-100`}><Truck className="w-4 h-4" /> จ่ายของแล้ว</span>;
            case 'COMPLETED':
                return <span className={`${baseClass} bg-blue-50 text-blue-600 border-blue-100`}><CheckCircle2 className="w-4 h-4" /> เสร็จสิ้น</span>;
            default:
                return <span className={`${baseClass} bg-slate-50 text-slate-500 border-slate-200`}>{status}</span>;
        }
    };

    // 💡 คำนวณมูลค่ารวม
    const calculateGrandTotal = () => {
        if (!selectedSR || !selectedSR.items) return 0;
        return selectedSR.items.reduce((sum, item) => {
            const cost = Number(item.product?.unitCost) || Number(item.product?.price) || 0;
            const qty = Number(item.quantity) || 0;
            return sum + (cost * qty);
        }, 0);
    };

    const grandTotalValue = viewMode === 'DETAIL' ? calculateGrandTotal() : 0;

    return (
        <AuthGate>
            <Toaster position="top-right" />
            {/* ปรับคอนเทนเนอร์หลักให้กว้างและชิดขอบมากขึ้น */}
            <div className="w-[96%] max-w-[1600px] mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="w-full pt-10 mb-6 print:hidden">
                    <div className="w-full px-6 md:px-10 flex flex-col gap-6">

                        {/* --- ปุ่มย้อนกลับ: แสดงเฉพาะหน้ารายละเอียด (viewMode !== 'LIST') --- */}
                        {viewMode !== 'LIST' && (
                            <div className="flex justify-start">
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="group flex items-center gap-2.5 bg-white border border-slate-200 px-5 py-2 rounded-full shadow-sm hover:shadow-md hover:border-[#1F3B8B]/30 hover:bg-slate-50 transition-all active:scale-95 w-fit"
                                >
                                    {/* ไอคอน ArrowLeft */}
                                    <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-[#1F3B8B] transition-colors" />

                                    {/* ข้อความ ย้อนกลับ */}
                                    <span className="text-sm font-bold text-slate-600 group-hover:text-[#1F3B8B] transition-colors">
                                        ย้อนกลับ
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* แถวล่าง: ส่วนเนื้อหา Icon & Title */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                {/* Icon รถบรรทุก */}
                                <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                    <Truck className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <ArrowUpRight className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                            Inventory Outbound Management
                                        </p>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                        {/* ถ้าไม่ใช่หน้า LIST แสดงว่าเป็นหน้ารายละเอียด */}
                                        {viewMode === 'LIST' ? 'รายการใบขอเบิก (SR)' : 'รายละเอียดใบเบิก'}
                                    </h1>
                                    <div className="flex items-center gap-2 pt-1 opacity-90">
                                        <History className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                            รายการประวัติใบขอเบิกพัสดุ (Requisition Queue)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ปุ่มสร้างใบเบิก: แสดงเฉพาะหน้ารายการหลัก */}
                            {viewMode === 'LIST' && (
                                <div className="flex items-center">
                                    <Link
                                        href="/inventory/requisition/create"
                                        className="group flex items-center gap-2 bg-emerald-600 text-white px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        <Plus className="w-5 h-5 shrink-0" strokeWidth={3} />
                                        สร้างใบขอเบิกใหม่
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- LIST VIEW --- */}
                {viewMode === 'LIST' && (
                    <>
                        {/* STATUS SUMMARY BAR */}
                        <div className="flex items-center gap-4 px-2">
                            <div className="flex items-center gap-2 bg-indigo-50 px-5 py-2.5 rounded-2xl border-2 border-indigo-200 shadow-sm">
                                <History className="w-5 h-5 text-indigo-500" />
                                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                    รายการที่รอประมวลผล: {requisitions.length} รายการ
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-2xl border-2 border-emerald-200 shadow-sm">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                    เฉพาะผู้ที่มีสิทธิ์เข้าถึงข้อมูลเท่านั้น
                                </span>
                            </div>
                        </div>

                        {/* DATA TABLE */}
                        <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm animate-in fade-in duration-500">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-base text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-slate-900 font-black text-sm tracking-wide">
                                            <th className="p-6 w-32">วันที่ขอเบิก</th>
                                            <th className="p-6">เลขที่เอกสาร (SR)</th>
                                            <th className="p-6">วัตถุประสงค์ / โครงการ</th>
                                            <th className="p-6">ผู้ขอเบิก / แผนก</th>
                                            <th className="p-6 text-center">สถานะ</th>
                                            <th className="p-6 text-right">ดำเนินการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white/50">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan="6" className="p-24 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                        <p className="text-slate-400 font-black tracking-wide text-sm mt-2">กำลังโหลดข้อมูลรายการใบเบิก...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : requisitions.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-32 text-center">
                                                    <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                                    <p className="text-slate-500 font-black tracking-wide text-sm">ไม่พบประวัติรายการใบเบิก</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            requisitions.map((req) => (
                                                <tr key={req.id} className="hover:bg-slate-50/80 group cursor-default transition-colors">
                                                    <td className="p-6 whitespace-nowrap">
                                                        <div className="font-mono text-sm text-slate-600 flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                            {new Date(req.createdAt).toLocaleDateString('th-TH')}
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-blue-800 uppercase tracking-tight text-base tabular-nums group-hover:text-blue-600 transition-colors">
                                                                {req.srNumber}
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                                                <Package className="w-3.5 h-3.5" /> จำนวน {req._count?.items || req.items?.length || 0} รายการ
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="max-w-[250px]">
                                                            <p className="font-bold text-slate-800 text-sm truncate">"{req.purpose}"</p>
                                                            <p className="text-xs font-bold text-slate-500 mt-1.5 tracking-tight">อ้างอิง: {req.referenceNo || "---"}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-indigo-100 p-2 rounded-full shadow-sm group-hover:bg-white transition-colors">
                                                                <User className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-black text-slate-800 truncate">
                                                                    {req.user?.firstName} {req.user?.lastName}
                                                                </p>
                                                                <p className="text-xs text-slate-500 font-bold tracking-tight mt-0.5">
                                                                    {req.department?.name || "ระบุไม่ได้"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <div className="inline-flex justify-center w-full">
                                                            {getStatusBadge(req.status)}
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <button
                                                            onClick={() => handleSelectSR(req)}
                                                            className="bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-wider shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 ml-auto"
                                                        >
                                                            ดูข้อมูล <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* BOTTOM COMPLIANCE NOTE */}
                        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-5 bg-slate-50 rounded-2xl border border-slate-200 mb-10">
                            <div className="flex items-center gap-2.5 text-nowrap">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                <span className="text-xs font-black text-slate-800 tracking-wider">
                                    บันทึกข้อมูลการเบิกจ่ายภายใน
                                </span>
                            </div>
                            <div className="text-xs font-bold text-slate-700 tracking-wider mt-3 md:mt-0">
                                จำนวนรายการประวัติทั้งหมด: {requisitions.length} รายการ
                            </div>
                        </div>
                    </>
                )}

                {/* --- DETAIL VIEW (ปรับปรุงให้ใหญ่และตรงกันเป๊ะ) --- */}
                {viewMode === 'DETAIL' && selectedSR && (
                    <div className="bg-white rounded-[3.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 w-full max-w-[1550px] mx-auto flex flex-col mb-10">

                        {/* 1. Header Section */}
                        <div className="bg-white p-12 text-slate-950 border-b-2 border-slate-100">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        {/* 💡 ปรับจาก text-xs เป็น text-sm เพื่อให้หัวข้อใหญ่ขึ้น และเข้มขึ้นด้วย text-slate-500 */}
                                        <p className="text-slate-500 text-sm font-black uppercase tracking-[0.3em]">
                                            เลขที่ใบเบิก
                                        </p>
                                    </div>
                                    {/* 💡 ปรับขนาดลงจาก 4xl/5xl เหลือ 2xl/3xl เพื่อให้ดูพอดีกับหัวข้อ */}
                                    <h2 className="text-2xl lg:text-3xl tabular-nums font-black tracking-tighter text-[#1F3B8B]">
                                        {selectedSR.srNumber}
                                    </h2>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm min-w-[280px]">
                                    <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-[#1F3B8B]" /> วันที่ส่งคำขอ
                                    </p>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums">
                                        {new Date(selectedSR.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Content Body */}
                        <div className="p-12 space-y-12">

                            {/* Meta Data Grid - ปรับขนาดไอคอนและจัดแนวใหม่ */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b-2 border-dashed border-slate-200">

                                <div className="flex flex-col gap-4">
                                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                        <User className="w-6 h-6 text-indigo-500" strokeWidth={2.5} /> ผู้ขอเบิกพัสดุ
                                    </p>
                                    <div>
                                        <p className="text-lg font-black text-slate-900 uppercase leading-tight mb-2">
                                            {selectedSR.user?.firstName} {selectedSR.user?.lastName}
                                        </p>
                                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 uppercase">
                                            {selectedSR.department?.name || 'ส่วนกลาง'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                        <Hash className="w-6 h-6 text-amber-500" strokeWidth={2.5} /> เลขอ้างอิงโครงการ
                                    </p>
                                    <p className="text-2xl font-black text-[#1F3B8B] tabular-nums uppercase">
                                        {selectedSR.referenceNo || '---'}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                        <ShieldCheck className="w-6 h-6 text-emerald-500" strokeWidth={2.5} /> ผู้อนุมัติเอกสาร
                                    </p>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 uppercase">
                                            {selectedSR.approver?.firstName ? `${selectedSR.approver.firstName} ${selectedSR.approver.lastName}` : "-"}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 italic mt-1 uppercase">Authorized Personnel</p>
                                    </div>
                                </div>

                                {/* 💡 ปรับส่วนสถานะเอกสาร: เอา justify-between ออกเพื่อให้ชิดหัวข้อ */}
                                <div className="flex flex-col gap-4">
                                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                        <Clock className="w-6 h-6 text-blue-500" strokeWidth={2.5} /> สถานะเอกสาร
                                    </p>
                                    <div className="flex justify-start items-center">
                                        {getStatusBadge(selectedSR.status)}
                                    </div>
                                </div>
                            </div>

                            {/* วัตถุประสงค์และหมายเหตุ */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-slate-100 shadow-inner">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                        <Briefcase className="w-6 h-6 text-sky-600" /> วัตถุประสงค์การใช้งาน
                                    </p>
                                    <p className="text-xl font-semibold text-slate-700 italic leading-relaxed">
                                        "{selectedSR.purpose}"
                                    </p>
                                </div>

                                <div className={`${selectedSR.remarks ? 'bg-amber-50/40 border-amber-100' : 'bg-slate-50 border-slate-100'} p-10 rounded-[3rem] border-2 shadow-inner`}>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                        <MessageSquareText className={`w-6 h-6 ${selectedSR.remarks ? 'text-amber-500' : 'text-slate-400'}`} />
                                        หมายเหตุ (Remarks)
                                    </p>
                                    <p className="text-xl font-semibold text-slate-700 leading-relaxed">
                                        {selectedSR.remarks || "--- ไม่มีการระบุข้อมูลเพิ่มเติม ---"}
                                    </p>
                                </div>
                            </div>

                            {/* รายการพัสดุ */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between px-4">
                                    <h3 className="text-xl font-black text-slate-950 uppercase tracking-widest flex items-center gap-4">
                                        <div className="p-4 bg-[#1F3B8B] rounded-3xl shadow-lg shadow-blue-900/20">
                                            <Package className="w-8 h-8 text-white" />
                                        </div>
                                        รายการพัสดุและมูลค่าเบิกจ่าย
                                    </h3>
                                    <p className="text-base font-black text-slate-500 bg-white border-2 border-slate-100 px-8 py-3 rounded-2xl shadow-sm">
                                        จำนวนทั้งหมด {selectedSR.items?.length || 0} รายการ
                                    </p>
                                </div>

                                <div className="border-2 border-slate-200 rounded-[3.5rem] overflow-hidden shadow-2xl bg-white">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                                            <tr className="text-sm font-black uppercase text-slate-500 tracking-widest">
                                                <th className="p-8 pl-12 w-24 text-center">ลำดับ</th>
                                                <th className="p-8">รายการพัสดุ / SKU</th>
                                                <th className="p-8 text-right">ราคา/หน่วย</th>
                                                <th className="p-8 text-center">จำนวนเบิก</th>
                                                <th className="p-8 text-right text-[#1F3B8B]">รวมมูลค่า</th>
                                                <th className="p-8 pr-12">หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedSR.items?.map((item, idx) => {
                                                const unitCost = Number(item.product?.unitCost) || Number(item.product?.price) || 0;
                                                const rowTotal = unitCost * Number(item.quantity);
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="p-8 text-center font-bold text-slate-300 tabular-nums text-xl group-hover:text-[#1F3B8B]">{idx + 1}</td>
                                                        <td className="p-8">
                                                            <p className="font-black text-slate-900 text-lg uppercase mb-1">{item.product?.name}</p>
                                                            <span className="text-xs text-[#1F3B8B] font-black bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 tabular-nums">SKU: {item.product?.sku}</span>
                                                        </td>
                                                        <td className="p-8 text-right font-bold text-slate-500 tabular-nums text-xl">
                                                            ฿{unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-8 text-center">
                                                            <span className="font-black text-[#1F3B8B] text-3xl tabular-nums bg-slate-50 px-6 py-3 rounded-3xl border border-slate-100">{item.quantity}</span>
                                                        </td>
                                                        <td className="p-8 text-right font-black text-[#1F3B8B] text-2xl tabular-nums">
                                                            ฿{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-8 pr-12">
                                                            {item.remark ? (
                                                                <div className="flex items-start gap-2 bg-amber-50 px-4 py-3 rounded-2xl border border-amber-100 w-fit max-w-[280px]">
                                                                    <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                                    <p className="text-xs font-bold text-slate-600 leading-tight">{item.remark}</p>
                                                                </div>
                                                            ) : <span className="text-slate-300">-</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-[#1F3B8B]/5 border-t-2 border-slate-200">
                                            <tr>
                                                <td colSpan="4" className="p-12 text-right text-base font-black uppercase tracking-[0.2em] text-slate-500">
                                                    มูลค่าประมาณการสุทธิ (Total Valuation)
                                                </td>
                                                <td className="p-12 text-right font-black text-3xl text-[#1F3B8B] tabular-nums tracking-tighter">
                                                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}