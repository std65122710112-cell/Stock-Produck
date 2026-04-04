"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Settings, RefreshCw, Plus, Trash2, Edit3, Check, X,
    Database, Tag, Layers, ShieldCheck, AlertTriangle, ChevronRight,
    ClipboardList, Info
} from "lucide-react";

const MAX_INPUT_LENGTH = 50;

function MasterDataSection({
    title,
    endpoint,
    placeholder,
    hasAbbr,
    icon,
    iconClass = "text-slate-600"
}) {

    const Icon = icon; // ✅ ประกาศก่อนใช้

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
        <div className="flex flex-col bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300">

            {/* Modal: ยืนยันการลบ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-2 border-slate-100 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto border-2 border-rose-100">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase mb-2">ยืนยันการลบ?</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8">คุณต้องการลบรายการนี้ใช่หรือไม่? ข้อมูลที่ถูกลบไม่สามารถกู้คืนได้</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-all">ยกเลิก</button>
                            <button onClick={executeDelete} className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl font-black text-sm uppercase hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> ยืนยันลบ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: ยืนยันการแก้ไข */}
            {updateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-2 border-slate-100 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 mx-auto border-2 border-emerald-100">
                            <Edit3 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase mb-2">ยืนยันการแก้ไข?</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8">คุณต้องการบันทึกการเปลี่ยนแปลงของข้อมูลนี้ใช่หรือไม่?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setUpdateTarget(null)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-all">ยกเลิก</button>
                            <button onClick={executeUpdate} className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"><Check className="w-4 h-4" /> บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="p-6 bg-slate-50 border-b-2 border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* 💡 นำ iconClass มาใส่ตรงนี้แทนสีที่ถูก Fix ไว้ */}
                    <div className={`p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 ${iconClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-black text-slate-950 uppercase tracking-[0.15em]">{title}</h2>
                </div>
                <button onClick={load} disabled={loading} className="p-2 hover:bg-[#1F3B8B]/10 rounded-lg text-slate-400 hover:text-[#1F3B8B] transition-all disabled:opacity-30">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Creation Form */}
            <form onSubmit={create} autoComplete="off" className="p-6 bg-white border-b-2 border-slate-50 flex flex-wrap lg:flex-nowrap gap-3">
                <div className="flex-1 min-w-[200px]">
                    <input
                        className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-300"
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
                            className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-black uppercase text-center outline-none focus:border-[#1F3B8B] bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-300"
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
                    className="bg-emerald-600 text-white rounded-2xl px-8 py-4 font-black text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-30 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                    <Plus className="w-4 h-4" /> {loading ? "..." : "เพิ่มข้อมูล"}
                </button>
            </form>

            {/* Data Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b-2 border-slate-100">
                        <tr>
                            {/* 💡 ปรับเพิ่ม text-xs (ใหญ่ขึ้น) และ text-slate-950 (เข้มขึ้น) */}
                            <th className="px-8 py-5 text-left text-xs font-black uppercase tracking-[0.2em] text-slate-950">
                                ชื่อรายการ
                            </th>
                            {hasAbbr && (
                                <th className="px-8 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-slate-950 w-32">
                                    ตัวย่อ
                                </th>
                            )}
                            <th className="px-8 py-5 text-right text-xs font-black uppercase tracking-[0.2em] text-slate-950 w-40">
                                จัดการ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/80 transition-all group">
                                <td className="px-8 py-5">
                                    {editingId === r.id ? (
                                        <input
                                            autoFocus
                                            className="border-2 border-emerald-500 rounded-xl px-4 py-2 w-full text-sm font-bold outline-none bg-white shadow-inner"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            maxLength={MAX_INPUT_LENGTH}
                                            disabled={loading}
                                        />
                                    ) : (
                                        <span className="font-bold text-slate-800 uppercase tracking-tight text-sm group-hover:text-[#1F3B8B] transition-colors">{r.name}</span>
                                    )}
                                </td>
                                {hasAbbr && (
                                    <td className="px-8 py-5 text-center">
                                        {editingId === r.id ? (
                                            <input
                                                className="border-2 border-emerald-500 rounded-xl px-2 py-2 w-24 text-center text-xs font-black uppercase outline-none bg-white shadow-inner"
                                                value={editAbbr}
                                                onChange={(e) => setEditAbbr(e.target.value.toUpperCase())}
                                                placeholder="-"
                                                maxLength={10}
                                                disabled={loading}
                                            />
                                        ) : (
                                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black border border-slate-200 group-hover:bg-[#1F3B8B]/10 group-hover:text-[#1F3B8B] transition-all">
                                                {r.abbr || "-"}
                                            </span>
                                        )}
                                    </td>
                                )}
                                <td className="px-8 py-5 text-right">
                                    {editingId === r.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setUpdateTarget(r.id)} disabled={loading || !editName.trim()} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="บันทึก">
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} disabled={loading} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all" title="ยกเลิก">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <div className="flex justify-end gap-2">
                                                {/* 💡 ปุ่มแก้ไข: เปลี่ยนจาก text-slate-300 เป็นสีน้ำเงินหลัก และเพิ่มพื้นหลังจางๆ ให้ดูมีมิติ */}
                                                <button
                                                    onClick={() => { setEditingId(r.id); setEditName(r.name); setEditAbbr(r.abbr || ""); }}
                                                    disabled={loading}
                                                    className="p-2 text-[#1F3B8B] bg-[#1F3B8B]/5 hover:bg-[#1F3B8B]/10 rounded-xl transition-all active:scale-90"
                                                    title="แก้ไข"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </button>

                                                {/* 💡 ปุ่มลบ: เปลี่ยนจาก text-slate-300 เป็นสีแดง Rose และเพิ่มพื้นหลังจางๆ */}
                                                <button
                                                    onClick={() => setDeleteTarget(r.id)}
                                                    disabled={loading}
                                                    className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all active:scale-90"
                                                    title="ลบ"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && (
                    <div className="p-16 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic">ยังไม่มีข้อมูลในระบบ</div>
                )}
            </div>
        </div>
    );
}

export default function MasterSettingsPage() {
    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-10 pb-20">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center border-b-2 border-slate-100 pb-8 gap-6">

                    {/* ด้านซ้าย: กล่องไอคอน */}
                    <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-[#1F3B8B] flex items-center justify-center shadow-xl shadow-[#1F3B8B]/20 shrink-0 border border-[#1F3B8B]">
                        <ClipboardList className="w-8 h-8 text-white" strokeWidth={2} />
                    </div>

                    {/* ด้านขวา: ข้อมูลเรียงซ้อนกัน */}
                    <div className="flex flex-col">
                        {/* ส่วนบน: หมวดหมู่ระบบ (System Core Configuration) */}
                        <div className="flex items-center gap-2 mb-1.5">
                            <ShieldCheck className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                System Core Configuration
                            </p>
                        </div>

                        {/* หัวข้อหลัก: ตัวตรง ไม่เอียง หนาพิเศษ */}
                        <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                            หมวดหมู่และหน่วยนับ
                        </h1>

                        {/* คำอธิบายด้านล่าง: ไอคอน Info นำหน้า */}
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                จัดการข้อมูลหมวดหมู่และหน่วยนับพื้นฐาน
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
                    <MasterDataSection
                        title="จัดการหมวดหมู่สินค้า"
                        endpoint="/master/categories"
                        placeholder="ชื่อหมวดหมู่ (เช่น Fiber Optics)"
                        hasAbbr={true}
                        icon={Layers}
                        iconClass="text-blue-600" // 👈 เปลี่ยนสีตรงนี้ได้เลย เช่น text-rose-500, text-amber-500
                    />
                    <MasterDataSection
                        title="จัดการหมวดหมู่หน่วยนับ"
                        endpoint="/master/units"
                        placeholder="ชื่อหน่วยนับ (เช่น ม้วน, ชิ้น)"
                        hasAbbr={false}
                        icon={Tag}
                        iconClass="text-emerald-600" // 👈 เปลี่ยนสีตรงนี้ได้เลย
                    />
                </div>

                {/* Footer Compliance */}
                <div className="flex justify-center items-center gap-3 py-10">
                    <Database className="w-4 h-4 text-slate-300" />
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">ข้อมูลตั้งต้นจะถูกใช้ร่วมกันในทุกส่วนของระบบปฏิบัติการ</span>
                </div>
            </div>
        </AuthGate>
    );
}