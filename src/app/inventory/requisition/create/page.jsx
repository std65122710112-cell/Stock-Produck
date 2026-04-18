"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from "react-dom";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    Plus,
    Trash2,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    X,
    ClipboardPenLine,
    ArrowLeft
} from "lucide-react";

export default function CreateStockRequisitionPage() {
    const router = useRouter();

    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // 💡 State สำหรับจัดการ Error แจ้งเตือนใต้ช่องกรอก
    const [errors, setErrors] = useState({});

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
        // อัปเดตให้รองรับตอนเปิด showSuccessModal ด้วย
        if (confirmSubmitModal || showSuccessModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [confirmSubmitModal, showSuccessModal]);

    const getAvailableStock = (productId) => {
        if (!productId) return 0;
        return stockBalances
            .filter(b => b.productId === productId)
            .reduce((sum, b) => sum + Number(b.quantity), 0);
    };

    const getProductPrice = (productId) => {
        if (!productId) return 0;
        const product = products.find(p => p.id === productId);
        return product ? (Number(product.unitCost) || Number(product.price) || 0) : 0;
    };

    const grandTotalValue = items.reduce((sum, item) => {
        return sum + (getProductPrice(item.productId) * (Number(item.quantity) || 0));
    }, 0);

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // 💡 เคลียร์ Error เมื่อมีการพิมพ์ข้อมูล
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);

        // 💡 เคลียร์ Error ระดับ Item เมื่อมีการเลือกข้อมูล
        if (errors.items && errors.items[index] && errors.items[index][field]) {
            const newItemsErrors = [...errors.items];
            newItemsErrors[index] = { ...newItemsErrors[index], [field]: null };
            setErrors({ ...errors, items: newItemsErrors });
        }
    };

    const addItem = () => setItems([...items, { id: Date.now(), productId: '', quantity: 1, remark: '' }]);
    const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

    const triggerSubmitSR = (e) => {
        e.preventDefault();

        let newErrors = {};
        let isValid = true;

        // 💡 ตรวจสอบข้อมูลฟอร์มหลัก
        const cleanPurpose = formData.purpose.trim();
        if (!cleanPurpose) {
            newErrors.purpose = "กรุณาระบุวัตถุประสงค์การใช้งาน";
            isValid = false;
        }

        if (!formData.departmentId) {
            newErrors.departmentId = "กรุณาเลือกแผนกต้นสังกัด";
            isValid = false;
        }

        // 💡 ตรวจสอบรายการพัสดุ
        const itemErrors = [];
        let hasItemError = false;

        items.forEach((item) => {
            const iErr = {};
            if (!item.productId) {
                iErr.productId = "กรุณาเลือกพัสดุ";
                hasItemError = true;
            }
            if (!item.quantity || Number(item.quantity) <= 0) {
                iErr.quantity = "ระบุจำนวน";
                hasItemError = true;
            }
            itemErrors.push(iErr);
        });

        if (hasItemError) {
            newErrors.items = itemErrors;
            isValid = false;
        }

        // ถ้าพบ Error ให้หยุดและแสดงผล
        if (!isValid) {
            setErrors(newErrors);
            toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
            return;
        }

        // Check overstock (Warning only)
        const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
        const isOverStock = validItems.some(it => Number(it.quantity) > getAvailableStock(it.productId));
        if (isOverStock) {
            toast.error("⚠️ มีพัสดุบางรายการระบุจำนวนเกินกว่าสต๊อกที่มีในคลัง");
        }

        setErrors({}); // เคลียร์ Error ทั้งหมดก่อนเปิด Modal
        setConfirmSubmitModal(true);
    };

    const executeSubmitSR = async () => {

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
            setConfirmSubmitModal(false);
            setShowSuccessModal(true); // ✅ เปิดป็อปอัพสำเร็จ



        } catch (error) {
            toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
            setConfirmSubmitModal(false);
        } finally {
            setIsLoading(false);
        }
    };

    const ConfirmSubmitPortal = () => {
        if (!isMounted || !confirmSubmitModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-200">

                    {/* 1. Header Section - ปรับขนาดฟอนต์และไอคอนลง */}
                    <div className="p-6 flex items-center justify-between bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-emerald-950">ยืนยันส่งใบขอเบิก</h3>
                                <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">Requisition Confirmation</p>
                            </div>
                        </div>
                        <button onClick={() => setConfirmSubmitModal(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full transition-colors border border-slate-200 shadow-sm">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 2. Content Body - จัดพารากราฟใหม่ให้เล็กลงและสวยงาม */}
                    <div className="p-8">
                        <div className="flex flex-col items-center gap-5 mb-8">
                            <p className="text-base font-bold text-slate-700 text-center leading-tight max-w-[300px] mx-auto">
                                คุณตรวจสอบความถูกต้องของรายการ <br />
                                และข้อมูลพัสดุเรียบร้อยแล้วใช่หรือไม่?
                            </p>

                            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 w-full shadow-sm">
                                <p className="text-[12px] font-bold text-slate-500 text-center leading-relaxed">
                                    เมื่อยืนยัน ระบบจะสร้างเอกสารเข้าสู่คิว <br />
                                    เพื่อรอการพิจารณาอนุมัติทันที
                                </p>
                            </div>
                        </div>

                        {/* 3. Grand Total Box - ปรับเส้นขอบและขนาดตัวเลข */}
                        <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 mb-8 text-center shadow-sm">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">มูลค่าการเบิกจ่ายรวม</p>
                            <p className="text-3xl font-black text-emerald-600 tabular-nums">฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>

                        {/* 4. Action Buttons - ปรับขนาดฟอนต์ปุ่ม */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                disabled={isLoading}
                                onClick={() => setConfirmSubmitModal(false)}
                                className="py-3.5 rounded-xl font-black text-sm text-slate-500 bg-white border-2 border-slate-100 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                disabled={isLoading}
                                onClick={executeSubmitSR}
                                className="py-3.5 rounded-xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4" /> ยืนยันส่งข้อมูล</>
                                )}
                            </button>
                        </div>
                    </div>

                </div>
            </div>,
            document.body
        );
    };

    // ✅ เพิ่ม SuccessModalPortal (ป็อปอัพสำเร็จ) เข้าไปใหม่
    const SuccessModalPortal = () => {
        if (!isMounted || !showSuccessModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-2 border-emerald-100">
                    <div className="p-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">ส่งใบขอเบิกสำเร็จ</h3>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">
                            ระบบได้รับข้อมูลใบขอเบิกเลขที่ <br />
                            <span className="text-[#1F3B8B] font-black text-lg">{formData.srNumber}</span> <br />
                            เรียบร้อยแล้ว
                        </p>
                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                router.push("/inventory/requisition");
                            }}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                        >
                            ตกลง
                        </button>
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
            <SuccessModalPortal /> {/* ✅ วาง component ป็อปอัพสำเร็จตรงนี้ */}

            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">

                {/* HEADER SECTION - ตาม Blueprint */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-200 pb-8 gap-6 print:hidden">
                    <div className="flex flex-col gap-6">
                        {/* ปุ่มย้อนกลับแบบตัวหนังสือ (ไม่มีกรอบ) ตามรูป */}
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex items-center gap-2.5 text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                        </button>

                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                                <ClipboardPenLine className="w-7 h-7 text-[#1F3B8B]" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">สร้างใบขอเบิกพัสดุ</h1>
                                <p className="text-base text-slate-500 mt-1 font-bold">กรอกรายละเอียดและรายการพัสดุที่ต้องการเบิกใช้งาน (Material Requisition)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 💡 ใส่ noValidate เพื่อใช้ Custom Validation ของเราเอง */}
                <form onSubmit={triggerSubmitSR} className="space-y-8" noValidate>

                    {/* กล่องเนื้อหาหลัก (กรอบนอกชัดขึ้น shadow ลอยขึ้น ตาม Blueprint) */}
                    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">

                        {/* --- ส่วนที่ 1: ข้อมูลเอกสารหลัก --- */}
                        <div className="p-8 md:p-10 border-b-2 border-slate-200 bg-white">
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider mb-8 pb-5 border-b-2 border-slate-100">
                                ข้อมูลและรายละเอียดทั่วไป
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                                            เลขที่ใบเบิก (ระบบออกให้)
                                        </label>
                                        <input type="text" value={formData.srNumber} readOnly className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-base font-black text-slate-500 outline-none tabular-nums" />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                                            วัตถุประสงค์การใช้งาน <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            name="purpose"
                                            value={formData.purpose}
                                            onChange={handleFormChange}
                                            className={`w-full border-2 rounded-xl p-4 text-base font-bold outline-none transition-all text-slate-900 ${errors.purpose ? 'border-rose-400 bg-rose-50 focus:ring-4 focus:ring-rose-100 placeholder-rose-300' : 'border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 placeholder-slate-400 bg-white'}`}
                                            placeholder="เช่น เพื่อซ่อมบำรุงเซิร์ฟเวอร์หลักของบริษัท..."
                                        />
                                        {errors.purpose && <p className="text-sm font-bold text-rose-500 mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {errors.purpose}</p>}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                                            แผนกที่เบิก (Cost Center) <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            required
                                            name="departmentId"
                                            value={formData.departmentId}
                                            onChange={handleFormChange}
                                            className={`w-full border-2 rounded-xl p-4 text-base font-bold outline-none transition-all text-slate-900 ${errors.departmentId ? 'border-rose-400 bg-rose-50 focus:ring-4 focus:ring-rose-100' : 'border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 bg-white'}`}
                                        >
                                            <option value="">-- กรุณาเลือกแผนกต้นสังกัด --</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                        {errors.departmentId && <p className="text-sm font-bold text-rose-500 mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {errors.departmentId}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                                            เลขอ้างอิงโครงการ
                                        </label>
                                        <input
                                            type="text"
                                            name="referenceNo"
                                            value={formData.referenceNo}
                                            onChange={handleFormChange}
                                            className="w-full border-2 border-slate-200 rounded-xl p-4 text-base font-bold outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 transition-all text-slate-900 bg-white"
                                            placeholder="Job No. / Project ID"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- ส่วนที่ 2: รายการพัสดุ --- */}
                        <div className="p-8 md:p-10 bg-slate-50/50 border-b-2 border-slate-200">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                                    ระบุรายการพัสดุที่ต้องการเบิก
                                </h2>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="bg-emerald-600 text-white text-sm font-black px-6 py-3 rounded-xl uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 w-full md:w-auto justify-center"
                                >
                                    <Plus className="w-5 h-5" /> เพิ่มรายการพัสดุ
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
                                <table className="min-w-full text-left border-collapse">
                                    <thead className="bg-slate-100 border-b-2 border-slate-200">
                                        <tr className="text-xs font-black uppercase text-slate-600 tracking-widest whitespace-nowrap">
                                            <th className="p-5 text-left">เลือกพัสดุ (Asset SKU)</th>
                                            <th className="p-5 text-center">คงเหลือรวม</th>
                                            <th className="p-5 text-right">ราคา/หน่วย</th>
                                            <th className="p-5 text-center w-48">จำนวนเบิก <span className="text-rose-500">*</span></th>
                                            <th className="p-5 text-right">มูลค่ารวม</th>
                                            <th className="p-5 text-left">หมายเหตุรายชิ้น</th>
                                            <th className="p-5 w-20 text-center">ลบ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-100">
                                        {items.map((item, index) => {
                                            const totalStock = getAvailableStock(item.productId);
                                            const isOver = item.productId && Number(item.quantity) > totalStock;

                                            const errProduct = errors.items?.[index]?.productId;
                                            const errQuantity = errors.items?.[index]?.quantity;

                                            const unitPrice = getProductPrice(item.productId);
                                            const rowTotal = unitPrice * (Number(item.quantity) || 0);

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-200">
                                                    <td className="p-5 min-w-[300px] align-top">
                                                        <select
                                                            required
                                                            value={item.productId}
                                                            onChange={e => handleItemChange(index, "productId", e.target.value)}
                                                            className={`w-full border-2 rounded-xl p-3.5 text-base font-black uppercase outline-none transition-all text-slate-900 ${errProduct ? 'border-rose-400 bg-rose-50 focus:ring-4 focus:ring-rose-100' : 'border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 bg-white'}`}
                                                        >
                                                            <option value="">-- ค้นหา / เลือกรายการ --</option>
                                                            {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                                        </select>
                                                        {errProduct && <p className="text-sm font-bold text-rose-500 mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {errProduct}</p>}
                                                    </td>
                                                    <td className="p-5 text-center align-top pt-8">
                                                        <div className={`inline-block px-4 py-1.5 rounded-lg font-black text-base tabular-nums border ${totalStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                                            {totalStock}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-right align-top pt-8">
                                                        <span className="text-lg font-black text-slate-600 tabular-nums">
                                                            {item.productId ? `฿${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 align-top pt-5">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={e => handleItemChange(index, "quantity", e.target.value)}
                                                            className={`w-full border-2 rounded-xl py-3 text-center font-black text-xl tabular-nums outline-none transition-all ${isOver || errQuantity ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-4 focus:ring-rose-100' : 'border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10'}`}
                                                        />
                                                        {errQuantity && !isOver && <p className="text-sm font-bold text-rose-500 mt-2 text-center flex items-center justify-center gap-1.5"><AlertCircle className="w-4 h-4" /> {errQuantity}</p>}
                                                        {isOver && <p className="text-sm font-black text-amber-500 mt-2 text-center flex items-center justify-center gap-1.5"><AlertCircle className="w-4 h-4" /> สต๊อกไม่พอ</p>}
                                                    </td>
                                                    <td className="p-5 text-right align-top pt-8">
                                                        <span className="text-xl font-black text-slate-900 tabular-nums">
                                                            {item.productId ? `฿${rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 min-w-[250px] align-top pt-5">
                                                        <input
                                                            type="text"
                                                            value={item.remark}
                                                            onChange={e => handleItemChange(index, "remark", e.target.value)}
                                                            className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-base font-bold text-slate-700 outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 transition-all bg-white"
                                                            placeholder="สเปก/ขนาด เพิ่มเติม"
                                                        />
                                                    </td>
                                                    <td className="p-5 text-center align-top pt-6">
                                                        <button type="button" onClick={() => removeItem(index)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors border-2 border-slate-200 hover:border-rose-200">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-[#1F3B8B]/5">
                                        <tr>
                                            <td colSpan="4" className="p-6 text-right">
                                                <div className="text-sm font-black text-slate-600 uppercase tracking-widest">
                                                    มูลค่าเบิกจ่ายรวมทั้งสิ้น (Grand Total)
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <span className="text-3xl font-black text-emerald-600 tabular-nums">
                                                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* --- ส่วนที่ 3: หมายเหตุรวมถึงผู้อนุมัติ & Action Bar --- */}
                        <div className="p-8 md:p-10 bg-white">
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider mb-6">
                                หมายเหตุเพิ่มเติมถึงผู้อนุมัติ (ความเร่งด่วน / วันที่ต้องการใช้งาน)
                            </h2>

                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleFormChange}
                                rows="4"
                                className="w-full bg-white border-2 border-slate-200 rounded-2xl p-6 text-base text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 placeholder-slate-400 transition-all font-bold mb-10"
                                placeholder="กรุณาระบุความเร่งด่วน วันที่ต้องการใช้พัสดุ หรือรายละเอียดอื่นๆ เพื่อประกอบการพิจารณาของผู้อนุมัติ..."
                            />

                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8 border-t-2 border-slate-100">
                                <div className="flex items-start gap-4 bg-amber-50 p-5 rounded-2xl border-2 border-amber-100 max-w-xl shadow-sm">
                                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-slate-700 leading-relaxed font-bold">
                                        <strong className="text-slate-950 font-black">ข้อควรระวัง:</strong> ตรวจสอบความถูกต้องของจำนวนเบิกก่อนส่งยืนยัน หากพัสดุไม่มีในคลัง ระบบจะสร้างรายการสินค้ารอจ่าย (Backorder) โดยอัตโนมัติ
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black text-base uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <><ShieldCheck className="w-6 h-6" /> ยืนยันการส่งใบขอเบิกพัสดุ</>
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