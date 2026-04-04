"use client";

import React, { useState, useEffect } from 'react';
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
    Briefcase
} from "lucide-react";

export default function RequisitionApprovalPage() {
    const [requisitions, setRequisitions] = useState([]);
    const [selectedSR, setSelectedSR] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [viewMode, setViewMode] = useState('LIST');

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

    useEffect(() => { loadPendingSRs(); }, []);

    const handleSelectSR = (sr) => {
        setSelectedSR(sr);
        setViewMode('DETAIL');
        window.scrollTo(0, 0);
    };

    const handleAction = async (id, actionStatus) => {
        const actionText = actionStatus === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ';
        if (!confirm(`⚠️ ยืนยันการดำเนินการ "${actionText}" สำหรับใบเบิกเลขที่ ${selectedSR?.srNumber}?`)) return;

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
            setViewMode('LIST');
            setSelectedSR(null);
            loadPendingSRs();
        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดด้านความปลอดภัย", { id: toastId });
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            {/* ปรับพื้นหลังรวมให้เป็นสีเทาอ่อนเพื่อไม่ให้ขาวเกินไป */}
            <div className="min-h-screen bg-slate-50/50 py-10 px-4 md:px-8">
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* --- HEADER BLOCK --- */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    {viewMode === 'LIST' ? "คิวงานรออนุมัติ" : "ตรวจสอบรายละเอียดใบเบิก"}
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-widest font-bold">SR-Approval</span>
                                </h1>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.1em]">TJC Group Logistics • Management Authorization</p>
                            </div>
                        </div>
                        {viewMode === 'DETAIL' && (
                            <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-all">
                                <ArrowLeft className="w-4 h-4" /> ย้อนกลับไปรายการทั้งหมด
                            </button>
                        )}
                    </div>

                    {/* --- LIST VIEW: DATA TABLE --- */}
                    {viewMode === 'LIST' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                            {isLoading ? (
                                <div className="py-40 text-center flex flex-col items-center gap-3">
                                    <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">กำลังซิงโครไนซ์ข้อมูลจากระบบคลัง...</p>
                                </div>
                            ) : requisitions.length === 0 ? (
                                <div className="py-40 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <CheckCircle2 className="w-8 h-8 text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">ไม่มีรายการใบเบิกค้างอนุมัติในขณะนี้</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                            <th className="p-5 border-r border-slate-800">เลขที่ใบเบิก</th>
                                            <th className="p-5 border-r border-slate-800">ชื่อผู้เบิกพัสดุ</th>
                                            <th className="p-5 border-r border-slate-800">แผนกต้นสังกัด</th>
                                            <th className="p-5 border-r border-slate-800">วันที่ส่งคำขอ</th>
                                            <th className="p-5 text-right">ดำเนินการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {requisitions.map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-50 transition-all">
                                                <td className="p-5 font-mono font-black text-indigo-600">{req.srNumber}</td>
                                                <td className="p-5">
                                                    <p className="font-bold text-slate-700 text-sm">{req.user?.firstName} {req.user?.lastName}</p>
                                                </td>
                                                <td className="p-5">
                                                    <span className="text-[10px] font-black text-slate-500 border border-slate-200 px-2 py-1 rounded bg-slate-50 uppercase tracking-tighter">
                                                        {req.department?.name || 'ไม่ได้ระบุแผนก'}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-xs font-bold text-slate-400">
                                                    {new Date(req.createdAt).toLocaleDateString('th-TH')}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <button
                                                        onClick={() => handleSelectSR(req)}
                                                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-100 bg-indigo-50 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                                                    >
                                                        Review <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* --- DETAIL VIEW: OFFICIAL RECORD --- */}
                    {viewMode === 'DETAIL' && selectedSR && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                {/* Info Box (4/12) */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                        <div className="absolute -right-4 -bottom-4 opacity-5"><Database className="w-40 h-40" /></div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Official Document ID</p>
                                        <h2 className="text-4xl font-mono font-black tracking-tighter mb-8">{selectedSR.srNumber}</h2>

                                        <div className="space-y-4 border-t border-white/10 pt-6">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase italic">
                                                <span>เลขอ้างอิง:</span>
                                                <span className="text-white not-italic font-black tracking-normal">{selectedSR.referenceNo || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-start text-[10px] font-bold text-slate-400 uppercase italic">
                                                <span>สถานที่จัดส่ง:</span>
                                                <span className="text-white not-italic font-black text-right max-w-[150px]">{selectedSR.deliveryLocation || "คลังสินค้าหลัก TJC Group"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><User className="w-5 h-5" /></div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ผู้ขอรับพัสดุ</p>
                                                <p className="text-sm font-black text-slate-800 uppercase">{selectedSR.user?.firstName} {selectedSR.user?.lastName}</p>
                                                <p className="text-[10px] font-bold text-indigo-600">{selectedSR.department?.name}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Briefcase className="w-3 h-3" /> วัตถุประสงค์การใช้งาน</p>
                                            <p className="text-sm font-bold text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4">"{selectedSR.purpose}"</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items & Remarks (8/12) */}
                                <div className="lg:col-span-8 space-y-6">
                                    {/* หมายเหตุรวม (Amber Box) */}
                                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-start gap-4">
                                        <div className="w-10 h-10 bg-amber-200 rounded-2xl flex items-center justify-center text-amber-700 shrink-0"><MessageSquareText className="w-5 h-5" /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">หมายเหตุเพิ่มเติมถึงผู้อนุมัติ</p>
                                            <p className="text-sm font-bold text-amber-900 leading-relaxed">{selectedSR.remarks || "--- ไม่มีการระบุข้อมูลเพิ่มเติม ---"}</p>
                                        </div>
                                    </div>

                                    {/* รายการพัสดุ */}
                                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <Package className="w-4 h-4 text-indigo-600" /> ตรวจสอบรายการพัสดุ (Asset List)
                                            </h3>
                                            <span className="bg-white text-slate-500 border border-slate-200 text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                                {selectedSR.items.length} รายการ
                                            </span>
                                        </div>
                                        <div className="overflow-auto max-h-[450px]">
                                            <table className="w-full text-left">
                                                <thead className="bg-white border-b border-slate-50">
                                                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        <th className="p-6">ข้อมูลสินค้า / SKU</th>
                                                        <th className="p-6 text-right">จำนวนเบิก</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {selectedSR.items.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/30 transition-all">
                                                            <td className="p-6">
                                                                <p className="font-black text-slate-800 text-xs tracking-tight uppercase">[{item.product?.sku}] {item.product?.name}</p>
                                                                {item.remark && (
                                                                    <p className="text-[10px] font-bold text-slate-400 mt-1 italic flex items-center gap-1 opacity-75">
                                                                        ↳ Note: {item.remark}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="p-6 text-right">
                                                                <span className="text-xl font-mono font-black text-slate-900 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 inline-block">
                                                                    {item.quantity}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* ACTION CONTROL BAR */}
                                        <div className="p-8 bg-slate-900 flex flex-col sm:flex-row justify-end gap-4">
                                            <button
                                                disabled={isActionLoading}
                                                onClick={() => handleAction(selectedSR.id, 'REJECTED')}
                                                className="px-8 py-4 rounded-2xl font-black text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                                            >
                                                ปฏิเสธรายการเบิก (Reject)
                                            </button>
                                            <button
                                                disabled={isActionLoading}
                                                onClick={() => handleAction(selectedSR.id, 'APPROVED')}
                                                className="px-12 py-4 rounded-2xl font-black text-[10px] text-white bg-indigo-600 border border-indigo-500 uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/50 hover:bg-emerald-600 hover:border-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {isActionLoading ? (
                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <ShieldCheck className="w-4 h-4" />
                                                )}
                                                ยืนยันการอนุมัติจ่ายพัสดุ
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- FOOTER AUDIT --- */}
                    <div className="flex justify-center items-center gap-2 py-4 border-t border-slate-100 italic">
                        <ClipboardCheck className="w-4 h-4 text-slate-300" />
                        <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em]">Authorized Manager Signature Required for Final Dispatch • TJC Group ERP System</span>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}