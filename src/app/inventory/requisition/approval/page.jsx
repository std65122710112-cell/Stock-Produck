"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    CheckCircle2,
    ShieldCheck,
    Package,
    ArrowLeft,
    ChevronRight,
    FileText,
    ClipboardCheck,
    AlertTriangle,
    X,
    Calendar,
    Layers,
    Wallet
} from "lucide-react";

export default function RequisitionApprovalPage() {
    const [requisitions, setRequisitions] = useState([]);
    const [selectedSR, setSelectedSR] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [viewMode, setViewMode] = useState('LIST');
    const [isMounted, setIsMounted] = useState(false);

    // --- Modal States ---
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, actionStatus: null, id: null });
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        loadPendingSRs();
    }, []);

    // ป้องกันการ Scroll เมื่อเปิด Modal
    useEffect(() => {
        if (confirmModal.isOpen || showSuccessModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [confirmModal.isOpen, showSuccessModal]);

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

            toast.dismiss(toastId);
            setConfirmModal({ isOpen: false, actionStatus: null, id: null });
            setShowSuccessModal(true); // 💡 เปิดป๊อปอัปสำเร็จ
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

    // --- MODAL COMPONENTS (Portals) ---

    const ConfirmModalPortal = () => {
        if (!isMounted || !confirmModal.isOpen) return null;
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-200">
                    <div className={`p-6 md:p-8 flex items-center justify-between border-b border-slate-200 ${confirmModal.actionStatus === 'APPROVED' ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3.5 rounded-xl ${confirmModal.actionStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {confirmModal.actionStatus === 'APPROVED' ? <ShieldCheck className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                            </div>
                            <div>
                                <h3 className={`text-xl font-black tracking-tight ${confirmModal.actionStatus === 'APPROVED' ? 'text-emerald-950' : 'text-rose-950'}`}>
                                    ยืนยันการ{confirmModal.actionStatus === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'}รายการ
                                </h3>
                                <p className="text-xs font-bold uppercase tracking-wider mt-0.5 opacity-60">
                                    {selectedSR?.srNumber}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setConfirmModal({ isOpen: false, actionStatus: null, id: null })} className="p-2.5 text-slate-400 hover:text-slate-700 bg-white rounded-full transition-colors border border-slate-200 shadow-sm">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-8">
                        {/* 💡 ปรับปรุงพารากราฟใหม่: ลดขนาดฟอนต์ และจัดเรียงให้สวยงามตามรูปตัวอย่าง */}
                        <div className="flex flex-col items-center gap-5 mb-8">
                            <p className="text-lg font-black text-slate-800 text-center leading-tight max-w-[280px] mx-auto">
                                คุณแน่ใจหรือไม่ที่ต้องการ <br />
                                <span className={confirmModal.actionStatus === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}>
                                    {confirmModal.actionStatus === 'APPROVED' ? 'อนุมัติพัสดุ' : 'ปฏิเสธและยกเลิก'}
                                </span> ใบเบิกรายการนี้?
                            </p>

                            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 w-full shadow-sm">
                                <p className="text-[12px] font-bold text-slate-500 text-center leading-relaxed">
                                    การดำเนินการนี้จะถูกบันทึกลงในระบบ <br />
                                    เพื่อการตรวจสอบ (Audit Log) ทันที
                                </p>
                            </div>
                        </div>

                        {confirmModal.actionStatus === 'APPROVED' && (
                            <div className="mb-8 bg-white border-2 border-emerald-100 rounded-2xl p-5 text-center shadow-sm">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">อนุมัติมูลค่าเบิกจ่าย</p>
                                <p className="text-3xl font-black text-emerald-600 tabular-nums">฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <button
                                disabled={isActionLoading}
                                onClick={() => setConfirmModal({ isOpen: false, actionStatus: null, id: null })}
                                className="py-4 rounded-xl font-black text-sm text-slate-500 bg-white border-2 border-slate-100 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                disabled={isActionLoading}
                                onClick={executeAction}
                                className={`py-4 rounded-xl font-black text-sm text-white shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 ${confirmModal.actionStatus === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
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

    const SuccessModalPortal = () => {
        if (!isMounted || !showSuccessModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-emerald-100 p-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">ทำรายการสำเร็จ!</h3>
                    <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">ระบบได้บันทึกข้อมูลการพิจารณา <br />ลงในฐานข้อมูลเรียบร้อยแล้ว</p>
                    <button onClick={() => { setShowSuccessModal(false); setViewMode('LIST'); setSelectedSR(null); }} className="w-full py-4 rounded-xl font-black text-base text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg transition-all active:scale-95">กลับสู่หน้ารายการ</button>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <ConfirmModalPortal />
            <SuccessModalPortal />

            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">

                {/* HEADER SECTION - ตาม Blueprint เป๊ะๆ */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-200 pb-8 gap-6 print:hidden">
                    <div className="flex flex-col gap-6">
                        {/* ปุ่มย้อนกลับแบบตัวหนังสือ (ตามรูป) */}
                        {viewMode === 'DETAIL' && (
                            <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2.5 text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors w-fit">
                                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                            </button>
                        )}
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                                <ClipboardCheck className="w-7 h-7 text-[#1F3B8B]" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                                    {viewMode === 'LIST' ? "คิวงานรออนุมัติ" : "รายละเอียดใบเบิก"}
                                </h1>
                                <p className="text-base text-slate-500 mt-1 font-bold">Inventory Outbound Management & History</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LIST VIEW --- */}
                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-3">
                                <FileText className="w-5 h-5 text-[#1F3B8B]" /> รายการรอดำเนินการ (Pending Requests)
                            </h2>
                            <div className="hidden sm:block bg-slate-50 text-slate-500 border border-slate-200 text-xs px-4 py-2 rounded-lg font-bold uppercase tracking-wider shadow-sm">
                                <span className="text-[#1F3B8B] mr-1">{requisitions.length}</span> รายการในระบบ
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="py-40 text-center flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                                    <p className="text-slate-500 text-sm font-bold tracking-widest mt-2 uppercase">กำลังซิงโครไนซ์ข้อมูล...</p>
                                </div>
                            ) : requisitions.length === 0 ? (
                                <div className="py-40 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <CheckCircle2 className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-bold text-base tracking-wide">ไม่มีรายการใบเบิกค้างอนุมัติในขณะนี้</p>
                                </div>
                            ) : (
                                <table className="min-w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-xs font-black uppercase text-slate-600 tracking-widest whitespace-nowrap">
                                            <th className="py-5 px-6">เลขที่ใบเบิก (SR)</th>
                                            <th className="py-5 px-6">ชื่อผู้ขอเบิกพัสดุ</th>
                                            <th className="py-5 px-6">แผนกต้นสังกัด</th>
                                            <th className="py-5 px-6">วันที่ส่งคำขอ</th>
                                            <th className="py-5 px-6 text-center">ดำเนินการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {requisitions.map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="p-6 whitespace-nowrap">
                                                    <span className="tabular-nums font-black text-[#1F3B8B] text-lg tracking-tight transition-colors group-hover:text-blue-600">
                                                        {req.srNumber}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <p className="font-bold text-slate-900 text-base uppercase tracking-tight">{req.user?.firstName} {req.user?.lastName}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className="text-xs font-bold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg bg-slate-50 uppercase tracking-wide">
                                                        {req.department?.name || '---'}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-sm font-bold text-slate-500 tabular-nums">
                                                    {new Date(req.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="p-6 text-center">
                                                    <button
                                                        onClick={() => handleSelectSR(req)}
                                                        className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#1F3B8B] hover:text-white bg-white border-2 border-slate-200 hover:border-[#1F3B8B] hover:bg-[#1F3B8B] px-6 py-2.5 rounded-xl transition-all uppercase tracking-widest shadow-sm active:scale-95"
                                                    >
                                                        ตรวจสอบข้อมูล <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* --- DETAIL VIEW --- */}
                {viewMode === 'DETAIL' && selectedSR && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden">

                            {/* Detail Header */}
                            <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">เลขที่อ้างอิงใบเบิก (SR Number)</span>
                                    <h2 className="text-2xl md:text-3xl font-black text-[#1F3B8B] tabular-nums">{selectedSR.srNumber}</h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">วันที่ส่งคำขอเบิก</p>
                                    <p className="text-base font-bold text-slate-900 flex items-center gap-2 justify-end">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {new Date(selectedSR.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            {/* Detail Content Grid (คลีน ไม่มีไอคอน) */}
                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-slate-200">
                                <DetailInfoItem label="ผู้ขอเบิกพัสดุ" value={`${selectedSR.user?.firstName} ${selectedSR.user?.lastName}`} subValue={selectedSR.department?.name || 'ส่วนกลาง'} />
                                <DetailInfoItem label="เลขอ้างอิงโครงการ" value={selectedSR.referenceNo || 'ไม่มีระบุ'} />
                                <DetailInfoItem label="สถานะปัจจุบัน" value="รอการพิจารณาอนุมัติ" />
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">วัตถุประสงค์การใช้งาน</p>
                                    <p className="text-base text-slate-800 font-bold leading-relaxed p-5 bg-slate-50 rounded-xl border border-slate-100 italic">"{selectedSR.purpose}"</p>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">หมายเหตุ (Remarks)</p>
                                    <p className="text-base text-slate-800 font-bold leading-relaxed p-5 bg-slate-50 rounded-xl border border-slate-100">{selectedSR.remarks || "--- ไม่มีการระบุข้อมูลเพิ่มเติม ---"}</p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="px-8 pb-8">
                                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2"><Package className="w-5 h-5 text-[#1F3B8B]" /> รายการพัสดุและมูลค่าเบิกจ่าย (ทั้งหมด {selectedSR.items.length} รายการ)</h3>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-slate-100 border-b-2 border-slate-200">
                                            <tr className="text-xs font-black uppercase text-slate-600 tracking-widest whitespace-nowrap">
                                                <th className="p-5 text-center w-16">ลำดับ</th>
                                                <th className="p-5 text-left">รายละเอียดพัสดุ (Product Name / SKU)</th>
                                                <th className="p-5 text-right">ราคา/หน่วย</th>
                                                <th className="p-5 text-center w-32">จำนวนเบิก</th>
                                                <th className="p-5 text-right">รวมมูลค่า (Est.)</th>
                                                <th className="p-5 text-left">หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {selectedSR.items.map((item, idx) => {
                                                const unitCost = Number(item.product?.unitCost) || Number(item.product?.price) || 0;
                                                const rowTotal = unitCost * Number(item.quantity);
                                                return (
                                                    <tr key={idx} className="text-base hover:bg-slate-50 transition-colors">
                                                        <td className="p-5 text-center text-slate-500 font-bold tabular-nums">{idx + 1}</td>
                                                        <td className="p-5">
                                                            <p className="font-bold text-slate-900">{item.product?.name}</p>
                                                            <p className="text-xs text-[#1F3B8B] font-bold uppercase mt-0.5 tracking-wider">SKU: {item.product?.sku}</p>
                                                        </td>
                                                        <td className="p-5 text-right tabular-nums font-semibold text-slate-700">฿{unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className="p-5 text-center">
                                                            <span className="px-3 py-1.5 bg-slate-100 rounded-md font-black text-lg text-[#1F3B8B] border border-slate-200 tabular-nums">{item.quantity}</span>
                                                        </td>
                                                        <td className="p-5 text-right tabular-nums font-bold text-slate-900">฿{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className="p-5 text-sm text-slate-600 font-medium">{item.remark || <span className="text-slate-400 font-bold">-</span>}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-[#1F3B8B]/5">
                                            <tr>
                                                <td colSpan="4" className="p-6 text-right text-sm font-black uppercase text-slate-600 tracking-widest">มูลค่าประเมินรวมทั้งสิ้น (Grand Total)</td>
                                                <td className="p-6 text-right text-xl font-black text-emerald-600 tabular-nums">฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Action Footer Section */}
                            <div className="bg-slate-50 p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8 border-t-2 border-slate-200">
                                <div className="flex flex-col text-center md:text-left w-full md:w-auto">
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center justify-center md:justify-start gap-2">
                                        <Wallet className="w-4 h-4 text-[#1F3B8B]" /> สรุปมูลค่าการเบิกจ่ายรวม
                                    </span>
                                    <span className="text-3xl md:text-4xl font-black text-emerald-600 tabular-nums tracking-tighter">
                                        ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                    <button
                                        disabled={isActionLoading}
                                        onClick={() => setConfirmModal({ isOpen: true, actionStatus: 'REJECTED', id: selectedSR.id })}
                                        className="w-full sm:w-auto px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-rose-600 bg-white border-2 border-rose-200 hover:bg-rose-50 hover:border-rose-400 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                    >
                                        ไม่อนุมัติ (Reject)
                                    </button>
                                    <button
                                        disabled={isActionLoading}
                                        onClick={() => setConfirmModal({ isOpen: true, actionStatus: 'APPROVED', id: selectedSR.id })}
                                        className="w-full sm:w-auto px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} /> ยืนยันการอนุมัติพัสดุ
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}

// --- SUB-COMPONENTS ---

function DetailInfoItem({ label, value, subValue }) {
    return (
        <div className="flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</span>
            <span className="text-base font-bold text-slate-900">{value}</span>
            {subValue && <span className="text-xs font-bold text-[#1F3B8B] uppercase mt-0.5">{subValue}</span>}
        </div>
    );
}