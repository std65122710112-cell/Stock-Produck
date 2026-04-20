"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Settings, RefreshCw, Plus, Trash2, Edit3, Check, X,
    Database, Tag, Layers, ShieldCheck, AlertTriangle,
    ClipboardList, Info, Loader2, CheckCircle2, XCircle
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

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [updateTarget, setUpdateTarget] = useState(null);
    
    const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);
    const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

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
            setEditingId(null);
            setUpdateTarget(null);
            setShowUpdateSuccessModal(true);
            await load();
        } catch (err) {
            toast.error(err.message || `ไม่สามารถบันทึกข้อมูลได้`);
            setUpdateTarget(null);
        } finally { setLoading(false); }
    }

    async function executeDelete() {
        if (!deleteTarget) return;
        setLoading(true);
        try {
            await apiFetch(`${endpoint}/${deleteTarget}`, { method: "DELETE" });
            if (editingId === deleteTarget) setEditingId(null);
            setShowDeleteSuccessModal(true);
            await load();
        } catch (err) {
            toast.error(`ไม่สามารถลบข้อมูลได้ (ข้อมูลอาจถูกใช้งานอยู่)`);
        } finally {
            setLoading(false);
            setDeleteTarget(null);
        }
    }

    return (
        <div className="flex flex-col bg-white rounded-xl border-2 border-slate-200 shadow-md overflow-hidden transition-all duration-300">

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl border-2 border-rose-100 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 mx-auto border border-rose-200 shadow-sm">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-2">ยืนยันการลบ?</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                            คุณต้องการลบรายการนี้ใช่หรือไม่? <br />
                            <span className="text-xs font-normal mt-2 block text-slate-400 bg-slate-50 p-2 rounded-md">ข้อมูลที่ถูกลบไม่สามารถกู้คืนได้ และระบบจะปฏิเสธการลบหากมีการผูกข้อมูลไว้แล้ว</span>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-slate-200 transition-all border border-transparent active:scale-95">ยกเลิก</button>
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

            {updateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl border-2 border-slate-200 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-[#1F3B8B]/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-[#1F3B8B]/20 shadow-sm">
                            <Edit3 className="w-8 h-8 text-[#1F3B8B]" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-2">ยืนยันการแก้ไข?</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">คุณต้องการบันทึกการเปลี่ยนแปลง<br/>ของข้อมูลหลักระบบนี้ใช่หรือไม่?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setUpdateTarget(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-slate-200 transition-all border border-transparent active:scale-95">ยกเลิก</button>
                            <button onClick={executeUpdate} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"><Check className="w-4 h-4" /> ยืนยัน</button>
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
                        <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">อัปเดตข้อมูลสำเร็จ</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                            ระบบได้บันทึกการเปลี่ยนแปลง<br />เรียบร้อยแล้ว
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowUpdateSuccessModal(false)}
                            className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            )}

            <div className="p-6 md:p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-200 text-[#1F3B8B]">
                        <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 uppercase tracking-widest">{title}</h2>
                </div>
                <button onClick={load} disabled={loading} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-[#1F3B8B] shadow-sm transition-all disabled:opacity-30">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <form onSubmit={create} autoComplete="off" className="p-6 md:px-8 bg-white border-b border-slate-100 flex flex-wrap lg:flex-nowrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <input
                        className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all placeholder:text-slate-400 text-slate-800"
                        placeholder={placeholder}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={MAX_INPUT_LENGTH}
                        disabled={loading}
                    />
                </div>
                {hasAbbr && (
                    <div className="w-full lg:w-32">
                        <input
                            className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-sm font-bold uppercase lg:text-center outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all placeholder:text-slate-400 text-[#1F3B8B]"
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
                    className="w-full lg:w-auto bg-emerald-600 text-white rounded-xl px-6 py-3.5 font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 shrink-0"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} เพิ่มข้อมูล
                </button>
            </form>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left">ชื่อรายการ</th>
                            {hasAbbr && <th className="px-6 py-4 text-center w-32">ตัวย่อ</th>}
                            <th className="px-6 py-4 text-right w-40">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.length === 0 && !loading && (
                            <tr>
                                <td colSpan={hasAbbr ? 3 : 2} className="py-20 text-center text-slate-400 font-bold text-sm italic tracking-widest uppercase">
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
                                            className="border-2 border-slate-300 rounded-lg px-3 py-2 w-full text-sm font-bold outline-none focus:border-[#1F3B8B] bg-white shadow-sm text-slate-900"
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
                                                className="border-2 border-slate-300 rounded-lg px-2 py-2 w-full text-center text-sm font-bold uppercase outline-none focus:border-[#1F3B8B] bg-white shadow-sm text-[#1F3B8B]"
                                                value={editAbbr}
                                                onChange={(e) => setEditAbbr(e.target.value.toUpperCase())}
                                                placeholder="-"
                                                maxLength={10}
                                                disabled={loading}
                                            />
                                        ) : (
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200">
                                                {r.abbr || "-"}
                                            </span>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                    {editingId === r.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setUpdateTarget(r.id)} disabled={loading || !editName.trim()} className="p-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50" title="บันทึก">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} disabled={loading} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-all border border-slate-200 active:scale-95 disabled:opacity-50" title="ยกเลิก">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingId(r.id); setEditName(r.name); setEditAbbr(r.abbr || ""); }}
                                                disabled={loading}
                                                className="p-2 text-slate-400 bg-slate-50 hover:text-[#1F3B8B] hover:bg-blue-50 rounded-lg transition-all border border-slate-200 hover:border-blue-200 active:scale-95 disabled:opacity-30"
                                                title="แก้ไข"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(r.id)}
                                                disabled={loading}
                                                className="p-2 text-slate-400 bg-slate-50 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 hover:border-rose-200 active:scale-95 disabled:opacity-30"
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
            <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto space-y-8 pb-20">

                    <div className="flex flex-col md:flex-row items-start md:items-center border-b border-slate-200 pb-8 gap-6 print:hidden">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#1F3B8B]/10 text-[#1F3B8B] rounded-xl shadow-sm border border-[#1F3B8B]/20 flex items-center justify-center shrink-0">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                    หมวดหมู่และหน่วยนับ
                                </h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium uppercase tracking-widest flex items-center gap-2">
                                    <Database className="w-4 h-4 text-emerald-500" />
                                    Master Data Management
                                </p>
                            </div>
                        </div>
                    </div>

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
                </div>
            </div>
        </AuthGate>
    );
}