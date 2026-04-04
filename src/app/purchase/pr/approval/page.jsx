"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    FileSignature, Database, ArrowLeft,
    CheckCircle2, ShieldCheck, Building2,
    ClipboardList, MessageSquare, AlertCircle, Upload, PenTool, FileText, Clock, XCircle, Package, FileCheck,
    UserCheck,
    BadgeCheck,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";

export default function ApprovePRPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState('LIST');
    const [filterTab, setFilterTab] = useState('PENDING');
    const [isLoading, setIsLoading] = useState(false);

    const [prList, setPrList] = useState([]);
    const [selectedPRData, setSelectedPRData] = useState(null);
    const [approvalComment, setApprovalComment] = useState('');
    const [signatureImage, setSignatureImage] = useState(null);

    // 💡 State สำหรับควบคุม Popup
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                // ดึงรายการ PR ตาม Tab ที่เลือก
                const data = await apiFetch(`/api/purchase/pr?status=${filterTab}`);
                setPrList(data || []);
            } catch (error) {
                toast.error("ไม่สามารถโหลดข้อมูลได้");
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [filterTab, viewMode]);

    const handleSelectPRFromList = async (pr) => {
        setIsLoading(true);
        try {
            const prDetail = await apiFetch(`/api/purchase/pr/${pr.id}`);
            if (prDetail) {
                setSelectedPRData(prDetail);
                setApprovalComment('');
                setSignatureImage(null);
                setViewMode('FORM');
            }
        } catch (error) {
            toast.error("ไม่สามารถดึงข้อมูลรายละเอียดได้");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setSignatureImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // 💡 ฟังก์ชันอนุมัติและสร้าง PR PDF
    const handleApproveAndGeneratePDF = async (e) => {
        if (e) e.preventDefault();
        setIsApproveModalOpen(false); // ปิด Popup

        if (!signatureImage) return toast.error("กรุณาลงนามกำกับเอกสารก่อนทำการอนุมัติ");

        setIsLoading(true);
        try {
            toast.loading("กำลังประมวลผล สร้างเอกสารอนุมัติ PR (PDF)...", { id: "pr-approve" });

            const payload = {
                status: 'APPROVED',
                comments: approvalComment,
                signatureBase64: signatureImage
            };

            // 💡 ยิงไป API ใหม่ที่เราจะสร้างสำหรับออกเอกสาร PR
            const response = await apiFetch(`/api/purchase/pr/${selectedPRData.id}/approve-pdf`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            toast.success("อนุมัติและสร้างเอกสาร PDF สำเร็จ!", { id: "pr-approve" });

            if (response && response.pdfUrl) {
                handleViewPDF(response.pdfUrl);
            }

            setTimeout(() => {
                setViewMode('LIST');
                setFilterTab('APPROVED');
            }, 1500);

        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", { id: "pr-approve" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async (e) => {
        if (e) e.preventDefault();
        setIsRejectModalOpen(false); // ปิด Popup

        if (!approvalComment.trim()) return toast.error("กรุณาระบุเหตุผลในการไม่อนุมัติในช่องหมายเหตุ");

        setIsLoading(true);
        try {
            await apiFetch(`/api/purchase/pr/approve`, {
                method: "POST",
                body: JSON.stringify({ id: selectedPRData.id, status: 'REJECTED', comments: approvalComment })
            });
            toast.success("ปฏิเสธคำขอเรียบร้อยแล้ว");
            setViewMode('LIST');
        } catch (error) {
            toast.error("ไม่สามารถปฏิเสธคำขอได้");
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewPDF = async (pdfPath) => {
        if (!pdfPath) return toast.error("ไม่พบไฟล์เอกสาร PDF สำหรับรายการนี้");

        setIsLoading(true);
        toast.loading("กำลังเปิดเอกสาร...", { id: "pdf-load" });

        try {
            const filename = pdfPath.split('/').pop();
            const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
            const url = `${backendUrl}/api/purchase/pr/document/${filename}`; // 💡 ชี้ไปที่ Route ของ PR Document

            const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
            if (!token) throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่อีกครั้ง");

            const response = await fetch(url, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("คุณไม่มีสิทธิ์เข้าถึง หรือเอกสารสูญหาย");

            const blob = await response.blob();
            const fileURL = window.URL.createObjectURL(blob);
            window.open(fileURL, '_blank');
            toast.success("เปิดเอกสารสำเร็จ", { id: "pdf-load" });

            setTimeout(() => { window.URL.revokeObjectURL(fileURL); }, 60000);
        } catch (error) {
            toast.error(error.message, { id: "pdf-load" });
        } finally {
            setIsLoading(false);
        }
    };

    const totalAmount = selectedPRData?.items?.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.estimatedPrice)), 0) || 0;

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 md:px-0 animate-in fade-in duration-500">

                {/* HEADER SECTION - คอนเซปต์พรีเมียม ชิดซ้าย ไม่เอาเส้นกั้น และเว้นระยะ pt-10 ตามมาตรฐานระบบ */}
                <div className="w-full pt-10 mb-6 print:hidden">

                    {/* กล่องใน: จัดตำแหน่งให้ชิดซ้าย (px-6 md:px-10) */}
                    <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">

                        {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า (ปรับตามสถานะ viewMode) --- */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* 💡 ไอคอนหลัก: FileCheck (สื่อถึงการตรวจสอบและอนุมัติเอกสาร) */}
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                <FileCheck className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>

                            {/* กลุ่มข้อความเรียงซ้อนกัน */}
                            <div className="flex flex-col">
                                {/* ภาษาอังกฤษด้านบน */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <UserCheck className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        Executive Purchase Requisition Approval
                                    </p>
                                </div>

                                {/* หัวข้อหลัก (ตัวตรง หนาพิเศษ เปลี่ยนตาม viewMode) */}
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                    {viewMode === 'LIST' ? "อนุมัติใบขอซื้อ (PR)" : "พิจารณาอนุมัติเอกสาร"}
                                </h1>

                                {/* คำอธิบายด้านล่าง พร้อมไอคอนสีเขียวมรกต */}
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <BadgeCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                        ระบบตรวจสอบและอนุมัติการจัดซื้อสำหรับผู้บริหาร
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* --- ส่วนขวา: ปุ่มย้อนกลับ หรือ Tab Switcher สำหรับกรองสถานะ --- */}
                        <div className="flex items-center">
                            {viewMode === 'FORM' ? (
                                /* ปุ่มย้อนกลับในโหมด FORM */
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="group flex items-center gap-3 bg-white border-2 border-slate-100 text-slate-600 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                    ย้อนกลับไปหน้ารายการ
                                </button>
                            ) : (
                                /* Tab Switcher ในโหมด LIST (ปรับดีไซน์ให้เข้าคู่กับหน้าอื่น) */
                                <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm border-2 border-slate-100 overflow-x-auto w-full md:w-auto">
                                    <button
                                        onClick={() => setFilterTab("PENDING")}
                                        className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none border-2 ${filterTab === 'PENDING'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Clock className="w-4 h-4" /> รอพิจารณาอนุมัติ
                                    </button>
                                    <button
                                        onClick={() => setFilterTab("APPROVED")}
                                        className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none border-2 ${filterTab === 'APPROVED'
                                            ? 'bg-[#1F3B8B]/5 text-[#1F3B8B] border-[#1F3B8B]/20 shadow-sm'
                                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                                            }`}
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> ประวัติการอนุมัติแล้ว
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- VIEW 1: LIST --- */}
                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl shadow-sm border ${filterTab === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {filterTab === 'PENDING' ? <AlertCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-slate-900 tracking-wide">
                                        {filterTab === 'PENDING' ? 'รายการคำขอที่รอการดำเนินการ' : 'รายการเอกสารที่ผ่านการอนุมัติแล้ว'}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-sm font-black uppercase text-slate-600 tracking-wider">
                                        <th className="p-6">วันที่ส่งคำขอ</th>
                                        <th className="p-6">เลขที่ใบขอซื้อ (PR)</th>
                                        <th className="p-6">ผู้ขอซื้อ / แผนก</th>
                                        <th className="p-6 text-center">สถานะ</th>
                                        <th className="p-6 text-right">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="5" className="p-24 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                    <p className="text-slate-500 font-black text-sm tracking-wide">กำลังโหลดข้อมูล...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : prList.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-32 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                                    <p className="text-slate-500 font-black text-sm tracking-wide">ไม่มีข้อมูลในหมวดหมู่นี้</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : prList.map((pr) => (
                                        <tr key={pr.id} className="hover:bg-blue-50 transition-colors group">
                                            <td className="p-6 font-bold text-slate-500 text-sm">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="font-black text-[#1e3b8a] uppercase text-base tracking-tight">{pr.prNumber}</span>
                                                    <span className="text-xs font-bold text-slate-600 truncate max-w-[250px]">"{pr.purpose}"</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-black text-slate-800 text-sm block">{pr.user?.firstName} {pr.user?.lastName}</span>
                                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-1"><Building2 className="w-3.5 h-3.5" /> {pr.department?.name || 'General'}</span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${pr.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : pr.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                    {pr.status === 'PENDING' ? 'รออนุมัติ' : pr.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                {filterTab === 'PENDING' ? (
                                                    <button onClick={() => handleSelectPRFromList(pr)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-md shadow-blue-900/10 inline-flex items-center justify-center">
                                                        ตรวจสอบและอนุมัติ
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleViewPDF(pr.pdfPath)}
                                                        disabled={!pr.pdfPath}
                                                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${pr.pdfPath
                                                            ? 'bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white hover:shadow-md active:scale-95'
                                                            : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <FileText className="w-4 h-4" /> {pr.pdfPath ? "ดูเอกสาร PDF" : "ไม่มีเอกสาร"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- VIEW 2: APPROVAL FORM (โหมดกล่องเอกสารเดี่ยวพรีเมียม หัวข้อภาษาไทย สีเข้ม) --- */}
                {viewMode === 'FORM' && selectedPRData && (
                    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 relative">
                        <form className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col">

                            {/* 1. ส่วนหัวเอกสาร (Document Identity) */}
                            <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start gap-6 bg-slate-50/30">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-900 mb-2">
                                        <FileText className="w-5 h-5 text-slate-900" />
                                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">เอกสารใบขออนุมัติจัดซื้อ (PR)</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                                        {selectedPRData.prNumber}
                                    </h2>
                                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> วันที่ส่งคำขอ: {new Date(selectedPRData.createdAt).toLocaleDateString('th-TH')}
                                    </p>
                                </div>
                            </div>

                            {/* 2. รายละเอียดวัตถุประสงค์ (Purpose Section) */}
                            <div className="px-10 py-8 bg-white">
                                <div className="bg-slate-50/80 border border-slate-100 p-6 rounded-[2rem]">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-slate-900" /> วัตถุประสงค์ / โครงการ
                                    </h3>
                                    <p className="text-lg font-black text-slate-900 leading-relaxed">
                                        "{selectedPRData.purpose}"
                                    </p>
                                </div>
                            </div>

                            {/* 3. ตารางรายการสินค้า (Items Table) */}
                            <div className="px-10 py-4 flex-1">
                                <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/80 border-b border-slate-100">
                                            <tr className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                                <th className="px-6 py-4">รายการพัสดุ</th>
                                                <th className="px-6 py-4 text-center">จำนวน</th>
                                                <th className="px-6 py-4 text-right">ราคาต่อหน่วย</th>
                                                <th className="px-6 py-4 text-right">รวม (บาท)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedPRData.items.map((item, index) => (
                                                <tr key={index} className="text-sm font-bold text-slate-700">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-400 mb-0.5">#{item.product?.sku}</span>
                                                            <span className="text-slate-900 font-black">{item.product?.name || "N/A"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center font-black text-base">{item.quantity}</td>
                                                    <td className="px-6 py-5 text-right font-bold text-slate-500">
                                                        {Number(item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-slate-900 text-base">
                                                        {(item.quantity * item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50/30">
                                            <tr>
                                                <td colSpan="3" className="px-6 py-6 text-right text-xs font-black uppercase tracking-widest text-slate-900">
                                                    มูลค่ารวมทั้งสิ้น (Total Amount)
                                                </td>
                                                <td className="px-6 py-6 text-right font-black text-3xl text-slate-950 tracking-tighter">
                                                    ฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* 4. ส่วนการอนุมัติและลายเซ็น (Approval Sign-off) */}
                            <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* หมายเหตุ */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-slate-900" /> ความเห็น/หมายเหตุเพิ่มเติม
                                        </label>
                                        <textarea
                                            className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] p-5 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 min-h-[140px] transition-all"
                                            placeholder="ระบุข้อความถึงฝ่ายจัดซื้อ..."
                                            value={approvalComment}
                                            onChange={(e) => setApprovalComment(e.target.value)}
                                        />
                                    </div>

                                    {/* ลายเซ็น */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <PenTool className="w-4 h-4 text-slate-900" /> ลายเซ็นผู้อนุมัติ (Signature) <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative h-[140px]">
                                            {signatureImage ? (
                                                <div className="w-full h-full border-2 border-dashed border-emerald-300 rounded-[1.5rem] bg-white p-4 flex items-center justify-center relative overflow-hidden group">
                                                    <img src={signatureImage} alt="Signature" className="max-h-full object-contain mix-blend-multiply" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setSignatureImage(null)}
                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-rose-500 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase transition-all shadow-lg"
                                                    >
                                                        ลบทิ้ง
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-full h-full border-2 border-dashed border-slate-300 rounded-[1.5rem] bg-white flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-all group">
                                                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-700 mb-2 transition-colors" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900">อัปโหลดลายเซ็น</span>
                                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ปุ่มดำเนินการ (เปิด Popup แทนการรันคำสั่งโดยตรง) */}
                                <div className="flex flex-col md:flex-row gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsApproveModalOpen(true)}
                                        disabled={isLoading || !signatureImage}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                    >
                                        <CheckCircle2 className="w-5 h-5" /> ยืนยันการอนุมัติและสร้าง PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsRejectModalOpen(true)}
                                        disabled={isLoading}
                                        className="px-10 bg-white border-2 border-rose-100 hover:bg-rose-50 text-rose-600 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                    >
                                        <XCircle className="w-5 h-5" /> ปฏิเสธคำขอ
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* --- POPUP ยืนยันการอนุมัติ --- */}
            {isApproveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 px-4">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4 mb-8">
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">ยืนยันการอนุมัติ</h3>
                                <p className="text-sm font-bold text-slate-500">
                                    คุณต้องการอนุมัติคำขอจัดซื้อนี้และสร้างเอกสาร PDF ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsApproveModalOpen(false)}
                                className="flex-1 px-4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-widest transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleApproveAndGeneratePDF}
                                className="flex-1 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                ยืนยันอนุมัติ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- POPUP ยืนยันปฏิเสธคำขอ --- */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 px-4">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4 mb-8">
                            <div className="p-4 bg-rose-50 text-rose-600 rounded-full">
                                <XCircle className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">ปฏิเสธคำขอ</h3>
                                <p className="text-sm font-bold text-slate-500">
                                    คุณแน่ใจหรือไม่ที่จะปฏิเสธใบคำขอนี้? กรุณาตรวจสอบให้แน่ใจว่าคุณได้กรอกเหตุผลในช่องหมายเหตุแล้ว
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsRejectModalOpen(false)}
                                className="flex-1 px-4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-widest transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleReject}
                                className="flex-1 px-4 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-colors shadow-lg shadow-rose-600/20"
                            >
                                ยืนยันปฏิเสธ
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AuthGate>
    );
}