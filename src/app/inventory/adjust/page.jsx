"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    Scale,
    AlertCircle,
    Database,
    ArrowLeft,
    Package,
    MapPin,
    Plus,
    Trash2,
    ShieldCheck,
    Info,
    Hash,
    CheckCircle2,
    FileText
} from "lucide-react";

export default function StockAdjustmentPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [productBalances, setProductBalances] = useState({});
    const [adjustNo, setAdjustNo] = useState(`ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`);
    const [reasonCode, setReasonCode] = useState('');
    const [remarks, setRemarks] = useState('');
    const [items, setItems] = useState([
        { id: Date.now(), productId: '', locationId: '', oldQuantity: 0, newQuantity: '', diffQuantity: 0 }
    ]);

    useEffect(() => {
        async function loadMasterData() {
            try {
                const [pRes, lRes] = await Promise.all([
                    apiFetch("/master/products").catch(() => []),
                    apiFetch("/master/locations").catch(() => [])
                ]);
                setProducts(pRes);
                setLocations(lRes);
            } catch (error) {
                toast.error("ไม่สามารถโหลดข้อมูลคลังสินค้าได้");
            }
        }
        loadMasterData();
    }, []);

    const fetchBalanceForProduct = async (productId) => {
        if (!productId || productBalances[productId]) return;
        try {
            const res = await apiFetch(`/inventory/balances?productId=${productId}`);
            const balancesData = Array.isArray(res) ? res : (res.data || []);
            setProductBalances(prev => ({ ...prev, [productId]: balancesData }));
        } catch (error) {
            console.error("Failed to fetch balance");
        }
    };

    const handleItemChange = async (index, field, value) => {
        const newItems = [...items];
        const item = newItems[index];
        item[field] = value;

        if (field === 'productId') {
            item.locationId = '';
            item.oldQuantity = 0;
            item.newQuantity = '';
            item.diffQuantity = 0;
            setItems([...newItems]);
            await fetchBalanceForProduct(value);
            return;
        }
        if (field === 'locationId' && item.productId) {
            const balancesForThisProduct = productBalances[item.productId] || [];
            const exactBalance = balancesForThisProduct.find(b => b.location?.id === value);
            item.oldQuantity = exactBalance ? exactBalance.quantity : 0;
            if (item.newQuantity !== '') {
                const newQty = parseInt(item.newQuantity) || 0;
                item.diffQuantity = newQty - item.oldQuantity;
            }
        }
        if (field === 'newQuantity') {
            const newQty = parseInt(value) || 0;
            item.newQuantity = value === '' ? '' : newQty;
            item.diffQuantity = value === '' ? 0 : newQty - item.oldQuantity;
        }
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { id: Date.now(), productId: '', locationId: '', oldQuantity: 0, newQuantity: '', diffQuantity: 0 }]);
    const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reasonCode) return toast.error("กรุณาระบุรหัสสาเหตุ (Reason Code)");
        const validItems = items.filter(it => it.productId && it.locationId && it.newQuantity !== '');
        if (validItems.length === 0) return toast.error("กรุณาระบุสินค้าอย่างน้อย 1 รายการ");
        if (validItems.some(it => it.newQuantity < 0)) return toast.error("ยอดใหม่ต้องไม่ติดลบ");

        if (!confirm(`⚠️ ยืนยันการปรับปรุงยอดสต๊อก?\nการกระทำนี้จะถูกบันทึกลง Audit Log ทันที`)) return;

        setIsLoading(true);
        try {
            const payload = {
                adjustNo,
                reasonCode,
                remarks: remarks.trim() !== '' ? remarks.trim() : undefined,
                items: validItems.map(it => ({
                    productId: it.productId,
                    locationId: it.locationId,
                    oldQuantity: Number(it.oldQuantity),
                    newQuantity: Number(it.newQuantity),
                    diffQuantity: Number(it.diffQuantity)
                }))
            };
            const res = await apiFetch("/inventory/adjust", { method: "POST", body: JSON.stringify(payload) });
            if (res.success) {
                toast.success(res.message);
                setTimeout(() => router.push('/history'), 1500);
            }
        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดในการปรับปรุงยอด");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-5xl mx-auto space-y-6">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory Reconciliation</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Stock Adjustment
                            <span className="not-italic bg-rose-600 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-rose-700 shadow-lg">HIGH SECURITY</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            เอกสารตรวจนับและปรับปรุงยอดสินค้าคงคลัง (Cycle Count)
                        </p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-none"
                    >
                        <ArrowLeft className="w-4 h-4" /> Cancel Transaction
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* DOCUMENT INFO CARD */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black px-6 py-1.5 rounded-bl-2xl tracking-[0.2em] uppercase">Audit Trail Active</div>

                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Info className="w-4 h-4 text-indigo-500" /> 1. Document Identification
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> Adjustment No. (Auto)
                                </label>
                                <input type="text" value={adjustNo} readOnly className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm bg-slate-50 font-mono font-bold text-slate-500 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Reason Code *
                                </label>
                                <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-rose-500 bg-rose-50/20 text-slate-800 transition-none" required>
                                    <option value="">-- Select Reason --</option>
                                    <option value="MISCOUNT">นับผิดพลาด (Miscount)</option>
                                    <option value="DAMAGED">สินค้าชำรุด/เสียหาย (Damaged)</option>
                                    <option value="LOST">สินค้าสูญหาย (Lost)</option>
                                    <option value="FOUND">ค้นพบสินค้าตกหล่น (Found)</option>
                                    <option value="EXPIRED">สินค้าหมดอายุ (Expired)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Audit Remarks
                                </label>
                                <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter audit observations..." className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 transition-none" />
                            </div>
                        </div>
                    </div>

                    {/* ADJUSTMENT ITEMS TABLE */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Scale className="w-4 h-4 text-indigo-500" /> 2. Inventory Variance List
                            </h2>
                            <button type="button" onClick={addItem} className="bg-white border border-slate-200 text-indigo-600 font-black text-[10px] px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-none flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add Item
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">
                                        <th className="p-6">Asset Specification</th>
                                        <th className="p-6">Location & Live Balance</th>
                                        <th className="p-6 text-center">System</th>
                                        <th className="p-6 text-center text-indigo-600">Actual Count</th>
                                        <th className="p-6 text-center">Variance</th>
                                        <th className="p-6 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((item, index) => {
                                        const currentProductBalances = productBalances[item.productId] || [];
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-none">
                                                <td className="p-4 min-w-[250px]">
                                                    <select value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 text-[11px] font-black uppercase outline-none focus:border-indigo-400 bg-white" required>
                                                        <option value="">-- Select Product --</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-4 min-w-[280px]">
                                                    <select value={item.locationId} onChange={(e) => handleItemChange(index, 'locationId', e.target.value)} disabled={!item.productId} className="w-full border-2 border-slate-100 rounded-xl p-3 text-[11px] font-bold outline-none focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-300" required>
                                                        <option value="">{item.productId ? '-- Select Position --' : 'Select product first'}</option>
                                                        {locations.map(loc => {
                                                            const exactBal = currentProductBalances.find(b => b.location?.id === loc.id);
                                                            const currentQty = exactBal ? exactBal.quantity : 0;
                                                            return (
                                                                <option key={loc.id} value={loc.id}>
                                                                    🏢 {loc.warehouse?.code} | 📍 {loc.code} → (Current: {currentQty})
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="w-16 mx-auto py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-black text-slate-400">{item.oldQuantity}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <input type="number" min="0" value={item.newQuantity} onChange={(e) => handleItemChange(index, 'newQuantity', e.target.value)} disabled={!item.locationId} className="w-24 text-center border-2 border-indigo-600 bg-indigo-950 text-white rounded-xl py-2 text-sm font-mono font-black shadow-lg outline-none disabled:opacity-30 transition-none" required placeholder="0" />
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[10px] font-black font-mono border ${item.diffQuantity > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            item.diffQuantity < 0 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                'bg-slate-50 text-slate-400 border-slate-100'
                                                        }`}>
                                                        {item.diffQuantity > 0 ? '+' : ''}{item.diffQuantity}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-300 hover:text-rose-600 transition-none">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ACTION BAR */}
                    <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex justify-between items-center sticky bottom-6 border border-white/5">
                        <div className="flex items-center gap-4 px-4 border-l-4 border-rose-500">
                            <ShieldCheck className="w-8 h-8 text-rose-500" />
                            <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Adjustment Policy</p>
                                <p className="text-white text-xs font-bold uppercase tracking-tight">Records are permanent & verifiable</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => router.back()} className="px-8 py-4 rounded-2xl text-slate-400 font-black text-xs uppercase tracking-widest hover:text-white transition-none">Cancel</button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-indigo-600 hover:bg-emerald-600 text-white px-12 py-4 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/50 transition-none disabled:opacity-50 flex items-center gap-3"
                            >
                                {isLoading ? 'Processing...' : '✓ Confirm & Adjust Stock'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* LOGGING NOTE */}
                <div className="flex justify-center items-center gap-2 py-4">
                    <CheckCircle2 className="w-3 h-3 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">System Sync: Integrity Verified</span>
                </div>
            </div>
        </AuthGate>
    );
}