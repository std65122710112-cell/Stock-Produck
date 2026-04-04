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
    Box,
    AlertTriangle // 💡 เพิ่มสำหรับใช้ในแจ้งเตือนและป๊อปอัป
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

    // 💡 สถานะสำหรับเปิด-ปิดป๊อปอัปยืนยัน
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [updateTarget, setUpdateTarget] = useState(null);

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

    // 💡 เปิดป๊อปอัปยืนยันการแก้ไข
    function confirmSave(id) {
        if (!editForm.name.trim() || !editForm.categoryId || !editForm.unitId) {
            return toast.error("กรุณากรอกชื่อ, หมวดหมู่ และหน่วยนับ");
        }
        setUpdateTarget(id);
    }

    // 💡 ฟังก์ชันบันทึกที่แท้จริงจะถูกเรียกเมื่อกดยืนยันในป๊อปอัป
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
            toast.success("อัปเดตข้อมูลสำเร็จ");
            setEditingId(null);
            await load();
        } catch (err) {
            toast.error(err.message || "อัปเดตไม่สำเร็จ");
        } finally {
            setIsSubmitting(false);
            setUpdateTarget(null);
        }
    }

    // 💡 ฟังก์ชันทำงานจริงเมื่อกดยืนยันการลบ
    async function executeDelete() {
        if (!deleteTarget) return;
        setIsSubmitting(true);
        setBusyId(deleteTarget.id);
        try {
            await apiFetch(`/master/products/${deleteTarget.id}`, { method: "DELETE" });
            toast.success(`ลบข้อมูลสำเร็จ`);
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

            {/* 💡 ป๊อปอัปยืนยันการลบ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-2 border-slate-100 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto border-2 border-rose-100">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase mb-2">ยืนยันการลบ?</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8">คุณต้องการลบสินค้า <span className="text-rose-600 font-black">[{deleteTarget.sku}]</span> ใช่หรือไม่? ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} disabled={isSubmitting} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-all">ยกเลิก</button>
                            <button onClick={executeDelete} disabled={isSubmitting} className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl font-black text-sm uppercase hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> ยืนยันลบ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 💡 ป๊อปอัปยืนยันการแก้ไข */}
            {updateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-2 border-slate-100 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-[#1F3B8B]/5 rounded-2xl flex items-center justify-center mb-6 mx-auto border-2 border-[#1F3B8B]/10">
                            <Edit3 className="w-8 h-8 text-[#1F3B8B]" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase mb-2">ยืนยันการแก้ไข?</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8">คุณต้องการบันทึกการเปลี่ยนแปลงของข้อมูลสินค้านี้ใช่หรือไม่?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setUpdateTarget(null)} disabled={isSubmitting} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-all">ยกเลิก</button>
                            <button onClick={executeUpdate} disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"><Check className="w-4 h-4" /> ยืนยันแก้ไข</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. กล่องนอกสุด: ขีดเส้นยาวพาดทั้งหน้าจอ (Edge-to-Edge) */}
            <div className="w-full border-b-2 border-slate-100 mb-10">

                {/* 2. กล่องใน: จัดการความกว้างให้อยู่ด้านซ้าย (px-6 md:px-10) */}
                <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between pb-6 gap-6">

                    {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า --- */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* กล่องไอคอน */}
                        <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                            <Package className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                        </div>

                        {/* กลุ่มข้อความ */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Database className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                    Inventory Master Data
                                </p>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                ทะเบียนข้อมูลสินค้า
                            </h1>
                            <div className="flex items-center gap-2 pt-1 opacity-90">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                    ระบบจัดการฐานข้อมูลสินค้าและรหัสควบคุมภายใน
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* --- ส่วนขวา: ปุ่มคำสั่ง --- */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={load}
                            disabled={isSubmitting}
                            className="flex items-center gap-2.5 rounded-full bg-[#1F3B8B] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#1F3B8B]/30 transition-all hover:bg-[#152968] active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                            {isSubmitting ? "กำลังซิงค์..." : "โหลดข้อมูลใหม่"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-8 pb-20">
                {errMsg && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold uppercase tracking-widest flex items-center gap-3"><AlertTriangle className="w-5 h-5" />{errMsg}</div>}

                {/* BATCH ENTRY CARD */}
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 bg-[#1F3B8B] text-white text-[9px] font-black px-6 py-2 rounded-bl-3xl tracking-[0.2em] uppercase shadow-md">
                        ลงทะเบียนแบบกลุ่ม
                    </div>

                    <div className="p-8 bg-slate-50/50 border-b-2 border-slate-100">
                        <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-600" /> 1. กำหนดคลังและพื้นที่จัดเก็บหลัก
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <select className="border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 bg-white transition-all" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={isSubmitting}>
                                <option value="">-- ระบุคลังสินค้า (Warehouse) --</option>
                                {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.code} - {w.name}</option>))}
                            </select>
                            <select className="border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 bg-white transition-all disabled:opacity-50" value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={!warehouseId || isSubmitting}>
                                <option value="">-- ระบุโซนจัดเก็บ (Zone) --</option>
                                {zones.filter(z => z.warehouseId === warehouseId).map((z) => (<option key={z.id} value={z.id}>{z.code} - {z.name}</option>))}
                            </select>
                            <select className="border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 bg-white transition-all disabled:opacity-50" value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!zoneId || isSubmitting}>
                                <option value="">-- ระบุตำแหน่ง (Location) --</option>
                                {locations.filter(l => l.zoneId === zoneId).map((l) => (<option key={l.id} value={l.id}>{l.code}</option>))}
                            </select>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                                <Box className="w-5 h-5 text-amber-500" /> 2. รายการสินค้าที่ต้องการลงทะเบียน
                            </h2>
                            <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">
                                สูงสุด {MAX_BATCH_SIZE} รายการ/ครั้ง
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs font-black uppercase text-slate-950 border-b-2 border-slate-100">
                                    <tr>
                                        <th className="p-4 text-left w-48 tracking-widest">รหัส SKU (ตัวอย่าง)</th>
                                        <th className="p-4 text-left tracking-widest">ชื่อสินค้า <span className="text-rose-500">*</span></th>
                                        <th className="p-4 text-left w-48 tracking-widest">หมวดหมู่ <span className="text-rose-500">*</span></th>
                                        <th className="p-4 text-left w-32 tracking-widest">หน่วยนับ <span className="text-rose-500">*</span></th>
                                        <th className="p-4 text-center w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3">
                                                <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-mono text-[11px] text-slate-500 text-center uppercase font-black">
                                                    {getPreviewSku(item.categoryId)}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 outline-none transition-all" placeholder="กรอกชื่อสินค้า" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} maxLength={MAX_NAME_LEN} disabled={isSubmitting} />
                                            </td>
                                            <td className="p-3">
                                                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#1F3B8B] bg-white transition-all" value={item.categoryId} onChange={(e) => updateItem(item.id, 'categoryId', e.target.value)} disabled={isSubmitting}>
                                                    <option value="">เลือกหมวดหมู่...</option>
                                                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name} {c.abbr ? `(${c.abbr})` : ''}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#1F3B8B] bg-white transition-all" value={item.unitId} onChange={(e) => updateItem(item.id, 'unitId', e.target.value)} disabled={isSubmitting}>
                                                    <option value="">เลือกหน่วย...</option>
                                                    {units.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    disabled={items.length === 1 || isSubmitting}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-rose-500 rounded-xl disabled:opacity-30 transition-all active:scale-90"
                                                    title="ลบรายการ"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 gap-4 border-t-2 border-slate-100">
                            <button type="button" onClick={addItem} disabled={isSubmitting || items.length >= MAX_BATCH_SIZE} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-[#1F3B8B] font-black text-[10px] uppercase tracking-widest hover:bg-[#1F3B8B]/5 transition-all flex items-center gap-2 active:scale-95">
                                <Plus className="w-4 h-4" /> เพิ่มแถวข้อมูล
                            </button>
                            <button onClick={createBatch} disabled={isSubmitting} className="bg-emerald-600 text-white rounded-2xl px-10 py-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2">
                                {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> กำลังประมวลผล...</> : <><Check className="w-4 h-4" /> บันทึกข้อมูล {items.length} รายการ</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* MASTER LEDGER TABLE */}
                <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                    <div className="p-8 bg-slate-50/50 border-b-2 border-slate-100 flex justify-between items-center">
                        <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                            <Hash className="w-5 h-5 text-emerald-500" /> ฐานข้อมูลสินค้าในระบบ
                        </h2>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                            สถานะเชื่อมต่อ: ปกติ
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-white border-b-2 border-slate-100">
                                <tr className="text-slate-900 font-black uppercase text-[10px] tracking-widest">
                                    <th className="p-6">รหัส SKU</th>
                                    <th className="p-6">ชื่อสินค้า</th>
                                    <th className="p-6">หมวดหมู่</th>
                                    <th className="p-6 whitespace-nowrap">หน่วยนับ</th>
                                    <th className="p-6">พื้นที่จัดเก็บหลัก</th>
                                    <th className="p-6 text-center">บาร์โค้ด</th>
                                    <th className="p-6 text-right w-40">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {products.map((p) => {
                                    const isEditing = editingId === p.id;
                                    return (
                                        <tr key={p.id} className={`${isEditing ? "bg-[#1F3B8B]/5" : "hover:bg-slate-50/80"} group transition-all`}>
                                            <td className="p-6 font-mono font-black text-[#1F3B8B] text-xs tracking-tighter uppercase">{p.sku}</td>
                                            <td className="p-6">
                                                {isEditing ? (
                                                    <input className="border-2 border-[#1F3B8B] rounded-xl px-3 py-2 w-full text-xs font-bold outline-none bg-white shadow-sm" value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} maxLength={MAX_NAME_LEN} disabled={isSubmitting} />
                                                ) : <span className="font-black text-slate-800 uppercase text-xs tracking-tight group-hover:text-[#1F3B8B] transition-colors">{p.name}</span>}
                                            </td>
                                            <td className="p-6">
                                                {/* 💡 นำกล่องพื้นหลังออกให้เหลือแค่ตัวหนังสือเรียบๆ */}
                                                {isEditing ? (
                                                    <select className="border-2 border-[#1F3B8B] rounded-xl px-3 py-2 w-full text-xs font-bold outline-none bg-white shadow-sm" value={editForm.categoryId} onChange={(e) => handleEditChange('categoryId', e.target.value)} disabled={isSubmitting}>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                ) : <span className="text-slate-600 font-black uppercase text-[10px] tracking-widest">{p.category?.name || "GEN"}</span>}
                                            </td>
                                            <td className="p-6">
                                                {isEditing ? (
                                                    <select className="border-2 border-[#1F3B8B] rounded-xl px-3 py-2 w-full text-xs font-bold outline-none bg-white shadow-sm" value={editForm.unitId} onChange={(e) => handleEditChange('unitId', e.target.value)} disabled={isSubmitting}>
                                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                ) : <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{p.unit?.name || "PCS"}</span>}
                                            </td>
                                            <td className="p-6">
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-2">
                                                        <select className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-[#1F3B8B]" value={editForm.warehouseId} onChange={(e) => handleEditChange('warehouseId', e.target.value)} disabled={isSubmitting}>
                                                            <option value="">- คลัง -</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}
                                                        </select>
                                                        <select className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-[#1F3B8B]" value={editForm.zoneId} onChange={(e) => handleEditChange('zoneId', e.target.value)} disabled={!editForm.warehouseId || isSubmitting}>
                                                            <option value="">- โซน -</option>{zones.filter(z => z.warehouseId === editForm.warehouseId).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                                                        </select>
                                                        <select className="border-2 border-blue-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-blue-700 bg-blue-50 outline-none focus:border-[#1F3B8B]" value={editForm.locationId} onChange={(e) => handleEditChange('locationId', e.target.value)} disabled={!editForm.zoneId || isSubmitting}>
                                                            <option value="">- ตำแหน่ง -</option>{locations.filter(l => l.zoneId === editForm.zoneId).map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-nowrap bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                                                        <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                                        <div className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                                                            <span className="text-slate-800 font-black">{p.warehouse?.code || "-"}</span> / {p.zone?.code || "-"} / <span className="text-[#1F3B8B] font-black">{p.location?.code || "-"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex gap-2 justify-center">
                                                    {/* 💡 ปุ่มดูบาร์โค้ด: เมื่อ Hover จะเป็นสีม่วงพาสเทล ละมุนตา */}
                                                    <button
                                                        onClick={() => handleBarcode(p, "view")}
                                                        disabled={busyId === p.id || isEditing}
                                                        className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 hover:shadow-md hover:shadow-purple-200/50 hover:scale-105 transition-all active:scale-90 disabled:opacity-50"
                                                        title="ดูบาร์โค้ด"
                                                    >
                                                        <Eye className="w-4 h-4" strokeWidth={2.5} />
                                                    </button>

                                                    {/* 💡 ปุ่มดาวน์โหลด: เมื่อ Hover จะเป็นสีเขียวพาสเทล สบายตา */}
                                                    <button
                                                        onClick={() => handleBarcode(p, "dl")}
                                                        disabled={busyId === p.id || isEditing}
                                                        className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-emerald-100 hover:text-emerald-600 hover:shadow-md hover:shadow-emerald-200/50 hover:scale-105 transition-all active:scale-90 disabled:opacity-50"
                                                        title="ดาวน์โหลดบาร์โค้ด"
                                                    >
                                                        <Download className="w-4 h-4" strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        {/* 💡 ปุ่มบันทึก: ไล่สีเขียวมรกต สดใส พร้อมเงาสะท้อนเรืองแสง */}
                                                        <button
                                                            onClick={() => confirmSave(p.id)}
                                                            disabled={isSubmitting}
                                                            className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:from-emerald-500 hover:to-emerald-700 hover:scale-105 transition-all active:scale-90 disabled:opacity-50"
                                                            title="บันทึก"
                                                        >
                                                            <Check className="w-5 h-5" strokeWidth={2.5} />
                                                        </button>

                                                        {/* 💡 ปุ่มยกเลิก: ปกติเป็นสีเทาดูสะอาดตา แต่พอเอาเมาส์ชี้จะสว่างเป็นสีแดงกุหลาบ */}
                                                        <button
                                                            onClick={cancelEdit}
                                                            disabled={isSubmitting}
                                                            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-gradient-to-br hover:from-rose-400 hover:to-rose-600 hover:text-white hover:shadow-lg hover:shadow-rose-500/40 hover:scale-105 transition-all active:scale-90 disabled:opacity-50"
                                                            title="ยกเลิก"
                                                        >
                                                            <X className="w-5 h-5" strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => startEdit(p)}
                                                            disabled={isSubmitting || busyId}
                                                            className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-[#1F3B8B] hover:bg-[#1F3B8B]/10 transition-all active:scale-90 disabled:opacity-30"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit3 className="w-5 h-5" />
                                                        </button>

                                                        {/* 💡 เรียกป๊อปอัปยืนยันการลบแทน window.confirm */}
                                                        <button
                                                            onClick={() => setDeleteTarget(p)}
                                                            disabled={isSubmitting || busyId}
                                                            className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-all active:scale-90 disabled:opacity-30"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {products.length === 0 && !isSubmitting && <div className="p-16 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic">ยังไม่มีข้อมูลสินค้าในระบบ</div>}
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}