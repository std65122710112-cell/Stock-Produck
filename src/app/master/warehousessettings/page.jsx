"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Building2, Layers, MapPin, Database, RefreshCw, Plus,
    ArrowRight, Loader2, LayoutGrid, Trash2
} from "lucide-react";

export default function UnifiedInfrastructurePage() {
    const [warehouses, setWarehouses] = useState([]);
    const [zones, setZones] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selWhId, setSelWhId] = useState(null);
    const [selZoneId, setSelZoneId] = useState(null);

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

    const handleDelete = async (path, id, typeLabel) => {
        if (!window.confirm(`ยืนยันการลบ ${typeLabel}?`)) return;
        try {
            await apiFetch(`${path}/${id}`, { method: "DELETE" });
            toast.success(`ลบ ${typeLabel} สำเร็จ`);
            if (id === selWhId) setSelWhId(null);
            if (id === selZoneId) setSelZoneId(null);
            await loadData();
        } catch (err) {
            toast.error("ลบไม่สำเร็จ: ข้อมูลมีการใช้งานอยู่");
        }
    };

    const filteredZones = useMemo(() => zones.filter(z => z.warehouseId === selWhId), [zones, selWhId]);
    const filteredLocations = useMemo(() => locations.filter(l => l.zoneId === selZoneId), [locations, selZoneId]);

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-[1600px] mx-auto p-6 space-y-6">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-8">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">Logistics Infrastructure</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Facility Manager
                            <span className="not-italic bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-lg font-black uppercase">Standard</span>
                        </h1>
                    </div>
                    <button onClick={loadData} disabled={loading} className="flex items-center gap-2 bg-white border-2 border-slate-100 hover:border-indigo-500 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync Data
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[720px]">

                    {/* 1. WAREHOUSES */}
                    <div className="flex flex-col bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                        <header className="p-6 bg-slate-50 border-b border-slate-100">
                            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-800">
                                <Building2 className="w-4 h-4 text-indigo-600" /> 1. Warehouses
                            </h3>
                        </header>
                        <div className="p-4 bg-white border-b">
                            <DoubleAddInput
                                codePlaceholder="WH-01"
                                namePlaceholder="คลังสินค้าหลัก"
                                onAdd={(c, n) => handleCreate("/master/warehouses", { code: c, name: n }, "เพิ่มคลังสำเร็จ")}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {warehouses.map(wh => (
                                <SelectCard
                                    key={wh.id}
                                    active={selWhId === wh.id}
                                    onClick={() => { setSelWhId(wh.id); setSelZoneId(null); }}
                                    onDelete={() => handleDelete("/master/warehouses", wh.id, "คลังสินค้า")}
                                    title={wh.code}
                                    subtitle={wh.name}
                                    badge={`${zones.filter(z => z.warehouseId === wh.id).length} Zones`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 2. ZONES */}
                    <div className={`flex flex-col bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden transition-all ${!selWhId ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <header className="p-6 bg-slate-50 border-b border-slate-100">
                            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-800">
                                <Layers className="w-4 h-4 text-indigo-600" /> 2. Zones
                            </h3>
                        </header>
                        <div className="p-4 bg-white border-b">
                            <DoubleAddInput
                                codePlaceholder="Zone-A"
                                namePlaceholder="โซนสินค้าอันตราย"
                                onAdd={(c, n) => handleCreate("/master/zones", { warehouseId: selWhId, code: c, name: n }, "เพิ่มโซนสำเร็จ")}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {filteredZones.map(zn => (
                                <SelectCard
                                    key={zn.id}
                                    active={selZoneId === zn.id}
                                    onClick={() => setSelZoneId(zn.id)}
                                    onDelete={() => handleDelete("/master/zones", zn.id, "โซน")}
                                    title={zn.code}
                                    subtitle={zn.name}
                                    badge={`${locations.filter(l => l.zoneId === zn.id).length} Bins`}
                                />
                            ))}
                            {filteredZones.length === 0 && <EmptyHint msg="No zones here" />}
                        </div>
                    </div>

                    {/* 3. LOCATIONS */}
                    <div className={`flex flex-col bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden transition-all ${!selZoneId ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <header className="p-6 bg-slate-50 border-b border-slate-100">
                            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-800">
                                <MapPin className="w-4 h-4 text-indigo-600" /> 3. Bins
                            </h3>
                        </header>
                        <div className="p-4 bg-white border-b">
                            <DoubleAddInput
                                codePlaceholder="A-01-01"
                                namePlaceholder="ชั้นวางที่ 1"
                                onAdd={(c, n) => handleCreate("/master/locations", { warehouseId: selWhId, zoneId: selZoneId, code: c, name: n }, "เพิ่มตำแหน่งสำเร็จ")}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
                            {filteredLocations.map(loc => (
                                <div key={loc.id} className="p-4 bg-white border border-slate-100 rounded-3xl flex justify-between items-center group hover:border-indigo-200 transition-all">
                                    <div>
                                        <p className="font-mono font-black text-indigo-600 uppercase">{loc.code}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{loc.name}</p>
                                    </div>
                                    <button onClick={() => handleDelete("/master/locations", loc.id, "ตำแหน่ง")} className="p-2 text-slate-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {filteredLocations.length === 0 && <EmptyHint msg="Select a zone" />}
                        </div>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}

// 🆕 Component ใหม่สำหรับกรอก 2 ช่อง (Code & Name)
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
        <form onSubmit={submit} className="space-y-2">
            <div className="flex gap-2">
                <input
                    className="w-1/3 bg-slate-50 border-2 border-slate-50 rounded-xl py-2 px-3 text-xs font-mono font-black focus:border-indigo-500 outline-none transition-all uppercase"
                    placeholder={codePlaceholder}
                    value={c} onChange={e => setC(e.target.value)}
                />
                <input
                    className="w-2/3 bg-slate-50 border-2 border-slate-50 rounded-xl py-2 px-3 text-xs font-bold focus:border-indigo-500 outline-none transition-all"
                    placeholder={namePlaceholder}
                    value={n} onChange={e => setN(e.target.value)}
                />
            </div>
            <button type="submit" disabled={loading || !c.trim()} className="w-full bg-slate-900 text-white rounded-xl py-2 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-20 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Entry
            </button>
        </form>
    );
}

function SelectCard({ active, onClick, onDelete, title, subtitle, badge }) {
    return (
        <div onClick={onClick} className={`p-4 rounded-[1.8rem] cursor-pointer transition-all border-2 flex justify-between items-center group relative overflow-hidden ${active ? "bg-slate-900 border-slate-900 text-white shadow-xl" : "bg-white border-transparent hover:border-slate-100 text-slate-600"}`}>
            <div className="z-10">
                <p className={`font-mono font-black uppercase text-base tracking-tighter ${active ? 'text-indigo-400' : 'text-indigo-600'}`}>{title}</p>
                <p className={`text-[10px] font-bold uppercase truncate max-w-[120px] ${active ? 'text-slate-400' : 'text-slate-400'}`}>{subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-1 z-10">
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`p-1.5 rounded-lg transition-all ${active ? 'text-slate-500 hover:text-red-400' : 'text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${active ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-100 text-slate-500'}`}>
                        {badge}
                    </span>
                </div>
                <ArrowRight className={`w-4 h-4 transition-all ${active ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
            </div>
            {active && <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 blur-2xl rounded-full"></div>}
        </div>
    );
}

function EmptyHint({ msg }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center opacity-30">
            <LayoutGrid className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic">{msg}</p>
        </div>
    );
}