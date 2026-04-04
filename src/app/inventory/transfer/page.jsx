"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    RefreshCw,
    Database,
    ArrowRightLeft,
    Plus,
    Trash2,
    ShieldCheck,
    Package,
    MapPin,
    Hash,
    Info,
    CheckCircle2,
    MoveRight,
    ClipboardList,
    XCircle,    // 💡 แก้ไข: เพิ่มการ Import ไอคอนที่ขาดไป
    AlertTriangle
} from "lucide-react";

export default function TransferPage() {
    // Master Data
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [stockBalances, setStockBalances] = useState([]);

    // Form State
    const [transferNo, setTransferNo] = useState("");
    const [reason, setReason] = useState("");
    const [items, setItems] = useState([{ productId: "", fromLocationId: "", toLocationId: "", quantity: 1 }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function loadMasterData() {
            try {
                const [p, l, b] = await Promise.all([
                    apiFetch("/master/products"),
                    apiFetch("/master/locations"),
                    apiFetch("/inventory/balances")
                ]);
                setProducts(p || []);
                setLocations(l || []);
                setStockBalances(Array.isArray(b) ? b : b?.data || []);
            } catch (e) {
                toast.error("ดึงข้อมูลระบบล้มเหลว กรุณารีเฟรชหน้าจอ");
            }
        }
        loadMasterData();
    }, []);

    const getAvailableLocations = (productId) => {
        if (!Array.isArray(stockBalances)) return [];
        return stockBalances.filter(b => b.productId === productId && Number(b.quantity) > 0);
    };

    const getAvailableStock = (productId, locationId) => {
        if (!Array.isArray(stockBalances)) return 0;
        const balance = stockBalances.find(b => b.productId === productId && b.locationId === locationId);
        return balance ? Number(balance.quantity) : 0;
    };

    const updateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx][field] = value;
        if (field === "productId") {
            newItems[idx].fromLocationId = "";
            newItems[idx].toLocationId = "";
        }
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { productId: "", fromLocationId: "", toLocationId: "", quantity: 1 }]);
    const removeItem = (idx) => items.length > 1 && setItems(items.filter((_, i) => i !== idx));

    const canSubmit = useMemo(() => {
        const hasHeader = transferNo.trim() !== "";
        const hasValidItems = items.every(it =>
            it.productId &&
            it.fromLocationId &&
            it.toLocationId &&
            it.fromLocationId !== it.toLocationId &&
            it.quantity > 0 &&
            it.quantity <= getAvailableStock(it.productId, it.fromLocationId)
        );
        return hasHeader && hasValidItems && !isSubmitting;
    }, [transferNo, items, isSubmitting, stockBalances]);

    async function handleTransfer() {
        const validItems = items.filter(it =>
            it.productId !== "" &&
            it.fromLocationId !== "" &&
            it.toLocationId !== "" &&
            Number(it.quantity) > 0
        );

        if (validItems.length === 0) {
            return toast.error("กรุณาระบุข้อมูลสินค้าและตำแหน่งให้ครบถ้วน");
        }

        if (validItems.some(it => it.fromLocationId === it.toLocationId)) {
            return toast.error("ตำแหน่งต้นทางและปลายทางต้องไม่เป็นที่เดียวกัน");
        }

        setIsSubmitting(true);
        const tid = toast.loading("กำลังประมวลผลธุรกรรม...");

        try {
            await apiFetch("/inventory/transfer", {
                method: "POST",
                body: JSON.stringify({
                    referenceNo: transferNo.trim() || null,
                    remarks: reason.trim() || null,
                    items: validItems.map(it => ({
                        productId: it.productId,
                        fromLocationId: it.fromLocationId,
                        toLocationId: it.toLocationId,
                        quantity: Number(it.quantity)
                    }))
                })
            });

            toast.success(`บันทึกการโอนย้ายสำเร็จ`, { id: tid });
            setTransferNo("");
            setReason("");
            setItems([{ productId: "", fromLocationId: "", toLocationId: "", quantity: 1 }]);

            const newBalances = await apiFetch("/inventory/balances");
            setStockBalances(Array.isArray(newBalances) ? newBalances : newBalances?.data || []);

        } catch (e) {
            toast.error(e.message || "เกิดข้อผิดพลาดในการโอนย้าย", { id: tid });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-6">

                {/* --- ส่วนหัวข้อ (Header) --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4 px-4 md:px-0">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Internal Asset Management</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            บันทึกการโอนย้ายพัสดุ
                            <span className="not-italic bg-slate-900 text-white text-[9px] px-3 py-1 rounded-full tracking-[0.2em] font-black shadow-lg uppercase">Transaction</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2 mt-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            TJC GROUP: ระบบควบคุมการย้ายตำแหน่งพัสดุภายในคลัง
                        </p>
                    </div>
                </div>

                {/* --- ข้อมูลเอกสาร (Document Header) --- */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group mx-4 md:mx-0">
                    <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black px-8 py-2 rounded-bl-3xl tracking-[0.2em] uppercase">Document Header</div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-indigo-500" /> 1. รายละเอียดข้อมูลการโอนย้าย
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 ml-1">
                                <Hash className="w-3.5 h-3.5" /> เลขที่เอกสารอ้างอิง *
                            </label>
                            <input
                                className="w-full border-2 border-slate-100 rounded-2xl p-4 font-mono text-sm font-black text-slate-800 focus:border-indigo-500 outline-none transition-all bg-slate-50/30"
                                placeholder="เช่น TO-202604-001"
                                value={transferNo}
                                onChange={e => setTransferNo(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                                <Info className="w-3.5 h-3.5" /> เหตุผลการโอนย้าย
                            </label>
                            <input
                                className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all bg-slate-50/30"
                                placeholder="เช่น ย้ายเพื่อจัดระเบียบโซนใหม่ หรือ เตรียมจ่ายหน้างาน..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* --- รายการพัสดุ (Items Manifest) --- */}
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden mx-4 md:mx-0">
                    <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3">
                            <Package className="w-5 h-5 text-indigo-400" /> 2. รายการพัสดุที่ต้องการย้าย (Transfer List)
                        </h2>
                        <button type="button" onClick={addItem} className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] px-6 py-2.5 rounded-xl uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10">
                            <Plus className="w-3.5 h-3.5" /> เพิ่มรายการพัสดุ
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {items.map((it, idx) => {
                            const availableLocations = getAvailableLocations(it.productId);
                            const currentStock = getAvailableStock(it.productId, it.fromLocationId);
                            const isSameLoc = it.fromLocationId && it.toLocationId && it.fromLocationId === it.toLocationId;
                            const isOverStock = it.quantity > currentStock && it.fromLocationId !== "";

                            return (
                                <div key={idx} className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6 relative group">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">

                                        {/* Product Selection */}
                                        <div className="md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">เลือกพัสดุ/สินค้า</label>
                                            <select
                                                className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-[11px] font-black uppercase outline-none focus:border-indigo-500 bg-white shadow-sm"
                                                value={it.productId}
                                                onChange={e => updateItem(idx, "productId", e.target.value)}
                                            >
                                                <option value="">-- ค้นหารหัส หรือ ชื่อพัสดุ --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                            </select>
                                        </div>

                                        {/* Source */}
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> คลังต้นทาง
                                            </label>
                                            <select
                                                disabled={!it.productId}
                                                className="w-full border-2 border-rose-100 rounded-2xl p-3.5 text-[10px] bg-rose-50/30 outline-none focus:border-rose-500 font-bold disabled:opacity-30 transition-all shadow-sm"
                                                value={it.fromLocationId}
                                                onChange={e => updateItem(idx, "fromLocationId", e.target.value)}
                                            >
                                                <option value="">-- เลือกตำแหน่งที่หยิบของ --</option>
                                                {availableLocations.map(loc => (
                                                    <option key={loc.locationId} value={loc.locationId}>
                                                        🏢 {loc.location.warehouse?.code} | {loc.location.code} (คงเหลือ: {loc.quantity})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Target */}
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                <MoveRight className="w-3 h-3" /> คลังปลายทาง
                                            </label>
                                            <select
                                                className={`w-full border-2 rounded-2xl p-3.5 text-[10px] bg-emerald-50/30 outline-none focus:border-emerald-500 font-bold shadow-sm transition-all ${isSameLoc ? 'border-rose-500' : 'border-emerald-100'}`}
                                                value={it.toLocationId}
                                                onChange={e => updateItem(idx, "toLocationId", e.target.value)}
                                            >
                                                <option value="">-- เลือกตำแหน่งที่นำไปเก็บ --</option>
                                                {locations.map(l => (
                                                    <option key={l.id} value={l.id}>
                                                        🏢 {l.warehouse?.code} | {l.zone?.name || 'GEN'} | {l.code}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Qty */}
                                        <div className="md:col-span-1 space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">จำนวน</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className={`w-full border-2 rounded-2xl p-3 text-sm font-mono font-black text-center outline-none transition-all shadow-inner ${isOverStock ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-slate-200 bg-white focus:border-indigo-500'}`}
                                                value={it.quantity}
                                                onChange={e => updateItem(idx, "quantity", e.target.value)}
                                            />
                                        </div>

                                        {/* Delete */}
                                        <div className="md:col-span-1 flex justify-center pb-1">
                                            <button type="button" onClick={() => removeItem(idx)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-white rounded-2xl transition-all shadow-sm group-hover:text-slate-400">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Warning Messages */}
                                    {(isSameLoc || isOverStock || (availableLocations.length === 0 && it.productId)) && (
                                        <div className="flex gap-4 justify-end">
                                            {isSameLoc && <span className="text-[9px] font-black text-rose-600 uppercase bg-rose-100 px-3 py-1 rounded-lg flex items-center gap-1 italic animate-pulse">ห้ามเลือกตำแหน่งซ้ำกัน</span>}
                                            {isOverStock && <span className="text-[9px] font-black text-rose-600 uppercase bg-rose-100 px-3 py-1 rounded-lg flex items-center gap-1 italic animate-pulse">สต๊อกต้นทางไม่พอ</span>}
                                            {availableLocations.length === 0 && it.productId && <span className="text-[9px] font-black text-rose-600 uppercase bg-rose-100 px-3 py-1 rounded-lg flex items-center gap-1 italic animate-pulse">ไม่พบสต๊อกในระบบ</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- แถบปุ่มบันทึก (Action Bar) --- */}
                <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex justify-between items-center sticky bottom-6 border border-white/5 mx-4 md:mx-0">
                    <div className="flex items-center gap-4 px-6 border-l-4 border-indigo-500">
                        <ShieldCheck className="w-10 h-10 text-indigo-400" />
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Authorization Status</p>
                            <p className="text-white text-sm font-bold uppercase tracking-tight italic opacity-80 underline decoration-indigo-500 decoration-2">ตรวจสอบข้อมูลธุรกรรมสำเร็จ</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={!canSubmit || isSubmitting}
                        onClick={handleTransfer}
                        className="bg-indigo-600 hover:bg-emerald-600 text-white px-14 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/50 transition-all flex items-center gap-3 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none"
                    >
                        {isSubmitting ? "กำลังบันทึกบัญชี..." : "✓ ยืนยันการโอนย้ายพัสดุ"}
                    </button>
                </div>

                {/* Footer Sync Note */}
                <div className="text-center pt-10 border-t border-slate-100/50 mx-4 md:mx-0">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-3">
                        <Database className="w-4 h-4" /> TJC GROUP LOGISTICS • SECURE INTERNAL LEDGER
                    </p>
                </div>
            </div>
        </AuthGate>
    );
}