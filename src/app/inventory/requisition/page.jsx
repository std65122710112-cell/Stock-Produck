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
        const baseClass = "px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm flex items-center gap-1.5 w-fit mx-auto";
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

                        {/* แถวบน: ปุ่มย้อนกลับ (แสดงเฉพาะตอนอยู่หน้ารายละเอียด) */}
                        {viewMode === 'FORM' && (
                            <div>
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="group flex items-center gap-3 bg-white border-2 border-slate-200 text-slate-600 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm w-fit"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                    ย้อนกลับไปหน้ารายการ
                                </button>
                            </div>
                        )}

                        {/* แถวล่าง: ส่วนเนื้อหา Header (Icon & Title) และ ปุ่มสร้างใบเบิก */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
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

                            {/* ปุ่มสร้างใบเบิก (แสดงเฉพาะตอนอยู่หน้ารายการ) */}
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

                {/* --- DETAIL VIEW --- */}
                {viewMode === 'DETAIL' && selectedSR && (
                    /* ปรับขนาดหน้า Detail ให้กว้างขึ้นให้สอดคล้องกับ Layout หลัก */
                    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-w-[1300px] mx-auto flex flex-col mb-10">

                        {/* 1. Header Section */}
                        <div className="bg-white p-10 relative overflow-hidden border-b border-slate-200">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    {/* ปรับหัวข้อเป็นสีดำเข้ม */}
                                    <p className="text-slate-950 text-sm font-black uppercase tracking-[0.3em] mb-2">
                                        เลขที่ใบเบิก (SR Number)
                                    </p>
                                    {/* ปรับส่วนแสดงข้อมูลเป็นสีน้ำเงินเข้ม */}
                                    <h2 className="text-3xl lg:text-4xl tabular-nums font-black tracking-tighter text-[#1F3B8B]">
                                        {selectedSR.srNumber}
                                    </h2>
                                </div>
                                <div className="text-left md:text-right">
                                    {/* ปรับเป็น text-slate-500 */}
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">วันที่ส่งคำขอเบิก</p>
                                    {/* ปรับเป็น text-slate-900 */}
                                    <p className="text-xl font-bold flex items-center md:justify-end gap-2 text-slate-900 tabular-nums">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                        {new Date(selectedSR.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Content Body - 💡 เปลี่ยนพื้นหลังเป็นสีเทาอ่อน เพื่อให้กล่องย่อยสีขาวเด้งออกมา */}
                        <div className="p-8 md:p-10 space-y-8 bg-slate-50/80">

                            {/* 💡 แยกส่วนที่ 1: ข้อมูลบุคคลและสถานะ (Meta Data Grid) เป็น 3 กล่องชัดเจน */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* 1. ข้อมูลผู้เบิก - ปรับขนาดกระทัดรัด */}
                                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-2">
                                        <User className="w-3.5 h-3.5 text-indigo-500" /> ผู้ขอเบิกพัสดุ
                                    </p>
                                    <p className="text-lg font-black text-slate-900 uppercase truncate">
                                        {selectedSR.user?.firstName} {selectedSR.user?.lastName}
                                    </p>
                                    <div className="mt-1">
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                            {selectedSR.department?.name || 'ส่วนกลาง'}
                                        </span>
                                    </div>
                                </div>

                                {/* 2. สถานะปัจจุบัน - ปรับ Layout ให้สมดุล (Center alignment) */}
                                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-3">
                                        <Clock className="w-3.5 h-3.5 text-blue-500" /> สถานะปัจจุบัน
                                    </p>
                                    <div className="w-full flex justify-center">
                                        {/* badge จะดูเด่นและสะอาดขึ้นเมื่อวางกึ่งกลางในพื้นที่จำกัด */}
                                        {getStatusBadge(selectedSR.status)}
                                    </div>
                                </div>

                                {/* 3. ผู้อนุมัติ - ปรับให้คลีนเหมือนกล่องแรก */}
                                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> ผู้อนุมัติเอกสาร
                                    </p>
                                    <p className="text-lg font-black text-slate-900 uppercase truncate">
                                        {selectedSR.approver?.firstName ? `${selectedSR.approver.firstName} ${selectedSR.approver.lastName}` : "-"}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                        {selectedSR.approver?.firstName ? 'Authorized Personnel' : 'Waiting for action'}
                                    </p>
                                </div>
                            </div>

                            {/* 💡 แยกส่วนที่ 2: วัตถุประสงค์และหมายเหตุ เป็นกล่องชัดเจน */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* วัตถุประสงค์การใช้งาน */}
                                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
                                    <div className="flex justify-between items-center mb-5">
                                        <p className="text-sm font-black text-[#1e3b8a] uppercase tracking-widest flex items-center gap-2.5">
                                            <Briefcase className="w-5 h-5 text-sky-500" /> วัตถุประสงค์การใช้งาน
                                        </p>
                                        {selectedSR.referenceNo && <span className="text-[10px] font-black text-indigo-500 tracking-wider bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100">Ref: {selectedSR.referenceNo}</span>}
                                    </div>
                                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex-1">
                                        <p className="text-base font-bold text-slate-700 leading-relaxed italic">
                                            "{selectedSR.purpose}"
                                        </p>
                                    </div>
                                </div>

                                {/* หมายเหตุเพิ่มเติม */}
                                <div className={`bg-white p-6 md:p-8 rounded-[2rem] border ${selectedSR.remarks ? 'border-amber-200' : 'border-slate-200'} shadow-sm flex flex-col`}>
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2.5">
                                        <MessageSquareText className={`w-5 h-5 ${selectedSR.remarks ? 'text-amber-500' : 'text-slate-400'}`} />
                                        หมายเหตุ (Remarks)
                                    </p>
                                    <div className={`${selectedSR.remarks ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50/50 border-slate-100'} p-5 rounded-2xl border flex-1`}>
                                        <p className="text-base font-bold text-slate-700 leading-relaxed">
                                            {selectedSR.remarks || "--- ไม่มีการระบุข้อมูลเพิ่มเติม ---"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 💡 แยกส่วนที่ 3: รายการพัสดุ (Items Table Section) อยู่ในกล่องพื้นขาวของตัวเอง */}
                            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-base font-black text-slate-950 uppercase tracking-wider flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-50 rounded-xl"><Package className="w-6 h-6 text-[#1e3b8a]" /></div>
                                        รายการพัสดุและมูลค่า
                                    </h3>
                                    <p className="text-sm font-black text-slate-500 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">ทั้งหมด {selectedSR.items?.length || 0} รายการ</p>
                                </div>
                                <div className="border-2 border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                                            <tr className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                                <th className="p-5 w-16 text-center">ลำดับ</th>
                                                <th className="p-5">รายละเอียดพัสดุ (Product Name / SKU)</th>
                                                <th className="p-5 text-right">ราคา/หน่วย</th>
                                                <th className="p-5 text-center">จำนวนเบิก</th>
                                                <th className="p-5 text-right text-indigo-600">รวมมูลค่า (Est.)</th>
                                                <th className="p-5">หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {selectedSR.items?.map((item, idx) => {
                                                const unitCost = Number(item.product?.unitCost) || Number(item.product?.price) || 0;
                                                const rowTotal = unitCost * Number(item.quantity);
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-5 text-center font-black text-slate-400">{idx + 1}</td>
                                                        <td className="p-5">
                                                            <p className="font-black text-slate-900 text-base">{item.product?.name}</p>
                                                            <span className="tabular-nums text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200 mt-1.5 inline-block">
                                                                [{item.product?.sku}]
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-right font-bold text-slate-500 tabular-nums text-base">
                                                            ฿{unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            <span className="text-2xl tabular-nums font-black text-[#1e3b8a]">{item.quantity}</span>
                                                        </td>
                                                        <td className="p-5 text-right font-black text-indigo-600 text-lg tabular-nums">
                                                            ฿{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-5">
                                                            {item.remark ? (
                                                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-2.5 rounded-xl w-fit max-w-[200px]">
                                                                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                                    <p className="text-xs font-bold text-slate-600 leading-relaxed break-words">
                                                                        {item.remark}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 ml-2">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* สรุปยอดรวมท้ายตาราง */}
                                        <tfoot className="bg-indigo-50/30 border-t-2 border-indigo-100">
                                            <tr>
                                                <td colSpan="4" className="p-6 text-right text-sm font-black uppercase tracking-widest text-indigo-900">
                                                    มูลค่าประเมินรวมทั้งสิ้น (Grand Total)
                                                </td>
                                                <td className="p-6 text-right font-black text-2xl text-indigo-700 tabular-nums">
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