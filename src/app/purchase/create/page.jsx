"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import {
    FileSignature, Database, ArrowLeft, ShoppingCart,
    Hash, CheckCircle2, ShieldCheck, Trash2, Building2,
    ClipboardList, Truck, PenTool, Upload, Package,
    Clock, Loader2, MessageSquare, FileText, AlertCircle, CheckCircle, Lock,
    User, Calendar, MapPin, Tag
} from "lucide-react";

export default function CreatePurchaseOrderPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState('LIST');
    const [filterTab, setFilterTab] = useState('READY');
    const [isLoading, setIsLoading] = useState(false);

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

    useEffect(() => {
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

    const handleViewPDF = async (pdfPath, type = 'PO') => {
        if (!pdfPath || pdfPath === 'PENDING') return toast.error("ไม่พบไฟล์เอกสาร PDF");

        setIsLoading(true);
        toast.loading(`กำลังเปิดเอกสาร ${type}...`, { id: "pdf-load" });

        try {
            const filename = pdfPath.split('/').pop();
            const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

            const url = type === 'PR'
                ? `${backendUrl}/api/purchase/pr/document/${filename}`
                : `${backendUrl}/api/purchase/po/document/${filename}`;

            const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
            if (!token) throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");

            const response = await fetch(url, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("คุณไม่มีสิทธิ์เข้าถึง หรือเอกสารสูญหาย");

            const blob = await response.blob();
            const fileURL = window.URL.createObjectURL(blob);
            window.open(fileURL, '_blank');
            toast.success("เปิดสำเร็จ", { id: "pdf-load" });

            setTimeout(() => { window.URL.revokeObjectURL(fileURL); }, 60000);
        } catch (error) {
            toast.error(error.message, { id: "pdf-load" });
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
        if (!signatureImage) return toast.error("กรุณาลงนามกำกับใบสั่งซื้อก่อนดำเนินการ");
        if (!vendorName.trim()) return toast.error("กรุณาระบุชื่อผู้จัดจำหน่าย");

        setIsLoading(true);
        try {
            toast.loading("กำลังออกใบสั่งซื้อ และสร้าง PDF...", { id: "submit-po" });
            const payload = {
                poNumber,
                vendorName,
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
            if (response && response.pdfUrl) { handleViewPDF(response.pdfUrl, 'PO'); }
            setTimeout(() => {
                setViewMode('LIST');
                setFilterTab('TRACKING');
            }, 1000);
        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก", { id: "submit-po" });
        } finally {
            setIsLoading(false);
        }
    };

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.orderedQuantity) * Number(item.unitPrice)), 0);
    const activeList = filterTab === 'READY' ? approvedPRs : activePOs;

    return (
        <AuthGate>
            <Toaster position="top-right" />
            {/* 💡 ขยายความกว้างสูงสุดเป็น max-w-[1440px] เพื่อให้ฟอร์มกว้างขึ้น */}
            <div className="max-w-[1440px] mx-auto space-y-8 py-8 px-4 md:px-10 animate-in fade-in duration-500">

                {/* HEADER SECTION */}
                <div className="w-full pt-10 mb-6 print:hidden">
                    <div className="w-full px-6 md:px-10 flex flex-col gap-6">

                        {/* 💡 แถวบน: ปุ่มย้อนกลับ (ย้ายมาไว้บนซ้ายตามคอนเซปต์ แสดงเฉพาะโหมด FORM) */}
                        {viewMode === 'FORM' && (
                            <div>
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="group flex items-center gap-3 bg-white border-2 border-slate-200 text-slate-600 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm w-fit"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                    ย้อนกลับ
                                </button>
                            </div>
                        )}

                        {/* แถวล่าง: ส่วนเนื้อหา Header และ Tab ตัวกรอง */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                    <ShoppingCart className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <ClipboardList className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                            Purchasing Management System
                                        </p>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                        {viewMode === 'LIST' ? "ศูนย์กลางการจัดซื้อ" : "ออกใบสั่งซื้อ (PO)"}
                                    </h1>
                                    <div className="flex items-center gap-2 pt-1 opacity-90">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                            ฝ่ายจัดซื้อ: ดำเนินการออกใบสั่งซื้อและติดตามสถานะจาก PR
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* แสดง Tab ตัวกรองเฉพาะหน้า LIST */}
                            {viewMode === 'LIST' && (
                                <div className="flex bg-white p-2 rounded-[2.5rem] shadow-sm border-2 border-slate-100 overflow-x-auto w-full md:w-auto">
                                    <button
                                        onClick={() => setFilterTab("READY")}
                                        className={`px-8 py-3.5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 whitespace-nowrap flex-1 md:flex-none border-2 ${filterTab === 'READY'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Clock className="w-5 h-5" /> รายการรอออก PO ({approvedPRs.length})
                                    </button>
                                    <button
                                        onClick={() => setFilterTab("TRACKING")}
                                        className={`px-8 py-3.5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 whitespace-nowrap flex-1 md:flex-none border-2 ${filterTab === 'TRACKING'
                                            ? 'bg-[#1F3B8B]/5 text-[#1F3B8B] border-[#1F3B8B]/20 shadow-sm'
                                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Package className="w-5 h-5" /> ประวัติการสั่งซื้อ (PO)
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
                            <h2 className="text-sm font-black text-slate-900 tracking-wide flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${filterTab === 'READY' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {filterTab === 'READY' ? <Clock className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                                </div>
                                {filterTab === 'READY' ? 'รายการใบขอซื้อที่ผ่านการอนุมัติแล้ว' : 'ประวัติการดำเนินการสั่งซื้อพัสดุ'}
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr className="text-sm font-black uppercase text-slate-500 tracking-wider">
                                        <th className="p-6">วันที่</th>
                                        <th className="p-6">เลขที่อ้างอิง (PR/PO)</th>
                                        <th className="p-6">ผู้ขอซื้อ / ผู้จัดจำหน่าย</th>
                                        <th className="p-6 text-center">สถานะ</th>
                                        <th className="p-6 text-right">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                    {isLoading ? (
                                        <tr><td colSpan="5" className="p-24 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500" /></td></tr>
                                    ) : activeList.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-32 text-center">
                                                <AlertCircle className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-500 font-black text-sm tracking-wide">
                                                    {filterTab === 'READY' ? 'ไม่มีใบขอซื้อ (PR) ที่รอการดำเนินการ' : 'ยังไม่มีประวัติการสั่งซื้อ (PO)'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : activeList.map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-50 transition-colors group">
                                            <td className="p-6 font-bold text-slate-500 text-sm">{new Date(item.createdAt).toLocaleDateString('th-TH')}</td>
                                            <td className="p-6 tabular-nums font-black text-[#1e3b8a] text-base tracking-tight">{item.poNumber || item.prNumber}</td>
                                            <td className="p-6">
                                                <p className="font-black text-slate-800 text-sm uppercase">{item.vendorName || `${item.user?.firstName} ${item.user?.lastName}`}</p>
                                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-1">
                                                    <Building2 className="w-3.5 h-3.5" /> {item.department?.name || 'External Vendor'}
                                                </p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                    item.status === 'ORDERED' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                        item.status === 'SHIPPED' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                            'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                    {item.status === 'APPROVED' ? 'รอออก PO' : item.status}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {filterTab === 'READY' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleViewPDF(item.pdfPath, 'PR')}
                                                                className="bg-white text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-50 transition-colors flex items-center gap-2"
                                                            >
                                                                <FileText className="w-4 h-4" /> ดู PR
                                                            </button>
                                                            <button
                                                                onClick={() => handleSelectPRFromList(item)}
                                                                className="bg-white text-[#1F3B8B] border-2 border-slate-200 hover:bg-[#1F3B8B] hover:text-white hover:border-[#1F3B8B] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-95 inline-flex items-center justify-center"
                                                            >
                                                                สร้างใบ PO
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleViewPDF(item.pdfPath, 'PO')}
                                                            disabled={!item.pdfPath}
                                                            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${item.pdfPath
                                                                ? 'bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white hover:shadow-md active:scale-95'
                                                                : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            <FileText className="w-4 h-4" /> ดูเอกสาร PO
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
{/* --- VIEW 2: APPROVAL FORM --- */}
                {viewMode === 'FORM' && (
                    <div className="w-full max-w-[1440px] mx-auto animate-in slide-in-from-bottom-4 duration-500 relative">
                        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-200 overflow-hidden flex flex-col">

                            {/* 1. ส่วนหัวเอกสารและผู้จัดจำหน่าย (โทนสว่าง) */}
                            <div className="p-8 md:p-10 border-b-2 border-slate-100 border-dashed flex flex-col md:flex-row justify-between items-start gap-8 bg-white">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                                        <ShoppingCart className="w-6 h-6" />
                                        <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">อ้างอิงใบขอซื้อ (Source PR)</span>
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-black text-[#1F3B8B] tracking-tighter tabular-nums">
                                        {selectedPRData?.prNumber}
                                    </h2>
                                </div>

                                <div className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-6 flex flex-col w-full md:max-w-md shadow-sm">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-emerald-600" /> ระบุผู้จัดจำหน่าย (Vendor Name) *
                                    </label>
                                    <input
                                        type="text"
                                        className="bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-black uppercase text-slate-900 w-full outline-none focus:border-[#1F3B8B] transition-all placeholder:text-slate-400 shadow-sm"
                                        placeholder="ชื่อบริษัทคู่ค้าที่จะสั่งซื้อ..."
                                        value={vendorName}
                                        onChange={(e) => setVendorName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* 2. รายละเอียด PR (PR Details - โทนเดียวกับด้านบน) */}
                            <div className="px-8 md:px-10 py-8 bg-white flex flex-col gap-8 border-b-2 border-slate-100">
                                <h2 className="text-sm font-black text-[#1F3B8B] uppercase tracking-wider flex items-center gap-2.5">
                                    <div className="p-2 bg-slate-100 rounded-lg"><FileText className="w-5 h-5 text-[#1F3B8B]" /></div>
                                    ข้อมูลพื้นฐานจากใบขอซื้อ (PR Information)
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2.5">
                                            <User className="w-5 h-5 text-blue-500" /> ผู้ขอซื้อ
                                        </h3>
                                        <p className="text-base font-black text-slate-900">{selectedPRData?.user?.firstName} {selectedPRData?.user?.lastName}</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2.5">
                                            <Building2 className="w-5 h-5 text-fuchsia-500" /> แผนก
                                        </h3>
                                        <p className="text-base font-black text-slate-900">{selectedPRData?.department?.name || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2.5">
                                            <Calendar className="w-5 h-5 text-orange-500" /> วันที่ขอเบิก
                                        </h3>
                                        <p className="text-base font-black text-slate-900 tabular-nums">{selectedPRData ? new Date(selectedPRData.createdAt).toLocaleDateString('th-TH') : '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2.5">
                                            <ShieldCheck className="w-5 h-5 text-emerald-600" /> ผู้อนุมัติสั่งซื้อ
                                        </h3>
                                        <p className="text-base font-black text-slate-900">
                                            {selectedPRData?.approver?.firstName
                                                ? `${selectedPRData.approver.firstName} ${selectedPRData.approver.lastName}`
                                                : (selectedPRData?.status === 'APPROVED' ? 'ผู้บริหาร (อนุมัติแล้ว)' : '-')}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-100 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2.5">
                                            <MapPin className="w-5 h-5 text-rose-500" /> สถานที่ส่งมอบ (Delivery Location) *
                                        </h3>
                                        <select
                                            value={selectedPRData?.deliveryLocation || ''}
                                            onChange={(e) => {
                                                setSelectedPRData({ ...selectedPRData, deliveryLocation: e.target.value });
                                            }}
                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-sm font-black text-slate-900 outline-none focus:border-[#1F3B8B] transition-all cursor-pointer"
                                            required
                                        >
                                            <option value="">-- เลือกคลังสินค้าที่ต้องการให้ส่งของ --</option>
                                            {warehouses.map(wh => (
                                                <option key={wh.id} value={wh.name}>{wh.name}</option>
                                            ))}
                                            <option value="อื่นๆ (ระบุในหมายเหตุ)">อื่นๆ (ระบุในหมายเหตุ)</option>
                                        </select>
                                    </div>

                                    <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                <Tag className="w-5 h-5 text-indigo-500" /> วัตถุประสงค์ / โครงการ
                                            </h3>
                                            {selectedPRData?.referenceNo && <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase border border-slate-200">Ref: {selectedPRData.referenceNo}</span>}
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{selectedPRData?.purpose || '-'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2.5"><MessageSquare className="w-5 h-5 text-amber-500" /> หมายเหตุจากผู้ขอซื้อ</p>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{selectedPRData?.remarks || 'ไม่มีการระบุหมายเหตุ'}"</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2.5"><CheckCircle2 className="w-5 h-5 text-teal-500" /> ความเห็นผู้อนุมัติ</p>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{selectedPRData?.comments || 'ไม่มีความเห็นเพิ่มเติม'}"</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. ตารางรายการสินค้า (คุมโทนสะอาด) */}
                            <div className="px-8 md:px-10 py-10 bg-white border-b-2 border-slate-100">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5">
                                        <div className="p-2 bg-slate-100 rounded-lg"><ClipboardList className="w-5 h-5 text-sky-600" /></div>
                                        รายการพัสดุและราคาที่สั่งซื้อ
                                    </h2>
                                    <div className="flex items-center gap-2 bg-white text-slate-400 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                                        <Lock className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">ข้อมูลล็อกตามใบ PR</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-[2rem] border-2 border-slate-100">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 text-xs font-black text-slate-600 uppercase tracking-widest border-b border-slate-200">
                                            <tr>
                                                <th className="p-6">รายการพัสดุ (Product)</th>
                                                <th className="p-6 text-center w-32">จำนวนสั่ง</th>
                                                <th className="p-6 text-right w-48">ราคา/หน่วย</th>
                                                <th className="p-6 text-right text-slate-900 w-48">รวม (บาท)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {items.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-400 font-black tracking-wider mb-1 uppercase">#{item.productSku}</span>
                                                            <span className="text-base font-black text-slate-800">{item.productName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <span className="bg-slate-50 border border-slate-200 text-slate-900 px-5 py-2 rounded-xl font-black text-base tabular-nums">
                                                            {item.orderedQuantity}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <span className="font-bold text-slate-500 text-base tabular-nums">
                                                            ฿{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 text-right font-black text-[#1F3B8B] text-lg tabular-nums">
                                                        ฿{(item.orderedQuantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4. ดำเนินการสั่งซื้อ (Execution Area - โทนเดียวกับฟอร์ม) */}
                            <div className="p-8 md:p-10 bg-white flex flex-col gap-10">
                                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5 border-b-2 border-slate-100 pb-4">
                                    <div className="p-2 bg-slate-100 rounded-lg"><ShoppingCart className="w-5 h-5 text-blue-600" /></div>
                                    ดำเนินการออกใบสั่งซื้อ (PO Finalize)
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <Package className="w-5 h-5 text-sky-500" /> สถานะเริ่มต้นของ PO
                                        </label>
                                        <select
                                            value={orderStatus}
                                            onChange={(e) => setOrderStatus(e.target.value)}
                                            className="w-full border-2 border-slate-200 bg-slate-50 rounded-2xl p-4 text-base font-black uppercase outline-none focus:border-[#1F3B8B] transition-all text-slate-800"
                                        >
                                            <option value="ORDERED">ORDERED (สั่งซื้อแล้ว รอจัดส่ง)</option>
                                            <option value="SHIPPED">SHIPPED (กำลังจัดส่ง)</option>
                                            <option value="URGENT">URGENT (รายการเร่งด่วน)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <MessageSquare className="w-5 h-5 text-violet-500" /> บันทึกถึงผู้จำหน่าย (Note)
                                        </label>
                                        <textarea
                                            className="w-full border-2 border-slate-200 bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-violet-500 min-h-[140px] transition-all"
                                            placeholder="ระบุรายละเอียดการจัดส่งหรือเงื่อนไขเพิ่มเติม..."
                                            value={procurementNote}
                                            onChange={(e) => setProcurementNote(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <PenTool className="w-5 h-5 text-pink-500" /> ลายเซ็นจัดซื้อ <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative h-[140px]">
                                            {signatureImage ? (
                                                <div className="w-full h-full border-2 border-dashed border-emerald-400 rounded-2xl bg-white p-4 flex items-center justify-center relative overflow-hidden group">
                                                    <img src={signatureImage} alt="Signature" className="max-h-full object-contain mix-blend-multiply" />
                                                    <button type="button" onClick={() => setSignatureImage(null)} className="absolute top-2 right-2 text-white bg-rose-500 px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg transition-all opacity-0 group-hover:opacity-100">ลบทิ้ง</button>
                                                </div>
                                            ) : (
                                                <label className="w-full h-full border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:border-[#1F3B8B] hover:bg-white transition-all group">
                                                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#1F3B8B] mb-2 transition-colors" />
                                                    <span className="text-xs font-black text-slate-500 group-hover:text-[#1F3B8B] transition-colors text-center">อัปโหลดลายเซ็น</span>
                                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Summary & Action */}
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t-2 border-slate-100">
                                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                        <p className="text-xs uppercase font-black text-slate-400 tracking-[0.2em] mb-2">ยอดรวมมูลค่าการสั่งซื้อทั้งหมด (Grand Total)</p>
                                        <p className="text-4xl md:text-6xl font-black text-[#1F3B8B] tabular-nums tracking-tighter">
                                            ฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !signatureImage}
                                        className="w-full md:w-auto px-16 py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black text-lg uppercase tracking-wider shadow-xl shadow-emerald-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-4 active:scale-[0.98]"
                                    >
                                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-7 h-7" /> ยืนยันการสั่งซื้อและออก PO</>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}