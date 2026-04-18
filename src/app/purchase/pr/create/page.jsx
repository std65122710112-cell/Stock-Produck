"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { createPortal } from "react-dom";

import {
    Plus,
    Trash2,
    Database,
    ShieldCheck,
    X,
    CheckCircle2,
    Search,
    ArrowLeft,
    FilePlus2
} from "lucide-react";

// --- คอมโพเนนต์ช่องค้นหาสินค้า (Searchable Select) ---
const SearchableProductSelect = ({ options, value, onChange, error }) => {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const selected = options.find(o => o.id === value);
        setSearch(selected ? `[${selected.sku}] ${selected.name}` : "");
    }, [value, options]);

    const filtered = options.filter(o =>
        (o.sku?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (o.name?.toLowerCase() || "").includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                        if (value) onChange("");
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    className={`w-full border rounded-lg p-3 text-base font-bold outline-none transition-all pr-10 ${error
                        ? 'border-rose-400 bg-rose-50 text-rose-800 placeholder-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10'
                        }`}
                    placeholder="พิมพ์ค้นหา รหัส (SKU) หรือ ชื่อสินค้า..."
                    required={!value}
                />
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${error ? 'text-rose-400' : 'text-slate-400'}`}>
                    <Search className="w-4 h-4" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl custom-scrollbar">
                    {filtered.length > 0 ? (
                        filtered.map(o => (
                            <div
                                key={o.id}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onChange(o.id);
                                    setIsOpen(false);
                                }}
                                className="p-3 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-100 last:border-0 transition-colors"
                            >
                                <span className="text-xs font-bold text-[#1F3B8B] tracking-wider mb-0.5">[{o.sku}]</span>
                                <span className="text-sm font-bold text-slate-800">{o.name}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm font-bold text-slate-400">ไม่พบสินค้าที่ค้นหา</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function CreatePurchaseRequisitionPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    // --- Master Data States ---
    const [products, setProducts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    // --- PR Form States ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [purpose, setPurpose] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [items, setItems] = useState([{ productId: "", quantity: 1, estimatedPrice: 0 }]);

    const [errors, setErrors] = useState({});
    const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
    const [newlyCreatedProductIds, setNewlyCreatedProductIds] = useState([]);

    // --- Modals States ---
    const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [productSuccessModal, setProductSuccessModal] = useState(false); // 💡 เพิ่ม State สำหรับ Popup สร้างสินค้าสำเร็จ

    // --- Quick Product Creation States ---
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);

    const [newProduct, setNewProduct] = useState({
        name: '',
        categoryId: '',
        unitId: '',
        expirationDate: '',
        noExpiry: false,
        lotNumber: ''
    });

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

    useEffect(() => {
        if (confirmSubmitModal || isProductModalOpen || successModal || productSuccessModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [confirmSubmitModal, isProductModalOpen, successModal, productSuccessModal]);

    // 💡 ฟังก์ชันสร้างเลขล็อตอัตโนมัติ (Format: LOT-YYMMDD-HHMM)
    const generateAutoLotNumber = () => {
        const d = new Date();
        const yy = String(d.getFullYear()).slice(-2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `LOT-${yy}${mm}${dd}-${hh}${min}`;
    };

    const handleAddItem = () => setItems([...items, { productId: "", quantity: 1, estimatedPrice: 0 }]);
    const handleRemoveItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === "productId") {
            const selectedProduct = products.find(p => p.id === value);
            newItems[index].estimatedPrice = selectedProduct ? (Number(selectedProduct.unitCost) || Number(selectedProduct.price) || 0) : 0;
        }

        setItems(newItems);

        if (errors.items?.[index]?.[field]) {
            const newItemsErrors = [...errors.items];
            newItemsErrors[index] = { ...newItemsErrors[index], [field]: null };
            setErrors({ ...errors, items: newItemsErrors });
        }
    };

    const openNewProductModal = (index) => {
        setActiveRowIndex(index);
        setNewProduct({
            name: '',
            categoryId: '',
            unitId: '',
            expirationDate: '',
            noExpiry: false,
            lotNumber: generateAutoLotNumber()
        });
        setHasSubmittedForm(false);
        setIsProductModalOpen(true);
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();

        // 💡 ตรวจสอบข้อมูลก่อนส่ง หากไม่ครบจะปรับ state เป็น true และ return ทันที (ให้ error แดงขึ้นแทน alert)
        if (!newProduct.name || !newProduct.categoryId || !newProduct.unitId || (!newProduct.noExpiry && !newProduct.expirationDate)) {
            setHasSubmittedForm(true);
            return;
        }

        setIsCreatingProduct(true);
        try {
            const payload = {
                name: newProduct.name.trim(),
                categoryId: newProduct.categoryId,
                unitId: newProduct.unitId,
                expirationDate: newProduct.noExpiry ? null : newProduct.expirationDate,
                lotNumber: newProduct.lotNumber.trim(),
                isLotManaged: !newProduct.noExpiry
            };

            const res = await apiFetch("/master/products", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const createdProduct = res.data || res;
            setProducts(prev => [...prev, createdProduct]);
            setNewlyCreatedProductIds(prev => [...prev, createdProduct.id]);

            if (activeRowIndex !== null) {
                setItems(prevItems => {
                    const updatedItems = [...prevItems];
                    updatedItems[activeRowIndex].productId = createdProduct.id;
                    updatedItems[activeRowIndex].estimatedPrice = 0;
                    return updatedItems;
                });
            }

            // เปิด Popup สร้างสินค้าสำเร็จ (เอา setTimeout ออก)
            setProductSuccessModal(true);

        } catch (error) {
            toast.error(error.message || "สร้างสินค้าไม่สำเร็จ");
        } finally {
            setIsCreatingProduct(false);
        }
    };
    const triggerSubmitPR = (e) => {
        e.preventDefault();
        let newErrors = {};
        let isValid = true;

        if (!purpose.trim()) { newErrors.purpose = "ระบุวัตถุประสงค์"; isValid = false; }
        if (!departmentId) { newErrors.departmentId = "เลือกแผนก"; isValid = false; }

        const itemErrors = items.map(item => {
            const iErr = {};
            if (!item.productId) { iErr.productId = "เลือกพัสดุ"; isValid = false; }
            if (!item.quantity || item.quantity <= 0) { iErr.quantity = "ระบุจำนวน"; isValid = false; }
            return iErr;
        });

        if (!isValid) {
            setErrors({ ...newErrors, items: itemErrors });
            toast.error("กรุณาตรวจสอบข้อมูล");
            return;
        }
        setConfirmSubmitModal(true);
    };

    const executeSubmitPR = async () => {
        setConfirmSubmitModal(false);
        setIsSubmitting(true);
        try {
            const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
            const payload = {
                purpose: purpose.trim(),
                departmentId,
                supplierId: supplierId || null,
                items: validItems.map(it => ({
                    productId: it.productId,
                    quantity: Number(it.quantity),
                    estimatedPrice: Number(it.estimatedPrice) || 0
                }))
            };
            await apiFetch("/api/purchase/pr", { method: "POST", body: JSON.stringify(payload) });

            // เปิดหน้าต่าง Success (เอา setTimeout ออก)
            setSuccessModal(true);

        } catch (error) {
            toast.error(`ส่งข้อมูลไม่สำเร็จ: ${error.message}`);
            setIsSubmitting(false);
        }
    };

    const totalEstAmount = useMemo(() => items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.estimatedPrice || 0)), 0), [items]);

    // --- Components for Modals ---
    const ConfirmSubmitPortal = () => {
        if (!isMounted || !confirmSubmitModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                    <div className="p-6 flex items-center justify-between border-b border-slate-200 bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">ยืนยันการส่งใบขอซื้อ</h3>
                        <button onClick={() => setConfirmSubmitModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-8">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-center shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">มูลค่าประเมินรวมทั้งสิ้น</p>
                            <p className="text-3xl font-black text-emerald-600 tabular-nums">฿{totalEstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setConfirmSubmitModal(false)} className="py-3 rounded-lg font-bold text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm">ยกเลิก</button>
                            <button onClick={executeSubmitPR} disabled={isSubmitting} className="py-3 rounded-lg font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm flex justify-center items-center gap-2">
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle2 className="w-4 h-4" /> ยืนยันข้อมูล</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>, document.body
        );
    };

    const SuccessPortal = () => {
        if (!isMounted || !successModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center max-w-sm w-full border border-slate-200 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-200">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">สร้างใบขอซื้อสำเร็จ!</h3>
                    <p className="text-sm font-bold text-slate-500 text-center mb-8">ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว</p>

                    <button
                        onClick={() => router.push("/purchase/pr")}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold uppercase tracking-widest shadow-sm transition-colors active:scale-95"
                    >
                        ตกลง
                    </button>
                </div>
            </div>, document.body
        );
    };

    const ProductSuccessPortal = () => {
        if (!isMounted || !productSuccessModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center max-w-sm w-full border border-slate-200 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-200">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">สร้างรหัสสินค้าสำเร็จ!</h3>
                    <p className="text-sm font-bold text-slate-500 text-center mb-8">ระบบได้เพิ่มรายการลงในฐานข้อมูลแล้ว</p>
                    
                    <button 
                        onClick={() => {
                            setProductSuccessModal(false);
                            setIsProductModalOpen(false);
                        }} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold uppercase tracking-widest shadow-sm transition-colors active:scale-95"
                    >
                        ตกลง
                    </button>
                </div>
            </div>, document.body
        );
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <ConfirmSubmitPortal />
            <SuccessPortal />
            <ProductSuccessPortal /> {/* 💡 เรียกใช้งาน Component Popup ที่นี่ */}

            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 w-fit text-base font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                                <FilePlus2 className="w-7 h-7 text-[#1F3B8B]" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                                    สร้างใบขอซื้อ (PR)
                                </h1>
                                <p className="text-base text-slate-500 mt-1.5 font-medium flex items-center gap-2">
                                    ระบบบันทึกคำขออนุมัติจัดซื้อพัสดุ
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={triggerSubmitPR} className="space-y-8" noValidate>
                    <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col">

                        {/* SECTION 1: MASTER INFO */}
                        <div className="p-8 md:p-10 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-8">
                                ข้อมูลพื้นฐาน
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                        วัตถุประสงค์การจัดซื้อ <span className="text-rose-500">*</span>
                                    </label>
                                    <input type="text" value={purpose} onChange={(e) => { setPurpose(e.target.value); if (errors.purpose) setErrors({ ...errors, purpose: null }); }} className={`w-full border rounded-lg p-3.5 text-base font-bold outline-none transition-all ${errors.purpose ? 'border-rose-400 bg-rose-50 text-rose-900 placeholder-rose-300' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10'}`} placeholder="เช่น ขอซื้อคอมพิวเตอร์โครงการ..." required />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                        แผนกที่ร้องขอ <span className="text-rose-500">*</span>
                                    </label>
                                    <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); if (errors.departmentId) setErrors({ ...errors, departmentId: null }); }} className={`w-full border rounded-lg p-3.5 text-base font-bold outline-none transition-all ${errors.departmentId ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10'}`} required>
                                        <option value="">-- เลือกแผนก --</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">แนะนำคู่ค้า</label>
                                    <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full border border-slate-200 bg-slate-50 rounded-lg p-3.5 text-base font-bold outline-none text-slate-900 transition-all focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10">
                                        <option value="">-- ไม่ระบุ (คัดเลือกภายหลัง) --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: ITEM LIST */}
                        <div className="p-8 md:p-10 border-b border-slate-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest">รายละเอียดรายการพัสดุ (Items)</h2>
                                <button type="button" onClick={handleAddItem} className="bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 active:scale-95"><Plus className="w-4 h-4" /> เพิ่มรายการ</button>
                            </div>

                            <div className="space-y-6">
                                {items.map((item, index) => {
                                    const isNew = newlyCreatedProductIds.includes(item.productId);
                                    const isPriceReadOnly = item.productId ? !isNew : true;
                                    return (
                                        <div key={index} className="flex flex-col xl:flex-row gap-6 p-6 bg-slate-50/50 border border-slate-200 rounded-xl hover:border-[#1F3B8B]/30 transition-all items-end">

                                            <div className="flex-1 w-full space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                                        สินค้า / SKU <span className="text-rose-500">*</span>
                                                    </label>
                                                    <button type="button" onClick={() => openNewProductModal(index)} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors uppercase tracking-wider"><Plus className="w-3.5 h-3.5" /> สร้างรหัสใหม่</button>
                                                </div>
                                                <SearchableProductSelect options={products} value={item.productId} onChange={(val) => handleItemChange(index, "productId", val)} error={errors.items?.[index]?.productId} />
                                            </div>

                                            <div className="flex gap-4 w-full xl:w-auto">
                                                <div className="w-full xl:w-32 space-y-2">
                                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest text-center block">
                                                        จำนวน <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} className={`w-full border rounded-lg p-3 text-center font-bold text-lg outline-none transition-all ${errors.items?.[index]?.quantity ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10'}`} />
                                                </div>
                                                <div className="w-full xl:w-56 space-y-2">
                                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest text-right block">ราคาประเมิน {isPriceReadOnly ? '(ดึงอัตโนมัติ)' : '(ระบุเอง)'}</label>
                                                    <div className="relative">
                                                        <input type="number" value={item.estimatedPrice} onChange={(e) => handleItemChange(index, "estimatedPrice", e.target.value)} readOnly={isPriceReadOnly} className={`w-full border rounded-lg p-3 text-right font-bold text-base outline-none transition-all ${isPriceReadOnly ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10'}`} placeholder="0.00" />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">฿</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button type="button" onClick={() => handleRemoveItem(index)} className="p-3 bg-white text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 transition-colors shadow-sm" disabled={items.length === 1} title="ลบรายการ"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* --- FOOTER ACTION --- */}
                        <div className="p-8 md:p-10 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">มูลค่าประเมินรวมทั้งสิ้น</p>
                                    <p className="text-emerald-600 text-3xl font-black tabular-nums">฿{totalEstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-lg font-bold text-sm uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
                                <ShieldCheck className="w-5 h-5" /> ยืนยันและส่งใบขอซื้อ
                            </button>
                        </div>
                    </div>
                </form>

                {/* --- 📦 Quick Product Modal --- */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">

                            <div className="bg-slate-50 p-6 md:p-8 flex justify-between items-center border-b border-slate-200">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wider">สร้างฐานข้อมูลสินค้าด่วน</h3>
                                    <p className="text-sm text-slate-500 font-bold mt-1">เพิ่มพัสดุและระบุวันหมดอายุ</p>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            <form onSubmit={handleCreateProduct} className="p-6 md:p-8 space-y-6" noValidate>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                            หมวดหมู่ <span className="text-rose-500">*</span>
                                        </label>
                                        <select value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })} className={`w-full border rounded-lg p-3 text-base font-bold outline-none transition-all ${hasSubmittedForm && !newProduct.categoryId ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1F3B8B]'}`}>
                                            <option value="">-- เลือก --</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        {hasSubmittedForm && !newProduct.categoryId && (
                                            <span className="text-[11px] font-bold text-rose-500 mt-1.5 block">กรุณาเลือกหมวดหมู่</span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">รหัส SKU (Auto)</label>
                                        <input type="text" value="สร้างอัตโนมัติ" className="w-full border border-slate-200 bg-slate-100 text-slate-400 rounded-lg p-3 text-center font-bold cursor-not-allowed" readOnly />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                            หมายเลขล็อต (Auto-Generated)
                                        </label>
                                        <input
                                            type="text"
                                            value={newProduct.lotNumber}
                                            readOnly
                                            className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-lg p-3 text-base font-bold outline-none cursor-not-allowed shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                วันหมดอายุ <span className="text-rose-500">*</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" checked={newProduct.noExpiry} onChange={(e) => setNewProduct({ ...newProduct, noExpiry: e.target.checked, expirationDate: '' })} className="w-4 h-4 rounded border-slate-300 accent-[#1F3B8B]" />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ไม่มีวันหมดอายุ</span>
                                            </label>
                                        </div>
                                        <input type="date" value={newProduct.expirationDate} onChange={(e) => setNewProduct({ ...newProduct, expirationDate: e.target.value })} disabled={newProduct.noExpiry} className={`w-full border rounded-lg p-3 text-base font-bold outline-none transition-all ${!newProduct.noExpiry && hasSubmittedForm && !newProduct.expirationDate ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1F3B8B] disabled:opacity-50 disabled:bg-slate-100'}`} />
                                        {!newProduct.noExpiry && hasSubmittedForm && !newProduct.expirationDate && (
                                            <span className="text-[11px] font-bold text-rose-500 mt-1.5 block">กรุณาระบุวันหมดอายุ</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        ชื่อพัสดุ / สินค้า <span className="text-rose-500">*</span>
                                    </label>
                                    <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="ระบุชื่อพัสดุ..." className={`w-full border rounded-lg p-3 text-base font-bold outline-none transition-all ${hasSubmittedForm && !newProduct.name ? 'border-rose-400 bg-rose-50 text-rose-900 placeholder-rose-300' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1F3B8B]'}`} />
                                    {hasSubmittedForm && !newProduct.name && (
                                        <span className="text-[11px] font-bold text-rose-500 mt-1.5 block">กรุณาระบุชื่อพัสดุ / สินค้า</span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        หน่วยนับ <span className="text-rose-500">*</span>
                                    </label>
                                    <select value={newProduct.unitId} onChange={(e) => setNewProduct({ ...newProduct, unitId: e.target.value })} className={`w-full border rounded-lg p-3 text-base font-bold outline-none transition-all ${hasSubmittedForm && !newProduct.unitId ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1F3B8B]'}`}>
                                        <option value="">-- เลือก --</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                    {hasSubmittedForm && !newProduct.unitId && (
                                        <span className="text-[11px] font-bold text-rose-500 mt-1.5 block">กรุณาเลือกหน่วยนับ</span>
                                    )}
                                </div>

                                <div className="pt-6 mt-4 border-t border-slate-200 flex gap-4">
                                    <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm">ยกเลิก</button>
                                    <button type="submit" disabled={isCreatingProduct} className="flex-[2] bg-emerald-600 text-white py-3 rounded-lg font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                                        {isCreatingProduct ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle2 className="w-5 h-5" /> ยืนยันการสร้าง</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}