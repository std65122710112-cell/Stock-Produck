"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { 
    MapPin, 
    Building2, 
    Layers, 
    Plus, 
    RefreshCw, 
    Database, 
    ShieldCheck, 
    Hash, 
    Info, 
    CheckCircle2,
    AlertCircle
} from "lucide-react";

export default function LocationsPage() {
    const [locations, setLocations] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [zones, setZones] = useState([]);

    const [warehouseId, setWarehouseId] = useState("");
    const [zoneId, setZoneId] = useState(""); 
    const [code, setCode] = useState("");
    const [name, setName] = useState("");

    const [errMsg, setErrMsg] = useState("");
    const [loading, setLoading] = useState(false);

    async function load() {
        setErrMsg("");
        const [locs, whs, zns] = await Promise.all([
            apiFetch("/master/locations", { method: "GET" }),
            apiFetch("/master/warehouses", { method: "GET" }),
            apiFetch("/master/zones", { method: "GET" }),
        ]);

        setLocations(locs);
        setWarehouses(whs);
        setZones(zns);

        if (!warehouseId && whs?.[0]) setWarehouseId(whs[0].id);
    }

    useEffect(() => {
        load().catch((e) => setErrMsg(e.message || "Load failed"));
    }, []);

    const zonesForWarehouse = useMemo(() => {
        if (!warehouseId) return [];
        return zones.filter((z) => z.warehouseId === warehouseId);
    }, [zones, warehouseId]);

    useEffect(() => {
        if (!warehouseId) return;
        if (!zoneId) return;
        const ok = zonesForWarehouse.some((z) => z.id === zoneId);
        if (!ok) setZoneId("");
    }, [warehouseId, zoneId, zonesForWarehouse]);

    const canCreate = useMemo(() => {
        return warehouseId && code.trim().length > 0;
    }, [warehouseId, code]);

    async function create(e) {
        e.preventDefault();
        if (!canCreate) return;

        setLoading(true);
        setErrMsg("");
        try {
            await apiFetch("/master/locations", {
                method: "POST",
                body: JSON.stringify({
                    warehouseId,
                    zoneId: zoneId || undefined,
                    code: code.trim(),
                    name: name.trim() || undefined,
                }),
            });

            setCode("");
            setName("");
            await load();
        } catch (e2) {
            setErrMsg(e2.message || "Create failed");
        } finally {
            setLoading(false);
        }
    }

    const warehouseMap = useMemo(() => {
        const m = new Map();
        warehouses.forEach((w) => m.set(w.id, w));
        return m;
    }, [warehouses]);

    const zoneMap = useMemo(() => {
        const m = new Map();
        zones.forEach((z) => m.set(z.id, z));
        return m;
    }, [zones]);

    return (
        <AuthGate>
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Master Data Configuration</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Facility Units
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-lg uppercase">Root Access</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            TJC GROUP: จัดการตำแหน่งจัดเก็บพัสดุ (Bin Locations)
                        </p>
                    </div>
                    <button
                        onClick={() => load().catch((e) => setErrMsg(e.message || "Reload failed"))}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-none"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Reload Registry
                    </button>
                </div>

                {/* ERROR MESSAGE (STATIC) */}
                {errMsg && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-700 text-xs font-bold uppercase tracking-widest">
                        <AlertCircle className="w-5 h-5" />
                        {errMsg}
                    </div>
                )}

                {/* CREATION FORM CARD */}
                {warehouses.length === 0 ? (
                    <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-12 rounded-[2.5rem] text-center">
                        <Building2 className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                        <p className="text-amber-700 font-black uppercase tracking-widest text-sm">ยังไม่มีข้อมูล Warehouse ในระบบ</p>
                        <p className="text-amber-600/60 text-[10px] font-bold uppercase mt-2">กรุณาเพิ่ม Warehouse ก่อนจัดการตำแหน่งจัดเก็บ</p>
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black px-6 py-1.5 rounded-bl-2xl tracking-[0.2em] uppercase">Add New Unit</div>
                        
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-indigo-500" /> 1. Create Bin Location
                        </h2>

                        <form onSubmit={create} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Facility (WH) *</label>
                                    <select
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50/50"
                                        value={warehouseId}
                                        onChange={(e) => setWarehouseId(e.target.value)}
                                    >
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specific Zone</label>
                                    <select
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50/50"
                                        value={zoneId}
                                        onChange={(e) => setZoneId(e.target.value)}
                                    >
                                        <option value="">(Global Zone)</option>
                                        {zonesForWarehouse.map((z) => (
                                            <option key={z.id} value={z.id}>{z.code} - {z.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Location Code *</label>
                                    <input
                                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-mono font-black text-slate-800 focus:border-indigo-500 outline-none"
                                        placeholder="A-01-01 / BIN001"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                                    <input
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50/50"
                                        placeholder="Identify the specific shelf or rack..."
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                disabled={!canCreate || loading}
                                className="w-full bg-slate-900 text-white rounded-[1.5rem] py-4 font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-600 shadow-xl shadow-slate-200 disabled:opacity-30 transition-none flex items-center justify-center gap-2"
                            >
                                {loading ? "RECORDING..." : "Confirm Bin Registration ✓"}
                            </button>
                        </form>
                        <p className="text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-widest italic">
                            * Note: Location code must be unique within its respective warehouse facility.
                        </p>
                    </div>
                )}

                {/* DATA TABLE SECTION */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                    <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-indigo-500" /> Bin Location Registry
                        </h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Authorized Units: {locations.length}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-white border-b border-slate-100">
                                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                    <th className="p-6">Warehouse Facility</th>
                                    <th className="p-6">Assigned Zone</th>
                                    <th className="p-6">Bin/Loc Code</th>
                                    <th className="p-6">Description</th>
                                    <th className="p-6">Last Synchronized</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {locations.map((l) => {
                                    const w = l.warehouse || warehouseMap.get(l.warehouseId);
                                    const z = l.zone || (l.zoneId ? zoneMap.get(l.zoneId) : null);
                                    return (
                                        <tr key={l.id} className="hover:bg-slate-50/80 group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">
                                                            {w ? w.code : <span className="text-slate-300">ID: {l.warehouseId}</span>}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            {w ? w.name : 'Unknown Warehouse'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {z ? (
                                                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-800">
                                                        {z.code} - {z.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 font-bold text-[9px] uppercase tracking-widest italic">Global Area</span>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <span className="font-mono font-black text-indigo-600 uppercase text-sm tracking-tighter group-hover:text-indigo-700 transition-none">
                                                    {l.code}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-bold text-slate-600 text-xs uppercase italic">{l.name || "---"}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-[10px] font-mono text-slate-400 font-bold">
                                                    {l.updatedAt ? new Date(l.updatedAt).toLocaleString('th-TH') : "INITIAL RECORD"}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {locations.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="p-32 text-center">
                                            <Info className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Locations Registered</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FOOTER AUDIT NOTE */}
                <div className="flex justify-center items-center gap-2 py-4">
                    <ShieldCheck className="w-3 h-3 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Facility configuration changes are tracked in the TJC system audit log</span>
                </div>
            </div>
        </AuthGate>
    );
}