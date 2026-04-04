"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    FileSignature, Database, ArrowLeft,
    CheckCircle2, ShieldCheck, Building2,
    ClipboardList, MessageSquare, AlertCircle, Upload, PenTool, FileText, Clock, XCircle, Package
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
        e.preventDefault();

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
        e.preventDefault();
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

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider mb-2">
                            <ShieldCheck className="w-4 h-4" /> ระบบพิจารณาอนุมัติสำหรับผู้บริหาร
                        </div>
                        <h1 className="text-5xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                            {viewMode === 'LIST' ? "อนุมัติใบขอซื้อ (PR)" : "พิจารณาอนุมัติเอกสาร"}
                        </h1>
                        <p className="text-slate-600 text-base font-bold flex items-center gap-2 mt-2">
                            <FileSignature className="w-5 h-5 text-slate-400" />
                            ระบบตรวจสอบและอนุมัติการจัดซื้อ (Purchase Requisition Approval)
                        </p>
                    </div>

                    {viewMode === 'FORM' ? (
                        <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-sm">
                            <ArrowLeft className="w-5 h-5" /> ย้อนกลับไปหน้ารายการ
                        </button>
                    ) : (
                        <div className="flex bg-white p-1.5 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto w-full md:w-auto">
                            <button onClick={() => setFilterTab("PENDING")} className={`px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none ${filterTab === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <Clock className="w-4 h-4" /> รอพิจารณาอนุมัติ
                            </button>
                            <button onClick={() => setFilterTab("APPROVED")} className={`px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none ${filterTab === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <CheckCircle2 className="w-4 h-4" /> ประวัติการอนุมัติแล้ว
                            </button>
                        </div>
                    )}
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
                                    {/* เปลี่ยนจาก text-xs เป็น text-sm */}
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
                                                <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-500 font-black text-sm tracking-wide">ไม่มีข้อมูลในหมวดหมู่นี้</p>
                                            </td>
                                        </tr>
                                    ) : prList.map((pr) => (
                                        <tr key={pr.id} className="hover:bg-blue-50 transition-colors group">
                                            <td className="p-6 font-bold text-slate-500 text-sm">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="tabular-nums font-black text-[#1e3b8a] uppercase text-base tracking-tight">{pr.prNumber}</span>
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

                {/* --- VIEW 2: APPROVAL FORM --- */}
                {viewMode === 'FORM' && selectedPRData && (
                    <form className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* 📝 ฝั่งซ้าย: ข้อมูลรายละเอียด PR */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Document Header Info */}
                            <div className="bg-slate-950 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row gap-6 md:gap-10 relative overflow-hidden border border-slate-800">
                                <div className="absolute right-0 bottom-0 opacity-10">
                                    <Database className="w-64 h-64 text-indigo-400" />
                                </div>
                                <div className="relative z-10 w-full md:w-auto">
                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">เลขที่ใบขอซื้อ (PR Number)</p>
                                    <p className="font-mono font-black text-3xl md:text-4xl tracking-tight">{selectedPRData.prNumber}</p>
                                </div>
                                <div className="hidden md:block w-px bg-white/20 relative z-10"></div>
                                <div className="relative z-10 flex-1">
                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">วัตถุประสงค์ / โครงการ</p>
                                    <p className="font-bold text-sm md:text-base text-emerald-400 leading-relaxed">"{selectedPRData.purpose}"</p>
                                </div>
                            </div>

                            {/* Item List Table */}
                            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                    <div className="p-2 bg-sky-100 rounded-lg"><Package className="w-5 h-5 text-sky-600" /></div>
                                    รายการพัสดุที่ต้องการขอซื้อ
                                </h2>
                                <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase border-b border-slate-200">
                                            <tr>
                                                <th className="p-6">รายการสินค้า (Product)</th>
                                                <th className="p-6 text-center">จำนวน</th>
                                                <th className="p-6 text-right">ราคาประเมิน</th>
                                                <th className="p-6 text-right text-indigo-600">มูลค่ารวม</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedPRData.items.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-6">
                                                        <p className="font-black text-slate-800 text-sm flex items-center gap-2">
                                                            <span className="text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-md text-[10px] border border-slate-200">[{item.product?.sku}]</span>
                                                            {item.product?.name || "N/A"}
                                                        </p>
                                                    </td>
                                                    <td className="p-6 text-center font-black text-lg text-slate-700">{item.quantity}</td>
                                                    <td className="p-6 text-right font-mono font-bold text-slate-500 text-sm">฿{Number(item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td className="p-6 text-right font-black font-mono text-indigo-600 text-base">฿{(item.quantity * item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ✍️ ฝั่งขวา: เครื่องมือการอนุมัติ (Sticky Sidebar) */}
                        <div className="lg:col-span-4">
                            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-lg sticky top-8 space-y-8 relative overflow-hidden">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                    <div className="p-2 bg-emerald-100 rounded-lg"><FileSignature className="w-5 h-5 text-emerald-600" /></div>
                                    ดำเนินการพิจารณา
                                </h3>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <PenTool className="w-4 h-4 text-indigo-500" /> ลายเซ็นอิเล็กทรอนิกส์ (จำเป็น) <span className="text-rose-500">*</span>
                                    </label>
                                    {signatureImage ? (
                                        <div className="relative border-2 border-dashed border-emerald-300 rounded-[2rem] p-6 flex flex-col items-center bg-emerald-50/50 transition-all">
                                            <img src={signatureImage} alt="Signature" className="max-h-28 object-contain mix-blend-multiply" />
                                            <button type="button" onClick={() => setSignatureImage(null)} className="absolute top-3 right-3 text-rose-600 hover:bg-rose-100 bg-white border border-rose-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm transition-colors">ลบลายเซ็น</button>
                                        </div>
                                    ) : (
                                        <label className="border-2 border-dashed border-slate-300 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors group">
                                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-3 transition-colors" />
                                            <span className="text-xs font-black text-slate-500 uppercase group-hover:text-indigo-700 transition-colors">อัปโหลดรูปลายเซ็น</span>
                                            <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-sky-500" /> หมายเหตุ (คำสั่งเพิ่มเติม)
                                    </label>
                                    <textarea
                                        className="w-full border-2 border-slate-200 bg-white rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-50 min-h-[120px] transition-all"
                                        placeholder="ระบุข้อความหรือเงื่อนไขถึงฝ่ายจัดซื้อ (ถ้ามี)..."
                                        value={approvalComment}
                                        onChange={(e) => setApprovalComment(e.target.value)}
                                    />
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-xs uppercase font-black text-slate-500 tracking-widest mb-1">มูลค่าประเมินรวมทั้งสิ้น</p>
                                    <p className="text-4xl font-black text-slate-950 font-mono mb-8 tracking-tighter">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>

                                    <div className="space-y-3">
                                        <button
                                            onClick={handleApproveAndGeneratePDF}
                                            disabled={isLoading || !signatureImage}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-5 h-5" /> อนุมัติและสร้างเอกสาร PDF
                                        </button>
                                        <button
                                            onClick={handleReject}
                                            disabled={isLoading}
                                            className="w-full bg-white border-2 border-rose-200 hover:bg-rose-50 text-rose-600 py-5 rounded-[2rem] font-black text-sm uppercase tracking-wider shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-5 h-5" /> ไม่อนุมัติ (ปฏิเสธคำขอ)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </AuthGate>
    );
}