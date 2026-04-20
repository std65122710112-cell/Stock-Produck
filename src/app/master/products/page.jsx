"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Package, Database, RefreshCw, Plus, Trash2, Edit3,
    Check, X, Download, Eye, Layers, MapPin, Hash, ShieldCheck,
    Box, AlertTriangle, Loader2, CheckCircle2
} from "lucide-react";

const MAX_NAME_LEN = 150;
const MAX_BATCH_SIZE = 20;

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [zones, setZones] = useState([]);
    const [locations, setLocations] = useState([]);

    const [warehouseId, setWarehouseId] = useState("");
    const [zoneId, setZoneId] = useState("");
    const [locationId, setLocationId] = useState("");
    const [items, setItems] = useState([{ id: Date.now().toString(), name: "", categoryId: "", unitId: "" }]);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [busyId, setBusyId] = useState(null);
    const [errMsg, setErrMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [updateTarget, setUpdateTarget] = useState(null);

    const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);
    const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

    const load = useCallback(async () => {
        setErrMsg("");
        try {
            const [p, c, u, w, z, l] = await Promise.all([
                apiFetch("/master/products", { method: "GET" }),
                apiFetch("/master/categories", { method: "GET" }),
                apiFetch("/master/units", { method: "GET" }),
                apiFetch("/master/warehouses", { method: "GET" }),
                apiFetch("/master/zones", { method: "GET" }),
                apiFetch("/master/locations", { method: "GET" }),
            ]);
            setProducts(p || []); setCategories(c || []); setUnits(u || []); setWarehouses(w || []); setZones(z || []); setLocations(l || []);
        } catch (e) {
            setErrMsg("ไม่สามารถโหลดข้อมูลได้ โปรดลองรีเฟรชหน้าเว็บ");
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setZoneId(""); setLocationId(""); }, [warehouseId]);
    useEffect(() => { setLocationId(""); }, [zoneId]);

    const addItem = () => {
        if (items.length >= MAX_BATCH_SIZE) return toast.error(`เพิ่มได้สูงสุด ${MAX_BATCH_SIZE} รายการ`);
        setItems([...items, { id: Date.now().toString() + Math.random(), name: "", categoryId: "", unitId: "" }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const getPreviewSku = (categoryId) => {
        if (!categoryId || !warehouseId) return "AUTO-GENERATE";
        const cat = categories.find(c => c.id === categoryId);
        const wh = warehouses.find(w => w.id === warehouseId);
        const catAbbr = cat?.abbr || "GEN";
        const whCode = wh?.code || "WH";
        return `${catAbbr}-${whCode}-XXXX`;
    };

    const validateBatch = () => {
        if (!warehouseId) { toast.error("กรุณาระบุคลังสินค้า (Warehouse)"); return false; }
        for (const item of items) {
            if (!item.name.trim() || !item.categoryId || !item.unitId) {
                toast.error("ข้อมูลไม่ครบถ้วน (ชื่อ, หมวดหมู่, หน่วยนับ)"); return false;
            }
        }
        return true;
    };

    async function createBatch(e) {
        e.preventDefault();
        if (!validateBatch() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const payload = items.map(item => ({
                name: item.name.trim(),
                categoryId: item.categoryId,
                unitId: item.unitId,
                warehouseId: warehouseId || null,
                zoneId: zoneId || null,
                locationId: locationId || null
            }));
            await apiFetch("/master/products/batch", {
                method: "POST",
                body: JSON.stringify({ products: payload }),
            });
            toast.success(`บันทึกสินค้าสำเร็จ ${items.length} รายการ`);
            setItems([{ id: Date.now().toString(), name: "", categoryId: "", unitId: "" }]);
            await load();
        } catch (err) {
            toast.error(err.message || "เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    }

    const startEdit = (p) => {
        if (isSubmitting || busyId) return;
        setEditingId(p.id);
        setEditForm({
            name: p.name,
            categoryId: p.categoryId || "",
            unitId: p.unitId || "",
            warehouseId: p.warehouseId || "",
            zoneId: p.zoneId || "",
            locationId: p.locationId || "",
        });
    };

    const cancelEdit = () => { setEditingId(null); setEditForm({}); };

    const handleEditChange = (field, value) => {
        setEditForm(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'warehouseId') { updated.zoneId = ""; updated.locationId = ""; }
            if (field === 'zoneId') { updated.locationId = ""; }
            return updated;
        });
    };

    function confirmSave(id) {
        if (!editForm.name.trim() || !editForm.categoryId || !editForm.unitId) {
            return toast.error("กรุณากรอกชื่อ, หมวดหมู่ และหน่วยนับ");
        }
        setUpdateTarget(id);
    }

    async function executeUpdate() {
        if (!updateTarget) return;
        setIsSubmitting(true);
        try {
            await apiFetch(`/master/products/${updateTarget}`, {
                method: "PATCH",
                body: JSON.stringify({
                    name: editForm.name.trim(),
                    categoryId: editForm.categoryId,
                    unitId: editForm.unitId,
                    warehouseId: editForm.warehouseId || undefined,
                    zoneId: editForm.zoneId || undefined,
                    locationId: editForm.locationId || undefined,
                })
            });
            setShowUpdateSuccessModal(true);
            setEditingId(null);
            await load();
        } catch (err) {
            toast.error(err.message || "อัปเดตไม่สำเร็จ");
        } finally {
            setIsSubmitting(false);
            setUpdateTarget(null);
        }
    }

    async function executeDelete() {
        if (!deleteTarget) return;
        setIsSubmitting(true);
        setBusyId(deleteTarget.id);
        try {
            await apiFetch(`/master/products/${deleteTarget.id}`, { method: "DELETE" });
            setShowDeleteSuccessModal(true);
            await load();
        } catch (err) {
            toast.error("ไม่สามารถลบได้ (อาจมีข้อมูลอ้างอิงอยู่ในระบบ)");
        } finally {
            setIsSubmitting(false); setBusyId(null); setDeleteTarget(null);
        }
    }

    async function handleBarcode(product, action) {
        setBusyId(product.id);
        try {
            const token = getAccessToken();
            const res = await fetch(`${API_BASE}/master/products/${product.id}/barcode.png`, {
                method: "GET", headers: { Authorization: `Bearer ${token}` }, credentials: "include",
            });
            if (!res.ok) throw new Error("Load failed");
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            if (action === "view") {
                window.open(blobUrl, "_blank");
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            } else {
                const a = document.createElement("a");
                a.href = blobUrl; a.download = `barcode_${product.sku}.png`;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
            }
        } catch (e) { toast.error("เกิดข้อผิดพลาดในการโหลดบาร์โค้ด"); } finally { setBusyId(null); }
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />

            {deleteTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-rose-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-5 border border-rose-200">
                            <AlertTriangle className="w-8 h-8 text-rose-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">ยืนยันการลบ?</h3>
                        <p className="text-sm font-semibold text-slate-600 mb-8 leading-relaxed">
                            คุณต้องการลบ <span className="text-rose-600 font-bold">[{deleteTarget.sku}]</span> ใช่หรือไม่?<br />
                            <span className="text-xs font-normal mt-2 block text-slate-400 bg-slate-50 p-2 rounded-md">ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้</span>
                        </p>
                        <div className="flex w-full gap-3">
                            <button onClick={() => setDeleteTarget(null)} disabled={isSubmitting} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all">ยกเลิก</button>
                            <button onClick={executeDelete} disabled={isSubmitting} className="flex-1 py-3 bg-rose-600 text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-rose-700 shadow-sm transition-all flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> ยืนยันลบ</button>
                        </div>
                    </div>
                </div>
            )}

            {updateTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-slate-200 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-[#1F3B8B]/10 rounded-full flex items-center justify-center mb-5 border border-[#1F3B8B]/20">
                            <Edit3 className="w-8 h-8 text-[#1F3B8B]" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">ยืนยันการแก้ไข?</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                            คุณต้องการบันทึกการเปลี่ยนแปลงของข้อมูลสินค้านี้<br />ใช่หรือไม่?
                        </p>
                        <div className="flex w-full gap-3">
                            <button onClick={() => setUpdateTarget(null)} disabled={isSubmitting} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all">ยกเลิก</button>
                            <button
                                onClick={executeUpdate}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" /> ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showUpdateSuccessModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-emerald-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border border-emerald-200">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">แก้ไขข้อมูลสำเร็จ</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                            ระบบได้บันทึกการเปลี่ยนแปลง<br />เรียบร้อยแล้ว
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowUpdateSuccessModal(false)}
                            className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            )}

            {showDeleteSuccessModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-emerald-100 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border border-emerald-200">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">ลบข้อมูลสำเร็จ</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                            ข้อมูลถูกลบออกจากระบบ<br />เรียบร้อยแล้ว
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowDeleteSuccessModal(false)}
                            className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                                <Package className="w-6 h-6 text-[#1F3B8B]" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                    ทะเบียนข้อมูลสินค้า (Master Data)
                                </h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                                    <Database className="w-4 h-4 text-emerald-500" />
                                    ระบบจัดการฐานข้อมูลสินค้าและรหัสควบคุมภายใน
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={load}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-[#1F3B8B]/40 hover:bg-blue-50 text-slate-600 hover:text-[#1F3B8B] px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#1F3B8B]" /> : <RefreshCw className="w-4 h-4 text-[#1F3B8B]" />}
                            ซิงค์ข้อมูล
                        </button>
                    </div>
                </div>

                {errMsg && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold uppercase tracking-widest flex items-center gap-3 shadow-sm animate-in fade-in">
                        <AlertTriangle className="w-5 h-5" />{errMsg}
                    </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-500">
                    <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1.5">
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-5 h-5 text-[#1F3B8B]" /> ลงทะเบียนสินค้าใหม่แบบกลุ่ม
                            </h2>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 bg-white border-b border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <select className="border border-slate-300 rounded-lg p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all text-slate-700" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={isSubmitting}>
                                <option value="">-- ระบุคลังสินค้า (Warehouse) --</option>
                                {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.code} - {w.name}</option>))}
                            </select>
                            <select className="border border-slate-300 rounded-lg p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all disabled:opacity-50 text-slate-700" value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={!warehouseId || isSubmitting}>
                                <option value="">-- ระบุโซนจัดเก็บ (Zone) --</option>
                                {zones.filter(z => z.warehouseId === warehouseId).map((z) => (<option key={z.id} value={z.id}>{z.code} - {z.name}</option>))}
                            </select>
                            <select className="border border-slate-300 rounded-lg p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all disabled:opacity-50 text-slate-700" value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!zoneId || isSubmitting}>
                                <option value="">-- ระบุตำแหน่ง (Location) --</option>
                                {locations.filter(l => l.zoneId === zoneId).map((l) => (<option key={l.id} value={l.id}>{l.code}</option>))}
                            </select>
                        </div>
                    </div>

                    <div className="px-6 md:px-8 pb-8 pt-6">
                        <div className="border border-slate-200 rounded-xl overflow-x-auto">
                            <table className="w-full text-sm border-collapse min-w-[800px]">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
                                    <tr>
                                        <th className="py-4 px-6 text-left w-48">รหัส SKU (พรีวิว)</th>
                                        <th className="py-4 px-6 text-left">ชื่อสินค้า <span className="text-rose-500">*</span></th>
                                        <th className="py-4 px-6 text-left w-56">หมวดหมู่ <span className="text-rose-500">*</span></th>
                                        <th className="py-4 px-6 text-left w-32">หน่วยนับ <span className="text-rose-500">*</span></th>
                                        <th className="py-4 px-6 text-center w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-[10px] text-slate-500 text-center uppercase font-bold">
                                                    {getPreviewSku(item.categoryId)}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-white transition-all placeholder:text-slate-400" placeholder="ชื่อสินค้า..." value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} maxLength={MAX_NAME_LEN} disabled={isSubmitting} />
                                            </td>
                                            <td className="p-4">
                                                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#1F3B8B] bg-white transition-all text-slate-700" value={item.categoryId} onChange={(e) => updateItem(item.id, 'categoryId', e.target.value)} disabled={isSubmitting}>
                                                    <option value="">เลือกหมวดหมู่...</option>
                                                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name} {c.abbr ? `(${c.abbr})` : ''}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#1F3B8B] bg-white transition-all text-slate-700" value={item.unitId} onChange={(e) => updateItem(item.id, 'unitId', e.target.value)} disabled={isSubmitting}>
                                                    <option value="">เลือกหน่วย...</option>
                                                    {units.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    disabled={items.length === 1 || isSubmitting}
                                                    className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-200 hover:border-rose-200 active:scale-95 disabled:opacity-30"
                                                    title="ลบรายการ"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 gap-4 border-t border-slate-100 mt-6">
                            <button
                                type="button"
                                onClick={addItem}
                                disabled={isSubmitting || items.length >= MAX_BATCH_SIZE}
                                className="px-6 py-2.5 rounded-lg border-2 border-[#1F3B8B] text-[#1F3B8B] font-bold text-sm transition-all hover:bg-[#1F3B8B]/10 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:border-slate-300 disabled:text-slate-400"
                            >
                                <Plus className="w-4 h-4" /> เพิ่มแถวข้อมูล
                            </button>
                            <button
                                onClick={createBatch}
                                disabled={isSubmitting}
                                className="bg-emerald-600 text-white rounded-lg px-6 py-2.5 font-bold text-sm transition-all hover:bg-emerald-700 shadow-sm active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</> : <><Check className="w-4 h-4" /> บันทึกข้อมูล {items.length} รายการ</>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-500">
                    <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1.5">
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Hash className="w-5 h-5 text-[#1F3B8B]" /> ฐานข้อมูลสินค้าในระบบ
                            </h2>
                        </div>
                        <div className="flex justify-end">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                                ทะเบียนทั้งหมด: {products.length} รายการ
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[500px]">
                        <table className="min-w-full border-collapse min-w-[1000px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">รหัส SKU</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">ชื่อสินค้า</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">หมวดหมู่</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">หน่วยนับ</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">พื้นที่จัดเก็บหลัก</th>
                                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">บาร์โค้ด</th>
                                    <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-40">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.length === 0 && !isSubmitting && (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center text-slate-400 font-medium italic">ยังไม่มีข้อมูลสินค้าในระบบ</td>
                                    </tr>
                                )}
                                {products.map((p) => {
                                    const isEditing = editingId === p.id;
                                    return (
                                        <tr key={p.id} className={`${isEditing ? "bg-[#1F3B8B]/5" : "hover:bg-slate-50"} group transition-all`}>
                                            <td className="py-4 px-6 font-black text-[#1F3B8B] text-xs tracking-tight uppercase tabular-nums">
                                                {p.sku}
                                            </td>
                                            <td className="py-4 px-6">
                                                {isEditing ? (
                                                    <input className="border border-[#1F3B8B] rounded-lg px-3 py-2 w-full text-xs font-bold outline-none bg-white shadow-sm" value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} maxLength={MAX_NAME_LEN} disabled={isSubmitting} />
                                                ) : <span className="font-bold text-slate-900 uppercase text-xs tracking-tight group-hover:text-[#1F3B8B] transition-colors">{p.name}</span>}
                                            </td>
                                            <td className="py-4 px-6">
                                                {isEditing ? (
                                                    <select className="border border-[#1F3B8B] rounded-lg px-3 py-2 w-full text-xs font-bold outline-none bg-white shadow-sm" value={editForm.categoryId} onChange={(e) => handleEditChange('categoryId', e.target.value)} disabled={isSubmitting}>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                ) : <span className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">{p.category?.name || "GEN"}</span>}
                                            </td>
                                            <td className="py-4 px-6">
                                                {isEditing ? (
                                                    <select className="border border-[#1F3B8B] rounded-lg px-3 py-2 w-full text-xs font-bold outline-none bg-white shadow-sm" value={editForm.unitId} onChange={(e) => handleEditChange('unitId', e.target.value)} disabled={isSubmitting}>
                                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                ) : <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{p.unit?.name || "PCS"}</span>}
                                            </td>
                                            <td className="py-4 px-6">
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-2">
                                                        <select className="border border-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-[#1F3B8B] bg-white" value={editForm.warehouseId} onChange={(e) => handleEditChange('warehouseId', e.target.value)} disabled={isSubmitting}>
                                                            <option value="">- คลัง -</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}
                                                        </select>
                                                        <select className="border border-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-[#1F3B8B] bg-white" value={editForm.zoneId} onChange={(e) => handleEditChange('zoneId', e.target.value)} disabled={!editForm.warehouseId || isSubmitting}>
                                                            <option value="">- โซน -</option>{zones.filter(z => z.warehouseId === editForm.warehouseId).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                                                        </select>
                                                        <select className="border border-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-[#1F3B8B] bg-white text-[#1F3B8B]" value={editForm.locationId} onChange={(e) => handleEditChange('locationId', e.target.value)} disabled={!editForm.zoneId || isSubmitting}>
                                                            <option value="">- ตำแหน่ง -</option>{locations.filter(l => l.zoneId === editForm.zoneId).map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-nowrap bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200 w-fit">
                                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                            <span className="text-slate-800">{p.warehouse?.code || "-"}</span> / {p.zone?.code || "-"} / <span className="text-[#1F3B8B]">{p.location?.code || "-"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex gap-2 justify-center">
                                                    <button
                                                        onClick={() => handleBarcode(p, "view")}
                                                        disabled={busyId === p.id || isEditing}
                                                        className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-[#1F3B8B] hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all active:scale-95 disabled:opacity-30"
                                                        title="ดูบาร์โค้ด"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleBarcode(p, "dl")}
                                                        disabled={busyId === p.id || isEditing}
                                                        className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-[#1F3B8B] hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all active:scale-95 disabled:opacity-30"
                                                        title="ดาวน์โหลดบาร์โค้ด"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => confirmSave(p.id)}
                                                            disabled={isSubmitting}
                                                            className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                                                            title="บันทึก"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            disabled={isSubmitting}
                                                            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                                                            title="ยกเลิก"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => startEdit(p)}
                                                            disabled={isSubmitting || busyId}
                                                            className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-[#1F3B8B] hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all active:scale-95 disabled:opacity-30"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(p)}
                                                            disabled={isSubmitting || busyId}
                                                            className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all active:scale-95 disabled:opacity-30"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </AuthGate>
    );
}