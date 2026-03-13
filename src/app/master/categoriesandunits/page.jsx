"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Settings,
    RefreshCw,
    Plus,
    Trash2,
    Edit3,
    Check,
    X,
    Database,
    Tag,
    Layers,
    ShieldCheck
} from "lucide-react";

const MAX_INPUT_LENGTH = 50;

function MasterDataSection({ title, endpoint, placeholder, hasAbbr = false, icon: Icon }) {
    const [rows, setRows] = useState([]);
    const [name, setName] = useState("");
    const [abbr, setAbbr] = useState("");
    const [loading, setLoading] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editAbbr, setEditAbbr] = useState("");

    const load = useCallback(async () => {
        try {
            const data = await apiFetch(endpoint, { method: "GET" });
            if (Array.isArray(data)) setRows(data);
        } catch (err) {
            toast.error(`ไม่สามารถโหลดข้อมูล ${title} ได้`);
        }
    }, [endpoint, title]);

    useEffect(() => { load(); }, [load]);

    const validateInput = (inputName, inputAbbr) => {
        if (!inputName?.trim()) {
            toast.error("กรุณากรอกชื่อ");
            return false;
        }
        if (inputName.length > MAX_INPUT_LENGTH) {
            toast.error(`ชื่อต้องไม่เกิน ${MAX_INPUT_LENGTH} ตัวอักษร`);
            return false;
        }
        if (hasAbbr && inputAbbr && !/^[a-zA-Z0-9\-]{1,10}$/.test(inputAbbr)) {
            toast.error("ตัวย่อต้องเป็นภาษาอังกฤษ ตัวเลข หรือขีดกลาง (สูงสุด 10 ตัวอักษร)");
            return false;
        }
        return true;
    };

    async function create(e) {
        e.preventDefault();
        if (!validateInput(name, abbr)) return;

        setLoading(true);
        try {
            const payload = { name: name.trim() };
            if (hasAbbr) payload.abbr = abbr.trim().toUpperCase();

            await apiFetch(endpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            toast.success(`เพิ่มข้อมูลสำเร็จ`);
            setName("");
            setAbbr("");
            await load();
        } catch (err) {
            toast.error(err.message || `ไม่สามารถเพิ่มข้อมูลได้`);
        } finally { setLoading(false); }
    }

    async function update(id) {
        if (!validateInput(editName, editAbbr)) return;

        setLoading(true);
        try {
            const payload = { name: editName.trim() };
            if (hasAbbr) payload.abbr = editAbbr.trim().toUpperCase() || null;

            await apiFetch(`${endpoint}/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            toast.success(`อัปเดตข้อมูลสำเร็จ`);
            setEditingId(null);
            await load();
        } catch (err) {
            toast.error(err.message || `ไม่สามารถบันทึกข้อมูลได้`);
        } finally { setLoading(false); }
    }

    async function remove(id) {
        if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?")) return;
        setLoading(true);
        try {
            await apiFetch(`${endpoint}/${id}`, { method: "DELETE" });
            toast.success(`ลบข้อมูลสำเร็จ`);
            if (editingId === id) setEditingId(null);
            await load();
        } catch (err) {
            toast.error(`ไม่สามารถลบข้อมูลได้ (ข้อมูลอาจถูกใช้งานอยู่)`);
        } finally { setLoading(false); }
    }

    function startEdit(row) {
        if (loading) return;
        setEditingId(row.id);
        setEditName(row.name);
        setEditAbbr(row.abbr || "");
    }

    function cancelEdit() {
        setEditingId(null);
        setEditName("");
        setEditAbbr("");
    }

    return (
        <div className="flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            {/* Header Area */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-indigo-600">
                        <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">{title} Registry</h2>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-none disabled:opacity-30"
                    title="Reload Data"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Creation Form */}
            <form onSubmit={create} className="p-6 bg-white border-b border-slate-50 flex flex-wrap lg:flex-nowrap gap-3">
                <div className="flex-1 min-w-[200px]">
                    <input
                        className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50/30 transition-none"
                        placeholder={placeholder}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={MAX_INPUT_LENGTH}
                        disabled={loading}
                    />
                </div>
                {hasAbbr && (
                    <div className="w-32">
                        <input
                            className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-black uppercase text-center outline-none focus:border-indigo-500 bg-slate-50/30 transition-none"
                            placeholder="ABBR"
                            value={abbr}
                            onChange={(e) => setAbbr(e.target.value.toUpperCase())}
                            maxLength={10}
                            disabled={loading}
                        />
                    </div>
                )}
                <button
                    disabled={loading || !name.trim()}
                    className="bg-slate-900 text-white rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-30 transition-none flex items-center gap-2 shadow-lg shadow-slate-200"
                >
                    <Plus className="w-4 h-4" /> {loading ? "..." : "Add Entry"}
                </button>
            </form>

            {/* Data Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-left tracking-widest">Entry Name</th>
                            {hasAbbr && <th className="px-6 py-4 text-center tracking-widest w-32">Abbreviation</th>}
                            <th className="px-6 py-4 text-right tracking-widest w-40">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/80 transition-none group">
                                <td className="px-6 py-4">
                                    {editingId === r.id ? (
                                        <input
                                            autoFocus
                                            className="border-2 border-indigo-400 rounded-lg px-3 py-1.5 w-full text-sm font-bold outline-none bg-white"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            maxLength={MAX_INPUT_LENGTH}
                                            disabled={loading}
                                        />
                                    ) : (
                                        <span className="font-bold text-slate-700 uppercase tracking-tight text-xs group-hover:text-indigo-600 transition-none">{r.name}</span>
                                    )}
                                </td>
                                {hasAbbr && (
                                    <td className="px-6 py-4 text-center">
                                        {editingId === r.id ? (
                                            <input
                                                className="border-2 border-indigo-400 rounded-lg px-2 py-1.5 w-24 text-center text-xs font-black uppercase outline-none"
                                                value={editAbbr}
                                                onChange={(e) => setEditAbbr(e.target.value.toUpperCase())}
                                                placeholder="NONE"
                                                maxLength={10}
                                                disabled={loading}
                                            />
                                        ) : (
                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-none">
                                                {r.abbr || "-"}
                                            </span>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                    {editingId === r.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => update(r.id)} disabled={loading || !editName.trim()} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Save">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={cancelEdit} disabled={loading} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Cancel">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => startEdit(r)} disabled={loading} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-none" title="Edit Entry">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => remove(r.id)} disabled={loading} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-none" title="Remove Entry">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && <div className="p-10 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest italic">No Data Registered</div>}
            </div>
        </div>
    );
}

export default function MasterSettingsPage() {
    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Core Configuration</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Master Settings
                            <span className="not-italic bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-slate-800 shadow-lg">ROOT ACCESS</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-300" />
                            TJC GROUP: จัดการข้อมูลหมวดหมู่และหน่วยนับพื้นฐาน
                        </p>
                    </div>
                </div>

                {/* Configuration Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    <MasterDataSection
                        title="Product Categories"
                        endpoint="/master/categories"
                        placeholder="New category name (e.g. Fiber Optics)"
                        hasAbbr={true}
                        icon={Layers}
                    />
                    <MasterDataSection
                        title="Measurement Units"
                        endpoint="/master/units"
                        placeholder="New unit name (e.g. Roll, Pcs)"
                        hasAbbr={false}
                        icon={Tag}
                    />
                </div>

                {/* Footer Compliance */}
                <div className="flex justify-center items-center gap-2 py-6">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Master data changes are synchronized across all operational modules</span>
                </div>
            </div>
        </AuthGate>
    );
}