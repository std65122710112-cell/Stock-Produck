"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 🛡️ นำเข้า Portal เพื่อแก้ปัญหา Modal เคลื่อน
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
    Calendar
} from "lucide-react";

export default function RequisitionApprovalPage() {
    const [requisitions, setRequisitions] = useState([]);
    const [selectedSR, setSelectedSR] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [viewMode, setViewMode] = useState('LIST');

    // 🛡️ State ตรวจสอบการ Mount ของ Client (จำเป็นสำหรับ Next.js Portal)
    const [isMounted, setIsMounted] = useState(false);

    // 🛡️ State สำหรับจัดการ Pop-up ยืนยัน
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, actionStatus: null, id: null });

    useEffect(() => {
        setIsMounted(true);
        loadPendingSRs();
    }, []);

    // 🛡️ ล็อก Scroll หน้าจอพื้นหลังเวลา Pop-up เปิดอยู่ เพื่อไม่ให้จอขยับ
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

    // 🛡️ แยก Component Modal ออกมาใช้ Portal
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
            document.body // 👈 ดันออกไปนอกสุดของ DOM Tree
        );
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />

            {/* เรียกใช้งาน Modal Portal */}
            <ConfirmModalPortal />

            <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 md:px-0 animate-in fade-in duration-500">
                {/* --- HEADER BLOCK --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-wider w-fit">
                            <Package className="w-4 h-4" /> ระบบจัดการคลังสินค้า (Inventory Management)
                        </div>
                        <h1 className="text-5xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                            {viewMode === 'LIST' ? "คิวงานรออนุมัติ" : "รายละเอียดใบเบิก"}
                        </h1>
                        <p className="text-slate-600 text-base font-bold flex items-center gap-2 mt-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            ระบบตรวจสอบและอนุมัติใบขอเบิกพัสดุ (Requisition Approval)
                        </p>
                    </div>
                    {viewMode === 'DETAIL' && (
                        <button
                            onClick={() => setViewMode('LIST')}
                            className="group flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-sm"
                        >
                            <ArrowLeft className="w-5 h-5" /> ย้อนกลับไปรายการทั้งหมด
                        </button>
                    )}
                </div>

                {/* --- LIST VIEW: DATA TABLE (คงเดิม) --- */}
                {viewMode === 'LIST' && (
                    <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-sm font-black text-[#1e3b8a] tracking-wide flex items-center gap-3 uppercase">
                                <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-5 h-5 text-[#1e3b8a]" /></div>
                                รายการรอดำเนินการ (Pending Requests)
                            </h2>
                            <div className="bg-sky-50 text-sky-700 border border-sky-200 text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-wider">
                                {requisitions.length} รายการในระบบ
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="py-40 text-center flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-slate-400 text-sm font-black tracking-wide mt-2">กำลังซิงโครไนซ์ข้อมูลจากระบบคลัง...</p>
                                </div>
                            ) : requisitions.length === 0 ? (
                                <div className="py-40 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <CheckCircle2 className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-black text-sm tracking-wide">ไม่มีรายการใบเบิกค้างอนุมัติในขณะนี้</p>
                                </div>
                            ) : (
                                <table className="min-w-full text-left border-collapse">
                                    <thead className="bg-white border-b border-slate-200">
                                        <tr className="text-slate-500 font-black text-xs uppercase tracking-wider">
                                            <th className="p-6">เลขที่ใบเบิก (SR)</th>
                                            <th className="p-6">ชื่อผู้ขอเบิกพัสดุ</th>
                                            <th className="p-6">แผนกต้นสังกัด</th>
                                            <th className="p-6">วันที่ส่งคำขอ</th>
                                            <th className="p-6 text-center">ดำเนินการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {requisitions.map((req) => (
                                            <tr key={req.id} className="hover:bg-blue-50/50 group cursor-default transition-colors duration-200">
                                                <td className="p-6 whitespace-nowrap">
                                                    <span className="tabular-nums font-black text-[#1e3b8a] text-base transition-colors group-hover:text-blue-800">
                                                        {req.srNumber}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <p className="font-bold text-slate-800 text-sm uppercase">{req.user?.firstName} {req.user?.lastName}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className="text-xs font-black text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg bg-slate-50 uppercase">
                                                        {req.department?.name || 'ไม่ได้ระบุแผนก'}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-sm font-bold text-slate-400">
                                                    {new Date(req.createdAt).toLocaleDateString('th-TH')}
                                                </td>
                                                <td className="p-6 text-center">
                                                    <button
                                                        onClick={() => handleSelectSR(req)}
                                                        className="inline-flex items-center justify-center gap-2 bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-wider shadow-sm hover:shadow-md active:scale-95"
                                                    >
                                                        ตรวจสอบ <ChevronRight className="w-4 h-4" />
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

                {/* --- DETAIL VIEW: รวมทุกอย่างเป็นกล่องเดียวแบบแผ่นเอกสาร --- */}
                {viewMode === 'DETAIL' && selectedSR && (
                    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-w-5xl mx-auto flex flex-col">

                        {/* 1. Header Section (White Theme) */}
                        <div className="bg-white p-10 text-slate-950 relative overflow-hidden border-b border-slate-100">

                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <p className="text-[#1e3b8a] text-sm font-black uppercase tracking-[0.3em] mb-2">เลขที่อ้างอิง</p>
                                    <h2 className="text-2xl lg:text-3xl tabular-nums font-black tracking-tighter text-[#1e3b8a]">{selectedSR.srNumber}</h2>
                                </div>
                                <div className="text-left md:text-right bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">วันที่ส่งคำขอเบิก</p>
                                    <p className="text-lg font-bold flex items-center md:justify-end gap-2 text-slate-700">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                        {new Date(selectedSR.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Content Body */}
                        <div className="p-10 space-y-10">
                            {/* Meta Data Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-dashed border-slate-200">
                                {/* ข้อมูลผู้เบิก - ใช้สี Indigo */}
                                <div className="space-y-3">
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2.5">
                                        <User className="w-5 h-5 text-indigo-600" /> ข้อมูลผู้เบิกพัสดุ
                                    </p>
                                    <p className="text-lg font-black text-slate-900 uppercase">{selectedSR.user?.firstName} {selectedSR.user?.lastName}</p>
                                    <p className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 w-fit px-3 py-1.5 rounded-lg">
                                        {selectedSR.department?.name}
                                    </p>
                                </div>

                                {/* เลขอ้างอิงโครงการ - ใช้สี Amber */}
                                <div className="space-y-3">
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2.5">
                                        <Hash className="w-5 h-5 text-amber-500" /> เลขอ้างอิงโครงการ
                                    </p>
                                    <p className="text-lg font-black text-slate-900 uppercase">
                                        {selectedSR.referenceNo || 'ไม่มีระบุ'}
                                    </p>
                                </div>

                                {/* สถานที่จัดส่ง - ใช้สี Rose */}
                                <div className="space-y-3">
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2.5">
                                        <MapPin className="w-5 h-5 text-rose-500" /> สถานที่จัดส่ง
                                    </p>
                                    <p className="text-lg font-black text-slate-900 uppercase">
                                        {selectedSR.deliveryLocation || "คลังสินค้าหลัก TJC Group"}
                                    </p>
                                </div>
                            </div>

                            {/* Purpose & Remarks Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* วัตถุประสงค์การใช้งาน - ใช้สี Sky */}
                                <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 flex flex-col">
                                    <p className="text-sm font-black text-[#1e3b8a] uppercase tracking-widest mb-4 flex items-center gap-2.5">
                                        <Briefcase className="w-5 h-5 text-sky-500" /> วัตถุประสงค์การใช้งาน
                                    </p>
                                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic flex-1">
                                        "{selectedSR.purpose}"
                                    </p>
                                </div>

                                {/* หมายเหตุเพิ่มเติมถึงผู้อนุมัติ - ใช้สี Emerald (เมื่อมีข้อมูล) */}
                                <div className={`${selectedSR.remarks ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'} p-6 rounded-[1.5rem] border flex flex-col`}>
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2.5">
                                        <MessageSquareText className={`w-5 h-5 ${selectedSR.remarks ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        หมายเหตุเพิ่มเติมถึงผู้อนุมัติ
                                    </p>
                                    <p className="text-sm font-bold text-slate-700 leading-relaxed flex-1">
                                        {selectedSR.remarks || "--- ไม่มีการระบุข้อมูลเพิ่มเติม ---"}
                                    </p>
                                </div>
                            </div>

                            {/* Items Table Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                                        <Package className="w-5 h-5 text-[#1e3b8a]" /> รายการพัสดุที่ต้องการเบิก
                                    </h3>
                                    <p className="text-xs font-black text-slate-400">ทั้งหมด {selectedSR.items.length} รายการ</p>
                                </div>
                                <div className="border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr className="text-sm font-black uppercase text-slate-600 tracking-wider">
                                                <th className="p-6">รายละเอียดพัสดุ (Product Name / SKU)</th>
                                                <th className="p-5 text-center">จำนวนเบิก</th>
                                                <th className="p-6">หมายเหตุรายการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {selectedSR.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-5">
                                                        <p className="font-black text-slate-900 text-sm">{item.product?.name}</p>
                                                        <span className="tabular-nums text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 mt-1 inline-block">
                                                            [{item.product?.sku}]
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <span className="text-2xl tabular-nums font-black text-[#1e3b8a]">{item.quantity}</span>
                                                    </td>
                                                    <td className="p-5">
                                                        {item.remark ? (
                                                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-2.5 rounded-xl w-fit">
                                                                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                                <p className="text-[11px] font-bold text-slate-600 leading-tight">
                                                                    {item.remark}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 ml-2">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* 3. Action Footer Section */}
                        <div className="bg-slate-50 p-8 flex flex-col sm:flex-row justify-end items-center gap-4 border-t border-slate-200">
                            <button
                                disabled={isActionLoading}
                                onClick={() => setConfirmModal({ isOpen: true, actionStatus: 'REJECTED', id: selectedSR.id })}
                                className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-rose-600 bg-white border-2 border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all active:scale-95 disabled:opacity-50"
                            >
                                ไม่อนุมัติ (Reject)
                            </button>
                            <button
                                disabled={isActionLoading}
                                onClick={() => setConfirmModal({ isOpen: true, actionStatus: 'APPROVED', id: selectedSR.id })}
                                className="w-full sm:w-auto px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-emerald-600 shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <ShieldCheck className="w-5 h-5" /> ยืนยันการอนุมัติพัสดุ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}