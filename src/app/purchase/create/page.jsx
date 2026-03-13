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
    Clock, Loader2, MessageSquare, FileText, AlertCircle
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
                // 💡 ดึงเฉพาะ PR ที่ "อนุมัติแล้ว" และ "ยังไม่ถูกแปลงเป็น PO"
                const [pRes, prRes, poRes] = await Promise.all([
                    apiFetch("/master/products").catch(() => []),
                    apiFetch("/api/purchase/pr?status=APPROVED&unused=true").catch(() => []),
                    apiFetch("/inventory/pos").catch(() => [])
                ]);

                setProducts(pRes || []);

                // 🔒 กรอง PR ที่ผู้บริหารเซ็นและออก PDF ไว้แล้วเท่านั้น
                const validPRs = (prRes || []).filter(pr => pr.pdfPath && pr.pdfPath !== 'PENDING');
                setApprovedPRs(validPRs);

                // กรอง PO ที่จัดซื้อทำเสร็จแล้ว
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
                setVendorName(prDetail.supplier ? `[${prDetail.supplier.code}] ${prDetail.supplier.name}` : (prDetail.vendorName || 'ระบุชื่อผู้จำหน่าย...'));
                setSupplierId(prDetail.supplier?.id || '');

                const mappedItems = prDetail.items.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    productName: item.product?.name || "Unknown Product",
                    orderedQuantity: item.quantity,
                    unitPrice: item.estimatedPrice || 0
                }));

                setItems(mappedItems);
                setPoNumber(`PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`);
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
        if (!vendorName.trim()) return toast.error("กรุณาระบุชื่อผู้จำหน่าย (Vendor)");

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

            if (response && response.pdfUrl) {
                handleViewPDF(response.pdfUrl, 'PO');
            }

            setTimeout(() => {
                setViewMode('LIST');
                setFilterTab('TRACKING');
            }, 1000);

        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดในการสร้างระบบ", { id: "submit-po" });
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
            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                            <Truck className="w-3 h-3" /> Purchasing Department
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            {viewMode === 'LIST' ? "Procurement Hub" : "PO Issuance"}
                        </h1>
                        <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" /> ฝ่ายจัดซื้อ: ดำเนินการออกใบสั่งซื้อจาก PR
                        </p>
                    </div>

                    {viewMode === 'LIST' ? (
                        <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm border border-slate-200 overflow-x-auto">
                            <button onClick={() => setFilterTab("READY")} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filterTab === 'READY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                                <Clock className="w-3.5 h-3.5" /> รายการรอออกใบสั่งซื้อ ({approvedPRs.length})
                            </button>
                            <button onClick={() => setFilterTab("TRACKING")} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filterTab === 'TRACKING' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                                <Package className="w-3.5 h-3.5" /> ประวัติการสั่งซื้อ (PO)
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-rose-600 transition-all shadow-sm">
                            <ArrowLeft className="w-4 h-4" /> ยกเลิก
                        </button>
                    )}
                </div>

                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">Date</th>
                                        <th className="p-6">Ref Number</th>
                                        <th className="p-6">Requester / Vendor</th>
                                        <th className="p-6 text-center">Status</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        <tr><td colSpan="5" className="p-24 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
                                    ) : activeList.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-32 text-center">
                                                <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                                                    {filterTab === 'READY' ? 'ไม่มีใบขอซื้อ (PR) ที่รอออกใบสั่งซื้อ' : 'ยังไม่มีประวัติการออกใบสั่งซื้อ (PO)'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : activeList.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-none">
                                            <td className="p-6 font-bold text-slate-400 text-xs">{new Date(item.createdAt).toLocaleDateString('th-TH')}</td>
                                            <td className="p-6 font-mono font-black text-indigo-600 text-sm">{item.poNumber || item.prNumber}</td>
                                            <td className="p-6">
                                                <p className="font-black text-slate-700 text-xs uppercase">{item.vendorName || item.user?.firstName}</p>
                                                <p className="text-[10px] text-slate-400">{item.department?.name || 'Vendor'}</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        item.status === 'ORDERED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            item.status === 'SHIPPED' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                                'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {filterTab === 'READY' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleViewPDF(item.pdfPath, 'PR')}
                                                                className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 flex items-center gap-1"
                                                            >
                                                                <FileText className="w-3 h-3" /> ดู PR
                                                            </button>
                                                            <button onClick={() => handleSelectPRFromList(item)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-sm">
                                                                สร้าง PO
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleViewPDF(item.pdfPath, 'PO')}
                                                            disabled={!item.pdfPath}
                                                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ml-auto ${item.pdfPath ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 hover:border-blue-600 shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                        >
                                                            <FileText className="w-3.5 h-3.5" /> ดูเอกสาร PO
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

                {viewMode === 'FORM' && (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl flex flex-wrap gap-10 relative overflow-hidden border border-slate-800">
                                <div className="absolute -right-10 -top-10 opacity-[0.05] pointer-events-none"><ShoppingCart className="w-64 h-64" /></div>
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Source PR</p>
                                    <p className="font-mono font-black text-2xl tracking-tighter">{selectedPRData?.prNumber}</p>
                                </div>
                                <div className="relative z-10 border-l border-white/10 pl-10 flex-1">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Vendor (ผู้จัดจำหน่าย)</p>
                                    <input
                                        type="text"
                                        className="bg-transparent border-b-2 border-indigo-400 text-lg font-black uppercase text-emerald-400 w-full outline-none focus:border-emerald-400"
                                        placeholder="ระบุชื่อบริษัทคู่ค้าที่จะสั่งซื้อ..."
                                        value={vendorName}
                                        onChange={(e) => setVendorName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-indigo-500" /> Confirm Order Items
                                </h2>
                                <div className="overflow-hidden border border-slate-100 rounded-[2rem]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                                            <tr>
                                                <th className="p-5">Product Name</th>
                                                <th className="p-5 text-center w-24">Quantity</th>
                                                <th className="p-5 text-right w-36">Price</th>
                                                <th className="p-5 text-right">Total</th>
                                                <th className="p-5 w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map((item, index) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50">
                                                    <td className="p-3">
                                                        <select value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 text-[11px] font-black uppercase outline-none focus:border-indigo-400 bg-white">
                                                            {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-3"><input type="number" value={item.orderedQuantity} onChange={(e) => handleItemChange(index, 'orderedQuantity', e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 text-center font-black text-slate-800 outline-none" /></td>
                                                    <td className="p-3"><input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 text-right font-mono font-bold text-slate-700 outline-none" /></td>
                                                    <td className="p-3 text-right font-black text-indigo-600">฿{(item.orderedQuantity * item.unitPrice).toLocaleString()}</td>
                                                    <td className="p-3 text-center"><button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
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
                                    <FileSignature className="w-4 h-4 text-indigo-600" /> Procurement Action
                                </h3>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Package className="w-3 h-3" /> Initial Status
                                    </label>
                                    <select
                                        value={orderStatus}
                                        onChange={(e) => setOrderStatus(e.target.value)}
                                        className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-indigo-500"
                                    >
                                        <option value="ORDERED">ORDERED (สั่งซื้อแล้ว รอจัดส่ง)</option>
                                        <option value="SHIPPED">SHIPPED (กำลังจัดส่ง)</option>
                                        <option value="URGENT">URGENT (เร่งด่วน)</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <PenTool className="w-3 h-3" /> E-Signature (ฝ่ายจัดซื้อ)
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
                                        <MessageSquare className="w-3 h-3" /> Note to Supplier
                                    </label>
                                    <textarea
                                        className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 text-xs font-bold outline-none focus:border-indigo-500 min-h-[100px]"
                                        placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับการสั่งซื้อ..."
                                        value={procurementNote}
                                        onChange={(e) => setProcurementNote(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-50">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Total Order Value</p>
                                    <p className="text-4xl font-black text-emerald-600 font-mono mb-6">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !signatureImage}
                                        className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-30 disabled:scale-100 active:scale-95"
                                    >
                                        {isLoading ? "PROCESSING..." : "Confirm, Sign & Order"}
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