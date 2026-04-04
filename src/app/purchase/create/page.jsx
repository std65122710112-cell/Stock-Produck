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
    Clock, Loader2, MessageSquare, FileText, AlertCircle, CheckCircle, 
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

    useEffect(() => {
        async function loadInitialData() {
            setIsLoading(true);
            try {
                const [pRes, prRes, poRes] = await Promise.all([
                    apiFetch("/master/products").catch(() => []),
                    apiFetch("/api/purchase/pr?status=APPROVED&unused=true").catch(() => []),
                    apiFetch("/inventory/pos").catch(() => [])
                ]);

                setProducts(pRes || []);
                const validPRs = (prRes || []).filter(pr => pr.pdfPath && pr.pdfPath !== 'PENDING');
                setApprovedPRs(validPRs);
                const signedPOs = (poRes || []).filter(po => po.pdfPath && po.pdfPath !== 'PENDING');
                setActivePOs(signedPOs);

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

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.orderedQuantity) * Number(item.unitPrice)), 0);
    const activeList = filterTab === 'READY' ? approvedPRs : activePOs;

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 md:px-0 animate-in fade-in duration-500">

                {/* HEADER SECTION - คอนเซปต์พรีเมียม ชิดซ้าย ไม่เอาเส้นกั้น และเว้นระยะ pt-10 ตามที่ล็อกไว้ */}
                <div className="w-full pt-10 mb-6 print:hidden">

                    {/* กล่องใน: จัดตำแหน่งให้ชิดซ้าย (px-6 md:px-10) */}
                    <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">

                        {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า (ปรับตามสถานะ viewMode) --- */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* 💡 ไอคอนหลัก: ShoppingCart (สื่อถึงแผนกจัดซื้อ) */}
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                <ShoppingCart className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>

                            {/* กลุ่มข้อความเรียงซ้อนกัน */}
                            <div className="flex flex-col">
                                {/* ภาษาอังกฤษด้านบน */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <ClipboardList className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        Purchasing Management System
                                    </p>
                                </div>

                                {/* หัวข้อหลัก (ตัวตรง หนาพิเศษ เปลี่ยนตาม viewMode) */}
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                    {viewMode === 'LIST' ? "ศูนย์กลางการจัดซื้อ" : "ออกใบสั่งซื้อ (PO)"}
                                </h1>

                                {/* คำอธิบายด้านล่าง พร้อมไอคอนสีเขียวมรกต */}
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                        ฝ่ายจัดซื้อ: ดำเนินการออกใบสั่งซื้อและติดตามสถานะจาก PR
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* --- ส่วนขวา: ปุ่มย้อนกลับ หรือ Tab Switcher --- */}
                        <div className="flex items-center">
                            {viewMode === 'FORM' ? (
                                /* ปุ่มย้อนกลับในโหมด FORM */
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="group flex items-center gap-3 bg-white border-2 border-slate-100 text-slate-600 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                    ยกเลิกและย้อนกลับ
                                </button>
                            ) : (
                                /* Tab Switcher ในโหมด LIST */
                                <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm border-2 border-slate-100 overflow-x-auto w-full md:w-auto">
                                    <button
                                        onClick={() => setFilterTab("READY")}
                                        className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none border-2 ${filterTab === 'READY'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                                                : 'border-transparent text-slate-400 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Clock className="w-4 h-4" /> รายการรอออก PO ({approvedPRs.length})
                                    </button>
                                    <button
                                        onClick={() => setFilterTab("TRACKING")}
                                        className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none border-2 ${filterTab === 'TRACKING'
                                                ? 'bg-[#1F3B8B]/5 text-[#1F3B8B] border-[#1F3B8B]/20 shadow-sm'
                                                : 'border-transparent text-slate-400 hover:bg-slate-50'
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
                                    <tr className="text-xs font-black uppercase text-slate-500 tracking-wider">
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
                                        <tr key={item.id} className="hover:bg-blue-50 transition-colors">
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
                                                            <button onClick={() => handleSelectPRFromList(item)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors shadow-md">
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
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* 📝 ฝั่งซ้าย: รายละเอียดการสั่งซื้อ */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* PR Reference Card */}
                            <div className="bg-slate-950 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row gap-6 md:gap-10 relative overflow-hidden border border-slate-800">
                                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                                    <ShoppingCart className="w-64 h-64 text-indigo-400" />
                                </div>
                                <div className="relative z-10 w-full md:w-auto">
                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">อ้างอิงใบขอซื้อ (Source PR)</p>
                                    <p className="font-mono font-black text-3xl md:text-4xl tracking-tight">{selectedPRData?.prNumber}</p>
                                </div>
                                <div className="hidden md:block w-px bg-white/20 relative z-10"></div>
                                <div className="relative z-10 flex-1 space-y-4">
                                    <div>
                                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1.5">ระบุผู้จัดจำหน่าย (Vendor Name) *</p>
                                        <input
                                            type="text"
                                            className="bg-transparent border-b-2 border-indigo-500 text-xl font-black uppercase text-emerald-400 w-full outline-none focus:border-emerald-400 transition-colors placeholder:text-slate-700"
                                            placeholder="ชื่อบริษัทคู่ค้าที่จะสั่งซื้อ..."
                                            value={vendorName}
                                            onChange={(e) => setVendorName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Item Table Card */}
                            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                    <div className="p-2 bg-sky-100 rounded-lg"><ClipboardList className="w-5 h-5 text-sky-600" /></div>
                                    ยืนยันรายการพัสดุและราคาที่สั่งซื้อจริง
                                </h2>
                                <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase border-b border-slate-200">
                                            <tr>
                                                <th className="p-5">รายการพัสดุ (Product)</th>
                                                <th className="p-5 text-center w-32">จำนวนสั่ง</th>
                                                <th className="p-5 text-right w-40">ราคา/หน่วย</th>
                                                <th className="p-5 text-right text-indigo-600">รวม (Est.)</th>
                                                <th className="p-5 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {items.map((item, index) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4">
                                                        <select value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-black uppercase outline-none focus:border-indigo-400 bg-white text-slate-700">
                                                            {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-4"><input type="number" value={item.orderedQuantity} onChange={(e) => handleItemChange(index, 'orderedQuantity', e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 text-center font-black text-slate-800 outline-none focus:border-indigo-400" /></td>
                                                    <td className="p-4"><input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 text-right font-mono font-bold text-slate-700 outline-none focus:border-indigo-400" /></td>
                                                    <td className="p-4 text-right font-black font-mono text-indigo-600 text-base">฿{(item.orderedQuantity * item.unitPrice).toLocaleString()}</td>
                                                    <td className="p-4 text-center">
                                                        <button type="button" onClick={() => removeItem(index)} className="p-2.5 bg-slate-50 text-slate-300 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors border border-transparent hover:border-rose-100">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ✍️ ฝั่งขวา: เครื่องมือการสั่งซื้อ (Sidebar) */}
                        <div className="lg:col-span-4">
                            <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-lg sticky top-8 space-y-8">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                    <div className="p-2 bg-blue-100 rounded-lg"><ShoppingCart className="w-5 h-5 text-blue-600" /></div>
                                    ดำเนินการสั่งซื้อ
                                </h3>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-indigo-500" /> สถานะเริ่มต้นของ PO
                                    </label>
                                    <select
                                        value={orderStatus}
                                        onChange={(e) => setOrderStatus(e.target.value)}
                                        className="w-full border-2 border-slate-200 bg-white rounded-2xl p-4 text-sm font-black uppercase outline-none focus:border-indigo-500 transition-all text-slate-700 shadow-sm"
                                    >
                                        <option value="ORDERED">ORDERED (สั่งซื้อแล้ว รอจัดส่ง)</option>
                                        <option value="SHIPPED">SHIPPED (กำลังจัดส่ง)</option>
                                        <option value="URGENT">URGENT (รายการเร่งด่วน)</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <PenTool className="w-4 h-4 text-indigo-500" /> ลายเซ็นผู้ทำรายการจัดซื้อ <span className="text-rose-500">*</span>
                                    </label>
                                    {signatureImage ? (
                                        <div className="relative border-2 border-dashed border-emerald-300 rounded-[2rem] p-6 flex flex-col items-center bg-emerald-50/50 transition-all">
                                            <img src={signatureImage} alt="Signature" className="max-h-28 object-contain mix-blend-multiply" />
                                            <button type="button" onClick={() => setSignatureImage(null)} className="absolute top-3 right-3 text-rose-600 hover:bg-rose-100 bg-white border border-rose-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm transition-colors">Clear</button>
                                        </div>
                                    ) : (
                                        <label className="border-2 border-dashed border-slate-300 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors group">
                                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-3 transition-colors" />
                                            <span className="text-xs font-black text-slate-500 uppercase group-hover:text-indigo-700 transition-colors text-center">อัปโหลดลายเซ็นจัดซื้อ</span>
                                            <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-sky-500" /> บันทึกถึงผู้จำหน่าย (Note)
                                    </label>
                                    <textarea
                                        className="w-full border-2 border-slate-200 bg-white rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-50 min-h-[120px] transition-all"
                                        placeholder="ระบุรายละเอียดการจัดส่งหรือเงื่อนไขเพิ่มเติม..."
                                        value={procurementNote}
                                        onChange={(e) => setProcurementNote(e.target.value)}
                                    />
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-xs uppercase font-black text-slate-500 tracking-widest mb-1">ยอดรวมมูลค่าการสั่งซื้อ</p>
                                    <p className="text-4xl font-black text-slate-950 font-mono mb-8 tracking-tighter">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !signatureImage}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> ยืนยันการสั่งซื้อและออก PO</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}



            </div>
        </AuthGate>
    );
}