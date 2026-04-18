"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Settings, RefreshCw, Plus, Trash2, Edit3, Check, X,
    Database, Tag, Layers, ShieldCheck, AlertTriangle,
    ClipboardList, Info, Loader2
} from "lucide-react";

const MAX_INPUT_LENGTH = 50;

function MasterDataSection({
    title,
    endpoint,
    placeholder,
    hasAbbr,
    icon: Icon
}) {
    const [rows, setRows] = useState([]);
    const [name, setName] = useState("");
    const [abbr, setAbbr] = useState("");
    const [loading, setLoading] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editAbbr, setEditAbbr] = useState("");

    // --- Modal States ---
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [updateTarget, setUpdateTarget] = useState(null);

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
            await apiFetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
            toast.success(`เพิ่มข้อมูลสำเร็จ`);
            setName(""); setAbbr("");
            await load();
        } catch (err) {
            toast.error(err.message || `ไม่สามารถเพิ่มข้อมูลได้`);
        } finally { setLoading(false); }
    }

    async function executeUpdate() {
        if (!updateTarget) return;
        setLoading(true);
        try {
            const payload = { name: editName.trim() };
            if (hasAbbr) payload.abbr = editAbbr.trim().toUpperCase() || null;
            await apiFetch(`${endpoint}/${updateTarget}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            toast.success(`อัปเดตข้อมูลสำเร็จ`);
            setEditingId(null);
            setUpdateTarget(null);
            await load();
        } catch (err) {
            toast.error(err.message || `ไม่สามารถบันทึกข้อมูลได้`);
        } finally { setLoading(false); }
    }

    async function executeDelete() {
        if (!deleteTarget) return;
        setLoading(true);
        try {
            await apiFetch(`${endpoint}/${deleteTarget}`, { method: "DELETE" });
            toast.success(`ลบข้อมูลสำเร็จ`);
            if (editingId === deleteTarget) setEditingId(null);
            await load();
        } catch (err) {
            toast.error(`ไม่สามารถลบข้อมูลได้ (ข้อมูลอาจถูกใช้งานอยู่)`);
        } finally {
            setLoading(false);
            setDeleteTarget(null);
        }
    }

    return (
        <div className="flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg">

            {/* --- Modals --- */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 mx-auto border border-rose-100 shadow-sm">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-2">ยืนยันการลบ?</h3>
                        <p className="text-xs font-bold text-slate-500 mb-8 leading-relaxed">
                            คุณต้องการลบรายการนี้ใช่หรือไม่? <br/> ข้อมูลที่ถูกลบไม่สามารถกู้คืนได้ และระบบจะปฏิเสธการลบหากมีการผูกข้อมูลไว้แล้ว
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200 active:scale-95">ยกเลิก</button>
                            <button onClick={executeDelete} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> ยืนยันลบ</button>
                        </div>
                    </div>
                </div>
            )}

            {updateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 mx-auto border border-blue-100 shadow-sm">
                            <Edit3 className="w-8 h-8 text-[#1F3B8B]" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-2">ยืนยันการแก้ไข?</h3>
                        <p className="text-xs font-bold text-slate-500 mb-8 leading-relaxed">คุณต้องการบันทึกการเปลี่ยนแปลงของข้อมูลหลักระบบนี้ใช่หรือไม่?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setUpdateTarget(null)} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200 active:scale-95">ยกเลิก</button>
                            <button onClick={executeUpdate} className="flex-1 bg-[#1F3B8B] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"><Check className="w-4 h-4" /> บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- End Modals --- */}

            {/* Header Area */}
            <div className="p-6  border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 bg-white rounded-lg shadow-sm border border-slate-200 text-[#1F3B8B]`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{title}</h2>
                </div>
                <button onClick={load} disabled={loading} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-[#1F3B8B] shadow-sm transition-all disabled:opacity-30">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Creation Form */}
            <form onSubmit={create} autoComplete="off" className="p-6 bg-white border-b border-slate-100 flex flex-wrap lg:flex-nowrap gap-3">
                <div className="flex-1 min-w-[200px]">
                    <input
                        className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] bg-slate-50 focus:bg-white transition-all placeholder:text-slate-400"
                        placeholder={placeholder}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={MAX_INPUT_LENGTH}
                        disabled={loading}
                    />
                </div>
                {hasAbbr && (
                    <div className="w-28">
                        <input
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold uppercase text-center outline-none focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] bg-slate-50 focus:bg-white transition-all placeholder:text-slate-400"
                            placeholder="ตัวย่อ"
                            value={abbr}
                            onChange={(e) => setAbbr(e.target.value.toUpperCase())}
                            maxLength={10}
                            disabled={loading}
                        />
                    </div>
                )}
                <button
                    disabled={loading || !name.trim()}
                    className="bg-[#1F3B8B] text-white rounded-xl px-6 py-3.5 font-bold text-xs uppercase tracking-widest hover:bg-blue-900 disabled:opacity-30 transition-all flex items-center gap-2 shadow-sm active:scale-95 shrink-0"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} เพิ่มข้อมูล
                </button>
            </form>

            {/* Data Table */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left">ชื่อรายการ</th>
                            {hasAbbr && <th className="px-6 py-4 text-center w-28">ตัวย่อ</th>}
                            <th className="px-6 py-4 text-right w-36">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.length === 0 && !loading && (
                            <tr>
                                <td colSpan={hasAbbr ? 3 : 2} className="py-20 text-center text-slate-400 font-medium text-xs italic">
                                    ยังไม่มีข้อมูล
                                </td>
                            </tr>
                        )}
                        {rows.map((r) => (
                            <tr key={r.id} className={`group transition-all ${editingId === r.id ? 'bg-[#1F3B8B]/5' : 'hover:bg-slate-50'}`}>
                                <td className="px-6 py-4">
                                    {editingId === r.id ? (
                                        <input
                                            autoFocus
                                            className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm font-bold outline-none focus:border-[#1F3B8B] bg-white shadow-sm text-slate-900"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            maxLength={MAX_INPUT_LENGTH}
                                            disabled={loading}
                                        />
                                    ) : (
                                        <span className="font-bold text-slate-900 uppercase tracking-tight text-sm transition-colors">{r.name}</span>
                                    )}
                                </td>
                                {hasAbbr && (
                                    <td className="px-6 py-4 text-center">
                                        {editingId === r.id ? (
                                            <input
                                                className="border border-slate-300 rounded-lg px-2 py-2 w-full text-center text-xs font-bold uppercase outline-none focus:border-[#1F3B8B] bg-white shadow-sm text-slate-900"
                                                value={editAbbr}
                                                onChange={(e) => setEditAbbr(e.target.value.toUpperCase())}
                                                placeholder="-"
                                                maxLength={10}
                                                disabled={loading}
                                            />
                                        ) : (
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-[10px] font-bold border border-slate-200">
                                                {r.abbr || "-"}
                                            </span>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                    {editingId === r.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setUpdateTarget(r.id)} disabled={loading || !editName.trim()} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200" title="บันทึก">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} disabled={loading} className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-lg transition-all border border-slate-200" title="ยกเลิก">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingId(r.id); setEditName(r.name); setEditAbbr(r.abbr || ""); }}
                                                disabled={loading}
                                                className="p-2 text-slate-400 bg-slate-50 hover:text-[#1F3B8B] hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
                                                title="แก้ไข"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(r.id)}
                                                disabled={loading}
                                                className="p-2 text-slate-400 bg-slate-50 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200"
                                                title="ลบ"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function MasterSettingsPage() {
    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="min-h-screen  py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto space-y-8 pb-20">

                    {/* --- HEADER SECTION --- */}
                    <div className="flex flex-col md:flex-row items-start md:items-center border-b border-slate-200 pb-8 gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white text-[#1F3B8B] rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                    หมวดหมู่และหน่วยนับ (Master Data)
                                </h1>
                                <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-[#1F3B8B]" />
                                    จัดการข้อมูลหมวดหมู่สินค้าและหน่วยนับพื้นฐาน
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* --- 2 COLUMNS LAYOUT --- */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                        <MasterDataSection
                            title="จัดการหมวดหมู่สินค้า (Categories)"
                            endpoint="/master/categories"
                            placeholder="ชื่อหมวดหมู่ (เช่น Fiber Optics)"
                            hasAbbr={true}
                            icon={Layers}
                        />
                        <MasterDataSection
                            title="จัดการหน่วยนับ (Units)"
                            endpoint="/master/units"
                            placeholder="ชื่อหน่วยนับ (เช่น ม้วน, ชิ้น)"
                            hasAbbr={false}
                            icon={Tag}
                        />
                    </div>

                    {/* --- FOOTER HINT --- */}
                    <div className="flex justify-center items-center gap-2 py-6 opacity-50">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">ข้อมูลตั้งต้นจะถูกนำไปใช้งานร่วมกันในทุกฟังก์ชันของระบบ</span>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}