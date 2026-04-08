"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getAccessToken } from "@/lib/auth";
import {
    ArrowLeft, Database, FileText, CheckCircle2,
    Package, ClipboardCheck, User, Info, Hash,
    LayoutDashboard, Clock, ShieldCheck, FileCheck, X, Truck, PackagePlus,
    ArrowDownLeft, MapPin, Tag, Calendar, Building2, Loader2
} from "lucide-react";

function createDefaultItem() {
    return {
        id: `${Date.now()}-${Math.random()}`,
        productId: "", warehouseId: "", zoneId: "", locationId: "",
        quantity: 1, unitCost: 0, orderedQuantity: 0, receivedQuantity: 0, remainingQuantity: 0, sku: "", name: "",
    };
}

function generateReceiptNo() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `GR-${date}-${rand}`;
}

export default function CreateGoodsReceiptPage() {
    const [viewMode, setViewMode] = useState('LIST');
    const [filterTab, setFilterTab] = useState('PENDING');

    const [pendingPOs, setPendingPOs] = useState([]);
    const [completedGRs, setCompletedGRs] = useState([]);

    const [warehouses, setWarehouses] = useState([]);
    const [zones, setZones] = useState([]);
    const [locations, setLocations] = useState([]);

    const [receiptNo, setReceiptNo] = useState(generateReceiptNo());
    const [purchaseOrderId, setPurchaseOrderId] = useState("");
    const [selectedPO, setSelectedPO] = useState(null);
    const [remarks, setRemarks] = useState("");
    const [items, setItems] = useState([createDefaultItem()]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

    const loadInitialData = async () => {
        try {
            const [w, z, l, poList, grList] = await Promise.all([
                apiFetch("/master/warehouses").catch(() => []),
                apiFetch("/master/zones").catch(() => []),
                apiFetch("/master/locations").catch(() => []),
                apiFetch("/inventory/pos").catch(() => []),
                apiFetch("/inventory/receipt").catch(() => []),
            ]);

            setWarehouses(Array.isArray(w) ? w : w?.data || []);
            setZones(Array.isArray(z) ? z : z?.data || []);
            setLocations(Array.isArray(l) ? l : l?.data || []);

            const validIncomingPOs = (Array.isArray(poList) ? poList : poList?.data || []).filter(po =>
                po.pdfPath && po.pdfPath !== 'PENDING' && ['ORDERED', 'SHIPPED', 'PARTIAL', 'URGENT'].includes(po.status)
            );
            setPendingPOs(validIncomingPOs);
            setCompletedGRs(Array.isArray(grList) ? grList : grList?.data || []);
        } catch (error) {
            toast.error("โหลดข้อมูลระบบไม่สำเร็จ");
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const cleanupPdfUrl = () => {
        if (pdfBlobUrl) {
            window.URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }
    };

    const handleSelectPO = async (po) => {
        setPurchaseOrderId(po.id);
        setIsSubmitting(true);
        cleanupPdfUrl();

        try {
            const poData = await apiFetch(`/inventory/pos/${po.id}`);
            setSelectedPO(poData);

            const poItems = Array.isArray(poData?.items) ? poData.items : [];
            const matchedItems = poItems
                .filter((pi) => Number(pi.receivedQuantity) < Number(pi.orderedQuantity))
                .map((pi) => ({
                    id: pi.id || `${Date.now()}-${Math.random()}`,
                    productId: pi.productId || "", warehouseId: "", zoneId: "", locationId: "",
                    quantity: Number(pi.orderedQuantity) - Number(pi.receivedQuantity),
                    remainingQuantity: Number(pi.orderedQuantity) - Number(pi.receivedQuantity),
                    unitCost: Number(pi.unitPrice) || 0,
                    sku: pi.product?.sku || "", name: pi.product?.name || "",
                    orderedQuantity: Number(pi.orderedQuantity) || 0,
                    receivedQuantity: Number(pi.receivedQuantity) || 0,
                }));

            setItems(matchedItems.length > 0 ? matchedItems : [createDefaultItem()]);

            if (po.pdfPath) {
                const filename = po.pdfPath.split('/').pop();
                const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
                const url = `${backendUrl}/api/purchase/po/document/${filename}`;
                const token = typeof getAccessToken === 'function' ? getAccessToken() : null;

                fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
                    .then(res => res.ok ? res.blob() : Promise.reject())
                    .then(blob => setPdfBlobUrl(window.URL.createObjectURL(blob)))
                    .catch(() => console.error("Error loading inline PDF"));
            }

            setViewMode('FORM');
            toast.success(`กำลังตรวจรับสินค้า PO: ${po.poNumber}`);
        } catch (error) {
            toast.error("ไม่สามารถดึงข้อมูลรายการสินค้าได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewPDF = async (pdfPath, type = 'PO') => {
        if (!pdfPath) return toast.error("ไม่พบข้อมูลไฟล์เอกสาร");
        const toastId = toast.loading(`กำลังเปิดเอกสาร ${type}...`);

        try {
            const filename = pdfPath.split('/').pop();
            const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace('/api', '');

            let url = '';
            if (type === 'PO') {
                url = `${backendUrl}/api/purchase/po/document/${filename}`;
            } else {
                url = `${backendUrl}/inventory/receipt/document/${filename}`;
            }

            const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("เข้าถึงเอกสารไม่ได้ (อาจยังไม่มีไฟล์บนเซิร์ฟเวอร์)");

            const blob = await response.blob();
            const fileUrl = window.URL.createObjectURL(blob);
            window.open(fileUrl, '_blank');
            toast.success("เปิดเอกสารสำเร็จ", { id: toastId });

            setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
        } catch (error) {
            toast.error(error.message, { id: toastId });
        }
    };

    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === "warehouseId") { updated.zoneId = ""; updated.locationId = ""; }
            if (field === "zoneId") { updated.locationId = ""; }
            if (field === "quantity") {
                const val = parseInt(value, 10) || 0;
                if (val > Number(item.remainingQuantity)) {
                    toast.error(`รับเกินจำนวนค้างรับ (${item.remainingQuantity})`);
                    updated.quantity = Number(item.remainingQuantity);
                } else {
                    updated.quantity = val < 0 ? 0 : val;
                }
            }
            return updated;
        }));
    };

    const getAvailableZones = (whId) => zones.filter(z => String(z.warehouseId) === String(whId));
    const getAvailableLocations = (item) => locations.filter(loc => {
        if (item.zoneId) return String(loc.zoneId) === String(item.zoneId);
        if (item.warehouseId) return String(loc.warehouseId) === String(item.warehouseId);
        return false;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 💡 Validation: ตรวจสอบข้อมูลก่อนส่ง
        const receivingItems = items.filter(it => Number(it.quantity) > 0);

        if (receivingItems.length === 0) {
            return toast.error("กรุณาระบุจำนวนสินค้าที่ต้องการรับอย่างน้อย 1 รายการ");
        }

        // ตรวจสอบว่ารายการที่ระบุจำนวน มีการเลือกคลังและตำแหน่งครบหรือไม่
        for (const it of receivingItems) {
            if (!it.warehouseId) {
                return toast.error(`กรุณาเลือกคลังสินค้าสำหรับ: ${it.name}`);
            }
            if (!it.locationId) {
                return toast.error(`กรุณาระบุตำแหน่งจัดเก็บสำหรับ: ${it.name}`);
            }
        }

        setIsSubmitting(true);
        try {
            toast.loading("กำลังอัปเดตสต๊อกและสร้างใบ GR...", { id: "gr-submit" });
            const payload = {
                receiptNo,
                purchaseOrderId,
                remarks: remarks.trim(),
                items: receivingItems.map(it => ({
                    productId: it.productId, locationId: it.locationId,
                    quantity: Number(it.quantity), unitCost: Number(it.unitCost) || 0,
                }))
            };

            const response = await apiFetch("/inventory/receipt", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            toast.success("บันทึกรับสินค้าเข้าคลังสำเร็จ!", { id: "gr-submit" });
            if (response && response.pdfUrl) { handleViewPDF(response.pdfUrl, 'GR'); }
            setReceiptNo(generateReceiptNo());
            loadInitialData();
            setViewMode('LIST');
            setFilterTab('COMPLETED');
        } catch (error) {
            toast.error(error.message, { id: "gr-submit" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        cleanupPdfUrl();
        setViewMode('LIST');
    };

    const totalQty = useMemo(() => items.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0), [items]);

    return (
        <AuthGate>
            <Toaster position="top-right" />

            <div className="max-w-[1440px] mx-auto space-y-8 py-8 px-4 md:px-10 animate-in fade-in duration-500">
                {/* HEADER SECTION */}
                <div className="w-full pt-10 mb-6 print:hidden">
                    <div className="w-full flex flex-col gap-6">
                        {viewMode === 'FORM' && (
                            <div>
                                <button
                                    onClick={handleCancel}
                                    className="group flex items-center gap-3 bg-white border-2 border-slate-200 text-slate-600 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm w-fit"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
                                    ยกเลิก
                                </button>
                            </div>
                        )}

                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                    <PackagePlus className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <ArrowDownLeft className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                            Inbound Supply Chain Process
                                        </p>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                        {viewMode === 'LIST' ? "การตรวจรับสินค้าเข้าคลัง" : "บันทึกใบรับสินค้า (GR)"}
                                    </h1>
                                    <div className="flex items-center gap-2 pt-1 opacity-90">
                                        <Database className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                            ระบบตรวจรับสินค้าเข้าคลังและตรวจสอบประวัติพัสดุ
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {viewMode === 'LIST' && (
                                <div className="flex bg-white p-2 rounded-[2.5rem] shadow-sm border-2 border-slate-100 overflow-x-auto w-full md:w-auto">
                                    <button
                                        onClick={() => setFilterTab("PENDING")}
                                        className={`px-8 py-3.5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 whitespace-nowrap flex-1 md:flex-none border-2 ${filterTab === 'PENDING'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Clock className="w-5 h-5" /> รอรับเข้าคลัง ({pendingPOs.length})
                                    </button>
                                    <button
                                        onClick={() => setFilterTab("COMPLETED")}
                                        className={`px-8 py-3.5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 whitespace-nowrap flex-1 md:flex-none border-2 ${filterTab === 'COMPLETED'
                                            ? 'bg-[#1F3B8B]/5 text-[#1F3B8B] border-[#1F3B8B]/20 shadow-sm'
                                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                                            }`}
                                    >
                                        <ShieldCheck className="w-5 h-5" /> ประวัติรับของ (GR) ({completedGRs.length})
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- VIEW 1: LIST --- */}
                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 md:p-8 bg-slate-50/50 border-b-2 border-slate-100 flex justify-between items-center">
                            <h2 className="text-sm font-black text-slate-900 tracking-wide flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${filterTab === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {filterTab === 'PENDING' ? <Package className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                                </div>
                                {filterTab === 'PENDING' ? "รายการใบสั่งซื้อที่รอการส่งมอบ" : "รายการตรวจรับสินค้าที่ดำเนินการเสร็จสิ้น"}
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white border-b-2 border-slate-200">
                                    <tr className="text-sm font-black uppercase text-slate-500 tracking-wider">
                                        <th className="p-6">วันที่</th>
                                        <th className="p-6">เอกสารอ้างอิง (PO/GR)</th>
                                        <th className="p-6">{filterTab === 'PENDING' ? 'ผู้จัดจำหน่าย (Vendor)' : 'ผู้รับสินค้า / หมายเหตุ'}</th>
                                        <th className="p-6 text-center">สถานะ</th>
                                        <th className="p-6 text-right">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                    {filterTab === 'PENDING' ? (
                                        pendingPOs.length === 0 ? (
                                            <tr><td colSpan="5" className="p-32 text-center text-slate-400 font-black uppercase text-xs">ไม่มีใบสั่งซื้อรอรับของ</td></tr>
                                        ) : pendingPOs.map((po) => (
                                            <tr key={po.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="p-6 font-bold text-slate-500 text-sm tabular-nums">{new Date(po.createdAt).toLocaleDateString('th-TH')}</td>
                                                <td className="p-6 font-black text-[#1F3B8B] text-base tracking-tight tabular-nums">{po.poNumber}</td>
                                                <td className="p-6">
                                                    <p className="font-black text-slate-800 text-sm uppercase">{po.vendorName}</p>
                                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-1"><Truck className="w-3.5 h-3.5" /> Logistic Inbound</p>
                                                </td>
                                                <td className="p-6 text-center">
                                                    <span className={`inline-flex px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${po.status === 'PARTIAL' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                        {po.status === 'PARTIAL' ? 'รับแล้วบางส่วน' : 'รอรับของ'}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => handleViewPDF(po.pdfPath, 'PO')} className="bg-white border-2 border-slate-200 text-[#1F3B8B] px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-[#1F3B8B] hover:text-white hover:border-[#1F3B8B] transition-all flex items-center gap-2 shadow-sm">
                                                            <FileText className="w-4 h-4" /> ดู PO
                                                        </button>
                                                        <button onClick={() => handleSelectPO(po)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-emerald-700 shadow-md flex items-center gap-2 transition-all active:scale-95">
                                                            <ClipboardCheck className="w-4 h-4" /> เริ่มตรวจรับ
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        completedGRs.length === 0 ? (
                                            <tr><td colSpan="5" className="p-32 text-center text-slate-400 font-black uppercase text-xs">ยังไม่มีประวัติการรับสินค้า</td></tr>
                                        ) : completedGRs.map((gr) => (
                                            <tr key={gr.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="p-6 font-bold text-slate-500 text-sm tabular-nums">{new Date(gr.createdAt).toLocaleDateString('th-TH')}</td>
                                                <td className="p-6">
                                                    <p className="tabular-nums font-black text-emerald-600 text-base tracking-tight">{gr.receiptNo}</p>
                                                    <p className="tabular-nums text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">PO: {gr.purchaseOrder?.poNumber || 'N/A'}</p>
                                                </td>
                                                <td className="p-6">
                                                    <p className="font-black text-slate-800 text-sm uppercase">{gr.user?.firstName} {gr.user?.lastName}</p>
                                                    <p className="text-xs font-bold text-slate-500 italic mt-1 truncate max-w-[250px]">"{gr.remarks || 'ตรวจรับครบถ้วน'}"</p>
                                                </td>
                                                <td className="p-6 text-center">
                                                    <span className="inline-flex px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm">
                                                        สำเร็จ
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <button
                                                        onClick={() => handleViewPDF(gr.pdfPath, 'GR')}
                                                        disabled={!gr.pdfPath}
                                                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${gr.pdfPath
                                                            ? 'bg-white text-[#1F3B8B] border-2 border-slate-200 hover:border-[#1F3B8B] hover:bg-[#1F3B8B] hover:text-white hover:shadow-md active:scale-95'
                                                            : 'bg-slate-50 text-slate-300 border-2 border-slate-100 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <FileText className="w-4 h-4" /> ดูใบ GR
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- VIEW 2: FORM --- */}
                {viewMode === 'FORM' && (
                    <div className="w-full max-w-[1440px] mx-auto animate-in slide-in-from-bottom-4 duration-500 relative">
                        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-2 border-slate-200 overflow-hidden flex flex-col">

                            {/* 1. ส่วนหัวเอกสาร */}
                            <div className="p-8 md:p-10 border-b-2 border-slate-100 border-dashed flex flex-col md:flex-row justify-between items-start gap-8 bg-white">
                                <div className="space-y-5 flex-1">
                                    <div className="flex items-center gap-3 text-indigo-600">
                                        <Package className="w-7 h-7 text-indigo-500" />
                                        <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                                            เลขที่ใบรับสินค้า (GR Number)
                                        </span>
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-black text-[#1F3B8B] tracking-tighter tabular-nums">
                                        {receiptNo}
                                    </h2>
                                </div>

                                <div className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-6 flex flex-col w-full md:max-w-md shadow-sm">
                                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-500" /> อ้างอิงใบสั่งซื้อ / ผู้จัดจำหน่าย
                                    </p>
                                    <p className="font-black text-lg md:text-xl text-slate-950 tracking-tight tabular-nums">
                                        {selectedPO?.poNumber}
                                    </p>
                                    <p className="text-sm font-bold text-emerald-600 uppercase mt-1">
                                        {selectedPO?.vendorName}
                                    </p>
                                </div>
                            </div>

                            {/* 2. ส่วนตารางรายการรับเข้า */}
                            <div className="px-8 md:px-10 py-10 bg-white border-b-2 border-slate-100">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-100 rounded-xl">
                                            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        รายการพัสดุและตำแหน่งจัดเก็บ (Items & Storage)
                                    </h2>
                                </div>

                                <div className="overflow-x-auto rounded-[2rem] border-2 border-slate-100 shadow-sm">
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                                            <tr className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                                <th className="p-6 text-left">พัสดุ / SKU</th>
                                                <th className="p-6 text-left w-[28%]">
                                                    คลัง / โซน <span className="text-rose-500 ml-1">*</span>
                                                </th>
                                                <th className="p-6 text-left w-[22%]">
                                                    ตำแหน่ง (Location) <span className="text-rose-500 ml-1">*</span>
                                                </th>
                                                <th className="p-6 text-center w-28">ค้างรับ</th>

                                                {/* 💡 แก้ไขตรงนี้: เพิ่ม whitespace-nowrap และขยายเป็น w-48 */}
                                                <th className="p-6 text-center w-48 whitespace-nowrap">
                                                    จำนวนที่รับจริง <span className="text-rose-500 ml-1">*</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {items.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] text-slate-400 font-black tracking-wider mb-1 uppercase tabular-nums">#{item.sku}</span>
                                                            <span className="text-base font-black text-slate-900">{item.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col gap-2">
                                                            {/* --- ช่องเลือกคลังสินค้า (สีปกติ) --- */}
                                                            <select
                                                                value={item.warehouseId}
                                                                onChange={(e) => updateItem(item.id, "warehouseId", e.target.value)}
                                                                className={`border-2 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-[#1F3B8B] bg-white transition-all w-full cursor-pointer
                ${item.warehouseId ? 'border-slate-400 text-black' : 'border-slate-200 text-slate-400'}`}
                                                            >
                                                                <option value="">-- เลือกคลังสินค้า --</option>
                                                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                            </select>

                                                            {/* --- ช่องเลือกโซน (สีปกติ) --- */}
                                                            <select
                                                                value={item.zoneId}
                                                                onChange={(e) => updateItem(item.id, "zoneId", e.target.value)}
                                                                disabled={!item.warehouseId}
                                                                className={`border-2 rounded-xl px-3 py-2 text-xs font-black outline-none transition-all w-full cursor-pointer disabled:bg-slate-50 disabled:border-slate-100 disabled:text-slate-300
                                                                ${item.zoneId ? 'border-slate-400 text-black' : 'border-slate-200 text-slate-400'}`}
                                                            >
                                                                <option value="">-- เลือกโซน (ถ้ามี) --</option>
                                                                {getAvailableZones(item.warehouseId).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </td>

                                                    <td className="p-6">
                                                        {/* --- ช่องเลือกตำแหน่ง (เดิมเป็นสีม่วง ปรับเป็นสีปกติเหมือนอันแรกแล้ว) --- */}
                                                        <select
                                                            value={item.locationId}
                                                            onChange={(e) => updateItem(item.id, "locationId", e.target.value)}
                                                            disabled={!item.warehouseId}
                                                            className={`w-full border-2 rounded-xl px-3 py-3 text-xs font-black outline-none focus:border-[#1F3B8B] transition-all cursor-pointer shadow-sm disabled:bg-slate-50 disabled:border-slate-100
                                                            ${item.locationId ? 'border-slate-400 text-black' : 'border-slate-200 text-slate-400'}`}
                                                        >
                                                            <option value="">-- ระบุจุดเก็บ --</option>
                                                            {getAvailableLocations(item).map(l => (
                                                                <option key={l.id} value={l.id}>{l.name || l.code}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-6 text-center font-black text-slate-400 text-lg tabular-nums">
                                                        {item.remainingQuantity}
                                                    </td>
                                                    <td className="p-6">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                                                            className="w-full border-2 border-emerald-500 bg-emerald-50 text-emerald-900 rounded-xl py-3 text-center font-black text-xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all tabular-nums"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. ส่วนท้าย (หมายเหตุและสรุป) */}
                            <div className="p-6 md:p-8 bg-slate-50 flex flex-col gap-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                                    <div className="p-5 md:p-6 rounded-[1.5rem] bg-white border-2 border-slate-200 shadow-sm flex flex-col gap-3">
                                        {/* 💡 ปรับ Label: ขยายเป็น text-sm, ลดความหนาเป็น font-bold, เปลี่ยนสีเป็น slate-500, ขยายไอคอนเป็น w-5 h-5 */}
                                        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2.5">
                                            <Info className="w-5 h-5 text-sky-500" /> หมายเหตุการตรวจรับ (Remarks)
                                        </label>

                                        {/* 💡 ปรับ Textarea: ขยายตัวหนังสือเป็น text-base, เพิ่ม padding เป็น p-5, เปลี่ยนสีขอบตอนกดโฟกัสเป็นสีพาสเทล */}
                                        <textarea
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            rows="3"
                                            className="w-full flex-1 border-2 border-slate-200 bg-slate-50 rounded-2xl p-5 text-base font-bold text-slate-700 outline-none focus:border-sky-400 focus:bg-white transition-all resize-none placeholder:text-slate-300 shadow-sm"
                                            placeholder="ระบุสภาพสินค้าหรือปัญหาที่พบ..."
                                        />
                                    </div>

                                    <div className="p-5 md:p-6 rounded-[1.5rem] bg-white border-2 border-slate-200 shadow-md flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12">
                                        <div className="flex flex-col items-center md:items-start">
                                            <p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-1">ยอดรับรวมทั้งสิ้น</p>
                                            <p className="text-3xl md:text-4xl font-black text-[#1F3B8B] tabular-nums tracking-tighter flex items-baseline gap-1.5">
                                                {totalQty}
                                                <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Units</span>
                                            </p>
                                        </div>
                                        <div className="hidden md:block w-px h-10 bg-slate-100"></div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full md:w-auto min-w-[220px] bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-900/10 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                    <span>ยืนยันการรับสินค้า</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}