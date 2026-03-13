"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    FileEdit,
    ClipboardList,
    MapPin,
    Hash,
    Info,
    Package,
    Plus,
    Trash2,
    ShieldCheck,
    Building2,
    Tag,
    MessageSquareText,
    AlertCircle
} from "lucide-react";

export default function CreateStockRequisitionPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // 📦 ข้อมูล Master และ สต๊อกคงเหลือ
    const [products, setProducts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [stockBalances, setStockBalances] = useState([]);

    // 🛡️ ข้อมูลฟอร์ม (เน้นความสะอาด ตัด Priority/Date ออกไปรวมใน Remarks)
    const [formData, setFormData] = useState({
        srNumber: `SR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        purpose: '',
        departmentId: '',
        referenceNo: '',
        deliveryLocation: '',
        remarks: '' // 💡 ช่องหมายเหตุรวม (ใช้ระบุความด่วนและวันที่แทน)
    });

    const [items, setItems] = useState([{ id: Date.now(), productId: '', quantity: 1, remark: '' }]);

    useEffect(() => {
        async function loadInitialData() {
            try {
                const [pRes, dRes, bRes] = await Promise.all([
                    apiFetch("/master/products"),
                    apiFetch("/master/departments").catch(() => []),
                    apiFetch("/inventory/balances").catch(() => [])
                ]);
                setProducts(pRes || []);
                setDepartments(Array.isArray(dRes) ? dRes : dRes?.data || []);
                setStockBalances(Array.isArray(bRes) ? bRes : bRes?.data || []);
            } catch (error) {
                toast.error("ระบบขัดข้อง: ไม่สามารถโหลดข้อมูลมาสเตอร์ได้");
            }
        }
        loadInitialData();
    }, []);

    const getAvailableStock = (productId) => {
        if (!productId) return 0;
        return stockBalances
            .filter(b => b.productId === productId)
            .reduce((sum, b) => sum + Number(b.quantity), 0);
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { id: Date.now(), productId: '', quantity: 1, remark: '' }]);
    const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

    // 🛡️ ระบบส่งข้อมูลความปลอดภัยสูง
    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanPurpose = formData.purpose.trim();
        const cleanRemarks = formData.remarks.trim();

        if (!cleanPurpose) return toast.error("กรุณาระบุวัตถุประสงค์การขอเบิก");

        const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
        if (validItems.length === 0) return toast.error("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");

        // ตรวจสอบยอดสต๊อก (Warning Only)
        const isOverStock = validItems.some(it => Number(it.quantity) > getAvailableStock(it.productId));
        if (isOverStock && !confirm("⚠️ สินค้าบางรายการเกินยอดคงคลัง ระบบจะบันทึกเป็นรายการค้างจ่าย ยืนยันหรือไม่?")) return;

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                purpose: cleanPurpose,
                remarks: cleanRemarks,
                priority: "NORMAL", // ค่าเริ่มต้น (เพราะเราให้ระบุความด่วนในหมายเหตุแทน)
                items: validItems.map(it => ({
                    productId: it.productId,
                    quantity: Math.max(1, Math.abs(Number(it.quantity))), // ป้องกันค่าลบหรือศูนย์
                    remark: it.remark.trim()
                }))
            };

            await apiFetch("/outbound/requisitions", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            toast.success("ส่งคำขอเบิกพัสดุเรียบร้อยแล้ว");
            router.push("/inventory/requisition");
        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">

                {/* --- HEADER --- */}
                <div className="border-b border-slate-100 pb-6 flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">TJC Logistics Process</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                            เปิดใบขอเบิกพัสดุ <span className="text-slate-300 font-light text-2xl not-italic ml-2">(Material SR)</span>
                        </h1>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        ความปลอดภัย: เข้ารหัสข้อมูลปลายทาง
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* --- ส่วนที่ 1: ข้อมูลเอกสารหลัก --- */}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-indigo-500" /> 1. รายละเอียดทั่วไป
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Hash className="w-3 h-3 text-slate-300" /> เลขที่ใบเบิก (ระบบออกให้)
                                    </label>
                                    <input type="text" value={formData.srNumber} readOnly className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-sm font-mono font-bold text-slate-400 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Info className="w-3 h-3" /> วัตถุประสงค์การใช้งาน *
                                    </label>
                                    <input required type="text" name="purpose" value={formData.purpose} onChange={handleFormChange} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all" placeholder="เช่น เพื่อซ่อมบำรุงเซิร์ฟเวอร์ TJC..." />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Building2 className="w-3 h-3 text-slate-300" /> แผนกที่เบิก (Cost Center)
                                    </label>
                                    <select required name="departmentId" value={formData.departmentId} onChange={handleFormChange} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 bg-white">
                                        <option value="">-- กรุณาเลือกแผนก --</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <Tag className="w-3 h-3 text-slate-300" /> เลขอ้างอิงโครงการ
                                        </label>
                                        <input type="text" name="referenceNo" value={formData.referenceNo} onChange={handleFormChange} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500" placeholder="Job No. / Project ID" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <MapPin className="w-3 h-3 text-slate-300" /> สถานที่ส่งมอบ
                                        </label>
                                        <input type="text" name="deliveryLocation" value={formData.deliveryLocation} onChange={handleFormChange} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500" placeholder="ระบุตึก/ชั้น/ไซด์งาน" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ส่วนที่ 2: รายการพัสดุ --- */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-500" /> 2. รายการพัสดุที่เบิกจ่าย
                            </h2>
                            <button type="button" onClick={addItem} className="bg-slate-900 text-white text-[10px] font-black px-6 py-3 rounded-2xl uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200">
                                + เพิ่มรายการสินค้า
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase text-slate-300 tracking-widest border-b border-slate-50">
                                        <th className="p-8">เลือกพัสดุ (Asset SKU)</th>
                                        <th className="p-8 text-center">คงเหลือรวม</th>
                                        <th className="p-8 text-center w-40">จำนวนเบิก *</th>
                                        <th className="p-8">หมายเหตุรายชิ้น</th>
                                        <th className="p-8 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((item, index) => {
                                        const totalStock = getAvailableStock(item.productId);
                                        const isOver = item.productId && Number(item.quantity) > totalStock;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                                                <td className="p-6">
                                                    <select required value={item.productId} onChange={e => handleItemChange(index, "productId", e.target.value)} className="w-full border-2 border-slate-50 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-indigo-400 bg-white">
                                                        <option value="">-- ค้นหา/เลือกสินค้า --</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-6 text-center">
                                                    <div className={`inline-block px-4 py-2 rounded-xl font-mono font-black text-xs ${totalStock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                                        {totalStock}
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, "quantity", e.target.value)} className={`w-full border-2 rounded-2xl py-4 text-center font-mono font-black text-lg outline-none ${isOver ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-slate-100 bg-slate-900 text-white shadow-xl'}`} />
                                                    {isOver && <p className="text-[8px] font-black text-rose-500 uppercase mt-2 text-center">⚠️ สต๊อกไม่พอ</p>}
                                                </td>
                                                <td className="p-6">
                                                    <input type="text" value={item.remark} onChange={e => handleItemChange(index, "remark", e.target.value)} className="w-full border-2 border-slate-50 rounded-2xl p-4 text-[11px] font-bold text-slate-500 outline-none focus:border-slate-200" placeholder="สเปก/ขนาด..." />
                                                </td>
                                                <td className="p-6 text-center">
                                                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
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

                    {/* --- ส่วนที่ 3: หมายเหตุรวมถึงผู้อนุมัติ (NEW) --- */}
                    <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-white/10 space-y-6">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <MessageSquareText className="w-5 h-5" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">หมายเหตุเพิ่มเติมถึงผู้อนุมัติ (ความเร่งด่วน / วันที่ต้องการใช้งาน)</h3>
                        </div>

                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleFormChange}
                            rows="4"
                            className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm text-white outline-none focus:border-indigo-500 placeholder-slate-600 transition-all font-medium"
                            placeholder="ระบุความเร่งด่วน วันที่ต้องการใช้พัสดุ หรือรายละเอียดอื่นๆ เพื่อประกอบการพิจารณาอนุมัติ..."
                        />

                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6">
                            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 max-w-md">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase italic">
                                    ตรวจสอบความถูกต้องของจำนวนเบิกก่อนส่ง หากพัสดุไม่มีในคลัง ระบบจะสร้างรายการ Backorder อัตโนมัติ
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full md:w-auto bg-indigo-600 hover:bg-emerald-600 text-white px-16 py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-indigo-900/50 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>ส่งใบขอเบิกพัสดุ ✓</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* --- FOOTER --- */}
                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">TJC GROUP LOGISTICS • SECURE REQUEST SYSTEM • {formData.srNumber}</p>
                </div>
            </div>
        </AuthGate>
    );
}