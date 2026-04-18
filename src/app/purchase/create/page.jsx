"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import { createPortal } from "react-dom";
import {
    ArrowLeft, ShoppingCart, CheckCircle2, Trash2, Building2,
    ClipboardList, Truck, Upload, Package, Clock, Loader2, 
    FileText, AlertCircle, CheckCircle, Lock, User, Calendar, MapPin, Tag, X
} from "lucide-react";

export default function CreatePurchaseOrderPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState('LIST');
    const [filterTab, setFilterTab] = useState('READY');
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // --- Master Data ---
    const [products, setProducts] = useState([]);
    const [approvedPRs, setApprovedPRs] = useState([]);
    const [activePOs, setActivePOs] = useState([]);

    // --- PO Form States ---
    const [selectedPRData, setSelectedPRData] = useState(null);
    const [poNumber, setPoNumber] = useState('');
    const [vendorName, setVendorName] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState([]);
    const [orderStatus, setOrderStatus] = useState('ORDERED');
    const [signatureImage, setSignatureImage] = useState(null);
    const [procurementNote, setProcurementNote] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    
    const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null); // 💡 เก็บ URL PDF เพื่อรอเปิดตอนกดตกลง

    useEffect(() => {
        setIsMounted(true);
        async function loadInitialData() {
            setIsLoading(true);
            try {
                const [pRes, prRes, poRes, wRes] = await Promise.all([
                    apiFetch("/master/products").catch(() => []),
                    apiFetch("/api/purchase/pr?status=APPROVED&unused=true").catch(() => []),
                    apiFetch("/inventory/pos").catch(() => []),
                    apiFetch("/master/warehouses").catch(() => [])
                ]);

                setProducts(pRes || []);
                const validPRs = (prRes || []).filter(pr => pr.pdfPath && pr.pdfPath !== 'PENDING');
                setApprovedPRs(validPRs);
                const signedPOs = (poRes || []).filter(po => po.pdfPath && po.pdfPath !== 'PENDING');
                setActivePOs(signedPOs);
                setWarehouses(Array.isArray(wRes) ? wRes : wRes?.data || []);

            } catch (error) {
                toast.error("ไม่สามารถโหลดข้อมูลระบบจัดซื้อได้");
            } finally {
                setIsLoading(false);
            }
        }
        loadInitialData();
    }, [viewMode, filterTab]);

    useEffect(() => {
        if (successModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [successModal]);

    const handleViewPDF = async (pdfPath) => {
        if (!pdfPath) {
            return toast.error("ไม่พบไฟล์เอกสาร PDF สำหรับรายการนี้");
        }

        setIsLoading(true);
        toast.loading("กำลังเปิดเอกสาร...", { id: "pdf-load" });

        try {
            const backendUrl =
                process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000";

            const token = typeof getAccessToken === "function" ? getAccessToken() : null;
            if (!token) throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่อีกครั้ง");

            const rawPath = String(pdfPath).trim();
            const filename = rawPath.split(/[/\\\\]/).pop();

            if (!filename) {
                throw new Error("ไม่สามารถระบุชื่อไฟล์เอกสารได้");
            }

            const isPO = filename.toUpperCase().startsWith("PO-");
            const route = isPO
                ? `/api/purchase/po/document/${encodeURIComponent(filename)}`
                : `/api/purchase/pr/document/${encodeURIComponent(filename)}`;

            const response = await fetch(`${backendUrl}${route}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                let msg = "คุณไม่มีสิทธิ์เข้าถึง หรือเอกสารสูญหาย";
                try {
                    const err = await response.json();
                    msg = err?.message || msg;
                } catch {}
                throw new Error(msg);
            }

            const blob = await response.blob();
            const fileURL = window.URL.createObjectURL(blob);
            window.open(fileURL, "_blank");
            toast.success("เปิดเอกสารสำเร็จ", { id: "pdf-load" });

            setTimeout(() => {
                window.URL.revokeObjectURL(fileURL);
            }, 60000);
        } catch (error) {
            toast.error(error.message || "เปิดเอกสารไม่สำเร็จ", { id: "pdf-load" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectPRFromList = async (pr) => {
        setIsLoading(true);
        try {
            const prDetail = await apiFetch(`/api/purchase/pr/${pr.id}`);
            if (prDetail && prDetail.items) {
                setSelectedPRData(prDetail);
                setVendorName(prDetail.supplier ? `[${prDetail.supplier.code}] ${prDetail.supplier.name}` : (prDetail.vendorName || ''));
                setSupplierId(prDetail.supplier?.id || '');

                const mappedItems = prDetail.items.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    productSku: item.product?.sku || "-",
                    productName: item.product?.name || "Unknown Product",
                    orderedQuantity: item.quantity,
                    unitPrice: item.estimatedPrice || 0
                }));

                setItems(mappedItems);
                setPoNumber(`PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
                setSignatureImage(null);
                setProcurementNote('');
                setOrderStatus('ORDERED');
                setHasSubmittedForm(false); // Reset form submission state
                setViewMode('FORM');
            }
        } catch (error) {
            toast.error("ไม่สามารถดึงข้อมูลรายละเอียดใบขอซื้อได้");
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setHasSubmittedForm(true);

        // 💡 เช็คความครบถ้วน ถ้าไม่ครบให้หยุดทำงาน เพื่อให้กรอบแดงเด้งเตือน
        if (!vendorName.trim() || !selectedPRData?.deliveryLocation || !signatureImage) {
            toast.error("กรุณาตรวจสอบข้อมูลที่ต้องระบุให้ครบถ้วน");
            return;
        }

        setIsLoading(true);
        try {
            toast.loading("กำลังออกใบสั่งซื้อ และสร้าง PDF...", { id: "submit-po" });
            const payload = {
                poNumber,
                vendorName: vendorName.trim(),
                supplierId: supplierId || null,
                prId: selectedPRData?.id,
                status: orderStatus,
                procurementSignature: signatureImage,
                note: procurementNote,
                deliveryLocation: selectedPRData?.deliveryLocation || 'ไม่ระบุ',
                items: items.map(it => ({
                    productId: it.productId,
                    orderedQuantity: Number(it.orderedQuantity),
                    unitPrice: Number(it.unitPrice)
                }))
            };

            const response = await apiFetch("/api/purchase/po/generate", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            toast.success("บันทึกการสั่งซื้อและออก PDF เรียบร้อย", { id: "submit-po" });
            
            // 💡 บันทึก URL เอกสารไว้ แล้วเปิด Popup สำเร็จ (ยังไม่เปิดหน้าต่างทันที)
            if (response && response.pdfUrl) { 
                setGeneratedPdfUrl(response.pdfUrl); 
            }
            
            setSuccessModal(true);

        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก", { id: "submit-po" });
        } finally {
            setIsLoading(false);
        }
    };

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.orderedQuantity) * Number(item.unitPrice)), 0);
    const activeList = filterTab === 'READY' ? approvedPRs : activePOs;

    // --- Components for Modals ---
    const SuccessPortal = () => {
        if (!isMounted || !successModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center max-w-sm w-full border border-slate-200 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-200">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wider">สร้างใบสั่งซื้อสำเร็จ!</h3>
                    <p className="text-sm font-bold text-slate-500 text-center mb-8">
                        ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว<br/>คลิกตกลงเพื่อเปิดเอกสารและกลับสู่หน้ารายการ
                    </p>

                    <button
                        onClick={() => {
                            setSuccessModal(false);
                            if (generatedPdfUrl) {
                                handleViewPDF(generatedPdfUrl);
                            }
                            setViewMode('LIST');
                            setFilterTab('TRACKING');
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-lg font-bold text-sm uppercase tracking-widest shadow-sm transition-colors active:scale-95"
                    >
                        ตกลง
                    </button>
                </div>
            </div>, document.body
        );
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <SuccessPortal />

            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
                    <div className="flex flex-col gap-4 w-full">
                        {viewMode === 'FORM' && (
                            <button
                                onClick={() => setViewMode('LIST')}
                                className="flex items-center gap-2 w-fit text-base font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
                            </button>
                        )}

                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                                    <ShoppingCart className="w-7 h-7 text-[#1F3B8B]" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                                        {viewMode === 'LIST' ? "ศูนย์กลางการจัดซื้อ" : "ออกใบสั่งซื้อ (PO)"}
                                    </h1>
                                    <p className="text-base text-slate-500 mt-1.5 font-medium flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4" /> Purchasing Management System • ฝ่ายจัดซื้อ: ดำเนินการออกใบสั่งซื้อและติดตามสถานะจาก PR
                                    </p>
                                </div>
                            </div>

                            {viewMode === 'LIST' && (
                                <div className="flex bg-slate-100 p-1.5 rounded-xl w-full xl:w-auto">
                                    <button
                                        onClick={() => setFilterTab("READY")}
                                        className={`flex-1 xl:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                                            filterTab === 'READY'
                                                ? 'bg-white text-amber-600 shadow-sm border border-slate-200/50'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <Clock className="w-4 h-4" /> รายการรอออก PO ({approvedPRs.length})
                                    </button>
                                    <button
                                        onClick={() => setFilterTab("TRACKING")}
                                        className={`flex-1 xl:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                                            filterTab === 'TRACKING'
                                                ? 'bg-white text-[#1F3B8B] shadow-sm border border-slate-200/50'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <Package className="w-4 h-4" /> ประวัติการสั่งซื้อ (PO)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- VIEW 1: LIST --- */}
                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm ${filterTab === 'READY' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {filterTab === 'READY' ? <Clock className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                                </div>
                                <h2 className="text-lg font-bold text-slate-800 tracking-wide uppercase">
                                    {filterTab === 'READY' ? 'รายการใบขอซื้อที่ผ่านการอนุมัติแล้ว' : 'ประวัติการดำเนินการสั่งซื้อพัสดุ'}
                                </h2>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่</th>
                                        <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เลขที่อ้างอิง (PR/PO)</th>
                                        <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ขอซื้อ / ผู้จัดจำหน่าย</th>
                                        <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">กำลังโหลดข้อมูล...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : activeList.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center text-slate-400 font-medium italic">
                                                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                                {filterTab === 'READY' ? 'ไม่มีใบขอซื้อ (PR) ที่รอการดำเนินการ' : 'ยังไม่มีประวัติการสั่งซื้อ (PO)'}
                                            </td>
                                        </tr>
                                    ) : (
                                        activeList.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6 text-sm font-bold text-slate-500 tabular-nums">
                                                    {new Date(item.createdAt).toLocaleDateString('th-TH')}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-sm font-bold text-[#1e3b8a] uppercase tracking-tight">
                                                        {item.poNumber || item.prNumber}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800 uppercase">
                                                            {item.vendorName || `${item.user?.firstName} ${item.user?.lastName}`}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                                            {item.department?.name || 'External Vendor'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center justify-center gap-1.5 w-fit mx-auto ${
                                                        item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        item.status === 'ORDERED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        item.status === 'SHIPPED' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                        {item.status === 'APPROVED' ? 'รอออก PO' : item.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {filterTab === 'READY' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleViewPDF(item.pdfPath, 'PR')}
                                                                    className="bg-white text-emerald-600 border border-emerald-200 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-50 transition-colors flex items-center gap-2 shadow-sm"
                                                                >
                                                                    <FileText className="w-4 h-4" /> ดู PR
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSelectPRFromList(item)}
                                                                    className="bg-white text-[#1F3B8B] border border-slate-200 hover:bg-[#1F3B8B] hover:text-white hover:border-[#1F3B8B] px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 inline-flex items-center justify-center"
                                                                >
                                                                    สร้างใบ PO
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleViewPDF(item.pdfPath, 'PO')}
                                                                disabled={!item.pdfPath}
                                                                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
                                                                    item.pdfPath
                                                                        ? 'bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white active:scale-95'
                                                                        : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                <FileText className="w-4 h-4" /> ดูเอกสาร PO
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- VIEW 2: APPROVAL FORM --- */}
                {viewMode === 'FORM' && selectedPRData && (
                    <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">

                        {/* 1. Header Document */}
                        <div className="p-8 md:p-10 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-6">
                            <div className="space-y-2">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">อ้างอิงใบขอซื้อ (Source PR):</span>
                                <h2 className="text-3xl md:text-4xl font-black text-[#1F3B8B] tabular-nums whitespace-nowrap">
                                    {selectedPRData?.prNumber}
                                </h2>
                            </div>
                            <div className="flex flex-col items-start md:items-end justify-center">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1.5">วันที่ส่งคำขอ:</span>
                                <p className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-500" /> {new Date(selectedPRData.createdAt).toLocaleDateString('th-TH')}
                                </p>
                            </div>
                        </div>

                        {/* 2. PR Information & Vendor Input */}
                        <div className="p-8 md:p-10 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-8">ข้อมูลพื้นฐานจากใบขอซื้อ (PR Information)</h2>
                            
                            {/* Basic Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-10">
                                <div className="flex flex-col justify-center space-y-2">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">ผู้ขอซื้อ</span>
                                    <span className="text-lg md:text-xl font-bold text-slate-900">{selectedPRData?.user?.firstName} {selectedPRData?.user?.lastName}</span>
                                </div>
                                <div className="flex flex-col justify-center space-y-2">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">แผนก</span>
                                    <span className="text-lg md:text-xl font-bold text-slate-900">{selectedPRData?.department?.name || '-'}</span>
                                </div>
                                <div className="flex flex-col justify-center space-y-2">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">ผู้อนุมัติสั่งซื้อ</span>
                                    <span className="text-lg md:text-xl font-bold text-slate-900">{selectedPRData?.approver ? `${selectedPRData.approver.firstName} ${selectedPRData.approver.lastName}` : (selectedPRData?.status === 'APPROVED' ? 'ผู้บริหาร (อนุมัติแล้ว)' : '-')}</span>
                                </div>
                            </div>

                            {/* Purpose and Remarks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">วัตถุประสงค์ / โครงการ</span>
                                        {selectedPRData?.referenceNo && <span className="text-xs font-bold text-[#1F3B8B] tracking-wider uppercase">REF: {selectedPRData.referenceNo}</span>}
                                    </div>
                                    <p className="text-base text-slate-800 font-semibold leading-relaxed p-6 bg-slate-50 rounded-xl border border-slate-100 italic">"{selectedPRData?.purpose || '-'}"</p>
                                </div>
                                <div className="space-y-4">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">หมายเหตุจากผู้ขอซื้อ</span>
                                    <p className="text-base text-slate-800 font-semibold leading-relaxed p-6 bg-slate-50 rounded-xl border border-slate-100 italic">"{selectedPRData?.remarks || 'ไม่มีการระบุหมายเหตุ'}"</p>
                                </div>
                            </div>
                            
                            {/* Inputs: Vendor & Delivery Location */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-200">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                        ระบุผู้จัดจำหน่าย (Vendor Name) <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={vendorName} 
                                        onChange={(e) => setVendorName(e.target.value)} 
                                        className={`w-full border rounded-lg p-3.5 text-base font-bold outline-none transition-all ${
                                            hasSubmittedForm && !vendorName.trim()
                                                ? 'border-rose-400 bg-rose-50 text-rose-900 placeholder-rose-300'
                                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 placeholder:text-slate-400'
                                        }`}
                                        placeholder="ชื่อบริษัทคู่ค้าที่จะสั่งซื้อ..." 
                                    />
                                    {hasSubmittedForm && !vendorName.trim() && (
                                        <span className="text-[11px] font-bold text-rose-500 mt-1.5 block">กรุณาระบุชื่อผู้จัดจำหน่าย</span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                        สถานที่ส่งมอบ (Delivery Location) <span className="text-rose-500">*</span>
                                    </label>
                                    <select 
                                        value={selectedPRData?.deliveryLocation || ''} 
                                        onChange={(e) => setSelectedPRData({...selectedPRData, deliveryLocation: e.target.value})} 
                                        className={`w-full border rounded-lg p-3.5 text-base font-bold outline-none transition-all ${
                                            hasSubmittedForm && !selectedPRData?.deliveryLocation
                                                ? 'border-rose-400 bg-rose-50 text-rose-900'
                                                : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10'
                                        }`}
                                    >
                                        <option value="">-- เลือกคลังสินค้าที่ต้องการให้ส่งของ --</option>
                                        {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                                        <option value="อื่นๆ (ระบุในหมายเหตุ)">อื่นๆ (ระบุในหมายเหตุ)</option>
                                    </select>
                                    {hasSubmittedForm && !selectedPRData?.deliveryLocation && (
                                        <span className="text-[11px] font-bold text-rose-500 mt-1.5 block">กรุณาเลือกสถานที่ส่งมอบ</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Items Table */}
                        <div className="px-8 md:px-10 py-8 md:py-10 border-b border-slate-200">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">รายการพัสดุและราคาที่สั่งซื้อ</h3>
                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                                    <Lock className="w-3.5 h-3.5" /> ข้อมูลล็อกตามใบ PR
                                </span>
                            </div>
                            
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200 text-sm font-bold uppercase text-slate-600">
                                            <th className="p-5 text-left">รายการพัสดุ (Product)</th>
                                            <th className="p-5 text-center w-32">จำนวนสั่ง</th>
                                            <th className="p-5 text-right w-48">ราคา/หน่วย</th>
                                            <th className="p-5 text-right w-48">รวม (บาท)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map(item => (
                                            <tr key={item.id} className="text-base hover:bg-slate-50/50 transition-colors">
                                                <td className="p-5">
                                                    <p className="font-bold text-slate-900 text-lg">{item.productName}</p>
                                                    <p className="text-sm text-blue-600 font-bold uppercase mt-1">SKU: {item.productSku}</p>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className="px-4 py-1.5 bg-slate-100 rounded-md font-bold text-[#1F3B8B] text-lg">{item.orderedQuantity}</span>
                                                </td>
                                                <td className="p-5 text-right tabular-nums font-semibold text-slate-700 text-lg">
                                                    ฿{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-5 text-right tabular-nums font-bold text-slate-900 text-lg">
                                                    ฿{(item.orderedQuantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 4. Execution Area */}
                        <div className="p-8 md:p-10 bg-slate-50/30">
                            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-8">ดำเนินการออกใบสั่งซื้อ (PO Finalize)</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 mb-10">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">สถานะเริ่มต้นของ PO</label>
                                    <select 
                                        value={orderStatus} 
                                        onChange={e => setOrderStatus(e.target.value)} 
                                        className="w-full border rounded-lg p-3.5 text-base font-bold outline-none transition-all border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                                    >
                                        <option value="ORDERED">ORDERED (สั่งซื้อแล้ว รอจัดส่ง)</option>
                                        <option value="SHIPPED">SHIPPED (กำลังจัดส่ง)</option>
                                        <option value="URGENT">URGENT (รายการเร่งด่วน)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">บันทึกถึงผู้จำหน่าย (Note)</label>
                                    <textarea 
                                        value={procurementNote} 
                                        onChange={e => setProcurementNote(e.target.value)} 
                                        placeholder="ระบุรายละเอียดการจัดส่งหรือเงื่อนไขเพิ่มเติม..." 
                                        className="w-full border rounded-lg p-3.5 text-base font-medium outline-none transition-all border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 min-h-[140px] placeholder:text-slate-400" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">ลายเซ็นจัดซื้อ <span className="text-rose-500">*</span></label>
                                    <div className="relative h-[140px]">
                                        {signatureImage ? (
                                            <div className="w-full h-full border-2 border-dashed border-emerald-400 rounded-xl bg-white p-4 flex items-center justify-center relative overflow-hidden group shadow-sm">
                                                <img src={signatureImage} alt="Signature" className="max-h-full object-contain mix-blend-multiply" />
                                                <button type="button" onClick={() => setSignatureImage(null)} className="absolute top-3 right-3 text-white bg-rose-500 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all opacity-0 group-hover:opacity-100 shadow-md hover:bg-rose-600">ลบทิ้ง</button>
                                            </div>
                                        ) : (
                                            <label className={`w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group shadow-sm ${
                                                hasSubmittedForm && !signatureImage 
                                                    ? 'border-rose-400 bg-rose-50 hover:bg-rose-100 hover:border-rose-500' 
                                                    : 'border-slate-300 bg-slate-50 hover:border-[#1F3B8B] hover:bg-[#1F3B8B]/5'
                                            }`}>
                                                <Upload className={`w-8 h-8 mb-3 transition-colors ${hasSubmittedForm && !signatureImage ? 'text-rose-400 group-hover:text-rose-500' : 'text-slate-300 group-hover:text-[#1F3B8B]'}`} />
                                                <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${hasSubmittedForm && !signatureImage ? 'text-rose-500 group-hover:text-rose-600' : 'text-slate-500 group-hover:text-[#1F3B8B]'}`}>
                                                    อัปโหลดลายเซ็น
                                                </span>
                                                <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                    {hasSubmittedForm && !signatureImage && (
                                        <span className="text-[11px] font-bold text-rose-500 mt-1.5 block text-center">กรุณาลงนามกำกับใบสั่งซื้อก่อนดำเนินการ</span>
                                    )}
                                </div>
                            </div>

                            {/* Footer Submit */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-200">
                                <div className="flex flex-col items-center md:items-start text-center md:text-left w-full md:w-auto">
                                    <p className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-1">ยอดรวมมูลค่าการสั่งซื้อทั้งหมด (Grand Total)</p>
                                    <p className="text-4xl font-black text-emerald-600 tabular-nums">
                                        ฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full md:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> ยืนยันการสั่งซื้อและออก PO</>}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </AuthGate>
    );
}