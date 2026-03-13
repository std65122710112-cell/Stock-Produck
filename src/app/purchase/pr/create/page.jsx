"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import {
    FileSignature,
    Plus,
    Trash2,
    Database,
    Building2,
    Info,
    Package,
    ShoppingCart,
    Hash,
    ShieldCheck,
    PlusCircle,
    X,
    LayoutGrid,
    Tag,
    Calculator,
    Truck
} from "lucide-react";

export default function CreatePurchaseRequisitionPage() {
    const router = useRouter();

    // --- 📦 Master Data States ---
    const [products, setProducts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [suppliers, setSuppliers] = useState([]); // 💡 เพิ่ม State คู่ค้า

    // --- 📝 PR Form States ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [purpose, setPurpose] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [supplierId, setSupplierId] = useState(""); // 💡 เพิ่ม State สำหรับเก็บคู่ค้าที่เลือก
    const [items, setItems] = useState([{ productId: "", quantity: 1, estimatedPrice: 0 }]);

    // --- ✨ Quick Product Creation States ---
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', categoryId: '', unitId: '' });

    useEffect(() => {
        async function loadAllMasterData() {
            try {
                // 💡 เพิ่มการดึงข้อมูล Supplier มาพร้อมกันเลย
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

    const getNextSequentialSku = () => {
        if (!newProduct.categoryId) return "Waiting for category...";
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

    const handleSubmitPR = async (e) => {
        e.preventDefault();
        if (!purpose.trim()) return toast.error("กรุณาระบุวัตถุประสงค์");
        if (!departmentId) return toast.error("กรุณาเลือกแผนกที่ขอซื้อ");

        const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
        if (validItems.length === 0) return toast.error("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");

        setIsSubmitting(true);
        try {
            const payload = {
                purpose: purpose.trim(),
                departmentId: departmentId,
                supplierId: supplierId || null, // 💡 แนบ supplierId ไปด้วยถ้ามีการเลือก
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

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8 pb-10">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Procurement Initiation</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Create PR
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-lg uppercase">Internal Control</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <FileSignature className="w-4 h-4 text-indigo-500" />
                            TJC GROUP: ระบบขออนุมัติจัดซื้อ (Purchase Requisition)
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmitPR} className="space-y-8">
                    {/* SECTION 1: MASTER INFO */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black px-6 py-2 rounded-bl-3xl tracking-[0.2em] uppercase">Document Header</div>

                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-indigo-500" /> 1. General Requisition Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                                    <Info className="w-3 h-3" /> วัตถุประสงค์การจัดซื้อ (Purpose) *
                                </label>
                                <input
                                    type="text"
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-indigo-500 bg-white transition-none"
                                    placeholder="เช่น สั่งซื้อพัสดุสำหรับโครงการ TJC Phase 2..."
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> แผนกที่ร้องขอ (Cost Center) *
                                </label>
                                <select
                                    value={departmentId}
                                    onChange={(e) => setDepartmentId(e.target.value)}
                                    className="w-full border-2 border-slate-100 rounded-xl p-4 text-sm font-bold outline-none focus:border-indigo-400 bg-slate-50/50"
                                    required
                                >
                                    <option value="">-- Select Department --</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            {/* 💡 เพิ่มช่องเลือกว่าจะแนะนำคู่ค้าเจ้าไหน (Suggested Vendor) */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                    <Truck className="w-3 h-3" /> แนะนำคู่ค้า (Suggested Vendor)
                                </label>
                                <select
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    className="w-full border-2 border-slate-100 rounded-xl p-4 text-sm font-bold outline-none focus:border-emerald-400 bg-slate-50/50"
                                >
                                    <option value="">-- ไม่ระบุ (คัดเลือกคู่ค้าภายหลัง) --</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: ITEM MANIFEST */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-500" /> 2. Requested Assets (Line Items)
                            </h2>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="bg-slate-900 text-white font-black text-[10px] px-5 py-2.5 rounded-xl uppercase tracking-widest hover:bg-indigo-600 transition-none flex items-center gap-2 shadow-lg"
                            >
                                <Plus className="w-3 h-3" /> Add Row
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="flex flex-col md:flex-row gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 items-end">
                                    <div className="flex-1 w-full space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Identity (SKU/Name) *</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={item.productId}
                                                onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                                                className="w-full border-2 border-white rounded-xl p-3 text-xs font-black uppercase outline-none focus:border-indigo-400 bg-white shadow-sm"
                                                required
                                            >
                                                <option value="">-- Search Master Registry --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => openNewProductModal(index)}
                                                className="bg-indigo-600 text-white px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-tighter hover:bg-indigo-700 transition-none whitespace-nowrap shadow-md flex items-center gap-1"
                                            >
                                                <PlusCircle className="w-3.5 h-3.5" /> Quick Create
                                            </button>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-32 space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                            className="w-full border-2 border-white rounded-xl p-3 text-center font-mono font-black text-sm outline-none focus:border-indigo-400 bg-white shadow-sm"
                                            required
                                        />
                                    </div>

                                    <div className="w-full md:w-44 space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right block">Est. Price / Unit</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.estimatedPrice}
                                                onChange={(e) => handleItemChange(index, "estimatedPrice", e.target.value)}
                                                className="w-full border-2 border-white rounded-xl p-3 text-right font-mono font-black text-sm outline-none focus:border-indigo-400 bg-white shadow-sm pr-8"
                                                placeholder="0.00"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">฿</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="p-3 text-slate-300 hover:text-rose-600 transition-none"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ACTION BAR (Bottom Sticky) */}
                    <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center sticky bottom-6 border border-white/5 gap-6">
                        <div className="flex items-center gap-6 border-l-4 border-indigo-500 pl-6">
                            <div className="space-y-1">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Total Est. Valuation</p>
                                <p className="text-white text-3xl font-black font-mono tracking-tighter">
                                    ฿{totalEstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ready for Review</p>
                                <p className="text-white text-xs font-bold uppercase italic opacity-60">Pending Management Auth</p>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-indigo-600 hover:bg-emerald-600 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-xl shadow-indigo-900/50 transition-none disabled:opacity-30 disabled:bg-slate-800 whitespace-nowrap flex items-center gap-3"
                            >
                                {isSubmitting ? "PROCESSING..." : "Submit Requisition ✓"}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="flex justify-center items-center gap-2 py-4">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">
                        Procurement workflow strictly enforced - TJC Audit Sync
                    </span>
                </div>
            </div>

            {/* --- 📦 Quick Product Modal --- */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500 rounded-xl">
                                    <Database className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Quick Master Data</h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">สร้างรหัสพัสดุใหม่ในระบบ</p>
                                </div>
                            </div>
                            <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-none"><X className="w-4 h-4" /></button>
                        </div>

                        <form onSubmit={handleCreateProduct} className="p-10 space-y-6">
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Category *</label>
                                        <select
                                            value={newProduct.categoryId}
                                            onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                                            className="w-full border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500 bg-slate-50/50"
                                            required
                                        >
                                            <option value="">-- Select Category --</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.abbr})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Auto-Generated SKU 🔒</label>
                                        <input
                                            type="text"
                                            value={getNextSequentialSku()}
                                            className="w-full border-2 border-indigo-50 bg-indigo-50/30 text-indigo-800 rounded-xl p-3 text-xs font-mono font-black text-center outline-none"
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Product Name *</label>
                                    <input
                                        type="text"
                                        value={newProduct.name}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                        className="w-full border-2 border-slate-100 rounded-xl p-4 text-sm font-bold outline-none focus:border-indigo-500 bg-white"
                                        placeholder="e.g. Cisco Switch Catalyst 9200..."
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UoM (Unit) *</label>
                                    <select
                                        value={newProduct.unitId}
                                        onChange={(e) => setNewProduct({ ...newProduct, unitId: e.target.value })}
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500 bg-slate-50/50"
                                        required
                                    >
                                        <option value="">-- Select Unit --</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex gap-3">
                                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-none">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isCreatingProduct}
                                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-none disabled:opacity-30 flex items-center justify-center gap-2"
                                >
                                    {isCreatingProduct ? 'REGISTERING...' : '✓ Authorize Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthGate>
    );
}