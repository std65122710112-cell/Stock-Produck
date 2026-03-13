"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    FileSignature, Database, ArrowLeft,
    CheckCircle2, ShieldCheck, Building2,
    ClipboardList, MessageSquare, AlertCircle, Upload, PenTool, FileText, Clock, XCircle
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
            <div className="max-w-[1400px] mx-auto space-y-8 p-4 md:p-8 min-h-screen bg-slate-50/50">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                            <ShieldCheck className="w-3 h-3" /> Executive Direct Action
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            {viewMode === 'LIST' ? "PR Approval Center" : "Authorize Request"}
                        </h1>
                    </div>
                    {viewMode === 'FORM' ? (
                        <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-rose-600 shadow-sm transition-all">
                            <ArrowLeft className="w-4 h-4" /> Cancel & Return
                        </button>
                    ) : (
                        <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm border border-slate-200 overflow-x-auto">
                            <button onClick={() => setFilterTab("PENDING")} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filterTab === 'PENDING' ? 'bg-amber-100 text-amber-700 shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                <Clock className="w-3.5 h-3.5" /> รอพิจารณา
                            </button>
                            <button onClick={() => setFilterTab("APPROVED")} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filterTab === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> ประวัติการอนุมัติ
                            </button>
                        </div>
                    )}
                </div>

                {/* --- VIEW 1: LIST --- */}
                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl shadow-sm ${filterTab === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {filterTab === 'PENDING' ? <AlertCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">
                                        {filterTab === 'PENDING' ? 'Action Required' : 'Approved Requests'}
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                        {filterTab === 'PENDING' ? 'รายการใบขอซื้อที่รอการอนุมัติ' : 'เอกสารใบขอซื้อ (PR) ที่อนุมัติแล้ว'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">
                                        <th className="p-6">Date</th>
                                        <th className="p-6">PR Reference</th>
                                        <th className="p-6">Requester</th>
                                        <th className="p-6 text-center">Status</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        <tr><td colSpan="5" className="p-24 text-center text-slate-300 font-black uppercase tracking-[0.3em]">Loading Data...</td></tr>
                                    ) : prList.length === 0 ? (
                                        <tr><td colSpan="5" className="p-32 text-center text-slate-400 font-black uppercase tracking-widest text-xs italic">ไม่มีข้อมูลในหมวดหมู่นี้</td></tr>
                                    ) : prList.map((pr) => (
                                        <tr key={pr.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-6 font-bold text-slate-400 text-xs">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-mono font-black text-indigo-600 uppercase text-sm tracking-tighter">{pr.prNumber}</span>
                                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">{pr.purpose}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-black text-slate-700 uppercase text-xs tracking-tight block">{pr.user?.firstName} {pr.user?.lastName}</span>
                                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {pr.department?.name || 'General'}</span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${pr.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : pr.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {pr.status}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                {filterTab === 'PENDING' ? (
                                                    <button onClick={() => handleSelectPRFromList(pr)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-sm">
                                                        Review & Approve
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleViewPDF(pr.pdfPath)}
                                                        disabled={!pr.pdfPath}
                                                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ml-auto ${pr.pdfPath ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100 shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> {pr.pdfPath ? "ดูเอกสาร PR" : "ไม่มีเอกสาร"}
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
                    <form className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl flex flex-wrap gap-10 relative overflow-hidden border border-slate-800">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">PR Document</p>
                                    <p className="font-mono font-black text-2xl tracking-tighter">{selectedPRData.prNumber}</p>
                                </div>
                                <div className="relative z-10 border-l border-white/10 pl-10 flex-1">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Project / Purpose</p>
                                    <p className="font-bold text-sm text-emerald-400">{selectedPRData.purpose}</p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-indigo-500" /> Requested Items
                                </h2>
                                <div className="overflow-hidden border border-slate-100 rounded-[2rem]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                                            <tr>
                                                <th className="p-5">Product Name</th>
                                                <th className="p-5 text-center">Quantity</th>
                                                <th className="p-5 text-right">Est. Price</th>
                                                <th className="p-5 text-right">Total Est.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedPRData.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="p-4 font-bold text-slate-700">{item.product?.name || "N/A"}</td>
                                                    <td className="p-4 text-center font-black">{item.quantity}</td>
                                                    <td className="p-4 text-right font-mono">฿{Number(item.estimatedPrice).toLocaleString()}</td>
                                                    <td className="p-4 text-right font-black text-indigo-600">฿{(item.quantity * item.estimatedPrice).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white border-2 border-indigo-50 p-8 rounded-[3rem] shadow-xl sticky top-6 space-y-8">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                                    <FileSignature className="w-4 h-4 text-indigo-600" /> Executive Authorization
                                </h3>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <PenTool className="w-3 h-3" /> E-Signature (Required)
                                    </label>
                                    {signatureImage ? (
                                        <div className="relative border-2 border-dashed border-emerald-300 rounded-3xl p-4 flex flex-col items-center bg-emerald-50/30">
                                            <img src={signatureImage} alt="Signature" className="max-h-24 object-contain mix-blend-multiply" />
                                            <button type="button" onClick={() => setSignatureImage(null)} className="absolute top-2 right-2 text-rose-500 text-[10px] font-black uppercase bg-white px-2 py-1 rounded-lg shadow-sm">Clear</button>
                                        </div>
                                    ) : (
                                        <label className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                                            <Upload className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 mb-2" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Upload Signature</span>
                                            <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <MessageSquare className="w-3 h-3" /> Approval Note
                                    </label>
                                    <textarea
                                        className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 text-xs font-bold outline-none focus:border-indigo-500 min-h-[100px]"
                                        placeholder="ระบุข้อความถึงฝ่ายจัดซื้อ..."
                                        value={approvalComment}
                                        onChange={(e) => setApprovalComment(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-50">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Total Estimated Value</p>
                                    <p className="text-4xl font-black text-emerald-600 font-mono mb-6">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>

                                    <div className="space-y-3">
                                        <button
                                            onClick={handleApproveAndGeneratePDF}
                                            disabled={isLoading || !signatureImage}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Sign, Approve & Issue PR
                                        </button>
                                        <button
                                            onClick={handleReject}
                                            disabled={isLoading}
                                            className="w-full bg-white border-2 border-rose-100 hover:bg-rose-50 text-rose-600 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> Reject Request
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