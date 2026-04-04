"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { createPortal } from "react-dom"; // 🛡️ Import Portal สำหรับ Pop-up

import {
    FileSignature,
    Plus,
    Trash2,
    Database,
    Building2,
    Info,
    Package,
    Hash,
    ShieldCheck,
    PlusCircle,
    X,
    LayoutGrid,
    Truck,
    AlertTriangle,
    CheckCircle2,
    FilePlus2, 
} from "lucide-react";

export default function CreatePurchaseRequisitionPage() {
    const router = useRouter();

    // 🛡️ State สำหรับ Next.js Client-side Portal
    const [isMounted, setIsMounted] = useState(false);

    // --- 📦 Master Data States ---
    const [products, setProducts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    // --- 📝 PR Form States ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [purpose, setPurpose] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [items, setItems] = useState([{ productId: "", quantity: 1, estimatedPrice: 0 }]);

    // --- 🛡️ Modal Confirm State ---
    const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);

    // --- ✨ Quick Product Creation States ---
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', categoryId: '', unitId: '' });

    useEffect(() => {
        setIsMounted(true);
        async function loadAllMasterData() {
            try {
                const [pRes, dRes, cRes, uRes, sRes] = await Promise.all([
                    apiFetch("/master/products").catch(() => []),
                    apiFetch("/master/departments").catch(() => []),
                    apiFetch("/master/categories").catch(() => []),
                    apiFetch("/master/units").catch(() => []),
                    apiFetch("/master/suppliers").catch(() => [])
                ]);
                setProducts(pRes);
                setDepartments(dRes);
                setCategories(cRes);
                setUnits(uRes);
                setSuppliers(Array.isArray(sRes) ? sRes : []);
            } catch (error) {
                toast.error("ไม่สามารถโหลดฐานข้อมูลได้");
            }
        }
        loadAllMasterData();
    }, []);

    // 🛡️ Lock scroll เมื่อเปิด Pop-up
    useEffect(() => {
        if (confirmSubmitModal || isProductModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [confirmSubmitModal, isProductModalOpen]);

    const getNextSequentialSku = () => {
        if (!newProduct.categoryId) return "รอเลือกหมวดหมู่...";
        const cat = categories.find(c => c.id === newProduct.categoryId);
        const prefix = `${cat?.abbr || "GEN"}-`;

        const matchingProducts = products.filter(p => p.sku && p.sku.startsWith(prefix));
        let maxNumber = 0;
        matchingProducts.forEach(p => {
            const numPart = p.sku.replace(prefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxNumber) maxNumber = num;
        });

        return `${prefix}${String(maxNumber + 1).padStart(3, '0')}`;
    };

    const handleAddItem = () => setItems([...items, { productId: "", quantity: 1, estimatedPrice: 0 }]);
    const handleRemoveItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const openNewProductModal = (index) => {
        setActiveRowIndex(index);
        setNewProduct({ name: '', categoryId: '', unitId: '' });
        setIsProductModalOpen(true);
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.categoryId || !newProduct.unitId) {
            return toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
        }

        setIsCreatingProduct(true);
        try {
            const finalSku = getNextSequentialSku();
            const payload = {
                sku: finalSku,
                name: newProduct.name.trim(),
                categoryId: newProduct.categoryId,
                unitId: newProduct.unitId
            };

            const res = await apiFetch("/master/products", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const createdProduct = res.data || res;
            setProducts(prev => [...prev, createdProduct]);

            if (activeRowIndex !== null) {
                handleItemChange(activeRowIndex, 'productId', createdProduct.id);
            }

            toast.success(`สร้างรหัส [${finalSku}] สำเร็จ!`);
            setIsProductModalOpen(false);
        } catch (error) {
            toast.error(error.message || "สร้างสินค้าไม่สำเร็จ");
        } finally {
            setIsCreatingProduct(false);
        }
    };

    // 🛡️ ขั้นตอนที่ 1: ตรวจสอบข้อมูลและเปิด Pop-up ยืนยัน
    const triggerSubmitPR = (e) => {
        e.preventDefault();
        if (!purpose.trim()) return toast.error("กรุณาระบุวัตถุประสงค์");
        if (!departmentId) return toast.error("กรุณาเลือกแผนกที่ขอซื้อ");

        const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
        if (validItems.length === 0) return toast.error("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");

        setConfirmSubmitModal(true); // เปิด Modal ยืนยัน
    };

    // 🛡️ ขั้นตอนที่ 2: ดำเนินการยิง API จริงเมื่อกดยืนยันใน Pop-up
    const executeSubmitPR = async () => {
        setConfirmSubmitModal(false);
        setIsSubmitting(true);
        try {
            const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
            const payload = {
                purpose: purpose.trim(),
                departmentId: departmentId,
                supplierId: supplierId || null,
                items: validItems.map(it => ({
                    productId: it.productId,
                    quantity: Number(it.quantity),
                    estimatedPrice: Number(it.estimatedPrice) || 0
                }))
            };

            await apiFetch("/api/purchase/pr", { method: "POST", body: JSON.stringify(payload) });
            toast.success("สร้างใบขอซื้อสำเร็จ!");
            setTimeout(() => router.push("/purchase/pr"), 1500);
        } catch (error) {
            toast.error(`ส่งข้อมูลไม่สำเร็จ: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalEstAmount = useMemo(() => {
        return items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.estimatedPrice || 0)), 0);
    }, [items]);

    // 🛡️ Pop-up Portal Component
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
                                    ยืนยันการส่งใบขอซื้อ
                                </h3>
                                <p className="text-xs font-bold uppercase text-emerald-600">
                                    Purchase Requisition
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setConfirmSubmitModal(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full transition-colors shadow-sm">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-8">
                        <p className="text-sm font-bold text-slate-600 leading-relaxed text-center">
                            คุณตรวจสอบความถูกต้องของข้อมูลและรายการพัสดุเรียบร้อยแล้วใช่หรือไม่? <br /><br />การดำเนินการนี้จะสร้างเอกสารเข้าสู่ระบบเพื่อรอการอนุมัติทันที
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <button
                                disabled={isSubmitting}
                                onClick={() => setConfirmSubmitModal(false)}
                                className="py-3.5 rounded-2xl font-black text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                disabled={isSubmitting}
                                onClick={executeSubmitPR}
                                className="py-3.5 rounded-2xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-colors flex justify-center items-center disabled:opacity-50 gap-2"
                            >
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle2 className="w-4 h-4" /> ยืนยันข้อมูล</>}
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

            <div className="max-w-5xl mx-auto space-y-8 pb-10 py-8 px-4 md:px-0 animate-in fade-in duration-500">

                {/* HEADER SECTION - คอนเซปต์พรีเมียม ชิดซ้าย ไม่เอาเส้นกั้น และเว้นระยะ pt-10 ตามมาตรฐานระบบ */}
                <div className="w-full pt-10 mb-6 print:hidden">

                    {/* กล่องใน: จัดตำแหน่งให้ชิดซ้าย (px-6 md:px-10) */}
                    <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">

                        {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า --- */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* 💡 ไอคอนหลัก: FilePlus2 (สื่อถึงการเริ่มต้นสร้างเอกสาร PR ใหม่) */}
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                <FilePlus2 className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>

                            {/* กลุ่มข้อความเรียงซ้อนกัน */}
                            <div className="flex flex-col">
                                {/* ภาษาอังกฤษด้านบน */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <ShieldCheck className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        Procurement Initiation Process
                                    </p>
                                </div>

                                {/* หัวข้อหลัก พร้อม Badge เอกสารภายใน */}
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2 flex flex-wrap items-center gap-3">
                                    สร้างใบขอซื้อ (PR)
                                    <span className="bg-slate-950 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-sm uppercase">
                                        เอกสารภายใน
                                    </span>
                                </h1>

                                {/* คำอธิบายด้านล่าง พร้อมไอคอนสีเขียวมรกต */}
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <FileSignature className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                        ระบบบันทึกคำขออนุมัติจัดซื้อ (Purchase Requisition)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* --- ส่วนขวา: Badge ความปลอดภัย --- */}
                        <div className="hidden xl:flex items-center gap-3 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                            ระบบเข้ารหัสความปลอดภัยสูง
                        </div>
                    </div>
                </div>
                <form onSubmit={triggerSubmitPR} className="space-y-8">

                    {/* --- THE MASTER DOCUMENT CONTAINER --- */}
                    <div className="bg-white rounded-[2.5rem] shadow-md border border-slate-200 overflow-hidden">

                        {/* SECTION 1: MASTER INFO */}
                        <div className="p-8 md:p-10 space-y-8 relative">

                            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-indigo-100 rounded-lg"><LayoutGrid className="w-5 h-5 text-indigo-600" /></div>
                                ข้อมูลและรายละเอียดทั่วไป
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                        <Info className="w-4 h-4 text-sky-500" /> วัตถุประสงค์การจัดซื้อ (Purpose) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-50 transition-all text-slate-800 bg-slate-50 focus:bg-white"
                                        placeholder="เช่น ขออนุมัติสั่งซื้อพัสดุสำหรับโครงการ TJC Phase 2..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                        <Building2 className="w-4 h-4 text-emerald-500" /> แผนกที่ร้องขอ (Cost Center) <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={departmentId}
                                        onChange={(e) => setDepartmentId(e.target.value)}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all text-slate-800 bg-slate-50 focus:bg-white"
                                        required
                                    >
                                        <option value="">-- กรุณาเลือกแผนกต้นสังกัด --</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                        <Truck className="w-4 h-4 text-amber-500" /> แนะนำคู่ค้า (Suggested Vendor)
                                    </label>
                                    <select
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(e.target.value)}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all text-slate-800 bg-slate-50 focus:bg-white"
                                    >
                                        <option value="">-- ไม่ระบุ (ดำเนินการคัดเลือกคู่ค้าภายหลัง) --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* เส้นคั่นเอกสาร */}
                        <div className="w-full h-px bg-slate-200/80"></div>

                        {/* SECTION 2: ITEM MANIFEST */}
                        <div className="p-8 md:p-10 space-y-6 relative bg-slate-50/30">


                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-100 rounded-lg"><Package className="w-5 h-5 text-emerald-600" /></div>
                                    ระบุรายการพัสดุที่ต้องการขอซื้อ
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="bg-emerald-600 text-white text-xs font-black px-5 py-3 rounded-2xl uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                                >
                                    <Plus className="w-4 h-4" /> เพิ่มรายการพัสดุ
                                </button>
                            </div>

                            <div className="space-y-4 pt-2">
                                {items.map((item, index) => (
                                    <div key={index} className="flex flex-col xl:flex-row gap-6 p-6 md:p-8 bg-white border-2 border-slate-200/60 rounded-[2rem] hover:border-blue-200 transition-colors shadow-sm items-end relative group">
                                        <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-950 text-white rounded-full flex items-center justify-center font-black text-xs shadow-md border-4 border-white">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 w-full space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wide ml-1 flex justify-between">
                                                <span>ข้อมูลสินค้า / รหัส (SKU) <span className="text-rose-500">*</span></span>
                                                <button
                                                    type="button"
                                                    onClick={() => openNewProductModal(index)}
                                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                                                >
                                                    <PlusCircle className="w-3 h-3" /> สร้างรหัสใหม่
                                                </button>
                                            </label>
                                            <select
                                                value={item.productId}
                                                onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                                                className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-sm font-black uppercase outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-50 bg-white text-slate-800 transition-all"
                                                required
                                            >
                                                <option value="">-- ค้นหา / เลือกรายการสินค้า --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex gap-4 w-full xl:w-auto">
                                            <div className="w-full xl:w-32 space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wide text-center block">จำนวน <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                    className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-center font-mono font-black text-lg outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-50 bg-white transition-all"
                                                    required
                                                />
                                            </div>

                                            <div className="w-full xl:w-48 space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wide text-right block">ราคาประเมิน/หน่วย</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.estimatedPrice}
                                                        onChange={(e) => handleItemChange(index, "estimatedPrice", e.target.value)}
                                                        className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-right tabular-nums font-black text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-50 bg-white pr-8 transition-all"
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">บาท</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            className="p-3.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-100 hover:text-rose-600 border border-slate-100 hover:border-rose-200 transition-colors w-full xl:w-auto flex justify-center items-center"
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* --- ACTION BAR (Bottom of Document) --- */}
                        <div className="bg-slate-50 p-6 md:p-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6 border-l-4 border-indigo-500 pl-6 w-full md:w-auto">
                                <div className="space-y-1">
                                    <p className="text-slate-500 text-xs font-black uppercase tracking-wider">มูลค่าประเมินรวมทั้งสิ้น (Total Est. Valuation)</p>
                                    <p className="text-slate-950 text-4xl font-black tabular-nums tracking-tighter">
                                        {totalEstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                                <div className="text-center sm:text-right hidden sm:block">
                                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest">พร้อมส่งพิจารณา</p>
                                    <p className="text-slate-400 text-xs font-bold uppercase">รอการอนุมัติจากผู้มีอำนาจ</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <><ShieldCheck className="w-5 h-5" /> ยืนยันและส่งใบขอซื้อ</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

            </div>

            {/* --- 📦 Quick Product Modal --- */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 p-6 md:p-8 flex justify-between items-center border-b border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 rounded-2xl">
                                    <Database className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-950 tracking-wider">สร้างฐานข้อมูลสินค้าด่วน</h3>
                                    <p className="text-xs text-slate-500 font-bold tracking-wide mt-1">เพิ่มพัสดุใหม่เข้าสู่ระบบส่วนกลาง</p>
                                </div>
                            </div>
                            <button onClick={() => setIsProductModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full border border-slate-200 transition-colors shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProduct} className="p-6 md:p-8 space-y-6">
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wide ml-1">หมวดหมู่สินค้า (Category) <span className="text-rose-500">*</span></label>
                                        <select
                                            value={newProduct.categoryId}
                                            onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                                            className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-sm font-bold outline-none focus:border-indigo-500 bg-white transition-all"
                                            required
                                        >
                                            <option value="">-- เลือกหมวดหมู่ --</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.abbr})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-indigo-600 uppercase tracking-wide ml-1 flex items-center gap-1">
                                            <Hash className="w-4 h-4" /> รหัส (SKU) สร้างอัตโนมัติ
                                        </label>
                                        <input
                                            type="text"
                                            value={getNextSequentialSku()}
                                            className="w-full border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-2xl p-3.5 text-sm font-mono font-black text-center outline-none"
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide ml-1">ชื่อสินค้าใหม่ <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={newProduct.name}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 bg-white transition-all"
                                        placeholder="เช่น Cisco Switch Catalyst 9200..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide ml-1">หน่วยนับ (Unit) <span className="text-rose-500">*</span></label>
                                    <select
                                        value={newProduct.unitId}
                                        onChange={(e) => setNewProduct({ ...newProduct, unitId: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-sm font-bold outline-none focus:border-indigo-500 bg-white transition-all"
                                        required
                                    >
                                        <option value="">-- เลือกหน่วยนับ --</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex gap-4">
                                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-500 bg-slate-100 rounded-2xl uppercase tracking-wider hover:bg-slate-200 transition-colors">ยกเลิก</button>
                                <button
                                    type="submit"
                                    disabled={isCreatingProduct}
                                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-900/20 hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isCreatingProduct ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : 'ยืนยันการสร้างสินค้า'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthGate>
    );
}