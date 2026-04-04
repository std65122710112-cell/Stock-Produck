"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    ArrowLeft,
    Building2,
    User,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    Clock,
    ShieldCheck,
    Check,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Hash,
    FileText,
    CalendarClock,
    Truck,
    X,
    AlertTriangle
} from "lucide-react";

export default function CreateSupplierPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- State สำหรับระบบตรวจสอบข้อมูลแบบใหม่ (Inline Error) ---
    const [validationFailed, setValidationFailed] = useState(false);

    // --- Popup States ---
    const [popup, setPopup] = useState({ show: false, type: "success", title: "", message: "", onConfirm: null });
    const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false); // Popup ยืนยันการบันทึก
    const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false); // Popup ยืนยันการยกเลิก

    const [form, setForm] = useState({
        code: "",
        name: "",
        taxId: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
        creditDays: 30,
        avgLeadTime: 7
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // ซ่อน Error เมื่อผู้ใช้เริ่มพิมพ์แก้
        if (validationFailed && (name === "code" || name === "name")) {
            setValidationFailed(false);
        }
    };

    const showNotify = (type, title, message, onConfirm = null) => {
        setPopup({ show: true, type, title, message, onConfirm });
    };

    const closePopup = () => {
        const callback = popup.onConfirm;
        setPopup({ ...popup, show: false });
        if (callback) callback();
    };

    // 🔒 1. ดักจับก่อน Submit เพื่อตรวจข้อมูลและเปิด Popup ยืนยันบันทึก
    const handlePreSubmit = (e) => {
        e.preventDefault(); // หยุดการส่งฟอร์มเพื่อตรวจเอง
        if (!form.code || !form.name) {
            setValidationFailed(true); // กระตุ้นให้แสดงตัวหนังสือแดงใต้ช่องกรอก
            // รักษาลอจิกเดิม: แสดง Popup แจ้งเตือนของเดิม
            return showNotify("warning", "ข้อมูลไม่ครบถ้วน", "กรุณากรอกรหัสและชื่อคู่ค้าให้ครบถ้วนก่อนบันทึก");
        }
        setIsConfirmSaveOpen(true); // เปิดหน้าต่างยืนยัน
    };

    // 🔒 2. ลอจิกการส่ง API แบบดั้งเดิม 100% (ถูกเรียกเมื่อกดยืนยันใน Popup)
    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setIsConfirmSaveOpen(false); // ปิด Popup ยืนยัน
        setIsSubmitting(true);
        try {
            await apiFetch("/master/suppliers", {
                method: "POST",
                body: JSON.stringify(form)
            });

            showNotify(
                "success",
                "บันทึกข้อมูลสำเร็จ",
                `ลงทะเบียนคู่ค้า ${form.name} เข้าสู่ระบบเรียบร้อยแล้ว`,
                () => router.push("/master/suppliers")
            );
        } catch (error) {
            showNotify("error", "เกิดข้อผิดพลาด", error.message || "ไม่สามารถบันทึกข้อมูลได้ โปรดลองอีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🔒 3. ดักจับก่อนยกเลิก เพื่อเปิด Popup ถามความแน่ใจ
    const handlePreCancel = () => {
        setIsConfirmCancelOpen(true);
    };

    return (
        <AuthGate>
            {/* --- CUSTOM NOTIFY MODAL (ของเดิม) --- */}
            {popup.show && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
                    <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="p-8 text-center space-y-5">
                            <div className="flex justify-center">
                                {popup.type === "success" && <div className="p-4 bg-emerald-50 rounded-full text-emerald-600"><CheckCircle2 className="w-10 h-10" /></div>}
                                {popup.type === "error" && <div className="p-4 bg-rose-50 rounded-full text-rose-600"><XCircle className="w-10 h-10" /></div>}
                                {popup.type === "warning" && <div className="p-4 bg-amber-50 rounded-full text-amber-600"><AlertCircle className="w-10 h-10" /></div>}
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-950 tracking-tight">{popup.title}</h3>
                                <p className="text-sm font-bold text-slate-500 leading-relaxed px-2">{popup.message}</p>
                            </div>
                            <button
                                onClick={closePopup}
                                className="w-full py-4 bg-slate-950 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95"
                            >
                                ตกลง (Confirm)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔒 POPUP: ยืนยันการบันทึก (Double Confirmation Save) */}
            {isConfirmSaveOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all print:hidden">
                    <div className="bg-white rounded-3xl border-4 border-slate-100 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.3)] p-10 max-w-sm w-full text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="mx-auto w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center border-4 border-emerald-100 shadow-inner">
                            <ShieldCheck className="w-12 h-12 text-emerald-600 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">ระบบจัดการคู่ค้า</p>
                            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-tight">ยืนยันลงทะเบียน</h2>
                            <p className="text-sm font-bold text-slate-600 leading-relaxed italic px-4">ระบบจะทำการบันทึกข้อมูลคู่ค้านี้เข้าสู่ฐานข้อมูลกลาง</p>
                        </div>
                        <div className="pt-6 grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setIsConfirmSaveOpen(false)}
                                className="py-4 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 rounded-2xl hover:bg-slate-200 hover:text-slate-800 transition-colors active:scale-95"
                            >
                                กรอกข้อมูลต่อ
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-600 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest shadow-xl transition-all hover:bg-emerald-700 disabled:opacity-70 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" /> ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔒 POPUP: ยืนยันการยกเลิก (Double Confirmation Cancel) */}
            {isConfirmCancelOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all print:hidden">
                    <div className="bg-white rounded-3xl border-4 border-slate-100 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.3)] p-10 max-w-sm w-full text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="mx-auto w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center border-4 border-rose-100 shadow-inner">
                            <AlertCircle className="w-12 h-12 text-rose-600 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">แจ้งเตือนการยกเลิก</p>
                            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-tight">ยกเลิกรายการ?</h2>
                            <p className="text-sm font-bold text-slate-600 leading-relaxed italic px-4">ข้อมูลที่คุณกรอกไว้ทั้งหมดจะไม่ถูกบันทึกและจะสูญหาย</p>
                        </div>
                        <div className="pt-6 grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setIsConfirmCancelOpen(false)}
                                className="py-4 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 rounded-2xl hover:bg-slate-200 hover:text-slate-800 transition-colors active:scale-95"
                            >
                                กรอกข้อมูลต่อ
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="bg-rose-600 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest shadow-xl transition-all hover:bg-rose-700 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" /> ยืนยันยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto py-10 px-4 md:px-6">

                {/* 1. TOP NAVIGATION & TITLE */}
                <div className="mb-10 space-y-4 text-left border-b-2 border-slate-100 pb-8">
                    <button
                        onClick={handlePreCancel}
                        className="flex items-center gap-2 text-slate-400 hover:text-rose-600 transition-colors text-xs font-black uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลัก
                    </button>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                        <div className="space-y-1">
                            <h1 className="text-5xl font-black text-slate-950 tracking-tighter">ลงทะเบียนคู่ค้าใหม่</h1>

                        </div>

                    </div>
                </div>

                <form onSubmit={handlePreSubmit} className="space-y-10">

                    {/* 2. CORPORATE IDENTITY SECTION */}
                    <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-600 text-[10px] font-black px-6 py-2 rounded-bl-3xl tracking-widest uppercase border-l border-b border-indigo-100">ขั้นตอนที่ 1</div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                            <h2 className="text-lg font-black text-slate-950 uppercase tracking-widest">ข้อมูลพื้นฐานบริษัท</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                    <Hash className="w-4 h-4 text-indigo-500" /> รหัสคู่ค้า (Code) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    name="code" value={form.code} onChange={handleChange}
                                    placeholder="เช่น VND-001"
                                    // ปรับเส้นขอบให้เป็นสีแดงถ้าลืมกรอก (Inline Error Styling)
                                    className={`w-full bg-slate-50 border-2 ${validationFailed && !form.code ? 'border-rose-400 bg-rose-50/50' : 'border-slate-100'} rounded-2xl p-4 text-sm font-mono font-black text-indigo-700 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner`}
                                />
                                {/* ข้อความเตือนใต้ช่องกรอก (Inline Error Text) */}
                                {validationFailed && !form.code && (
                                    <p className="text-[10px] font-black text-rose-500 flex items-center gap-1 ml-1 animate-in fade-in slide-in-from-top-1">
                                        <AlertTriangle className="w-3 h-3" /> กรุณาระบุรหัสคู่ค้า
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-emerald-500" /> เลขผู้เสียภาษี (Tax ID)
                                </label>
                                <input
                                    name="taxId" value={form.taxId} onChange={handleChange}
                                    placeholder="ระบุตัวเลข 13 หลัก"
                                    className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold tabular-nums focus:border-emerald-500 outline-none transition-all shadow-inner"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-black text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-sky-500" /> ชื่อนิติบุคคล / ชื่อร้านค้า <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    name="name" value={form.name} onChange={handleChange}
                                    placeholder="ชื่อจดทะเบียนบริษัท..."
                                    className={`w-full border-2 ${validationFailed && !form.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-100'} rounded-2xl p-4 text-base font-black text-slate-900 focus:border-sky-500 outline-none transition-all shadow-inner`}
                                />
                                {validationFailed && !form.name && (
                                    <p className="text-[10px] font-black text-rose-500 flex items-center gap-1 ml-1 animate-in fade-in slide-in-from-top-1">
                                        <AlertTriangle className="w-3 h-3" /> กรุณาระบุชื่อบริษัทหรือร้านค้า
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 3. CONTACT DETAILS SECTION */}
                    <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-sky-50 text-sky-600 text-[10px] font-black px-6 py-2 rounded-bl-3xl tracking-widest uppercase border-l border-b border-sky-100">ขั้นตอนที่ 2</div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
                            <h2 className="text-lg font-black text-slate-950 uppercase tracking-widest">การติดต่อและที่อยู่</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                    <User className="w-4 h-4 text-indigo-400" /> ผู้ติดต่อหลัก
                                </label>
                                <input
                                    name="contactName" value={form.contactName} onChange={handleChange}
                                    className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-400 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                    <Phone className="w-4 h-4 text-emerald-500" /> เบอร์โทรศัพท์
                                </label>
                                <input
                                    name="phone" value={form.phone} onChange={handleChange}
                                    className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold tabular-nums outline-none focus:border-emerald-500 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                    <Mail className="w-4 h-4 text-rose-400" /> อีเมลติดต่องาน
                                </label>
                                <input
                                    name="email" type="email" value={form.email} onChange={handleChange}
                                    className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-rose-400 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-black text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-amber-500" /> ที่อยู่สำนักงาน
                                </label>
                                <textarea
                                    name="address" value={form.address} onChange={handleChange}
                                    rows="2"
                                    className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-500 transition-all resize-none shadow-inner"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 4. TERMS & CONDITIONS */}
                    <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-600 text-[10px] font-black px-6 py-2 rounded-bl-3xl tracking-widest uppercase border-l border-b border-emerald-100">ขั้นตอนที่ 3</div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                            <h2 className="text-lg font-black text-slate-950 uppercase tracking-widest">เงื่อนไขทางธุรกิจ</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl flex items-center justify-between shadow-sm">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        <CalendarClock className="w-4 h-4 text-indigo-500" /> เครดิตเทอม (วัน)
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 leading-none">ชำระเงินหลังจากวางบิล</p>
                                </div>
                                <input
                                    name="creditDays"
                                    type="number"
                                    value={form.creditDays}
                                    onChange={handleChange}

                                    className="w-24 bg-white border-2 border-slate-200 rounded-2xl p-3 text-center font-black text-xl text-slate-900 outline-none focus:border-indigo-500 shadow-inner tabular-nums"
                                />
                            </div>

                            <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl flex items-center justify-between shadow-sm">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-emerald-500" /> จัดส่งพัสดุ (วัน)
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 leading-none">ระยะเวลาโดยประมาณ</p>
                                </div>
                                <input
                                    name="avgLeadTime"
                                    type="number"
                                    value={form.avgLeadTime}
                                    onChange={handleChange}
                                    
                                    className="w-24 bg-white border-2 border-slate-200 rounded-2xl p-3 text-center font-black text-xl text-slate-900 outline-none focus:border-emerald-500 shadow-inner tabular-nums"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 5. SUBMIT ACTION BAR */}
                    <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-end gap-6">
                        {/* เพิ่ม ml-auto และ justify-end เพื่อผลักปุ่มไปชิดขวาสุด */}
                        <div className="flex items-center justify-end gap-4 w-full sm:w-auto ml-auto">
                            <button
                                type="button"
                                onClick={handlePreCancel}
                                className="flex-1 sm:flex-none px-10 py-4 text-xs font-black text-slate-500 bg-slate-100 rounded-2xl uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-colors active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-95"
                            >
                                {isSubmitting ? "กำลังตรวจสอบ..." : <><Check className="w-5 h-5 opacity-70" /> บันทึกข้อมูลคู่ค้า</>}
                            </button>
                        </div>
                    </div>
                </form>

            </div>
        </AuthGate>
    );
}