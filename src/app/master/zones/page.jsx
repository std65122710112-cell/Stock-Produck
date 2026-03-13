"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import {
    Layers,
    Building2,
    Plus,
    RefreshCw,
    Database,
    ShieldCheck,
    Hash,
    Info,
    CheckCircle2,
    AlertCircle
} from "lucide-react";

export default function ZonesPage() {
    const [zones, setZones] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    const [warehouseId, setWarehouseId] = useState("");
    const [code, setCode] = useState("");
    const [name, setName] = useState("");

    const [errMsg, setErrMsg] = useState("");
    const [loading, setLoading] = useState(false);

    async function load() {
        setErrMsg("");
        const [z, w] = await Promise.all([
            apiFetch("/master/zones", { method: "GET" }),
            apiFetch("/master/warehouses", { method: "GET" }),
        ]);
        setZones(z);
        setWarehouses(w);

        if (!warehouseId && w?.[0]) setWarehouseId(w[0].id);
    }

    useEffect(() => {
        load().catch((e) => setErrMsg(e.message || "Load failed"));
    }, []);

    const canCreate = useMemo(() => {
        return warehouseId && code.trim() && name.trim();
    }, [warehouseId, code, name]);

    async function create(e) {
        e.preventDefault();
        if (!canCreate) return;

        setLoading(true);
        setErrMsg("");
        try {
            await apiFetch("/master/zones", {
                method: "POST",
                body: JSON.stringify({
                    warehouseId,
                    code: code.trim(),
                    name: name.trim(),
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

    return (
        <AuthGate>
            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Master Data Configuration</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Storage Zones
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-lg uppercase">Registry</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            TJC GROUP: จัดการแบ่งเขตพื้นที่จัดเก็บ (Warehouse Zoning)
                        </p>
                    </div>
                    <button
                        onClick={() => load().catch((e) => setErrMsg(e.message || "Reload failed"))}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-none disabled:opacity-30"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Sync Registry
                    </button>
                </div>

                {/* ERROR STATE */}
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
                        <p className="text-amber-700 font-black uppercase tracking-widest text-sm">ยังไม่มีคลังสินค้าในฐานข้อมูล</p>
                        <p className="text-amber-600/60 text-[10px] font-bold uppercase mt-2 tracking-widest">กรุณาไปเพิ่มที่หน้า Warehouses ก่อนจัดการโซน</p>
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black px-6 py-2 rounded-bl-3xl tracking-[0.2em] uppercase">Registration Mode</div>

                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-indigo-500" /> 1. Create Area Zone
                        </h2>

                        <form onSubmit={create} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> Facility (WH) *
                                    </label>
                                    <select
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50/50"
                                        value={warehouseId}
                                        onChange={(e) => setWarehouseId(e.target.value)}
                                        disabled={loading}
                                    >
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> Zone Code *
                                    </label>
                                    <input
                                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-mono font-black text-slate-800 focus:border-indigo-500 outline-none uppercase"
                                        placeholder="E.G., A, B1, VIP"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                        <Info className="w-3 h-3" /> Zone Description *
                                    </label>
                                    <input
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50/50"
                                        placeholder="Identify the area (e.g., Cold Storage Area)"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button
                                disabled={!canCreate || loading}
                                className="w-full bg-slate-900 text-white rounded-[1.5rem] py-4 font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-600 shadow-xl shadow-slate-200 disabled:opacity-30 transition-none flex items-center justify-center gap-2"
                            >
                                {loading ? "RECORDING..." : "Register Zone✓"}
                            </button>
                        </form>
                    </div>
                )}

                {/* DATA TABLE SECTION */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                    <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-500" /> Active Zone Registry
                        </h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Total Zones: {zones.length}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-white border-b border-slate-100">
                                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-[0.15em]">
                                    <th className="p-6">Parent Warehouse</th>
                                    <th className="p-6">Zone Code</th>
                                    <th className="p-6">Description</th>
                                    <th className="p-6">Last Synchronized</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {zones.map((z) => {
                                    const w = z.warehouse || warehouseMap.get(z.warehouseId);
                                    return (
                                        <tr key={z.id} className="hover:bg-slate-50 group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-slate-900 text-white rounded text-[9px] font-mono font-black uppercase tracking-tighter">
                                                        {w ? w.code : '??'}
                                                    </div>
                                                    <span className="font-bold text-slate-500 text-xs uppercase truncate max-w-[150px]">
                                                        {w ? w.name : 'Unknown Warehouse'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-mono font-black text-indigo-600 uppercase text-sm tracking-tighter group-hover:text-indigo-700 transition-none">
                                                    {z.code}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-bold text-slate-800 uppercase text-xs tracking-tight">{z.name}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                                                    {z.updatedAt ? new Date(z.updatedAt).toLocaleString('th-TH') : "INITIAL RECORD"}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {zones.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="4" className="p-32 text-center">
                                            <Info className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">No Storage Zones Registered</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FOOTER SYNC NOTE */}
                <div className="flex justify-center items-center gap-2 py-4">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">
                        All zones are part of the TJC global facility hierarchy
                    </span>
                </div>
            </div>
        </AuthGate>
    );
}