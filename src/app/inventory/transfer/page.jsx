"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    RefreshCw, Database, ArrowRightLeft, Plus, Trash2, ShieldCheck,
    Package, MapPin, Hash, Info, CheckCircle2, MoveRight,
    ClipboardList, AlertTriangle, Truck, CheckSquare, Search, Warehouse as WhIcon
} from "lucide-react";

export default function TwoStepTransferPage() {
    // --- Global State ---
    const [activeTab, setActiveTab] = useState("SHIP");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Master Data State ---
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [stockBalances, setStockBalances] = useState([]);

    // ==========================================
    // 🚚 STATE: SHIP (ส่งของออก)
    // ==========================================
    const [reason, setReason] = useState("");
    const [shipItems, setShipItems] = useState([{ productId: "", fromLocationId: "", toLocationId: "", quantity: 1 }]);

    // เลขที่เอกสาร Preview (เพื่อแสดงให้ผู้ใช้รู้รูปแบบ)
    const previewTransferNo = useMemo(() => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        return `TO-${dateStr}-XXXX`; // XXXX คือลำดับที่ Backend จะ Gen ให้
    }, []);

    // ==========================================
    // 📥 STATE: RECEIVE (รับของเข้า)
    // ==========================================
    const [pendingTransfers, setPendingTransfers] = useState([]);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [receiveItems, setReceiveItems] = useState([]);

    useEffect(() => {
        loadMasterData();
    }, []);

    useEffect(() => {
        if (activeTab === "RECEIVE") {
            loadPendingTransfers();
        }
    }, [activeTab]);

    async function loadMasterData() {
        try {
            const [pRes, lRes, bRes] = await Promise.all([
                apiFetch("/master/products").catch(() => []),
                apiFetch("/master/locations").catch(() => []),
                apiFetch("/inventory/balances").catch(() => [])
            ]);
            setProducts(Array.isArray(pRes) ? pRes : pRes?.data || []);
            setLocations(Array.isArray(lRes) ? lRes : lRes?.data || []);
            setStockBalances(Array.isArray(bRes) ? bRes : bRes?.data || []);
        } catch (e) {
            toast.error("ดึงข้อมูลระบบล้มเหลว");
        }
    }

    async function loadPendingTransfers() {
        try {
            const res = await apiFetch("/api/transfer?status=SHIPPED").catch(() => []);
            const data = Array.isArray(res) ? res : res?.data || [];
            setPendingTransfers(data);
            setSelectedTransfer(null);
        } catch (e) {
            toast.error("ดึงข้อมูลรายการรอรับล้มเหลว");
        }
    }

    // 💡 ฟังก์ชันหัวใจสำคัญ: จัดรูปแบบชื่อตำแหน่งแบบละเอียด
    const formatLocationFull = (loc) => {
        if (!loc) return "ไม่ระบุตำแหน่ง";
        const whPart = loc.warehouse ? `[${loc.warehouse.code}] ${loc.warehouse.name}` : "ไม่ระบุคลัง";
        const zonePart = loc.zone ? ` | ${loc.zone.name || loc.zone.code}` : "";
        const locPart = ` > ${loc.code}`;
        return `${whPart}${zonePart}${locPart}`;
    };

    // ==========================================
    // 🚚 FUNCTIONS: SHIP (ส่งของออก)
    // ==========================================
    const getAvailableLocations = (productId) => stockBalances.filter(b => b.productId === productId && Number(b.quantity) > 0);
    const getAvailableStock = (productId, locationId) => {
        const balance = stockBalances.find(b => b.productId === productId && b.locationId === locationId);
        return balance ? Number(balance.quantity) : 0;
    };

    const updateShipItem = (idx, field, value) => {
        const newItems = [...shipItems];
        newItems[idx][field] = value;
        if (field === "productId") {
            newItems[idx].fromLocationId = "";
            newItems[idx].toLocationId = "";
        }
        setShipItems(newItems);
    };

    const addShipItem = () => setShipItems([...shipItems, { productId: "", fromLocationId: "", toLocationId: "", quantity: 1 }]);
    const removeShipItem = (idx) => shipItems.length > 1 && setShipItems(shipItems.filter((_, i) => i !== idx));

    const canShip = useMemo(() => {
        return shipItems.every(it =>
            it.productId && it.fromLocationId && it.toLocationId &&
            it.fromLocationId !== it.toLocationId && it.quantity > 0 &&
            it.quantity <= getAvailableStock(it.productId, it.fromLocationId)
        ) && !isSubmitting;
    }, [shipItems, isSubmitting, stockBalances]);

    async function handleShip() {
        setIsSubmitting(true);
        const tid = toast.loading("กำลังสร้างใบโอนย้าย...");
        try {
            await apiFetch("/api/transfer/ship", {
                method: "POST",
                body: JSON.stringify({
                    referenceNo: null, // 💡 ปล่อยว่างเพื่อให้ Backend Gen เลขที่ให้อัตโนมัติ
                    remarks: reason.trim() || null,
                    items: shipItems.map(it => ({ ...it, quantity: Number(it.quantity) }))
                })
            });
            toast.success(`ส่งออกสินค้าสำเร็จ ระบบออกเลขที่เอกสารให้อัตโนมัติ`, { id: tid });
            setReason("");
            setShipItems([{ productId: "", fromLocationId: "", toLocationId: "", quantity: 1 }]);
            loadMasterData();
        } catch (e) {
            toast.error(e.message || "เกิดข้อผิดพลาดในการส่งออก", { id: tid });
        } finally {
            setIsSubmitting(false);
        }
    }

    // ==========================================
    // 📥 FUNCTIONS: RECEIVE (รับของเข้า)
    // ==========================================
    const selectTransferToReceive = (transfer) => {
        setSelectedTransfer(transfer);
        const itemsForm = transfer.items.map(it => ({
            itemId: it.id,
            productName: it.product?.name || "Unknown Product",
            sku: it.product?.sku || "N/A",
            // 💡 แสดงชื่อตำแหน่งปลายทางแบบเต็มในหน้ากดยืนยัน
            targetLocationDetail: formatLocationFull(it.toLocation),
            shippedQty: it.shippedQty,
            receivedQty: it.shippedQty 
        }));
        setReceiveItems(itemsForm);
    };

    const updateReceiveItem = (idx, value) => {
        const newItems = [...receiveItems];
        newItems[idx].receivedQty = Number(value);
        setReceiveItems(newItems);
    };

    const canReceive = selectedTransfer && !isSubmitting && receiveItems.every(it => it.receivedQty >= 0);

    async function handleReceive() {
        setIsSubmitting(true);
        const tid = toast.loading("กำลังยืนยันการรับสินค้า...");
        try {
            await apiFetch(`/api/transfer/${selectedTransfer.id}/receive`, {
                method: "PUT",
                body: JSON.stringify({
                    items: receiveItems.map(it => ({
                        itemId: it.itemId,
                        receivedQty: Number(it.receivedQty)
                    }))
                })
            });
            toast.success(`ปิดใบงานโอนย้ายสำเร็จ สินค้าเข้าคลังเรียบร้อย`, { id: tid });
            setSelectedTransfer(null);
            loadPendingTransfers();
            loadMasterData();
        } catch (e) {
            toast.error(e.message || "เกิดข้อผิดพลาดในการรับเข้า", { id: tid });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-6 px-4 md:px-0">

                {/* --- Header --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Inventory Movement Control</p>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            โอนย้ายสินค้าระหว่างคลัง
                            <span className="not-italic bg-slate-900 text-white text-[9px] px-3 py-1 rounded-full tracking-[0.2em] font-black shadow-lg uppercase">System</span>
                        </h1>
                    </div>
                </div>

                {/* --- Tab Navigation --- */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-md shadow-inner">
                    <button onClick={() => setActiveTab("SHIP")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "SHIP" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        <Truck className="w-4 h-4" /> 1. ส่งของออก (Ship)
                    </button>
                    <button onClick={() => setActiveTab("RECEIVE")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "RECEIVE" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        <CheckSquare className="w-4 h-4" /> 2. รับของเข้า (Receive)
                    </button>
                </div>

                {/* 🚚 TAB: SHIP (โอนออก) */}
                {activeTab === "SHIP" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* ส่วนหัวเอกสาร (Auto-ID) */}
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black px-8 py-2 rounded-bl-3xl tracking-widest uppercase">Auto-Generation</div>
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-indigo-500" /> 1. ข้อมูลบิลโอนย้ายพัสดุ
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 ml-1">
                                        <Hash className="w-3.5 h-3.5" /> เลขที่เอกสาร (ระบบกำหนดให้อัตโนมัติ)
                                    </label>
                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                                        <div className="bg-white p-2 rounded-lg shadow-sm"><RefreshCw className="w-4 h-4 text-slate-400 animate-spin-slow" /></div>
                                        <span className="text-lg font-mono font-black text-slate-400 tracking-tighter">{previewTransferNo}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                                        <Info className="w-3.5 h-3.5" /> หมายเหตุ / เหตุผลการเบิกโอน
                                    </label>
                                    <textarea 
                                        className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all bg-slate-50/30" 
                                        rows="1"
                                        placeholder="ระบุเหตุผลสั้นๆ เช่น ย้ายไปเก็บโซนใหม่..."
                                        value={reason} 
                                        onChange={e => setReason(e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* รายการพัสดุ (Items) */}
                        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                    <Package className="w-5 h-5 text-indigo-400" /> 2. รายการพัสดุที่ต้องการย้ายตำแหน่ง
                                </h2>
                                <button onClick={addShipItem} className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] px-6 py-2.5 rounded-xl uppercase tracking-widest flex items-center gap-2 border border-white/10 transition-all">
                                    <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                                </button>
                            </div>
                            
                            <div className="p-4 space-y-4">
                                {shipItems.map((it, idx) => {
                                    const availableLocs = getAvailableLocations(it.productId);
                                    return (
                                        <div key={idx} className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6 relative group">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                                                {/* เลือกสินค้า */}
                                                <div className="md:col-span-4 space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">เลือกสินค้า</label>
                                                    <select className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-[11px] font-black uppercase outline-none focus:border-indigo-500 bg-white" value={it.productId} onChange={e => updateShipItem(idx, "productId", e.target.value)}>
                                                        <option value="">-- ค้นหารหัส หรือ ชื่อพัสดุ --</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                                    </select>
                                                </div>
                                                {/* ตำแหน่งต้นทางแบบละเอียด */}
                                                <div className="md:col-span-3 space-y-2">
                                                    <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> ต้นทาง (Origin)</label>
                                                    <select className="w-full border-2 border-rose-100 rounded-2xl p-3.5 text-[10px] font-bold outline-none focus:border-rose-500 bg-white" value={it.fromLocationId} onChange={e => updateShipItem(idx, "fromLocationId", e.target.value)}>
                                                        <option value="">-- เลือกคลังต้นทาง --</option>
                                                        {availableLocs.map(l => (
                                                            <option key={l.locationId} value={l.locationId}>
                                                                {formatLocationFull(l.location)} (คงเหลือ: {l.quantity})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {/* ตำแหน่งปลายทางแบบละเอียด */}
                                                <div className="md:col-span-3 space-y-2">
                                                    <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1 flex items-center gap-1"><MoveRight className="w-3 h-3" /> ปลายทาง (Destination)</label>
                                                    <select className="w-full border-2 border-emerald-100 rounded-2xl p-3.5 text-[10px] font-bold outline-none focus:border-emerald-500 bg-white" value={it.toLocationId} onChange={e => updateShipItem(idx, "toLocationId", e.target.value)}>
                                                        <option value="">-- เลือกคลังปลายทาง --</option>
                                                        {locations.map(l => (
                                                            <option key={l.id} value={l.id}>{formatLocationFull(l)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {/* จำนวน */}
                                                <div className="md:col-span-1 space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">จำนวน</label>
                                                    <input type="number" min="1" className="w-full border-2 border-slate-200 rounded-2xl p-3 text-sm font-mono font-black text-center outline-none focus:border-indigo-500" value={it.quantity} onChange={e => updateShipItem(idx, "quantity", e.target.value)} />
                                                </div>
                                                <div className="md:col-span-1 flex justify-center pb-2">
                                                    <button onClick={() => removeShipItem(idx)} className="p-3 text-slate-300 hover:text-rose-600 transition-all"><Trash2 className="w-5 h-5" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ปุ่มบันทึก */}
                        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex justify-end items-center sticky bottom-6 border border-white/5">
                            <button
                                onClick={handleShip}
                                disabled={!canShip || isSubmitting}
                                className="bg-indigo-600 hover:bg-emerald-600 text-white px-14 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all flex items-center gap-3 disabled:bg-slate-800"
                            >
                                <Truck className="w-5 h-5" /> {isSubmitting ? "กำลังบันทึก..." : "✓ ยืนยันการส่งออกสินค้า"}
                            </button>
                        </div>
                    </div>
                )}

                {/* 📥 TAB: RECEIVE (รับของเข้า) */}
                {activeTab === "RECEIVE" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {!selectedTransfer ? (
                            /* หน้ารายการ In-Transit */
                            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10">
                                <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-emerald-500" /> รายการพัสดุอยู่ระหว่างจัดส่ง (In-Transit)
                                </h2>
                                {pendingTransfers.length === 0 ? (
                                    <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-sm">ไม่มีรายการค้างรับในขณะนี้</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {pendingTransfers.map(t => (
                                            <div key={t.id} onClick={() => selectTransferToReceive(t)} className="p-8 border-2 border-slate-100 rounded-[2.5rem] hover:border-emerald-500 cursor-pointer transition-all bg-white hover:shadow-2xl group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-6 py-1.5 text-[8px] font-black tracking-widest uppercase">Shipped</div>
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className="text-sm font-mono font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 uppercase italic">{t.transferNo}</span>
                                                    <MoveRight className="w-6 h-6 text-slate-200 group-hover:text-emerald-500 transition-colors" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2"><WhIcon className="w-3 h-3"/> ผู้ส่ง: <span className="text-slate-800">{t.issuedUser?.firstName || 'System'}</span></p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2"><ClipboardList className="w-3 h-3"/> รายการ: <span className="text-slate-800">{t.items?.length || 0} รายการ</span></p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2"><Info className="w-3 h-3"/> เมื่อ: <span className="text-slate-800">{new Date(t.shippedAt).toLocaleString('th-TH')}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* หน้าฟอร์มรับของ */
                            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-900 p-10 flex justify-between items-center text-white">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Confirmation Process</p>
                                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">{selectedTransfer.transferNo}</h2>
                                    </div>
                                    <button onClick={() => setSelectedTransfer(null)} className="text-xs font-black text-slate-400 hover:text-white underline uppercase tracking-widest">ยกเลิกรายการ</button>
                                </div>

                                <div className="p-10 space-y-6">
                                    {receiveItems.map((it, idx) => {
                                        const isMissing = it.receivedQty < it.shippedQty;
                                        return (
                                            <div key={idx} className={`grid grid-cols-1 md:grid-cols-12 gap-8 items-center p-8 rounded-[2.5rem] border-2 transition-all ${isMissing ? 'border-rose-200 bg-rose-50/20' : 'border-slate-100 bg-slate-50/30'}`}>
                                                <div className="md:col-span-4">
                                                    <p className="text-[10px] font-black text-indigo-600 font-mono uppercase mb-1">{it.sku}</p>
                                                    <p className="text-base font-bold text-slate-800">{it.productName}</p>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">ตำแหน่งจัดเก็บ (Detailed Location)</span>
                                                    <p className="text-xs font-black text-slate-600 leading-relaxed">{it.targetLocationDetail}</p>
                                                </div>
                                                <div className="md:col-span-2 text-center border-x border-slate-200">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">ยอดส่งมา</span>
                                                    <p className="text-2xl font-black font-mono text-slate-700">{it.shippedQty}</p>
                                                </div>
                                                <div className="md:col-span-2 text-center pl-4">
                                                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-1">ยอดรับจริง *</label>
                                                    <input type="number" min="0" max={it.shippedQty} className={`w-full border-2 rounded-2xl p-4 text-xl font-mono font-black text-center outline-none transition-all ${isMissing ? 'border-rose-500 text-rose-600 bg-white' : 'border-slate-200 bg-white focus:border-indigo-500'}`} value={it.receivedQty} onChange={e => updateReceiveItem(idx, e.target.value)} />
                                                </div>
                                                {isMissing && (
                                                    <div className="md:col-span-12 flex items-center gap-3 p-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                        <AlertTriangle className="w-5 h-5" /> ตรวจพบสินค้าขาด (สูญหาย {it.shippedQty - it.receivedQty} ชิ้น) ระบบจะทำบันทึกแจ้งพนักงานความปลอดภัยอัตโนมัติ
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end">
                                    <button onClick={handleReceive} disabled={!canReceive || isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-16 py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center gap-3">
                                        <CheckSquare className="w-6 h-6" /> {isSubmitting ? "กำลังยืนยัน..." : "รับสินค้าและปิดตารางโอนย้าย"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AuthGate>
    );
}