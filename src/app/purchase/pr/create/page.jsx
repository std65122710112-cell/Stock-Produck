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
    AlertTriangle,
    Layout,
    Tag,
    Ruler,
    CalendarDays
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
                                    e.preventDefault();
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
    const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);

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
        if (confirmSubmitModal || isProductModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [confirmSubmitModal, isProductModalOpen]);

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
            lotNumber: generateAutoLotNumber() // 💡 สร้างให้ตอนเปิดจอ
        });
        setHasSubmittedForm(false);
        setIsProductModalOpen(true);
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        
        if (!newProduct.name || !newProduct.categoryId || !newProduct.unitId || (!newProduct.noExpiry && !newProduct.expirationDate)) {
            setHasSubmittedForm(true);
            return toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
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

            toast.success(`สร้างรหัส [${createdProduct.sku}] และบันทึกล็อตสำเร็จ!`);
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
            toast.success("สร้างใบขอซื้อสำเร็จ!");
            setTimeout(() => router.push("/purchase/pr"), 1500);
        } catch (error) {
            toast.error(`ส่งข้อมูลไม่สำเร็จ: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalEstAmount = useMemo(() => items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.estimatedPrice || 0)), 0), [items]);

    const ConfirmSubmitPortal = () => {
        if (!isMounted || !confirmSubmitModal) return null;
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
                    <div className="p-6 flex items-center justify-between bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600"><ShieldCheck className="w-6 h-6" /></div>
                            <div><h3 className="text-lg font-black text-emerald-950">ยืนยันการส่งใบขอซื้อ</h3></div>
                        </div>
                        <button onClick={() => setConfirmSubmitModal(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-8">
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-center">
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">มูลค่าประเมินรวมทั้งสิ้น</p>
                            <p className="text-2xl font-black text-blue-900 tabular-nums">฿{totalEstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setConfirmSubmitModal(false)} className="py-3.5 rounded-2xl font-black text-sm text-slate-500 bg-slate-100 hover:bg-slate-200">ยกเลิก</button>
                            <button onClick={executeSubmitPR} disabled={isSubmitting} className="py-3.5 rounded-2xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center gap-2">
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle2 className="w-4 h-4" /> ยืนยันข้อมูล</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>, document.body
        );
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <ConfirmSubmitPortal />

            <div className="w-[98%] max-w-[1600px] mx-auto space-y-8 pb-10 py-8 px-4 md:px-0 animate-in fade-in duration-500">
                
                {/* --- HEADER --- */}
                <div className="w-full pt-10 mb-6">
                    <div className="w-full px-6 md:px-10 flex flex-col gap-6">
                        <button onClick={() => router.back()} className="group flex items-center gap-2 bg-white border-2 border-slate-300 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all w-fit shadow-sm">
                            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B]" /> ย้อนกลับ
                        </button>

                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm border-2 border-slate-200">
                                <FilePlus2 className="w-8 h-8 text-[#1F3B8B]" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">สร้างใบขอซื้อ (PR)</h1>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">ระบบบันทึกคำขออนุมัติจัดซื้อพัสดุ</p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={triggerSubmitPR} className="space-y-8" noValidate>
                    <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-200 overflow-hidden">
                        
                        {/* SECTION 1: MASTER INFO */}
                        <div className="p-8 md:p-10 space-y-10">
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 border-b-2 border-slate-100 pb-5">
                                <div className="p-2.5 bg-indigo-100 rounded-xl"><LayoutGrid className="w-6 h-6 text-indigo-600" /></div> ข้อมูลพื้นฐาน
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-sm font-black text-slate-600 uppercase tracking-wide ml-1 flex items-center gap-2"><Info className="w-5 h-5 text-sky-500" /> วัตถุประสงค์การจัดซื้อ *</label>
                                    <input type="text" value={purpose} onChange={(e) => { setPurpose(e.target.value); if (errors.purpose) setErrors({ ...errors, purpose: null }); }} className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all ${errors.purpose ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-slate-50 focus:bg-white focus:border-sky-500'}`} placeholder="เช่น ขอซื้อคอมพิวเตอร์โครงการ..." required />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-600 uppercase tracking-wide ml-1 flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-500" /> แผนกที่ร้องขอ *</label>
                                    <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); if (errors.departmentId) setErrors({ ...errors, departmentId: null }); }} className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none ${errors.departmentId ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-slate-50 focus:border-emerald-500'}`} required>
                                        <option value="">-- เลือกแผนก --</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-600 uppercase tracking-wide ml-1 flex items-center gap-2"><Truck className="w-5 h-5 text-amber-500" /> แนะนำคู่ค้า</label>
                                    <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full border-2 border-slate-300 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-500 bg-slate-50 focus:bg-white">
                                        <option value="">-- ไม่ระบุ (คัดเลือกภายหลัง) --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-100"></div>

                        {/* SECTION 2: ITEM LIST */}
                        <div className="p-8 md:p-10 space-y-8 bg-slate-50/30">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><div className="p-2.5 bg-emerald-100 rounded-xl"><Package className="w-6 h-6 text-emerald-600" /></div> รายการพัสดุ</h2>
                                <button type="button" onClick={handleAddItem} className="bg-emerald-600 text-white text-sm font-black px-6 py-3.5 rounded-2xl hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2"><Plus className="w-5 h-5" /> เพิ่มรายการ</button>
                            </div>

                            <div className="space-y-6">
                                {items.map((item, index) => {
                                    const isNew = newlyCreatedProductIds.includes(item.productId);
                                    const isPriceReadOnly = item.productId ? !isNew : true;
                                    return (
                                        <div key={index} className="flex flex-col xl:flex-row gap-6 p-6 md:p-8 bg-white border-2 border-slate-300 rounded-[2.5rem] hover:border-blue-300 transition-all shadow-md items-end relative group">
                                            <div className="absolute -top-3 -left-3 w-9 h-9 bg-slate-950 text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-white shadow-md">{index + 1}</div>
                                            
                                            <div className="flex-1 w-full space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-black text-slate-600 uppercase">สินค้า / SKU *</label>
                                                    <button type="button" onClick={() => openNewProductModal(index)} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"><PlusCircle className="w-4 h-4" /> สร้างรหัสใหม่</button>
                                                </div>
                                                <SearchableProductSelect options={products} value={item.productId} onChange={(val) => handleItemChange(index, "productId", val)} error={errors.items?.[index]?.productId} />
                                            </div>

                                            <div className="flex gap-4 w-full xl:w-auto">
                                                <div className="w-full xl:w-36 space-y-3">
                                                    <label className="text-sm font-black text-slate-600 uppercase text-center block">จำนวน *</label>
                                                    <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} className={`w-full border-2 rounded-2xl p-4 text-center font-black text-xl outline-none ${errors.items?.[index]?.quantity ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white focus:border-sky-500'}`} />
                                                </div>
                                                <div className="w-full xl:w-56 space-y-3">
                                                    <label className="text-sm font-black text-slate-600 uppercase text-right block">ราคาประเมิน {isPriceReadOnly ? '(ดึงอัตโนมัติ)' : '(ระบุเอง)'}</label>
                                                    <div className="relative">
                                                        <input type="number" value={item.estimatedPrice} onChange={(e) => handleItemChange(index, "estimatedPrice", e.target.value)} readOnly={isPriceReadOnly} className={`w-full border-2 rounded-2xl p-4 text-right font-black text-base outline-none ${isPriceReadOnly ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-slate-300 bg-white focus:border-sky-500'}`} placeholder="0.00" />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase">บาท</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button type="button" onClick={() => handleRemoveItem(index)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-100 hover:text-rose-600 border border-slate-200 transition-colors" disabled={items.length === 1}><Trash2 className="w-6 h-6" /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* --- FOOTER ACTION --- */}
                        <div className="bg-white p-8 border-t-2 border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6 border-l-4 border-indigo-500 pl-6 w-full md:w-auto">
                                <div><p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em]">มูลค่าประเมินรวมทั้งสิ้น</p><p className="text-slate-950 text-4xl font-black tracking-tighter">฿{totalEstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><ShieldCheck className="w-5 h-5" /> ยืนยันและส่งใบขอซื้อ</>}
                            </button>
                        </div>
                    </div>
                </form>

                {/* --- 📦 Quick Product Modal --- */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
                            <div className="bg-slate-50/50 p-10 flex justify-between items-center border-b">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-white rounded-2xl shadow-sm border"><Database className="w-8 h-8 text-indigo-600" /></div>
                                    <div><h3 className="text-xl font-black text-slate-900">สร้างฐานข้อมูลสินค้าด่วน</h3><p className="text-sm text-slate-400 font-bold mt-1">เพิ่มพัสดุและระบุวันหมดอายุ</p></div>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="p-3 text-slate-400 hover:rotate-90 transition-all"><X className="w-6 h-6" /></button>
                            </div>

                            <form onSubmit={handleCreateProduct} className="p-10 space-y-7">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* หมวดหมู่ */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 ml-1"><Layout className="w-4 h-4 text-blue-500" /> หมวดหมู่ *</label>
                                        <select value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })} className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none ${hasSubmittedForm && !newProduct.categoryId ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 focus:bg-white'}`} required>
                                            <option value="">-- เลือก --</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    {/* SKU (Auto) */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 ml-1"><Hash className="w-4 h-4 text-amber-500" /> รหัส SKU (Auto)</label>
                                        <input type="text" value="สร้างอัตโนมัติ" className="w-full border-2 border-amber-100 bg-amber-50 text-amber-600 rounded-2xl p-4 text-center font-mono font-black cursor-default" readOnly />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 💡 หมายเลข Lot (ล็อกการพิมพ์) */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 ml-1">
                                            <Tag className="w-4 h-4 text-indigo-500" /> หมายเลขล็อต (Auto-Generated)
                                        </label>
                                        <input 
                                            type="text" 
                                            value={newProduct.lotNumber} 
                                            readOnly // 💡 ห้ามแก้ไข
                                            className="w-full border-2 border-slate-200 bg-slate-100 text-slate-500 rounded-2xl p-4 text-sm font-bold font-mono outline-none cursor-not-allowed shadow-inner" 
                                        />
                                    </div>
                                    {/* วันหมดอายุ */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2"><CalendarDays className="w-4 h-4 text-orange-500" /> วันหมดอายุ *</label>
                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={newProduct.noExpiry} onChange={(e) => setNewProduct({ ...newProduct, noExpiry: e.target.checked, expirationDate: '' })} className="w-3.5 h-3.5 rounded border-slate-300" /><span className="text-[10px] font-bold text-slate-400 uppercase">ไม่มีวันหมดอายุ</span></label>
                                        </div>
                                        <input type="date" value={newProduct.expirationDate} onChange={(e) => setNewProduct({ ...newProduct, expirationDate: e.target.value })} disabled={newProduct.noExpiry} className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none ${!newProduct.noExpiry && hasSubmittedForm && !newProduct.expirationDate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 disabled:opacity-50'}`} />
                                    </div>
                                </div>

                                {/* ชื่อสินค้า */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 ml-1"><Tag className="w-4 h-4 text-rose-500" /> ชื่อพัสดุ / สินค้า *</label>
                                    <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="ระบุชื่อพัสดุ..." className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none ${hasSubmittedForm && !newProduct.name ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 focus:bg-white'}`} required />
                                </div>

                                {/* หน่วยนับ */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 ml-1"><Ruler className="w-4 h-4 text-emerald-500" /> หน่วยนับ *</label>
                                    <select value={newProduct.unitId} onChange={(e) => setNewProduct({ ...newProduct, unitId: e.target.value })} className={`w-full border-2 rounded-2xl p-4 text-sm font-bold outline-none ${hasSubmittedForm && !newProduct.unitId ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 focus:bg-white'}`} required>
                                        <option value="">-- เลือก --</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>

                                <div className="pt-6 border-t flex gap-4">
                                    <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">ยกเลิก</button>
                                    <button type="submit" disabled={isCreatingProduct} className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex justify-center items-center gap-2">
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