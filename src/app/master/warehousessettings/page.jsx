"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Building2, Layers, MapPin, Database, RefreshCw, Plus,
    Loader2, LayoutGrid, Trash2, AlertTriangle, ArrowRight,
    CheckCircle2
} from "lucide-react";

export default function UnifiedInfrastructurePage() {
    const [warehouses, setWarehouses] = useState([]);
    const [zones, setZones] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selWhId, setSelWhId] = useState(null);
    const [selZoneId, setSelZoneId] = useState(null);

    const [confirmDelete, setConfirmDelete] = useState(null);
    const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

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
            if (id === selWhId) setSelWhId(null);
            if (id === selZoneId) setSelZoneId(null);
            await loadData();
            setShowDeleteSuccessModal(true);
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

            {confirmDelete && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300 p-4">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl border-2 border-rose-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-5 border border-rose-200 shadow-sm">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-2">ยืนยันการลบ?</h3>
                        <p className="text-sm font-semibold text-slate-600 mb-8 leading-relaxed">
                            คุณต้องการลบ <span className="text-rose-600 font-bold">{confirmDelete.typeLabel}</span> ใช่หรือไม่?<br/>
                            <span className="text-xs font-normal mt-2 block text-slate-400 bg-slate-50 p-2 rounded-md">หากข้อมูลนี้มีการผูกรายการอยู่ ระบบจะปฏิเสธการลบ</span>
                        </p>

                        <div className="flex flex-col sm:flex-row w-full gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-slate-200 transition-all border border-transparent active:scale-95">ยกเลิก</button>
                            <button onClick={executeDelete} className="flex-1 bg-rose-600 text-white py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> ยืนยันลบ</button>
                        </div>
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
                            className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto space-y-8 pb-20">

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white text-[#1F3B8B] rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                    จัดการคลังและพื้นที่ (Infrastructure)
                                </h1>
                                <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-emerald-500" />
                                    บริหารจัดการคลังสินค้า, โซนจัดเก็บ และตำแหน่งวางพัสดุ
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="flex items-center justify-center w-full md:w-auto gap-2 bg-white border border-slate-200 hover:border-[#1F3B8B]/40 hover:bg-blue-50 text-slate-600 hover:text-[#1F3B8B] px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#1F3B8B]" /> : <RefreshCw className="w-4 h-4 text-[#1F3B8B]" />}
                            ซิงค์ข้อมูล
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[750px]">

                        <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all h-[500px] lg:h-full">
                            <header className="p-6 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 rounded-lg"><Building2 className="w-5 h-5 text-blue-700" /></div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">1. คลังสินค้า (Warehouse)</h3>
                            </header>
                            <div className="p-5 bg-white border-b border-slate-100">
                                <DoubleAddInput
                                    codePlaceholder="รหัสคลัง (WH-01)"
                                    namePlaceholder="ชื่อคลังสินค้า"
                                    onAdd={(c, n) => handleCreate("/master/warehouses", { code: c, name: n }, "เพิ่มคลังสำเร็จ")}
                                    loading={loading}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50 custom-scrollbar">
                                {warehouses.map(wh => (
                                    <SelectCard
                                        key={wh.id}
                                        active={selWhId === wh.id}
                                        onClick={() => { setSelWhId(wh.id); setSelZoneId(null); }}
                                        onDelete={() => requestDelete("/master/warehouses", wh.id, "คลังสินค้า")}
                                        title={wh.code}
                                        subtitle={wh.name}
                                        badge={`${zones.filter(z => z.warehouseId === wh.id).length} โซน`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className={`flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 h-[500px] lg:h-full ${!selWhId ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <header className="p-6 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                                <div className="p-2.5 bg-amber-100 rounded-lg"><Layers className="w-5 h-5 text-amber-600" /></div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">2. โซนจัดเก็บ (Zone)</h3>
                            </header>
                            <div className="p-5 bg-white border-b border-slate-100">
                                <DoubleAddInput
                                    codePlaceholder="รหัสโซน (Z-A)"
                                    namePlaceholder="ชื่อโซน"
                                    onAdd={(c, n) => handleCreate("/master/zones", { warehouseId: selWhId, code: c, name: n }, "เพิ่มโซนสำเร็จ")}
                                    loading={loading}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50 custom-scrollbar">
                                {filteredZones.map(zn => (
                                    <SelectCard
                                        key={zn.id}
                                        active={selZoneId === zn.id}
                                        onClick={() => setSelZoneId(zn.id)}
                                        onDelete={() => requestDelete("/master/zones", zn.id, "โซน")}
                                        title={zn.code}
                                        subtitle={zn.name}
                                        badge={`${locations.filter(l => l.zoneId === zn.id).length} ตำแหน่ง`}
                                    />
                                ))}
                                {filteredZones.length === 0 && <EmptyHint msg="ยังไม่มีข้อมูลโซน" />}
                            </div>
                        </div>

                        <div className={`flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 h-[500px] lg:h-full ${!selZoneId ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <header className="p-6 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-100 rounded-lg"><MapPin className="w-5 h-5 text-emerald-600" /></div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">3. ตำแหน่ง (Location)</h3>
                            </header>
                            <div className="p-5 bg-white border-b border-slate-100">
                                <DoubleAddInput
                                    codePlaceholder="รหัส (A-01)"
                                    namePlaceholder="รายละเอียดชั้นวาง"
                                    onAdd={(c, n) => handleCreate("/master/locations", { warehouseId: selWhId, zoneId: selZoneId, code: c, name: n }, "เพิ่มตำแหน่งสำเร็จ")}
                                    loading={loading}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50 custom-scrollbar">
                                {filteredLocations.map(loc => (
                                    <div key={loc.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center group hover:border-emerald-300 hover:shadow-sm transition-all cursor-default">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                                <Database className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 uppercase text-sm group-hover:text-emerald-700 transition-colors">{loc.code}</span>
                                                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide mt-0.5">{loc.name}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => requestDelete("/master/locations", loc.id, "ตำแหน่ง")} className="p-2.5 bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-100 md:opacity-0 group-hover:opacity-100 active:scale-95 border border-transparent hover:border-rose-200">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {filteredLocations.length === 0 && <EmptyHint msg="กรุณาเลือกโซนก่อน หรือโซนนี้ยังไม่มีตำแหน่งจัดเก็บ" />}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthGate>
    );
}

function DoubleAddInput({ codePlaceholder, namePlaceholder, onAdd, loading }) {
    const [c, setC] = useState("");
    const [n, setN] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!c.trim()) return;
        setIsSubmitting(true);
        await onAdd(c.trim(), n.trim() || c.trim());
        setC(""); setN("");
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={submit} autoComplete="off" className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    className="w-full sm:w-1/3 bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-xs font-bold focus:bg-white focus:border-[#1F3B8B] outline-none transition-all uppercase placeholder:text-slate-400 placeholder:font-medium shadow-sm"
                    placeholder={codePlaceholder}
                    value={c} onChange={e => setC(e.target.value)}
                />
                <input
                    className="w-full sm:w-2/3 bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-xs font-bold focus:bg-white focus:border-[#1F3B8B] outline-none transition-all placeholder:text-slate-400 placeholder:font-medium shadow-sm"
                    placeholder={namePlaceholder}
                    value={n} onChange={e => setN(e.target.value)}
                />
            </div>
            <button type="submit" disabled={isSubmitting || loading || !c.trim()} className="w-full bg-emerald-600 text-white rounded-lg py-3 text-sm font-bold uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} บันทึกข้อมูล
            </button>
        </form>
    );
}

function SelectCard({ active, onClick, onDelete, title, subtitle, badge }) {
    return (
        <div 
            onClick={onClick} 
            className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group relative overflow-hidden outline-none ${
                active 
                    ? 'bg-[#1F3B8B]/5 border-[#1F3B8B]/40 shadow-sm' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
        >
            <div className="z-10 flex flex-col justify-center">
                <p className={`font-bold uppercase text-sm tracking-wide transition-colors ${active ? 'text-[#1F3B8B]' : 'text-slate-900 group-hover:text-[#1F3B8B]'}`}>{title}</p>
                <p className={`text-xs font-bold uppercase truncate max-w-full sm:max-w-[140px] mt-0.5 transition-colors ${active ? 'text-[#1F3B8B]/70' : 'text-slate-500'}`}>{subtitle}</p>
            </div>

            <div className="flex flex-row items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-2 z-10">
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`p-2 rounded-lg transition-all active:scale-95 border border-transparent ${active ? 'text-slate-400 hover:text-rose-500 hover:bg-white hover:border-rose-200' : 'bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 opacity-100 md:opacity-0 group-hover:opacity-100'}`}>
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <span className={`text-xs font-bold px-2.5 py-1.5 rounded-md uppercase transition-colors ${active ? 'bg-white text-[#1F3B8B] border border-[#1F3B8B]/20 shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 border border-slate-200'}`}>
                        {badge}
                    </span>
                </div>
                <ArrowRight className={`hidden sm:block w-4 h-4 transition-all duration-300 ${active ? 'translate-x-0 opacity-100 text-[#1F3B8B]' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 text-slate-400'}`} strokeWidth={2} />
            </div>
        </div>
    );
}

function EmptyHint({ msg }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center opacity-60">
            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                <LayoutGrid className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{msg}</p>
        </div>
    );
}