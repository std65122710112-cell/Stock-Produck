"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    CheckCircle2,
    User,
    ShieldCheck,
    Package,
    MapPin,
    Hash,
    Info,
    ArrowLeft,
    ChevronRight,
    FileText,
    Truck,
    MessageSquareText,
    ClipboardCheck,
    Database,
    Briefcase,
    AlertTriangle,
    X,
    Calendar,
    Layers,
    Clock,
    Wallet
} from "lucide-react";

export default function RequisitionApprovalPage() {
    const [requisitions, setRequisitions] = useState([]);
    const [selectedSR, setSelectedSR] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [viewMode, setViewMode] = useState('LIST');

    const [isMounted, setIsMounted] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, actionStatus: null, id: null });

    useEffect(() => {
        setIsMounted(true);
        loadPendingSRs();
    }, []);

    useEffect(() => {
        if (confirmModal.isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [confirmModal.isOpen]);

    const loadPendingSRs = async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch("/outbound/requisitions/pending");
            setRequisitions(Array.isArray(res) ? res : []);
        } catch (error) {
            toast.error("ระบบไม่สามารถดึงข้อมูลรายการค้างอนุมัติได้");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectSR = (sr) => {
        setSelectedSR(sr);
        setViewMode('DETAIL');
        window.scrollTo(0, 0);
    };

    const executeAction = async () => {
        const { id, actionStatus } = confirmModal;
        const actionText = actionStatus === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ';

        setIsActionLoading(true);
        const toastId = toast.loading(`กำลังส่งคำสั่ง${actionText}เข้าสู่ระบบ...`);

        try {
            await apiFetch(`/outbound/requisitions/${id}/status`, {
                method: "PUT",
                body: JSON.stringify({
                    status: actionStatus,
                    processedAt: new Date().toISOString()
                })
            });

            toast.success(`Security Verified: ทำรายการ${actionText}สำเร็จแล้ว`, { id: toastId });
            setConfirmModal({ isOpen: false, actionStatus: null, id: null });
            setViewMode('LIST');
            setSelectedSR(null);
            loadPendingSRs();
        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดด้านความปลอดภัย", { id: toastId });
        } finally {
            setIsActionLoading(false);
        }
    };

    const calculateGrandTotal = () => {
        if (!selectedSR || !selectedSR.items) return 0;
        return selectedSR.items.reduce((sum, item) => {
            const cost = Number(item.product?.unitCost) || Number(item.product?.price) || 0;
            const qty = Number(item.quantity) || 0;
            return sum + (cost * qty);
        }, 0);
    };

    const grandTotalValue = calculateGrandTotal();

    const ConfirmModalPortal = () => {
        if (!isMounted || !confirmModal.isOpen) return null;

        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className={`p-6 flex items-center justify-between ${confirmModal.actionStatus === 'APPROVED' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl ${confirmModal.actionStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {confirmModal.actionStatus === 'APPROVED' ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className={`text-lg font-black tracking-tight ${confirmModal.actionStatus === 'APPROVED' ? 'text-emerald-900' : 'text-rose-900'}`}>
                                    ยืนยันการ{confirmModal.actionStatus === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'}รายการ
                                </h3>
                                <p className={`text-xs font-bold uppercase ${confirmModal.actionStatus === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedSR?.srNumber}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setConfirmModal({ isOpen: false, actionStatus: null, id: null })} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-8">
                        <p className="text-sm font-bold text-slate-600 leading-relaxed text-center">
                            คุณแน่ใจหรือไม่ที่ต้องการ <strong className={confirmModal.actionStatus === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}>{confirmModal.actionStatus === 'APPROVED' ? 'อนุมัติพัสดุ' : 'ปฏิเสธและยกเลิก'}</strong> ใบเบิกรายการนี้? การดำเนินการนี้จะถูกบันทึกลงในระบบเพื่อการตรวจสอบ (Audit Log) ทันที
                        </p>

                        {confirmModal.actionStatus === 'APPROVED' && (
                            <div className="mt-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
                                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">อนุมัติมูลค่าเบิกจ่าย</p>
                                <p className="text-xl font-black text-emerald-900 tabular-nums">฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <button
                                disabled={isActionLoading}
                                onClick={() => setConfirmModal({ isOpen: false, actionStatus: null, id: null })}
                                className="py-3.5 rounded-2xl font-black text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                disabled={isActionLoading}
                                onClick={executeAction}
                                className={`py-3.5 rounded-2xl font-black text-sm text-white shadow-lg transition-colors flex justify-center items-center disabled:opacity-50 ${confirmModal.actionStatus === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'}`}
                            >
                                {isActionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'ยืนยันดำเนินการ'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <ConfirmModalPortal />

            {/* 💡 ขยายความกว้าง Container ให้ชิดขอบ (w-[98%] max-w-[1600px]) */}
            <div className="w-[98%] max-w-[1650px] mx-auto space-y-10 py-10 px-2 animate-in fade-in duration-500">
                {/* HEADER SECTION */}
                <div className="w-full mb-6 print:hidden px-4">
                    <div className="flex flex-col gap-6">

                        {/* แถวบน: ปุ่มย้อนกลับ (แสดงเฉพาะโหมด DETAIL) */}
                        {viewMode === 'DETAIL' && (
                            <div>
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="group flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm whitespace-nowrap w-fit"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                    ย้อนกลับ
                                </button>
                            </div>
                        )}

                        {/* แถวล่าง: ส่วน Header (ไอคอน + ข้อความ) */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">

                            {/* กล่องไอคอน (ลดขนาดเท่าหน้าที่แล้ว) */}
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                <ClipboardCheck className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>

                            {/* กลุ่มข้อความ */}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Layers className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        Inventory Requisition Approval System
                                    </p>
                                </div>

                                {/* หัวข้อหลัก (ปรับขนาดเท่าหน้าที่แล้ว) */}
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                    {viewMode === 'LIST' ? "คิวงานรออนุมัติ" : "รายละเอียดใบเบิก"}
                                </h1>

                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                        ระบบตรวจสอบและอนุมัติใบขอเบิกพัสดุ (Requisition Approval Queue)
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- LIST VIEW --- */}
                {viewMode === 'LIST' && (
                    <section className="overflow-hidden rounded-[3rem] border-2 border-slate-100 bg-white shadow-xl animate-in slide-in-from-bottom-6 duration-700">
                        <div className="p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-base md:text-lg font-bold text-slate-600 tracking-tight flex items-center gap-4">
                                {/* ส่วนของ Icon: เปลี่ยนจากสีน้ำเงินเข้มเป็นฟ้าพาสเทลนุ่มๆ */}
                                <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl border border-blue-100/50">
                                    <FileText className="w-5 h-5 md:w-6 h-6" />
                                </div>
                                <span className="uppercase tracking-wide">รายการรอดำเนินการ (Pending Requests)</span>
                            </h2>

                            {/* ส่วนของ Badge: เปลี่ยนจากสีเข้มเป็นโทนอ่อน (Soft Badge) */}
                            <div className="hidden sm:block bg-slate-50 text-slate-500 border border-slate-200 text-[11px] px-4 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                                <span className="text-blue-500 mr-1">{requisitions.length}</span> รายการในระบบ
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="py-60 text-center flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                                    <p className="text-slate-500 text-lg font-black tracking-widest mt-4 uppercase">กำลังซิงโครไนซ์ข้อมูล...</p>
                                </div>
                            ) : requisitions.length === 0 ? (
                                <div className="py-60 text-center">
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                        <CheckCircle2 className="w-12 h-12 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-black text-lg tracking-wide">ไม่มีรายการใบเบิกค้างอนุมัติในขณะนี้</p>
                                </div>
                            ) : (
                                <table className="min-w-full text-left border-collapse">
                                    <thead className="bg-slate-50/80 border-b border-slate-200">
                                        <tr className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                                            <th className="py-6 px-8 text-left">เลขที่ใบเบิก (SR)</th>
                                            <th className="py-6 px-8 text-left">ชื่อผู้ขอเบิกพัสดุ</th>
                                            <th className="py-6 px-8 text-left">แผนกต้นสังกัด</th>
                                            <th className="py-6 px-8 text-left">วันที่ส่งคำขอ</th>
                                            <th className="py-6 px-8 text-center">ดำเนินการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 bg-white">
                                        {requisitions.map((req) => (
                                            <tr key={req.id} className="hover:bg-blue-50/40 group cursor-default transition-all duration-300">
                                                <td className="p-8 whitespace-nowrap">
                                                    <span className="tabular-nums font-black text-blue-900 text-xl tracking-tight transition-colors group-hover:text-blue-600">
                                                        {req.srNumber}
                                                    </span>
                                                </td>
                                                <td className="p-8">
                                                    <p className="font-black text-slate-900 text-base uppercase tracking-tight">{req.user?.firstName} {req.user?.lastName}</p>
                                                </td>
                                                <td className="p-8">
                                                    <span className="text-sm font-black text-slate-700 border-2 border-slate-100 px-4 py-2 rounded-xl bg-slate-50/50 uppercase tracking-wide">
                                                        {req.department?.name || 'ไม่ได้ระบุแผนก'}
                                                    </span>
                                                </td>
                                                <td className="p-8 text-base font-bold text-slate-500 tabular-nums">
                                                    {new Date(req.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="p-8 text-center">
                                                    <button
                                                        onClick={() => handleSelectSR(req)}
                                                        className="inline-flex items-center justify-center gap-3 bg-white text-blue-900 border-2 border-slate-200 hover:border-blue-900 hover:bg-blue-900 hover:text-white px-8 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-xl active:scale-95"
                                                    >
                                                        ตรวจสอบข้อมูล <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>
                )}

                {/* --- DETAIL VIEW --- */}
                {viewMode === 'DETAIL' && selectedSR && (
                    <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 w-full max-w-[1440px] mx-auto flex flex-col mb-10">
                        {/* 💡 ปรับขยายความกว้างจาก max-w-[1200px] เป็น max-w-[1440px] */}

                        {/* 1. Header Section */}
                        <div className="bg-white p-8 md:p-10 text-slate-950 relative overflow-hidden border-b-2 border-slate-100">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mb-2">
                                        เลขที่อ้างอิงใบเบิก (SR Number)
                                    </p>
                                    <h2 className="text-2xl lg:text-3xl tabular-nums font-black tracking-tighter text-blue-950">{selectedSR.srNumber}</h2>
                                </div>
                                <div className="text-left md:text-right bg-slate-100 p-4 rounded-2xl border border-slate-300 shadow-sm">
                                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1">วันที่ส่งคำขอเบิก</p>
                                    <p className="text-lg font-bold flex items-center md:justify-end gap-2 text-slate-900">
                                        <Calendar className="w-5 h-5 text-blue-700" strokeWidth={2.5} />
                                        {new Date(selectedSR.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Content Body */}
                        <div className="p-8 md:p-10 space-y-10">
                            {/* Meta Data Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b-2 border-dashed border-slate-200">
                                <div className="space-y-3">
                                    {/* แก้ไข: เปลี่ยนจาก <p> เป็น <div> */}
                                    <div className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-xl"><User className="w-5 h-5 text-blue-500" /></div>
                                        ผู้ขอเบิกพัสดุ
                                    </div>
                                    <p className="text-lg font-black text-slate-950 uppercase tracking-tight">
                                        {selectedSR.user?.firstName} {selectedSR.user?.lastName}
                                    </p>
                                    <p className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-200 w-fit px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                        {selectedSR.department?.name || 'ส่วนกลาง'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {/* แก้ไข: เปลี่ยนจาก <p> เป็น <div> */}
                                    <div className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                                        <div className="p-2 bg-amber-50 rounded-xl"><Hash className="w-5 h-5 text-amber-500" /></div>
                                        เลขอ้างอิงโครงการ
                                    </div>
                                    <p className="text-lg font-black text-slate-950 uppercase tracking-tight">
                                        {selectedSR.referenceNo || 'ไม่มีระบุ'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {/* แก้ไข: เปลี่ยนจาก <p> เป็น <div> */}
                                    <div className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-xl"><Clock className="w-5 h-5 text-emerald-500" /></div>
                                        สถานะปัจจุบัน
                                    </div>
                                    <p className="text-lg font-black text-blue-800 uppercase tracking-tight">
                                        รอการพิจารณาอนุมัติ
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col shadow-sm">
                                    {/* ปรับหัวข้อ (Label) ให้ใหญ่ขึ้นเป็น text-sm */}
                                    <p className="text-sm font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-sky-500" /> วัตถุประสงค์การใช้งาน
                                    </p>
                                    {/* ข้อมูล (Value) ขนาดเท่าเดิม: text-sm */}
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed italic flex-1">
                                        "{selectedSR.purpose}"
                                    </p>
                                </div>

                                <div className={`${selectedSR.remarks ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'} p-6 rounded-3xl border flex flex-col shadow-sm`}>
                                    <p className="text-sm font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <MessageSquareText className={`w-5 h-5 ${selectedSR.remarks ? 'text-amber-500' : 'text-slate-400'}`} />
                                        หมายเหตุเพิ่มเติมถึงผู้อนุมัติ
                                    </p>
                                    {/* ข้อมูล (Value) ขนาดเท่าเดิม: text-sm */}
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed flex-1">
                                        {selectedSR.remarks || "--- ไม่มีการระบุข้อมูลเพิ่มเติม ---"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.15em] flex items-center gap-3">
                                        <Package className="w-5 h-5 text-blue-900" /> รายการพัสดุและมูลค่าเบิกจ่าย
                                    </h3>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">ทั้งหมด {selectedSR.items.length} รายการ</p>
                                </div>

                                <div className="border-2 border-slate-300 rounded-3xl overflow-hidden shadow-md">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/80 border-b border-slate-200">
                                            <tr className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                                                <th className="py-5 px-6 w-16 text-center">ลำดับ</th>
                                                <th className="py-5 px-6 text-left">รายละเอียดพัสดุ (Product Name / SKU)</th>
                                                <th className="py-5 px-6 text-right font-semibold">ราคา/หน่วย</th>
                                                <th className="py-5 px-6 text-center">จำนวนเบิก</th>
                                                {/* สำหรับ "รวมมูลค่า" ใช้สีน้ำเงินอ่อนๆ ให้ดูเด่นแต่ไม่เข้มเกินไป */}
                                                <th className="py-5 px-6 text-right text-[#1F3B8B]/70">รวมมูลค่า (Est.)</th>
                                                <th className="py-5 px-6 text-left">หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {selectedSR.items.map((item, idx) => {
                                                const unitCost = Number(item.product?.unitCost) || Number(item.product?.price) || 0;
                                                const rowTotal = unitCost * Number(item.quantity);
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-5 text-center font-black text-slate-500 text-sm tabular-nums">{idx + 1}</td>
                                                        <td className="p-5">
                                                            <p className="font-black text-slate-950 text-sm mb-1 uppercase tracking-tight">{item.product?.name}</p>
                                                            <span className="tabular-nums text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-300 font-bold tracking-wider uppercase">
                                                                [{item.product?.sku}]
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-right font-bold text-slate-600 tabular-nums text-sm">
                                                            ฿{unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            <span className="text-xl tabular-nums font-black text-blue-900">{item.quantity}</span>
                                                        </td>
                                                        <td className="p-5 text-right font-black text-blue-700 text-base tabular-nums">
                                                            ฿{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-5">
                                                            {item.remark ? (
                                                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl w-fit max-w-[200px] shadow-sm">
                                                                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                                    <p className="text-[11px] font-bold text-slate-800 leading-relaxed truncate">
                                                                        {item.remark}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 font-black">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-blue-50/50 border-t-2 border-blue-200">
                                            <tr>
                                                <td colSpan="4" className="p-6 text-right text-sm font-black uppercase tracking-[0.2em] text-blue-900">
                                                    มูลค่าประเมินรวมทั้งสิ้น (Grand Total)
                                                </td>
                                                <td className="p-6 text-right font-black text-2xl text-blue-900 tabular-nums tracking-tighter">
                                                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* 3. Action Footer Section */}
                        <div className="bg-slate-100 p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8 border-t-2 border-slate-200 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-col text-center md:text-left w-full md:w-auto">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1 flex items-center justify-center md:justify-start gap-2">
                                    <Wallet className="w-4 h-4 text-blue-700" /> สรุปมูลค่าการเบิกจ่ายรวม
                                </span>
                                <span className="text-3xl font-black text-slate-950 tabular-nums tracking-tighter">
                                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                <button
                                    disabled={isActionLoading}
                                    onClick={() => setConfirmModal({ isOpen: true, actionStatus: 'REJECTED', id: selectedSR.id })}
                                    className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-rose-700 bg-white border-2 border-rose-200 hover:bg-rose-50 hover:border-rose-400 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                >
                                    ไม่อนุมัติ (Reject)
                                </button>
                                <button
                                    disabled={isActionLoading}
                                    onClick={() => setConfirmModal({ isOpen: true, actionStatus: 'APPROVED', id: selectedSR.id })}
                                    className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-emerald-600 shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    <ShieldCheck className="w-5 h-5" strokeWidth={2.5} /> ยืนยันการอนุมัติพัสดุ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}