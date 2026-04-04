"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useEffect, useState, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Package,
    Database,
    RefreshCw,
    Plus,
    Trash2,
    Edit3,
    Check,
    X,
    Barcode,
    Download,
    Eye,
    Layers,
    MapPin,
    Tag,
    Hash,
    ShieldCheck,
    Box
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

    async function load() {
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
            setProducts(p); setCategories(c); setUnits(u); setWarehouses(w); setZones(z); setLocations(l);
        } catch (e) {
            setErrMsg("ไม่สามารถโหลดข้อมูลได้ โปรดลองรีเฟรชหน้าเว็บ");
        }
    }

    useEffect(() => { load(); }, []);
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
        if (!warehouseId) { toast.error("กรุณาระบุ Warehouse"); return false; }
        for (const item of items) {
            if (!item.name.trim() || !item.categoryId || !item.unitId) {
                toast.error("ข้อมูลไม่ครบถ้วน (Name, Category, Unit)"); return false;
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
            toast.success(`สร้างสินค้าสำเร็จ ${items.length} รายการ`);
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

    async function saveEdit(id) {
        if (!editForm.name.trim() || !editForm.categoryId || !editForm.unitId) {
            return toast.error("กรุณากรอก Name, Category และ Unit");
        }
        setIsSubmitting(true);
        try {
            await apiFetch(`/master/products/${id}`, {
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
            toast.success("อัปเดตสำเร็จ");
            setEditingId(null);
            await load();
        } catch (err) {
            toast.error(err.message || "อัปเดตไม่สำเร็จ");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function deleteProduct(p) {
        if (isSubmitting || busyId) return;
        if (!window.confirm(`⚠️ คำเตือน!\nลบสินค้า [${p.sku}] ${p.name}?\n(ไม่สามารถย้อนกลับได้)`)) return;
        setIsSubmitting(true);
        setBusyId(p.id);
        try {
            await apiFetch(`/master/products/${p.id}`, { method: "DELETE" });
            toast.success(`ลบสำเร็จ`);
            await load();
        } catch (err) {
            toast.error("ไม่สามารถลบได้ (อาจมีการใช้งานอยู่)");
        } finally {
            setIsSubmitting(false); setBusyId(null);
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
        } catch (e) { toast.error("บาร์โค้ดผิดพลาด"); } finally { setBusyId(null); }
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory Master Data</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Asset Registry
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-lg uppercase">Root Hub</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            TJC GROUP: ระบบจัดการฐานข้อมูลสินค้าและรหัสควบคุมภายใน
                        </p>
                    </div>
                    <button onClick={load} disabled={isSubmitting} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-none disabled:opacity-30">
                        <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                        Reload Master
                    </button>
                </div>

                {errMsg && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold uppercase tracking-widest flex items-center gap-3"><AlertTriangle className="w-5 h-5" />{errMsg}</div>}

                {/* BATCH ENTRY CARD */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black px-6 py-2 rounded-bl-3xl tracking-[0.2em] uppercase">Mass Registration</div>

                    <div className="p-8 bg-slate-50/50 border-b border-slate-100">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-500" /> 1. Set Primary Facility
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <select className="border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={isSubmitting}>
                                <option value="">-- Target Warehouse --</option>
                                {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.code} - {w.name}</option>))}
                            </select>
                            <select className="border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white disabled:opacity-50" value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={!warehouseId || isSubmitting}>
                                <option value="">-- Target Zone --</option>
                                {zones.filter(z => z.warehouseId === warehouseId).map((z) => (<option key={z.id} value={z.id}>{z.code} - {z.name}</option>))}
                            </select>
                            <select className="border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white disabled:opacity-50" value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!zoneId || isSubmitting}>
                                <option value="">-- Target Bin/Loc --</option>
                                {locations.filter(l => l.zoneId === zoneId).map((l) => (<option key={l.id} value={l.id}>{l.code}</option>))}
                            </select>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Box className="w-4 h-4 text-indigo-500" /> 2. Manifest Items
                            </h2>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max {MAX_BATCH_SIZE} per batch</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 text-left w-48">Preview SKU</th>
                                        <th className="p-4 text-left">Asset Name *</th>
                                        <th className="p-4 text-left w-48">Category *</th>
                                        <th className="p-4 text-left w-32">Unit *</th>
                                        <th className="p-4 text-center w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((item) => (
                                        <tr key={item.id} className="transition-none">
                                            <td className="p-3">
                                                <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-mono text-[11px] text-slate-500 text-center uppercase">
                                                    {getPreviewSku(item.categoryId)}
                                                </div>
                                            </td>
                                            <td className="p-3"><input className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold focus:border-indigo-500 outline-none" placeholder="Product name" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} maxLength={MAX_NAME_LEN} disabled={isSubmitting} /></td>
                                            <td className="p-3">
                                                <select className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 bg-white" value={item.categoryId} onChange={(e) => updateItem(item.id, 'categoryId', e.target.value)} disabled={isSubmitting}>
                                                    <option value="">Select...</option>
                                                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name} {c.abbr ? `(${c.abbr})` : ''}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <select className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 bg-white" value={item.unitId} onChange={(e) => updateItem(item.id, 'unitId', e.target.value)} disabled={isSubmitting}>
                                                    <option value="">Select...</option>
                                                    {units.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1 || isSubmitting} className="p-2 text-slate-300 hover:text-rose-500 disabled:opacity-30 transition-none"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-4 border-t border-slate-100">
                            <button type="button" onClick={addItem} disabled={isSubmitting || items.length >= MAX_BATCH_SIZE} className="px-6 py-2 rounded-xl border border-slate-200 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-none flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Row
                            </button>
                            <button onClick={createBatch} disabled={isSubmitting} className="bg-slate-900 text-white rounded-2xl px-10 py-4 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-none disabled:opacity-50">
                                {isSubmitting ? "PROCESSING TRANSACTION..." : `Commit ${items.length} Entries`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* MASTER LEDGER TABLE */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                    <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" /> Master Ledger Entries
                        </h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Sync: OK</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-white border-b border-slate-100">
                                <tr className="text-slate-400 font-black uppercase text-[9px] tracking-[0.15em]">
                                    <th className="p-6">SKU ID</th>
                                    <th className="p-6">Asset Name</th>
                                    <th className="p-6">Category</th>
                                    <th className="p-6">Unit</th>
                                    <th className="p-6">Primary Location</th>
                                    <th className="p-6 text-center">Identity</th>
                                    <th className="p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {products.map((p) => {
                                    const isEditing = editingId === p.id;
                                    return (
                                        <tr key={p.id} className={`${isEditing ? "bg-indigo-50/50" : "hover:bg-slate-50/80"} group`}>
                                            <td className="p-6 font-mono font-black text-indigo-600 text-xs tracking-tighter uppercase">{p.sku}</td>
                                            <td className="p-6">
                                                {isEditing ? (
                                                    <input className="border-2 border-indigo-400 rounded-xl px-3 py-2 w-full text-xs font-bold outline-none bg-white" value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} maxLength={MAX_NAME_LEN} disabled={isSubmitting} />
                                                ) : <span className="font-black text-slate-800 uppercase text-xs tracking-tight">{p.name}</span>}
                                            </td>
                                            <td className="p-6">
                                                {isEditing ? (
                                                    <select className="border-2 border-indigo-400 rounded-xl px-3 py-2 w-full text-xs font-bold outline-none bg-white" value={editForm.categoryId} onChange={(e) => handleEditChange('categoryId', e.target.value)} disabled={isSubmitting}>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                ) : <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200">{p.category?.name || "GEN"}</span>}
                                            </td>
                                            <td className="p-6">
                                                {isEditing ? (
                                                    <select className="border-2 border-indigo-400 rounded-xl px-3 py-2 w-full text-xs font-bold outline-none bg-white" value={editForm.unitId} onChange={(e) => handleEditChange('unitId', e.target.value)} disabled={isSubmitting}>
                                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                ) : <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{p.unit?.name || "PCS"}</span>}
                                            </td>
                                            <td className="p-6">
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-1">
                                                        <select className="border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold" value={editForm.warehouseId} onChange={(e) => handleEditChange('warehouseId', e.target.value)} disabled={isSubmitting}>
                                                            <option value="">- WH -</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}
                                                        </select>
                                                        <select className="border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold" value={editForm.zoneId} onChange={(e) => handleEditChange('zoneId', e.target.value)} disabled={!editForm.warehouseId || isSubmitting}>
                                                            <option value="">- Zone -</option>{zones.filter(z => z.warehouseId === editForm.warehouseId).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                                                        </select>
                                                        <select className="border border-indigo-200 rounded-lg px-2 py-1 text-[10px] font-black text-indigo-600 bg-indigo-50" value={editForm.locationId} onChange={(e) => handleEditChange('locationId', e.target.value)} disabled={!editForm.zoneId || isSubmitting}>
                                                            <option value="">- Loc -</option>{locations.filter(l => l.zoneId === editForm.zoneId).map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-nowrap">
                                                        <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                                                        <div className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                                                            <span className="text-slate-800 font-black">{p.warehouse?.code || "-"}</span> / {p.zone?.code || "-"} / <span className="text-indigo-600 font-black">{p.location?.code || "-"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex gap-1 justify-center">
                                                    <button onClick={() => handleBarcode(p, "view")} disabled={busyId === p.id || isEditing} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-indigo-600 transition-none disabled:opacity-20"><Eye className="w-4 h-4" /></button>
                                                    <button onClick={() => handleBarcode(p, "dl")} disabled={busyId === p.id || isEditing} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-emerald-600 transition-none disabled:opacity-20"><Download className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-1">
                                                        <button onClick={() => saveEdit(p.id)} disabled={isSubmitting} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20">SAVE</button>
                                                        <button onClick={cancelEdit} disabled={isSubmitting} className="px-3 py-1 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">CANCEL</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-4 justify-end">
                                                        <button onClick={() => startEdit(p)} disabled={isSubmitting || busyId} className="text-slate-300 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-none disabled:opacity-20">Edit</button>
                                                        <button onClick={() => deleteProduct(p)} disabled={isSubmitting || busyId} className="text-slate-300 hover:text-rose-600 font-black text-[10px] uppercase tracking-widest transition-none disabled:opacity-20">Delete</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {products.length === 0 && !isSubmitting && <div className="p-32 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest italic">No Asset Data Registered</div>}
                    </div>
                </div>

                {/* FOOTER SYNC NOTE */}
                <div className="flex justify-center items-center gap-2 py-4">
                    <ShieldCheck className="w-3 h-3 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Master Product IDs are validated against Enterprise SKU Standards</span>
                </div>
            </div>
        </AuthGate>
    );
}