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
    ArrowDownLeft, 
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
        const validItems = items.filter(it => it.productId && it.locationId && Number(it.quantity) > 0);
        if (validItems.length === 0) return toast.error("กรุณาระบุจำนวนสินค้าและตำแหน่งเก็บให้ครบถ้วน");

        setIsSubmitting(true);
        try {
            toast.loading("กำลังอัปเดตสต๊อกและสร้างใบ GR...", { id: "gr-submit" });
            const payload = {
                receiptNo,
                purchaseOrderId,
                remarks: remarks.trim(),
                items: validItems.map(it => ({
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

            <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 md:px-0 animate-in fade-in duration-500">
               {/* HEADER SECTION - คอนเซปต์พรีเมียม ชิดซ้าย ไม่เอาเส้นกั้น และเว้นระยะ pt-10 */}
<div className="w-full pt-10 mb-6 print:hidden">
    
    {/* กล่องใน: จัดตำแหน่งให้ชิดซ้าย (px-6 md:px-10) */}
    <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        
        {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า (ปรับตามสถานะ viewMode) --- */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* 💡 ไอคอนหลัก: PackagePlus (สื่อถึงการตรวจรับสินค้าใหม่เข้าคลัง) */}
            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                <PackagePlus className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
            </div>

            {/* กลุ่มข้อความเรียงซ้อนกัน */}
            <div className="flex flex-col">
                {/* ภาษาอังกฤษด้านบน */}
                <div className="flex items-center gap-2 mb-1.5">
                    <ArrowDownLeft className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                        Inbound Supply Chain Process
                    </p>
                </div>

                {/* หัวข้อหลัก (ตัวตรง หนาพิเศษ เปลี่ยนตาม viewMode) */}
                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                    {viewMode === 'LIST' ? "การตรวจรับสินค้าเข้าคลัง" : "บันทึกใบรับสินค้า (GR)"}
                </h1>

                {/* คำอธิบายด้านล่าง พร้อมไอคอนสีเขียวมรกต */}
                <div className="flex items-center gap-2 pt-1 opacity-90">
                    <Database className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                        ระบบตรวจรับสินค้าเข้าคลังและตรวจสอบประวัติพัสดุ
                    </p>
                </div>
            </div>
        </div>

        {/* --- ส่วนขวา: ปุ่มย้อนกลับ หรือ Tab Switcher --- */}
        <div className="flex items-center">
            {viewMode === 'FORM' ? (
                /* ปุ่มย้อนกลับในโหมด FORM */
                <button 
                    onClick={handleCancel} 
                    className="group flex items-center gap-3 bg-white border-2 border-slate-100 text-slate-600 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" /> 
                    ยกเลิกและย้อนกลับ
                </button>
            ) : (
                /* Tab Switcher ในโหมด LIST */
                <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm border-2 border-slate-100 overflow-x-auto w-full md:w-auto">
                    <button
                        onClick={() => setFilterTab("PENDING")}
                        className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none border-2 ${
                            filterTab === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                        }`}
                    >
                        <Clock className="w-4 h-4" /> รอรับเข้าคลัง ({pendingPOs.length})
                    </button>
                    <button
                        onClick={() => setFilterTab("COMPLETED")}
                        className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-1 md:flex-none border-2 ${
                            filterTab === 'COMPLETED'
                            ? 'bg-[#1F3B8B]/5 text-[#1F3B8B] border-[#1F3B8B]/20 shadow-sm'
                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4" /> ประวัติรับของ (GR) ({completedGRs.length})
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
                                <div className={`p-2 rounded-lg ${filterTab === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {filterTab === 'PENDING' ? <Package className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                                </div>
                                {filterTab === 'PENDING' ? "รายการใบสั่งซื้อที่รอการส่งมอบ" : "รายการตรวจรับสินค้าที่ดำเนินการเสร็จสิ้น"}
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr className="text-xs font-black uppercase text-slate-500 tracking-wider">
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
                                            <tr key={po.id} className="hover:bg-blue-50 transition-colors">
                                                <td className="p-6 font-bold text-slate-500 text-sm">{new Date(po.createdAt).toLocaleDateString('th-TH')}</td>
                                                <td className="p-6 font-mono font-black text-blue-600 text-base tracking-tight">{po.poNumber}</td>
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
                                                        <button onClick={() => handleViewPDF(po.pdfPath, 'PO')} className="bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-colors flex items-center gap-2">
                                                            <FileText className="w-4 h-4" /> ดู PO
                                                        </button>
                                                        <button onClick={() => handleSelectPO(po)} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase hover:bg-emerald-700 shadow-md flex items-center gap-2">
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
                                            <tr key={gr.id} className="hover:bg-blue-50 transition-colors">
                                                <td className="p-6 font-bold text-slate-500 text-sm">{new Date(gr.createdAt).toLocaleDateString('th-TH')}</td>
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
                                                            ? 'bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white hover:shadow-md active:scale-95'
                                                            : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
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
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Info Header Card */}
                        <div className="bg-slate-950 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row gap-6 md:gap-10 relative overflow-hidden border border-slate-800">
                            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                                <Package className="w-64 h-64 text-emerald-400" />
                            </div>
                            <div className="relative z-10 w-full md:w-auto">
                                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">เลขที่ใบรับสินค้า (GR Number)</p>
                                <p className="font-mono font-black text-3xl md:text-4xl tracking-tight">{receiptNo}</p>
                            </div>
                            <div className="hidden md:block w-px bg-white/20 relative z-10"></div>
                            <div className="relative z-10 flex-1">
                                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">อ้างอิงใบสั่งซื้อ / ผู้จัดจำหน่าย</p>
                                <p className="font-bold text-lg md:text-xl text-white tracking-tight">{selectedPO?.poNumber} | <span className="text-emerald-400">{selectedPO?.vendorName}</span></p>
                            </div>
                        </div>

                        {/* Items Table Card */}
                        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-emerald-100 rounded-lg"><ClipboardCheck className="w-5 h-5 text-emerald-600" /></div>
                                ตรวจสอบและระบุตำแหน่งจัดเก็บพัสดุ
                            </h2>
                            <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase border-b border-slate-200">
                                        <tr>
                                            <th className="p-5">พัสดุ / SKU</th>
                                            <th className="p-5">คลัง / โซนจัดเก็บ</th>
                                            <th className="p-5">ตำแหน่งที่วาง (Location) *</th>
                                            <th className="p-5 text-center">ค้างรับ</th>
                                            <th className="p-5 text-center text-emerald-600">จำนวนที่รับจริง</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 bg-white">
                                        {items.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-5">
                                                    <p className="font-black text-slate-800 text-sm uppercase">[{item.sku}]</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1">{item.name}</p>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex gap-2">
                                                        <select value={item.warehouseId} onChange={(e) => updateItem(item.id, "warehouseId", e.target.value)} className="border-2 border-slate-100 rounded-xl px-2 py-2 text-xs font-black outline-none focus:border-emerald-400 bg-white">
                                                            <option value="">WH</option>
                                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}
                                                        </select>
                                                        <select value={item.zoneId} onChange={(e) => updateItem(item.id, "zoneId", e.target.value)} disabled={!item.warehouseId} className="border-2 border-slate-100 rounded-xl px-2 py-2 text-xs font-black outline-none disabled:bg-slate-50 bg-white">
                                                            <option value="">Zone</option>
                                                            {getAvailableZones(item.warehouseId).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <select value={item.locationId} onChange={(e) => updateItem(item.id, "locationId", e.target.value)} disabled={!item.warehouseId} required className="w-full border-2 border-emerald-100 bg-emerald-50/30 rounded-xl px-3 py-2.5 text-xs font-black text-emerald-700 outline-none focus:border-emerald-500">
                                                        <option value="">-- เลือกตำแหน่งวางของ --</option>
                                                        {getAvailableLocations(item).map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-5 text-center font-black text-slate-400 text-lg">{item.remainingQuantity}</td>
                                                <td className="p-5">
                                                    <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} className="w-full border-2 border-emerald-500 bg-emerald-50 text-emerald-900 rounded-xl py-3 text-center font-mono font-black text-xl outline-none" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Action Card */}
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-sky-500" /> หมายเหตุ (Remarks)
                                    </label>
                                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows="3" className="w-full border-2 border-slate-200 bg-white rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all placeholder:text-slate-300" placeholder="ระบุสภาพสินค้าหรือปัญหาที่พบตอนตรวจรับ..." />
                                </div>
                                <div className="p-8 rounded-[2rem] bg-slate-950 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="text-center md:text-left">
                                        <p className="text-xs font-black uppercase text-emerald-400 tracking-widest mb-1">ยอดรับรวมทั้งสิ้น</p>
                                        <p className="text-4xl font-black font-mono tracking-tight">{totalQty} <span className="text-sm font-bold text-slate-500">Units</span></p>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                        {isSubmitting ? "กำลังประมวลผล..." : "ยืนยันการรับสินค้า"} <CheckCircle2 className="w-5 h-5" />
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