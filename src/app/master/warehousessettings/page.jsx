"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Building2, Layers, MapPin, Database, RefreshCw, Plus,
    ArrowRight, Loader2, LayoutGrid, Trash2, AlertTriangle, ShieldCheck, ChevronRight
} from "lucide-react";

export default function UnifiedInfrastructurePage() {
    const [warehouses, setWarehouses] = useState([]);
    const [zones, setZones] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selWhId, setSelWhId] = useState(null);
    const [selZoneId, setSelZoneId] = useState(null);

    // --- Modal State ---
    const [confirmDelete, setConfirmDelete] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [whs, zns, locs] = await Promise.all([
                apiFetch("/master/warehouses"),
                apiFetch("/master/zones"),
                apiFetch("/master/locations"),
            ]);
            setWarehouses(whs || []);
            setZones(zns || []);
            setLocations(locs || []);
            if (!selWhId && whs?.length > 0) setSelWhId(whs[0].id);
        } catch (err) {
            toast.error("การเชื่อมต่อฐานข้อมูลล้มเหลว");
        } finally {
            setLoading(false);
        }
    }, [selWhId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreate = async (path, body, successMsg) => {
        if (!body.code) return toast.error("กรุณาระบุรหัส (Code)");
        try {
            await apiFetch(path, {
                method: "POST",
                body: JSON.stringify(body)
            });
            toast.success(successMsg);
            await loadData();
        } catch (err) {
            toast.error(err.message || "ไม่สามารถบันทึกข้อมูลได้");
        }
    };

    const requestDelete = (path, id, typeLabel) => {
        setConfirmDelete({ path, id, typeLabel });
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        const { path, id, typeLabel } = confirmDelete;
        try {
            await apiFetch(`${path}/${id}`, { method: "DELETE" });
            toast.success(`ลบ ${typeLabel} สำเร็จ`);
            if (id === selWhId) setSelWhId(null);
            if (id === selZoneId) setSelZoneId(null);
            await loadData();
        } catch (err) {
            toast.error("ลบไม่สำเร็จ: ข้อมูลมีการใช้งานอยู่");
        } finally {
            setConfirmDelete(null);
        }
    };

    const filteredZones = useMemo(() => zones.filter(z => z.warehouseId === selWhId), [zones, selWhId]);
    const filteredLocations = useMemo(() => locations.filter(l => l.zoneId === selZoneId), [locations, selZoneId]);

    return (
        <AuthGate>
            <Toaster position="top-right" />

            {/* --- Custom Confirm Delete Modal --- */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full mx-4 shadow-2xl border-2 border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border-2 border-rose-100 shadow-inner">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-2">ยืนยันการลบ?</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8">คุณต้องการลบ {confirmDelete.typeLabel} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>

                        <div className="flex w-full gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">ยกเลิก</button>
                            <button onClick={executeDelete} className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 active:scale-95 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> ยืนยันลบ</button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- End Modal --- */}

            <div className="max-w-[1600px] mx-auto p-6 space-y-6 pb-20">

                {/* HEADER: เส้นกั้นยาวเส้นเดียว และระยะชิดหัวข้อ */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-slate-100 pb-6 gap-6 mb-10">

                    {/* กลุ่มเนื้อหาซ้าย: ไอคอน + ข้อความ */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* ด้านซ้าย: กล่องไอคอน */}
                        <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                            <Building2 className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                        </div>

                        {/* ด้านขวา: ข้อมูลเรียงซ้อนกัน */}
                        <div className="flex flex-col">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B] mb-1.5">
                                Logistics Infrastructure
                            </p>

                            <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                จัดการคลังและพื้นที่
                            </h1>

                            <div className="flex items-center gap-2 pt-1 opacity-90">
                                <Database className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                    บริหารจัดการตำแหน่งจัดเก็บและโครงสร้างคลังสินค้าอย่างเป็นระบบ
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ปุ่มซิงค์ข้อมูล: อยู่ขวาสุดของเส้นยาว */}
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 bg-white border-2 border-slate-100 hover:border-[#1F3B8B]/30 hover:bg-[#1F3B8B]/5 text-slate-600 hover:text-[#1F3B8B] px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#1F3B8B]" /> : <RefreshCw className="w-4 h-4 text-[#1F3B8B]" />}
                        ซิงค์ข้อมูล
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[720px]">

                    {/* 1. WAREHOUSES */}
                    <div className="flex flex-col bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-lg transition-all">
                        <header className="p-6 bg-slate-50 border-b-2 border-slate-100">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-slate-950">
                                <div className="p-2 bg-[#1F3B8B]/10 rounded-xl"><Building2 className="w-5 h-5 text-[#1F3B8B]" /></div>
                                1. คลังสินค้า
                            </h3>
                        </header>
                        <div className="p-5 bg-white border-b-2 border-slate-50">
                            <DoubleAddInput
                                codePlaceholder="รหัสคลัง (เช่น WH-01)"
                                namePlaceholder="ชื่อคลังสินค้า"
                                onAdd={(c, n) => handleCreate("/master/warehouses", { code: c, name: n }, "เพิ่มคลังสำเร็จ")}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                            {warehouses.map(wh => (
                                <SelectCard
                                    key={wh.id}
                                    active={selWhId === wh.id}
                                    onClick={() => { setSelWhId(wh.id); setSelZoneId(null); }}
                                    onDelete={() => requestDelete("/master/warehouses", wh.id, "คลังสินค้า")}
                                    title={wh.code}
                                    subtitle={wh.name}
                                    badge={`${zones.filter(z => z.warehouseId === wh.id).length} โซน`}
                                    theme="blue"
                                />
                            ))}
                        </div>
                    </div>

                    {/* 2. ZONES */}
                    <div className={`flex flex-col bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg ${!selWhId ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                        <header className="p-6 bg-slate-50 border-b-2 border-slate-100">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-slate-950">
                                <div className="p-2 bg-amber-100 rounded-xl"><Layers className="w-5 h-5 text-amber-500" /></div>
                                2. โซนจัดเก็บ
                            </h3>
                        </header>
                        <div className="p-5 bg-white border-b-2 border-slate-50">
                            <DoubleAddInput
                                codePlaceholder="รหัสโซน (เช่น Z-A)"
                                namePlaceholder="ชื่อโซน"
                                onAdd={(c, n) => handleCreate("/master/zones", { warehouseId: selWhId, code: c, name: n }, "เพิ่มโซนสำเร็จ")}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                            {filteredZones.map(zn => (
                                <SelectCard
                                    key={zn.id}
                                    active={selZoneId === zn.id}
                                    onClick={() => setSelZoneId(zn.id)}
                                    onDelete={() => requestDelete("/master/zones", zn.id, "โซน")}
                                    title={zn.code}
                                    subtitle={zn.name}
                                    badge={`${locations.filter(l => l.zoneId === zn.id).length} ตำแหน่ง`}
                                    theme="amber"
                                />
                            ))}
                            {filteredZones.length === 0 && <EmptyHint msg="ยังไม่มีข้อมูลโซน" />}
                        </div>
                    </div>

                    {/* 3. LOCATIONS */}
                    <div className={`flex flex-col bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg ${!selZoneId ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                        <header className="p-6 bg-slate-50 border-b-2 border-slate-100">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-slate-950">
                                <div className="p-2 bg-emerald-100 rounded-xl"><MapPin className="w-5 h-5 text-emerald-500" /></div>
                                3. ตำแหน่ง (Locations)
                            </h3>
                        </header>
                        <div className="p-5 bg-white border-b-2 border-slate-50">
                            <DoubleAddInput
                                codePlaceholder="รหัสตำแหน่ง (เช่น A-01)"
                                namePlaceholder="รายละเอียดชั้นวาง"
                                onAdd={(c, n) => handleCreate("/master/locations", { warehouseId: selWhId, zoneId: selZoneId, code: c, name: n }, "เพิ่มตำแหน่งสำเร็จ")}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                            {filteredLocations.map(loc => (
                                <div key={loc.id} className="p-5 bg-white border-2 border-slate-100 rounded-2xl flex justify-between items-center group hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/50 transition-all cursor-default">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-mono font-black text-slate-950 uppercase text-sm group-hover:text-emerald-700 transition-colors">{loc.code}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{loc.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => requestDelete("/master/locations", loc.id, "ตำแหน่ง")} className="p-2.5 bg-slate-50 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 active:scale-95">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {filteredLocations.length === 0 && <EmptyHint msg="กรุณาเลือกโซนก่อน" />}
                        </div>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}

// 🆕 Component สำหรับกรอก 2 ช่อง (Code & Name)
function DoubleAddInput({ codePlaceholder, namePlaceholder, onAdd }) {
    const [c, setC] = useState("");
    const [n, setN] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!c.trim()) return;
        setLoading(true);
        await onAdd(c.trim(), n.trim() || c.trim());
        setC(""); setN("");
        setLoading(false);
    };

    return (
        <form onSubmit={submit} autoComplete="off" className="space-y-3">
            <div className="flex gap-2">
                <input
                    className="w-1/3 bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-xs font-mono font-black focus:bg-white focus:border-emerald-500 outline-none transition-all uppercase placeholder:text-slate-400"
                    placeholder={codePlaceholder}
                    value={c} onChange={e => setC(e.target.value)}
                />
                <input
                    className="w-2/3 bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-xs font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder={namePlaceholder}
                    value={n} onChange={e => setN(e.target.value)}
                />
            </div>
            <button type="submit" disabled={loading || !c.trim()} className="w-full bg-emerald-600 text-white rounded-xl py-3 text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} เพิ่มข้อมูล
            </button>
        </form>
    );
}

function SelectCard({ active, onClick, onDelete, title, subtitle, badge, theme }) {
    // 💡 ปรับสีกล่องให้ "ไม่เข้มเกินไป" โดยใช้สีอ่อนตัดขอบชัดเจน (Soft Pastel & Clear Border)
    const activeBg = theme === 'blue' ? 'bg-[#1F3B8B]/5 border-[#1F3B8B]/40' : 'bg-amber-50 border-amber-400';
    const activeShadow = theme === 'blue' ? 'shadow-[#1F3B8B]/10' : 'shadow-amber-500/10';
    const activeText = theme === 'blue' ? 'text-[#1F3B8B]' : 'text-amber-900';
    const activeSubText = theme === 'blue' ? 'text-[#1F3B8B]/70' : 'text-amber-600';
    const activeBadgeBg = theme === 'blue' ? 'bg-[#1F3B8B]/10' : 'bg-amber-100';
    const activeBadgeText = theme === 'blue' ? 'text-[#1F3B8B]' : 'text-amber-700';

    return (
        <div onClick={onClick} className={`p-5 rounded-[1.8rem] cursor-pointer transition-all duration-300 border-2 flex justify-between items-center group relative overflow-hidden outline-none ${active ? `${activeBg} ${activeText} shadow-lg ${activeShadow} scale-[1.02] z-10` : "bg-white border-slate-100 hover:border-slate-300 text-slate-600 hover:shadow-md hover:bg-slate-50/80"}`}>

            {active && (
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl pointer-events-none ${theme === 'blue' ? 'bg-[#1F3B8B]/10' : 'bg-amber-200/40'}`} />
            )}

            <div className="z-10 flex flex-col justify-center">
                <p className={`font-mono font-black uppercase text-sm tracking-wide transition-colors ${active ? activeText : 'text-slate-950 group-hover:text-slate-900'}`}>{title}</p>
                <p className={`text-[10px] font-bold uppercase truncate max-w-[140px] mt-0.5 transition-colors ${active ? activeSubText : 'text-slate-500'}`}>{subtitle}</p>
            </div>

            <div className="flex flex-col items-end gap-2 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`p-2 rounded-xl transition-all active:scale-95 ${active ? 'text-slate-400 hover:text-rose-500 hover:bg-white/60' : 'bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100'}`}>
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase transition-colors ${active ? `${activeBadgeBg} ${activeBadgeText}` : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                        {badge}
                    </span>
                </div>
                <ArrowRight className={`w-4 h-4 transition-all duration-300 ${active ? `translate-x-0 opacity-100 ${activeText}` : '-translate-x-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 text-slate-400'}`} strokeWidth={3} />
            </div>
        </div>
    );
}

function EmptyHint({ msg }) {
    return (
        <div className="flex flex-col items-center justify-center p-14 text-center opacity-40">
            <div className="w-16 h-16 bg-slate-200 rounded-[1.5rem] flex items-center justify-center mb-4">
                <LayoutGrid className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{msg}</p>
        </div>
    );
}