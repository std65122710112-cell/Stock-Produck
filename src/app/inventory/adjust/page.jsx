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
    FileText,
    X,
    Loader2
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

    const [showCancelPopup, setShowCancelPopup] = useState(false);
    // ✅ เพิ่ม State สำหรับเช็คการกด Submit เพื่อโชว์แจ้งเตือนใต้ช่องกรอก
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        if (showCancelPopup) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showCancelPopup]);

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
        setIsSubmitted(true); // ✅ ให้ระบบรู้ว่ามีการกดปุ่มแล้ว เพื่อโชว์ Alert ใต้ช่อง

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

            {/* CANCEL POPUP MODAL */}
            {showCancelPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-wide">ยืนยันการยกเลิก?</h3>
                        <p className="text-sm font-bold text-slate-500 text-center mb-8">
                            ข้อมูลที่คุณกรอกไว้จะไม่ถูกบันทึก คุณต้องการยกเลิกการทำรายการนี้ใช่หรือไม่?
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowCancelPopup(false)}
                                className="flex-1 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm uppercase tracking-wider transition-colors"
                            >
                                ไม่ยกเลิก
                            </button>
                            <button
                                onClick={() => { setShowCancelPopup(false); router.back(); }}
                                className="flex-1 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-wider transition-colors shadow-lg shadow-rose-600/20"
                            >
                                ใช่, ยกเลิกเลย
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1200px] mx-auto space-y-6 p-4 md:p-6 min-h-screen pb-24 bg-white">

                {/* HEADER SECTION - คอนเซปต์พรีเมียม ชิดซ้าย เส้นกั้นยาว Edge-to-Edge */}
                <div className="w-full border-b-2 border-slate-100 mb-10">

                    {/* กล่องใน: จัดตำแหน่งให้ชิดซ้าย (px-6 md:px-10) */}
                    <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between pb-6 gap-6">

                        {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า --- */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* 💡 ไอคอนหลัก: Scale (สื่อถึงการปรับสมดุล/Reconcile ยอดสต๊อก) */}
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                <Scale className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>

                            {/* กลุ่มข้อความเรียงซ้อนกัน */}
                            <div className="flex flex-col">
                                {/* ภาษาอังกฤษด้านบน */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Database className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        Inventory Reconciliation
                                    </p>
                                </div>

                                {/* หัวข้อหลัก (ตัวตรง หนาพิเศษ) */}
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                    ปรับปรุงยอดสต๊อก
                                </h1>

                                {/* คำอธิบายด้านล่าง พร้อมไอคอนสีเขียวมรกต */}
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                        เอกสารตรวจนับและปรับปรุงยอดสินค้าคงคลัง
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* --- ส่วนขวา: (ถ้ามีปุ่มจัดการอื่นๆ สามารถใส่ตรงนี้ได้) --- */}
                    </div>
                </div>

                {/* ✅ เพิ่ม noValidate เพื่อปิด Alert เดิมของเบราว์เซอร์ */}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">



                        {/* --- PART 1: DOCUMENT INFO --- */}
                        <div className="p-8 border-b border-dashed border-slate-200">
                            <h2 className="text-sm font-black text-[#1e3b8a] uppercase tracking-widest mb-6 flex items-center gap-3">
                                <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                                    <Info className="w-5 h-5" />
                                </div>
                                1. ข้อมูลเอกสารปรับปรุงยอด
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-indigo-400" /> เลขที่เอกสาร (อัตโนมัติ)
                                    </label>
                                    <input
                                        type="text"
                                        value={adjustNo}
                                        readOnly
                                        className="w-full border-2 border-slate-100 rounded-xl p-3.5 text-sm bg-slate-50 tabular-nums font-black text-[#1e3b8a] outline-none"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> สาเหตุการปรับปรุง *
                                    </label>
                                    {/* ✅ ปรับสไตล์ให้ขอบแดงเมื่อกด Submit แล้วยังไม่เลือกข้อมูล */}
                                    <select
                                        value={reasonCode}
                                        onChange={(e) => { setReasonCode(e.target.value); setIsSubmitted(false); }}
                                        className={`w-full border-2 rounded-xl p-3.5 text-sm font-black outline-none focus:ring-4 transition-all cursor-pointer ${isSubmitted && !reasonCode ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100 bg-rose-50 text-rose-600' : 'border-rose-100 focus:border-rose-400 focus:ring-rose-50 bg-rose-50/30 text-slate-800'}`}
                                    >
                                        <option value="">-- เลือกสาเหตุ --</option>
                                        <option value="MISCOUNT">นับผิดพลาด (Miscount)</option>
                                        <option value="DAMAGED">สินค้าชำรุด/เสียหาย (Damaged)</option>
                                        <option value="LOST">สินค้าสูญหาย (Lost)</option>
                                        <option value="FOUND">ค้นพบสินค้าตกหล่น (Found)</option>
                                        <option value="EXPIRED">สินค้าหมดอายุ (Expired)</option>
                                    </select>
                                    {/* ✅ แจ้งเตือนข้อความสีแดงแบบ Inline สวยๆ ด้านล่าง */}
                                    {isSubmitted && !reasonCode && (
                                        <p className="text-rose-500 text-[11px] font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> กรุณาเลือกสาเหตุการปรับปรุง
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-400" /> หมายเหตุเพิ่มเติม
                                    </label>
                                    <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..." className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-[#1e3b8a] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300 text-slate-800" />
                                </div>
                            </div>
                        </div>

                        {/* --- PART 2: ITEMS TABLE --- */}
                        <div className="p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <h2 className="text-sm font-black text-[#1e3b8a] uppercase tracking-widest flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
                                        <Scale className="w-5 h-5" />
                                    </div>
                                    2. รายการตรวจสอบและปรับปรุงยอด
                                </h2>
                                <button type="button" onClick={addItem} className="bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-black text-sm px-5 py-2.5 rounded-xl uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-2">
                                    <Plus className="w-5 h-5" /> เพิ่มรายการ
                                </button>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-2xl mb-8">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-sm font-black uppercase text-slate-600 tracking-wider">
                                            <th className="p-5">รายละเอียดสินค้า</th>
                                            <th className="p-5">ตำแหน่ง และ ยอดปัจจุบัน</th>
                                            <th className="p-5 text-center">ยอดในระบบ</th>
                                            <th className="p-5 text-center text-[#1e3b8a]">ยอดนับจริง</th>
                                            <th className="p-5 text-center">ส่วนต่าง</th>
                                            <th className="p-5 text-center">ดำเนินการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, index) => {
                                            const currentProductBalances = productBalances[item.productId] || [];
                                            return (
                                                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                                                    <td className="p-4 min-w-[280px]">
                                                        {/* ✅ นำคำว่า required ออก */}
                                                        <select value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-black uppercase outline-none focus:border-[#1e3b8a] focus:ring-4 focus:ring-blue-50 bg-white cursor-pointer transition-all">
                                                            <option value="">-- เลือกสินค้า --</option>
                                                            {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-4 min-w-[320px]">
                                                        {/* ✅ นำคำว่า required ออก */}
                                                        <select value={item.locationId} onChange={(e) => handleItemChange(index, 'locationId', e.target.value)} disabled={!item.productId} className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#1e3b8a] focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-300 cursor-pointer transition-all">
                                                            <option value="">{item.productId ? '-- เลือกตำแหน่งคลังสินค้า --' : 'กรุณาเลือกสินค้าก่อน'}</option>
                                                            {locations.map(loc => {
                                                                const exactBal = currentProductBalances.find(b => b.location?.id === loc.id);
                                                                const currentQty = exactBal ? exactBal.quantity : 0;
                                                                return (
                                                                    <option key={loc.id} value={loc.id}>
                                                                        🏢 {loc.warehouse?.code} | 📍 {loc.code} → (ยอดปัจจุบัน: {currentQty})
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="w-20 mx-auto py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base tabular-nums font-black text-slate-500 shadow-inner">
                                                            {item.oldQuantity}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.newQuantity}
                                                            onChange={(e) => handleItemChange(index, 'newQuantity', e.target.value)}
                                                            disabled={!item.locationId}
                                                            className="w-24 mx-auto block text-center border-2 border-[#1e3b8a] bg-blue-50 text-[#1e3b8a] rounded-xl py-2.5 text-base tabular-nums font-black outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-40 disabled:bg-slate-100 disabled:border-slate-200 transition-all placeholder:text-blue-300"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-black tabular-nums border shadow-sm ${item.diffQuantity > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                            item.diffQuantity < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                'bg-slate-50 text-slate-500 border-slate-200'
                                                            }`}>
                                                            {item.diffQuantity > 0 ? '+' : ''}{item.diffQuantity}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button type="button" onClick={() => removeItem(index)} className="p-2.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-all">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* --- PART 3: ACTION BAR --- */}
                        <div className="bg-white p-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 rounded-b-[2.5rem]">
                            <div className="flex items-center gap-4 px-4 border-l-4 border-rose-500">
                                <div className="bg-rose-50 p-3 rounded-2xl">
                                    <ShieldCheck className="w-6 h-6 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest mb-1">นโยบายการตรวจสอบ</p>
                                    <p className="text-slate-900 text-sm font-bold uppercase tracking-wide">ทุกรายการจะถูกบันทึกลงประวัติอย่างถาวร</p>
                                </div>
                            </div>
                            <div className="flex w-full md:w-auto gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCancelPopup(true)}
                                    className="flex-1 md:flex-none px-8 py-3.5 rounded-2xl text-slate-500 font-black text-sm uppercase tracking-widest hover:text-white hover:bg-rose-600 hover:border-rose-600 transition-colors border border-slate-200 shadow-sm active:scale-95"
                                >
                                    ยกเลิกรายการ
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border border-emerald-700"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    {isLoading ? 'กำลังดำเนินการ...' : 'ยืนยันการปรับปรุงยอด'}
                                </button>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </AuthGate>
    );
}