"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getAccessToken } from "@/lib/auth";
import {
    ArrowLeft, Database, FileText, CheckCircle2,
    Package, ClipboardCheck, User, Info, Hash,
    LayoutDashboard, Clock, ShieldCheck, FileCheck
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
    const [filterTab, setFilterTab] = useState('PENDING'); // 💡 เพิ่ม State สำหรับสลับ Tab

    const [pendingPOs, setPendingPOs] = useState([]);
    const [completedGRs, setCompletedGRs] = useState([]); // 💡 เพิ่ม State เก็บประวัติ GR

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

    // 💡 แยกฟังก์ชันดึงข้อมูลออกมา เพื่อให้เรียกใช้ซ้ำตอนเซฟเสร็จได้
    const loadInitialData = async () => {
        try {
            const [w, z, l, poList, grList] = await Promise.all([
                apiFetch("/master/warehouses").catch(() => []),
                apiFetch("/master/zones").catch(() => []),
                apiFetch("/master/locations").catch(() => []),
                apiFetch("/inventory/pos").catch(() => []),
                apiFetch("/inventory/receipt").catch(() => []), // ดึงประวัติ GR
            ]);

            setWarehouses(Array.isArray(w) ? w : w?.data || []);
            setZones(Array.isArray(z) ? z : z?.data || []);
            setLocations(Array.isArray(l) ? l : l?.data || []);

            // กรอง PO ที่รอรับของ
            const validIncomingPOs = (Array.isArray(poList) ? poList : poList?.data || []).filter(po =>
                po.pdfPath && po.pdfPath !== 'PENDING' && ['ORDERED', 'SHIPPED', 'PARTIAL', 'URGENT'].includes(po.status)
            );
            setPendingPOs(validIncomingPOs);

            // เก็บประวัติ GR
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
            // สกัดเอาชื่อไฟล์ออกมา
            const filename = pdfPath.split('/').pop();

            // ตัด /api ออกจาก Base URL เพื่อให้เรียกเส้นทางตรงได้ (กรณีระบบคลังไม่ได้ใช้ /api)
            const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace('/api', '');

            let url = '';
            if (type === 'PO') {
                url = `${backendUrl}/api/purchase/po/document/${filename}`;
            } else {
                // 💡 สำหรับ GR ปรับให้ชี้ไปที่ Path ของ Receipt Document โดยเฉพาะ
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
            console.error("View PDF Error:", error);
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

            if (response && response.pdfUrl) {
                handleViewPDF(response.pdfUrl, 'GR');
            }

            // 💡 สลับกลับไปหน้า List และไปที่ Tab "COMPLETED" อัตโนมัติ
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

            <div className="max-w-[1500px] mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-slate-50/50">
                {/* HEADER SECTION & TABS */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-6">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                            <LayoutDashboard className="w-3 h-3" /> Warehouse Operations
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            {viewMode === 'LIST' ? "Inbound Process" : "Goods Receipt"}
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            TJC GROUP: ตรวจรับสินค้าและประวัติการรับเข้า
                        </p>
                    </div>
                    {viewMode === 'FORM' ? (
                        <button onClick={handleCancel} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-rose-600 shadow-sm transition-all">
                            <ArrowLeft className="w-4 h-4" /> Cancel & Return
                        </button>
                    ) : (
                        <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm border border-slate-200 overflow-x-auto">
                            <button onClick={() => setFilterTab("PENDING")} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filterTab === 'PENDING' ? 'bg-emerald-100 text-emerald-700 shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                <Clock className="w-3.5 h-3.5" /> รอรับเข้าคลัง
                            </button>
                            <button onClick={() => setFilterTab("COMPLETED")} className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${filterTab === 'COMPLETED' ? 'bg-indigo-100 text-indigo-700 shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                <ShieldCheck className="w-3.5 h-3.5" /> ประวัติรับของ (GR)
                            </button>
                        </div>
                    )}
                </div>

                {/* --- VIEW 1: LIST --- */}
                {viewMode === 'LIST' && (
                    <div className="max-w-6xl mx-auto bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl shadow-sm ${filterTab === 'PENDING' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {filterTab === 'PENDING' ? <Package className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">
                                        {filterTab === 'PENDING' ? "Pending Deliveries" : "Completed Receipts"}
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                        {filterTab === 'PENDING' ? "ใบสั่งซื้อที่รอรับของเข้าคลัง" : "เอกสารใบรับของ (GR) ที่เสร็จสมบูรณ์แล้ว"}
                                    </p>
                                </div>
                            </div>
                            <span className="bg-slate-900 text-white text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-[0.1em]">
                                {filterTab === 'PENDING' ? pendingPOs.length : completedGRs.length} Records
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">
                                        <th className="p-6">วันที่ (Date)</th>
                                        <th className="p-6">เอกสารอ้างอิง</th>
                                        <th className="p-6">{filterTab === 'PENDING' ? 'ผู้ขาย (Supplier)' : 'ผู้ทำรายการรับ'}</th>
                                        <th className="p-6 text-center">Status</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">

                                    {/* 💡 TAB: PENDING POs */}
                                    {filterTab === 'PENDING' && pendingPOs.map((po) => (
                                        <tr key={po.id} className="hover:bg-slate-50 transition-none">
                                            <td className="p-6 font-bold text-slate-400 text-xs">
                                                {new Date(po.createdAt).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="p-6">
                                                <p className="font-mono font-black text-indigo-600 uppercase text-sm">{po.poNumber}</p>
                                            </td>
                                            <td className="p-6">
                                                <p className="font-black text-slate-800 uppercase text-xs">{po.vendorName}</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`inline-block text-[9px] font-black px-3 py-1 rounded-full uppercase border ${po.status === 'PARTIAL' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleViewPDF(po.pdfPath, 'PO')} className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-sm flex items-center gap-2">
                                                        <FileText className="w-3.5 h-3.5" /> ดู PO
                                                    </button>
                                                    <button onClick={() => handleSelectPO(po)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 shadow-sm flex items-center gap-1">
                                                        <ClipboardCheck className="w-3.5 h-3.5" /> รับของ
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* 💡 TAB: COMPLETED GRs */}
                                    {filterTab === 'COMPLETED' && completedGRs.map((gr) => (
                                        <tr key={gr.id} className="hover:bg-slate-50 transition-none">
                                            <td className="p-6 font-bold text-slate-400 text-xs">
                                                {new Date(gr.createdAt).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="p-6">
                                                <p className="font-mono font-black text-emerald-600 uppercase text-sm">{gr.receiptNo}</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Ref PO: {gr.purchaseOrder?.poNumber || 'N/A'}</p>
                                            </td>
                                            <td className="p-6">
                                                <p className="font-black text-slate-800 uppercase text-xs tracking-tight">{gr.user?.firstName} {gr.user?.lastName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 italic line-clamp-1 max-w-[200px]">{gr.remarks || "รับครบถ้วน"}</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className="inline-block text-[9px] font-black px-3 py-1 rounded-full uppercase border bg-indigo-50 text-indigo-600 border-indigo-100">
                                                    RECEIVED
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => handleViewPDF(gr.pdfPath, 'GR')}
                                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ml-auto shadow-sm
                                                             ${gr.pdfPath
                                                            ? 'bg-white border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                                        }`}
                                                >
                                                    <FileCheck className="w-3.5 h-3.5" />
                                                    {gr.pdfPath ? "ดูใบรับสินค้า GR" : "ไม่มีไฟล์ PDF"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                </tbody>
                            </table>
                        </div>

                        {filterTab === 'PENDING' && pendingPOs.length === 0 && (
                            <div className="p-24 text-center">
                                <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">ไม่มีใบสั่งซื้อรอรับของในระบบ</p>
                            </div>
                        )}

                        {filterTab === 'COMPLETED' && completedGRs.length === 0 && (
                            <div className="p-24 text-center">
                                <FileCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">ยังไม่มีประวัติการรับสินค้า</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- VIEW 2: SPLIT SCREEN FORM --- */}
                {viewMode === 'FORM' && (
                    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">

                        {/* ส่วนหัวแสดงเลขที่ GR และชื่อ Supplier (ปรับให้ดูสะอาดตาขึ้น) */}
                        <div className="bg-slate-900 text-white p-8 lg:p-10 rounded-[3rem] shadow-xl relative overflow-hidden flex flex-wrap gap-8 lg:gap-12 border border-slate-800">
                            <div className="absolute -right-10 -top-10 opacity-[0.03] pointer-events-none">
                                <Package className="w-64 h-64" />
                            </div>
                            <div className="relative z-10 flex-1 min-w-[200px]">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> GR Number (Auto)
                                </p>
                                <p className="font-mono font-black text-2xl lg:text-3xl text-white tracking-tighter">{receiptNo}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Supplier:</span>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{selectedPO?.vendorName}</span>
                                </div>
                            </div>
                            <div className="relative z-10 border-l border-white/10 pl-8 lg:pl-12 flex-1 min-w-[200px]">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Ref. Purchase Order
                                </p>
                                <p className="font-black text-sm uppercase tracking-tight text-slate-200">
                                    {selectedPO?.poNumber}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                                    Ordered By: {selectedPO?.requisition?.user ? `${selectedPO.requisition.user.firstName} ${selectedPO.requisition.user.lastName}` : "System"}
                                </p>
                            </div>
                        </div>

                        {/* ตารางรายการสินค้าแบบเต็มหน้า */}
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <ClipboardCheck className="w-4 h-4 text-emerald-500" /> Receiving Items Detail
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-y border-slate-100">
                                        <tr>
                                            <th className="p-4 text-left">Asset / SKU</th>
                                            <th className="p-4 text-left">Warehouse / Zone</th>
                                            <th className="p-4 text-left min-w-[200px]">Storage Location *</th>
                                            <th className="p-4 text-center w-24">Ordered</th>
                                            <th className="p-4 text-center w-24">Pending</th>
                                            <th className="p-4 text-center w-32 text-emerald-600">Receive Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {items.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50">
                                                <td className="p-4">
                                                    <p className="font-black text-slate-800 uppercase text-xs">[{item.sku}]</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 leading-tight">{item.name}</p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <select value={item.warehouseId} onChange={(e) => updateItem(item.id, "warehouseId", e.target.value)} className="border-2 border-slate-100 rounded-xl px-2 py-2 text-[10px] w-full font-black outline-none focus:border-emerald-400 bg-white">
                                                            <option value="">WH</option>
                                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}
                                                        </select>
                                                        <select value={item.zoneId} onChange={(e) => updateItem(item.id, "zoneId", e.target.value)} disabled={!item.warehouseId} className="border-2 border-slate-100 rounded-xl px-2 py-2 text-[10px] w-full font-black outline-none disabled:bg-slate-50 bg-white">
                                                            <option value="">Zone</option>
                                                            {getAvailableZones(item.warehouseId).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <select value={item.locationId} onChange={(e) => updateItem(item.id, "locationId", e.target.value)} disabled={!item.warehouseId} required className="w-full border-2 border-emerald-200 bg-emerald-50/30 rounded-xl px-3 py-2 text-[10px] font-black text-emerald-700 outline-none focus:border-emerald-500">
                                                        <option value="">-- Select Position --</option>
                                                        {getAvailableLocations(item).map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-4 text-center font-mono font-bold text-slate-400">{item.orderedQuantity}</td>
                                                <td className="p-4 text-center font-mono font-black text-slate-300 text-lg">{item.remainingQuantity}</td>
                                                <td className="p-4">
                                                    <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} className="w-full border-2 border-emerald-500 bg-emerald-50 text-emerald-900 rounded-xl py-3 text-center font-mono font-black text-lg outline-none" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Note & Submit Section */}
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest flex items-center gap-2">
                                        <Info className="w-3 h-3" /> Note / Condition
                                    </label>
                                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows="2" className="w-full border-2 border-slate-100 rounded-2xl p-4 text-xs font-bold focus:border-emerald-500 outline-none bg-slate-50 focus:bg-white" placeholder="ระบุสภาพสินค้าตอนรับเข้า..." />
                                </div>
                                <div className="p-6 rounded-3xl bg-emerald-50/50 border-2 border-dashed border-emerald-200 flex justify-between items-center">
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Receive</p>
                                        <p className="text-3xl font-black font-mono text-slate-900">{totalQty} <span className="text-sm">Units</span></p>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 transition-all disabled:opacity-50 flex items-center gap-3">
                                        {isSubmitting ? "PROCESSING..." : "Confirm & Receive"} <CheckCircle2 className="w-4 h-4" />
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