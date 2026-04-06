"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from "react-dom";
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
    AlertCircle,
    CheckCircle2,
    X,
    Truck,
    ClipboardPenLine,
    Wallet
} from "lucide-react";

export default function CreateStockRequisitionPage() {
    const router = useRouter();

    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);

    // 📦 ข้อมูล Master และ สต๊อกคงเหลือ
    const [products, setProducts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [stockBalances, setStockBalances] = useState([]);

    const [formData, setFormData] = useState({
        srNumber: `SR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        purpose: '',
        departmentId: '',
        referenceNo: '',
        deliveryLocation: '',
        remarks: ''
    });

    const [items, setItems] = useState([{ id: Date.now(), productId: '', quantity: 1, remark: '' }]);

    useEffect(() => {
        setIsMounted(true);
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

    useEffect(() => {
        if (confirmSubmitModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [confirmSubmitModal]);

    const getAvailableStock = (productId) => {
        if (!productId) return 0;
        return stockBalances
            .filter(b => b.productId === productId)
            .reduce((sum, b) => sum + Number(b.quantity), 0);
    };

    // 💡 ฟังก์ชันดึงราคาต่อหน่วยของพัสดุ
    const getProductPrice = (productId) => {
        if (!productId) return 0;
        const product = products.find(p => p.id === productId);
        return product ? (Number(product.unitCost) || Number(product.price) || 0) : 0;
    };

    // 💡 คำนวณมูลค่าเบิกจ่ายยอดรวมทั้งสิ้น (Grand Total)
    const grandTotalValue = items.reduce((sum, item) => {
        return sum + (getProductPrice(item.productId) * (Number(item.quantity) || 0));
    }, 0);

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

    const triggerSubmitSR = (e) => {
        e.preventDefault();

        const cleanPurpose = formData.purpose.trim();
        if (!cleanPurpose) return toast.error("กรุณาระบุวัตถุประสงค์การขอเบิก");

        const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
        if (validItems.length === 0) return toast.error("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");

        const isOverStock = validItems.some(it => Number(it.quantity) > getAvailableStock(it.productId));
        if (isOverStock) {
            toast.error("⚠️ มีพัสดุบางรายการระบุจำนวนเกินกว่าสต๊อกที่มีในคลัง");
        }

        setConfirmSubmitModal(true);
    };

    const executeSubmitSR = async () => {
        setConfirmSubmitModal(false);
        setIsLoading(true);

        const cleanPurpose = formData.purpose.trim();
        const cleanRemarks = formData.remarks.trim();
        const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);

        try {
            const payload = {
                ...formData,
                purpose: cleanPurpose,
                remarks: cleanRemarks,
                priority: "NORMAL",
                items: validItems.map(it => ({
                    productId: it.productId,
                    quantity: Math.max(1, Math.abs(Number(it.quantity))),
                    remark: it.remark.trim()
                }))
            };

            await apiFetch("/outbound/requisitions", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            toast.success("ส่งคำขอเบิกพัสดุเรียบร้อยแล้ว");
            setTimeout(() => router.push("/inventory/requisition"), 1500);
        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsLoading(false);
        }
    };

    const ConfirmSubmitPortal = () => {
        if (!isMounted || !confirmSubmitModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                    <div className="p-6 flex items-center justify-between bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-emerald-950">
                                    ยืนยันการส่งใบขอเบิกพัสดุ
                                </h3>
                                <p className="text-xs font-bold uppercase text-emerald-600">
                                    Stock Requisition (SR)
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setConfirmSubmitModal(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full transition-colors shadow-sm">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-8">
                        <p className="text-sm font-bold text-slate-600 leading-relaxed text-center mb-6">
                            คุณตรวจสอบความถูกต้องของข้อมูลและรายการพัสดุเรียบร้อยแล้วใช่หรือไม่? <br /><br />การดำเนินการนี้จะสร้างเอกสารเข้าสู่ระบบเพื่อรอการอนุมัติทันที
                        </p>

                        {/* 💡 สรุปมูลค่าในหน้ายืนยันเพื่อให้ตัดสินใจได้ดีขึ้น */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-center">
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">มูลค่าการเบิกจ่ายรวม</p>
                            <p className="text-2xl font-black text-blue-900 tabular-nums">฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                disabled={isLoading}
                                onClick={() => setConfirmSubmitModal(false)}
                                className="py-3.5 rounded-2xl font-black text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                disabled={isLoading}
                                onClick={executeSubmitSR}
                                className="py-3.5 rounded-2xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-colors flex justify-center items-center disabled:opacity-50 gap-2"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle2 className="w-4 h-4" /> ยืนยันส่งข้อมูล</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <ConfirmSubmitPortal />

            <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 md:px-0 animate-in fade-in duration-500">

                <div className="w-full pt-10 mb-6 print:hidden">
                    <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                <ClipboardPenLine className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Truck className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        TJC Logistics Process
                                    </p>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                    สร้างใบขอเบิกพัสดุ
                                </h1>
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                        กรอกรายละเอียดและรายการพัสดุที่ต้องการเบิกใช้งาน (Material Requisition)
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="hidden xl:flex items-center gap-3 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                            ระบบเข้ารหัสความปลอดภัยสูง
                        </div>
                    </div>
                </div>

                <form onSubmit={triggerSubmitSR} className="space-y-8">
                    <div className="bg-white rounded-[2.5rem] shadow-md border border-slate-200 overflow-hidden">

                        {/* --- ส่วนที่ 1: ข้อมูลเอกสารหลัก --- */}
                        <div className="p-8 md:p-10 space-y-8 relative">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-indigo-100 rounded-lg"><ClipboardList className="w-5 h-5 text-indigo-600" /></div>
                                ข้อมูลและรายละเอียดทั่วไป
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                            <Hash className="w-4 h-4 text-slate-400" /> เลขที่ใบเบิก (ระบบออกให้)
                                        </label>
                                        <input type="text" value={formData.srNumber} readOnly className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-mono font-black text-slate-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                            <Info className="w-4 h-4 text-sky-500" /> วัตถุประสงค์การใช้งาน <span className="text-rose-500">*</span>
                                        </label>
                                        <input required type="text" name="purpose" value={formData.purpose} onChange={handleFormChange} className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-50 transition-all text-slate-800" placeholder="เช่น เพื่อซ่อมบำรุงเซิร์ฟเวอร์หลักของบริษัท..." />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                            <Building2 className="w-4 h-4 text-emerald-500" /> แผนกที่เบิก (Cost Center) <span className="text-rose-500">*</span>
                                        </label>
                                        <select required name="departmentId" value={formData.departmentId} onChange={handleFormChange} className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 bg-white transition-all text-slate-800">
                                            <option value="">-- กรุณาเลือกแผนกต้นสังกัด --</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                                <Tag className="w-4 h-4 text-amber-500" /> เลขอ้างอิงโครงการ
                                            </label>
                                            <input type="text" name="referenceNo" value={formData.referenceNo} onChange={handleFormChange} className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all text-slate-800" placeholder="Job No. / Project ID" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                                <MapPin className="w-4 h-4 text-rose-500" /> สถานที่ส่งมอบ
                                            </label>
                                            <input type="text" name="deliveryLocation" value={formData.deliveryLocation} onChange={handleFormChange} className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all text-slate-800" placeholder="ระบุตึก/ชั้น/ไซต์งาน" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-200/80"></div>

                        {/* --- ส่วนที่ 2: รายการพัสดุ --- */}
                        <div className="p-8 md:p-10 space-y-6 relative bg-slate-50/30">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-100 rounded-lg"><Package className="w-5 h-5 text-emerald-600" /></div>
                                    ระบุรายการพัสดุที่ต้องการเบิก
                                </h2>
                                <button type="button" onClick={addItem} className="bg-emerald-600 text-white text-xs font-black px-6 py-3.5 rounded-2xl uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 w-full md:w-auto justify-center">
                                    <Plus className="w-4 h-4" /> เพิ่มรายการพัสดุ
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-sm mt-4">
                                <table className="min-w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                            <th className="p-6">เลือกพัสดุ (Asset SKU)</th>
                                            <th className="p-6 text-center">คงเหลือรวม</th>
                                            {/* 💡 เพิ่ม Header ราคาต่อหน่วย */}
                                            <th className="p-6 text-right whitespace-nowrap">ราคา/หน่วย</th>
                                            <th className="p-6 text-center w-40">จำนวนเบิก <span className="text-rose-500">*</span></th>
                                            {/* 💡 เพิ่ม Header มูลค่ารวมของแถว */}
                                            <th className="p-6 text-right whitespace-nowrap">มูลค่ารวม</th>
                                            <th className="p-6">หมายเหตุรายชิ้น</th>
                                            <th className="p-6 w-16 text-center">ลบ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, index) => {
                                            const totalStock = getAvailableStock(item.productId);
                                            const isOver = item.productId && Number(item.quantity) > totalStock;

                                            // 💡 คำนวณราคาสินค้าแต่ละแถว
                                            const unitPrice = getProductPrice(item.productId);
                                            const rowTotal = unitPrice * (Number(item.quantity) || 0);

                                            return (
                                                <tr key={item.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                    <td className="p-6 min-w-[250px]">
                                                        <select required value={item.productId} onChange={e => handleItemChange(index, "productId", e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-black uppercase outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 bg-white text-slate-800 transition-all">
                                                            <option value="">-- ค้นหา / เลือกรายการ --</option>
                                                            {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <div className={`inline-block px-3 py-1.5 rounded-xl font-mono font-black text-sm border ${totalStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                                            {totalStock}
                                                        </div>
                                                    </td>
                                                    {/* 💡 แสดงข้อมูล ราคาต่อหน่วย */}
                                                    <td className="p-6 text-right">
                                                        <span className="text-sm font-bold text-slate-500 tabular-nums">
                                                            {item.productId ? `฿${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-6">
                                                        <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, "quantity", e.target.value)} className={`w-full border-2 rounded-xl py-2.5 text-center font-mono font-black text-lg outline-none transition-all ${isOver ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-2 focus:ring-rose-100' : 'border-slate-200 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'}`} />
                                                        {isOver && <p className="text-[10px] font-black text-rose-500 mt-1.5 text-center flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> สต๊อกไม่พอ</p>}
                                                    </td>
                                                    {/* 💡 แสดงข้อมูล มูลค่ารวมแต่ละแถว */}
                                                    <td className="p-6 text-right">
                                                        <span className="text-sm font-black text-blue-700 tabular-nums">
                                                            {item.productId ? `฿${rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 min-w-[200px]">
                                                        <input type="text" value={item.remark} onChange={e => handleItemChange(index, "remark", e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all" placeholder="สเปก/ขนาด เพิ่มเติม" />
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <button type="button" onClick={() => removeItem(index)} className="p-2.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-rose-100 hover:text-rose-600 transition-colors">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {/* 💡 ส่วน Footer สรุปมูลค่าเบิกจ่ายรวมทั้งสิ้น */}
                                    <tfoot className="bg-blue-50/50 border-t-2 border-blue-100">
                                        <tr>
                                            <td colSpan="4" className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-2 text-sm font-black text-blue-900 uppercase tracking-widest">
                                                    <Wallet className="w-4 h-4 text-blue-600" />
                                                    มูลค่าเบิกจ่ายรวมทั้งสิ้น (Grand Total)
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <span className="text-xl font-black text-blue-700 tabular-nums">
                                                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-200/80"></div>

                        {/* --- ส่วนที่ 3: หมายเหตุรวมถึงผู้อนุมัติ & Action Bar --- */}
                        <div className="p-8 md:p-10 space-y-8 relative">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2.5 bg-sky-100 rounded-xl"><MessageSquareText className="w-5 h-5 text-sky-600" /></div>
                                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">หมายเหตุเพิ่มเติมถึงผู้อนุมัติ (ความเร่งด่วน / วันที่ต้องการใช้งาน)</h3>
                            </div>

                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleFormChange}
                                rows="4"
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 placeholder-slate-400 transition-all font-medium"
                                placeholder="กรุณาระบุความเร่งด่วน วันที่ต้องการใช้พัสดุ หรือรายละเอียดอื่นๆ เพื่อประกอบการพิจารณาของผู้อนุมัติ..."
                            />

                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-slate-100">
                                <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-2xl border border-amber-100 max-w-lg">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-700 leading-relaxed font-bold">
                                        <strong className="text-slate-950">ข้อควรระวัง:</strong> ตรวจสอบความถูกต้องของจำนวนเบิกก่อนส่งยืนยัน หากพัสดุไม่มีในคลัง ระบบจะสร้างรายการสินค้ารอจ่าย (Backorder) โดยอัตโนมัติ
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/50 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <><ShieldCheck className="w-5 h-5" /> ยืนยันการส่งใบขอเบิกพัสดุ</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

            </div>
        </AuthGate>
    );
}