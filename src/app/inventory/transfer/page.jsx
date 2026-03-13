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
    ClipboardList
} from "lucide-react";

export default function TransferPage() {
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [stockBalances, setStockBalances] = useState([]);
    const [transferNo, setTransferNo] = useState("");
    const [reason, setReason] = useState("");
    const [items, setItems] = useState([{ productId: "", fromLocationId: "", toLocationId: "", quantity: 1 }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [p, l, b] = await Promise.all([
                    apiFetch("/master/products"),
                    apiFetch("/master/locations"),
                    apiFetch("/inventory/balances")
                ]);
                setProducts(p);
                setLocations(l);
                setStockBalances(b);
            } catch (e) {
                toast.error("โหลดข้อมูลระบบล้มเหลว กรุณารีเฟรชหน้าจอ");
            }
        }
        load();
    }, []);

    const getAvailableLocations = (productId) => {
        if (!productId) return [];
        return stockBalances
            .filter(b => b.productId === productId && b.quantity > 0)
            .sort((a, b) => b.quantity - a.quantity);
    };

    const getAvailableStock = (pId, lId) => {
        const found = stockBalances.find(b => b.productId === pId && b.locationId === lId);
        return found ? found.quantity : 0;
    };

    const updateItem = (idx, field, value) => {
        const n = [...items];
        n[idx][field] = value;
        if (field === "productId") {
            n[idx].fromLocationId = "";
            n[idx].toLocationId = "";
        }
        setItems(n);
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
        setIsSubmitting(true);
        const tid = toast.loading("กำลังประมวลผลธุรกรรมโอนย้าย...");

        try {
            await apiFetch("/inventory/transfer", {
                method: "POST",
                body: JSON.stringify({
                    transferNo: transferNo.trim(),
                    reason: reason.trim(),
                    items: items.map(it => ({ ...it, quantity: Number(it.quantity) }))
                })
            });

            toast.success(`บันทึกใบโอนย้าย ${transferNo} สำเร็จ`, { id: tid });
            setTransferNo("");
            setReason("");
            setItems([{ productId: "", fromLocationId: "", toLocationId: "", quantity: 1 }]);

            const newBalances = await apiFetch("/inventory/balances");
            setStockBalances(newBalances);
        } catch (e) {
            toast.error(e.message || "เกิดข้อผิดพลาดในการโอนย้าย", { id: tid });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Internal Logistics Relocation</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Stock Transfer
                            <span className="not-italic bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-indigo-700 shadow-lg uppercase">Transaction Mode</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                            TJC GROUP: บันทึกใบโอนย้ายสินค้าระหว่างคลัง/โซน (Internal Control)
                        </p>
                    </div>
                </div>

                {/* DOCUMENT INFO CARD */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black px-6 py-1.5 rounded-bl-2xl tracking-[0.2em] uppercase">Document Master Record</div>

                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-500" /> 1. Transaction Metadata
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Transfer Order (TO No.) *
                            </label>
                            <input
                                required
                                className="w-full border-2 border-slate-200 rounded-xl p-3 font-mono text-sm font-black text-slate-800 focus:border-indigo-500 outline-none transition-none"
                                placeholder="TO-YYYYMM-XXXX"
                                value={transferNo}
                                onChange={e => setTransferNo(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" /> Purpose of Relocation
                            </label>
                            <input
                                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 transition-none"
                                placeholder="ระบุเหตุผลเพื่อการตรวจสอบ Audit Trail..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ITEMS SECTION */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-500" /> 2. Relocation Manifest (Line Items)
                        </h2>
                        <button type="button" onClick={addItem} className="bg-slate-900 text-white font-black text-[10px] px-5 py-2.5 rounded-xl uppercase tracking-widest hover:bg-indigo-600 transition-none flex items-center gap-2 shadow-lg shadow-slate-200">
                            <Plus className="w-3 h-3" /> Add Relocation
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {items.map((it, idx) => {
                            const availableLocations = getAvailableLocations(it.productId);
                            const currentStock = getAvailableStock(it.productId, it.fromLocationId);
                            const isSameLoc = it.fromLocationId && it.toLocationId && it.fromLocationId === it.toLocationId;
                            const isOverStock = it.quantity > currentStock && it.fromLocationId !== "";

                            return (
                                <div key={idx} className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

                                        {/* Product Select */}
                                        <div className="md:col-span-4 space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                Asset to Move
                                            </label>
                                            <select
                                                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[11px] font-black uppercase outline-none focus:border-indigo-400 bg-white"
                                                value={it.productId}
                                                onChange={e => updateItem(idx, "productId", e.target.value)}
                                            >
                                                <option value="">-- Search Product --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                            </select>
                                        </div>

                                        {/* Source Selection */}
                                        <div className="md:col-span-3 space-y-1.5">
                                            <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> Source (Origin)
                                            </label>
                                            <select
                                                disabled={!it.productId}
                                                className="w-full border-2 border-rose-100 rounded-xl p-3 text-[10px] bg-rose-50/30 outline-none focus:border-rose-500 font-bold disabled:opacity-50"
                                                value={it.fromLocationId}
                                                onChange={e => updateItem(idx, "fromLocationId", e.target.value)}
                                            >
                                                <option value="">-- Select Source Pos. --</option>
                                                {availableLocations.map(loc => (
                                                    <option key={loc.locationId} value={loc.locationId}>
                                                        🏢 {loc.location.warehouse?.code} | {loc.location.code} (BAL: {loc.quantity})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Destination Selection */}
                                        <div className="md:col-span-3 space-y-1.5">
                                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                                <MoveRight className="w-3 h-3" /> Target (Destination)
                                            </label>
                                            <select
                                                className={`w-full border-2 rounded-xl p-3 text-[10px] bg-emerald-50/30 outline-none focus:border-emerald-500 font-bold ${isSameLoc ? 'border-rose-500' : 'border-emerald-100'}`}
                                                value={it.toLocationId}
                                                onChange={e => updateItem(idx, "toLocationId", e.target.value)}
                                            >
                                                <option value="">-- Select Target Pos. --</option>
                                                {locations.map(l => (
                                                    <option key={l.id} value={l.id}>
                                                        🏢 {l.warehouse?.code} | {l.zone?.name || 'GEN'} | {l.code}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Quantity */}
                                        <div className="md:col-span-1 space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={currentStock || 1}
                                                className={`w-full border-2 rounded-xl p-2.5 text-sm font-mono font-black text-center outline-none transition-none ${isOverStock ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-slate-200 bg-white focus:border-indigo-500'}`}
                                                value={it.quantity}
                                                onChange={e => updateItem(idx, "quantity", e.target.value)}
                                            />
                                        </div>

                                        {/* Remove Action */}
                                        <div className="md:col-span-1 flex justify-center pb-1">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-none"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Error Messaging (Static) */}
                                    {(isSameLoc || isOverStock || (availableLocations.length === 0 && it.productId)) && (
                                        <div className="flex gap-4 justify-end">
                                            {isSameLoc && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Origin & Target must be different</span>}
                                            {isOverStock && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Insufficient stock for relocation</span>}
                                            {availableLocations.length === 0 && it.productId && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 flex items-center gap-1"><XCircle className="w-3 h-3" /> No stock available in any facility</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* GLOBAL ACTION BAR */}
                <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex justify-between items-center sticky bottom-6 border border-white/5">
                    <div className="flex items-center gap-4 px-4 border-l-4 border-indigo-500">
                        <ShieldCheck className="w-8 h-8 text-indigo-400" />
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Asset Relocation Policy</p>
                            <p className="text-white text-xs font-bold uppercase tracking-tight italic opacity-80 underline decoration-indigo-500 decoration-2">Verified Internal Transfer Ledger</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            disabled={!canSubmit || isSubmitting}
                            onClick={handleTransfer}
                            className="bg-indigo-600 hover:bg-emerald-600 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/50 transition-none disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none flex items-center gap-3"
                        >
                            {isSubmitting ? "COMMITING TRANSACTION..." : "✓ Commit Relocation Order"}
                        </button>
                    </div>
                </div>

                {/* SYNC NOTE */}
                <div className="flex justify-center items-center gap-2 py-4">
                    <CheckCircle2 className="w-3 h-3 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Stock movements are synchronized in real-time across the TJC Network</span>
                </div>
            </div>
        </AuthGate>
    );
}