"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { createPortal } from "react-dom";

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
    CheckCircle2,
    FilePlus2,
    Search,
    ArrowLeft,
    AlertTriangle
} from "lucide-react";

// --- 💡 คอมโพเนนต์พิเศษ: ช่องค้นหาสินค้า (เพิ่ม prop 'error' สำหรับแสดงสีแดงตอนลืมกรอก) ---
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
                        if (value) onChange(""); // เคลียร์ค่า ID ถ้าเริ่มพิมพ์ใหม่
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    // 💡 ปรับเส้นขอบให้เข้มขึ้น (border-slate-300) และพื้นหลังช่องกรอก (bg-slate-50) ให้ตัดกับพื้นหลัง
                    className={`w-full border-2 rounded-xl p-3.5 text-sm font-black outline-none transition-all pr-10 ${error
                            ? 'border-rose-400 bg-rose-50 text-rose-800 placeholder-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                            : 'border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-50'
                        }`}
                    placeholder="พิมพ์ค้นหา รหัส (SKU) หรือ ชื่อสินค้า..."
                    required={!value}
                />
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${error ? 'text-rose-400' : 'text-slate-400'}`}>
                    <Search className="w-4 h-4" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 max-h-60 overflow-y-auto bg-white border-2 border-slate-300 rounded-xl shadow-2xl custom-scrollbar">
                    {filtered.length > 0 ? (
                        filtered.map(o => (
                            <div
                                key={o.id}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // ป้องกัน onBlur ทำงานก่อน
                                    onChange(o.id);
                                    setIsOpen(false);
                                }}
                                className="p-3.5 hover:bg-sky-50 cursor-pointer flex flex-col border-b border-slate-100 last:border-0 transition-colors"
                            >
                                <span className="text-[10px] font-black text-sky-600 tracking-wider">[{o.sku}]</span>
                                <span className="text-sm font-bold text-slate-700">{o.name}</span>
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

    // 💡 State สำหรับจัดการ Error แจ้งเตือนเมื่อลืมกรอก
    const [errors, setErrors] = useState({});

    // ตัวแปรเก็บ ID สินค้าที่เพิ่งสร้างใหม่ (เพื่อเปิดให้กรอกราคาได้)
    const [newlyCreatedProductIds, setNewlyCreatedProductIds] = useState([]);

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

        // ดึงราคาล่าสุดมาเติมอัตโนมัติ
        if (field === "productId") {
            const selectedProduct = products.find(p => p.id === value);
            if (selectedProduct) {
                newItems[index].estimatedPrice = Number(selectedProduct.unitCost) || Number(selectedProduct.price) || 0;
            } else {
                newItems[index].estimatedPrice = 0;
            }
        }

        setItems(newItems);

        // เคลียร์ Error ระดับ Item เมื่อมีการพิมพ์/เลือกข้อมูล
        if (errors.items && errors.items[index] && errors.items[index][field]) {
            const newItemsErrors = [...errors.items];
            newItemsErrors[index] = { ...newItemsErrors[index], [field]: null };
            setErrors({ ...errors, items: newItemsErrors });
        }
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
            setNewlyCreatedProductIds(prev => [...prev, createdProduct.id]);

            if (activeRowIndex !== null) {
                setItems(prevItems => {
                    const updatedItems = [...prevItems];
                    updatedItems[activeRowIndex].productId = createdProduct.id;
                    updatedItems[activeRowIndex].estimatedPrice = 0;
                    return updatedItems;
                });
            }

            toast.success(`สร้างรหัส [${finalSku}] สำเร็จ!`);
            setIsProductModalOpen(false);
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

        const cleanPurpose = purpose.trim();
        if (!cleanPurpose) {
            newErrors.purpose = "กรุณาระบุวัตถุประสงค์การจัดซื้อ";
            isValid = false;
        }

        if (!departmentId) {
            newErrors.departmentId = "กรุณาเลือกแผนกที่ร้องขอ";
            isValid = false;
        }

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

        if (!isValid) {
            setErrors(newErrors);
            toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
            return;
        }

        setErrors({});
        setConfirmSubmitModal(true);
    };

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
                        <p className="text-sm font-bold text-slate-600 leading-relaxed text-center mb-6">
                            คุณตรวจสอบความถูกต้องของข้อมูลและรายการพัสดุเรียบร้อยแล้วใช่หรือไม่? <br /><br />การดำเนินการนี้จะสร้างเอกสารเข้าสู่ระบบเพื่อรอการอนุมัติทันที
                        </p>

                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-center">
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">มูลค่าประเมินรวมทั้งสิ้น</p>
                            <p className="text-2xl font-black text-blue-900 tabular-nums">฿{totalEstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

            <div className="w-[98%] max-w-[1600px] mx-auto space-y-8 pb-10 py-8 px-4 md:px-0 animate-in fade-in duration-500">

                <div className="w-full pt-10 mb-6 print:hidden">
                    <div className="w-full px-6 md:px-10 flex flex-col gap-6">

                        {/* แถวบน: ปุ่มย้อนกลับ */}
                        <div>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="group flex items-center gap-2 bg-white border-2 border-slate-300 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 shadow-sm whitespace-nowrap w-fit"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                ย้อนกลับ
                            </button>
                        </div>

                        {/* แถวล่าง: ส่วน Header (ไอคอน + ข้อความ) */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-200">
                                <FilePlus2 className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <ShieldCheck className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        Procurement Initiation Process
                                    </p>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2 flex flex-wrap items-center gap-3">
                                    สร้างใบขอซื้อ (PR)
                                    <span className="bg-slate-950 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-sm uppercase">
                                        เอกสารภายใน
                                    </span>
                                </h1>
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <FileSignature className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                        ระบบบันทึกคำขออนุมัติจัดซื้อ (Purchase Requisition)
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <form onSubmit={triggerSubmitPR} className="space-y-8" noValidate>
                    {/* 💡 เพิ่มเงาและขอบที่ชัดเจนขึ้นให้กับ Container หลัก */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-200 overflow-hidden">

                        {/* SECTION 1: MASTER INFO */}
                        <div className="p-8 md:p-10 space-y-8 relative">
                            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5 border-b-2 border-slate-100 pb-4">
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
                                        onChange={(e) => {
                                            setPurpose(e.target.value);
                                            if (errors.purpose) setErrors({ ...errors, purpose: null });
                                        }}
                                        // 💡 ปรับขอบให้ชัดเจน (border-slate-300)
                                        className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all ${errors.purpose
                                                ? 'border-rose-400 bg-rose-50 text-rose-800 placeholder-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
                                                : 'border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-50'
                                            }`}
                                        placeholder="เช่น ขออนุมัติสั่งซื้อพัสดุสำหรับโครงการ TJC Phase 2..."
                                        required
                                    />
                                    {errors.purpose && <p className="text-sm font-bold text-rose-500 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {errors.purpose}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                        <Building2 className="w-4 h-4 text-emerald-500" /> แผนกที่ร้องขอ (Cost Center) <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={departmentId}
                                        onChange={(e) => {
                                            setDepartmentId(e.target.value);
                                            if (errors.departmentId) setErrors({ ...errors, departmentId: null });
                                        }}
                                        className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all ${errors.departmentId
                                                ? 'border-rose-400 bg-rose-50 text-rose-800 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
                                                : 'border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50'
                                            }`}
                                        required
                                    >
                                        <option value="">-- กรุณาเลือกแผนกต้นสังกัด --</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    {errors.departmentId && <p className="text-sm font-bold text-rose-500 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {errors.departmentId}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-2 ml-1">
                                        <Truck className="w-4 h-4 text-amber-500" /> แนะนำคู่ค้า (Suggested Vendor)
                                    </label>
                                    <select
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(e.target.value)}
                                        className="w-full border-2 border-slate-300 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all text-slate-800 bg-slate-50 focus:bg-white"
                                    >
                                        <option value="">-- ไม่ระบุ (ดำเนินการคัดเลือกคู่ค้าภายหลัง) --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-200/80"></div>

                        {/* SECTION 2: ITEM MANIFEST */}
                        {/* 💡 ปรับพื้นหลังส่วนตารางให้เข้มขึ้นเล็กน้อย (bg-slate-100/50) เพื่อให้กล่องสินค้าย่อยเด่นขึ้น */}
                        <div className="p-8 md:p-10 space-y-6 relative bg-slate-100/50">
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
                                {items.map((item, index) => {
                                    const isNewProduct = newlyCreatedProductIds.includes(item.productId);
                                    const isPriceReadOnly = item.productId ? !isNewProduct : true;

                                    const errProduct = errors.items?.[index]?.productId;
                                    const errQuantity = errors.items?.[index]?.quantity;

                                    return (
                                        // 💡 ปรับกล่องสินค้าย่อยให้มีขอบเข้มขึ้น (border-slate-300) และเงาชัดขึ้น (shadow-md)
                                        <div key={index} className="flex flex-col xl:flex-row gap-6 p-6 md:p-8 bg-white border-2 border-slate-300 rounded-[2rem] hover:border-blue-300 transition-colors shadow-md items-end relative group">
                                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-950 text-white rounded-full flex items-center justify-center font-black text-xs shadow-md border-4 border-white">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 w-full space-y-2">
                                                <label className="text-xs font-black text-slate-600 uppercase tracking-wide ml-1 flex justify-between">
                                                    <span>ข้อมูลสินค้า / รหัส (SKU) <span className="text-rose-500">*</span></span>
                                                    <button
                                                        type="button"
                                                        onClick={() => openNewProductModal(index)}
                                                        className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-colors border border-indigo-100"
                                                    >
                                                        <PlusCircle className="w-3 h-3" /> สร้างรหัสใหม่
                                                    </button>
                                                </label>
                                                <SearchableProductSelect
                                                    options={products}
                                                    value={item.productId}
                                                    onChange={(val) => handleItemChange(index, "productId", val)}
                                                    error={errProduct}
                                                />
                                                {errProduct && <p className="text-sm font-bold text-rose-500 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {errProduct}</p>}
                                            </div>

                                            <div className="flex gap-4 w-full xl:w-auto">
                                                <div className="w-full xl:w-32 space-y-2">
                                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide text-center block">จำนวน <span className="text-rose-500">*</span></label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                        className={`w-full border-2 rounded-xl p-3.5 text-center font-mono font-black text-lg outline-none transition-all ${errQuantity
                                                                ? 'border-rose-400 bg-rose-50 text-rose-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                                                                : 'border-slate-300 bg-white text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-50'
                                                            }`}
                                                        required
                                                    />
                                                    {errQuantity && <p className="text-xs font-bold text-rose-500 mt-1 text-center whitespace-nowrap">{errQuantity}</p>}
                                                </div>

                                                <div className="w-full xl:w-48 space-y-2">
                                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide text-right flex justify-end gap-1">
                                                        ราคาประเมิน
                                                        {isPriceReadOnly
                                                            ? <span className="text-slate-400 font-bold">(ดึงอัตโนมัติ)</span>
                                                            : <span className="text-emerald-500 font-bold">(ระบุเอง)</span>}
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.estimatedPrice}
                                                            onChange={(e) => handleItemChange(index, "estimatedPrice", e.target.value)}
                                                            readOnly={isPriceReadOnly}
                                                            className={`w-full border-2 rounded-xl p-3.5 text-right tabular-nums font-black text-sm outline-none transition-all pr-8 ${isPriceReadOnly ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-50 text-slate-800'}`}
                                                            placeholder="0.00"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">บาท</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="p-3.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-100 hover:text-rose-600 border border-slate-200 hover:border-rose-300 transition-colors w-full xl:w-auto flex justify-center items-center"
                                                disabled={items.length === 1}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* --- ACTION BAR (Bottom of Document) --- */}
                        <div className="bg-white p-6 md:p-8 border-t-2 border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.05)]">
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
                                            className="w-full border-2 border-slate-300 rounded-2xl p-3.5 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 bg-slate-50 transition-all"
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
                                            className="w-full border-2 border-indigo-200 bg-indigo-50 text-indigo-700 rounded-2xl p-3.5 text-sm font-mono font-black text-center outline-none"
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
                                        className="w-full border-2 border-slate-300 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 bg-slate-50 transition-all"
                                        placeholder="เช่น Cisco Switch Catalyst 9200..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-wide ml-1">หน่วยนับ (Unit) <span className="text-rose-500">*</span></label>
                                    <select
                                        value={newProduct.unitId}
                                        onChange={(e) => setNewProduct({ ...newProduct, unitId: e.target.value })}
                                        className="w-full border-2 border-slate-300 rounded-2xl p-3.5 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 bg-slate-50 transition-all"
                                        required
                                    >
                                        <option value="">-- เลือกหน่วยนับ --</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex gap-4">
                                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 rounded-2xl uppercase tracking-wider hover:bg-slate-200 transition-colors">ยกเลิก</button>
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