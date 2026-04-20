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
    CalendarClock,
    Truck,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Hash,
    FileText,
    Check,
    X,
    AlertTriangle,
    ShieldCheck,
    Loader2
} from "lucide-react";

export default function CreateSupplierPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [validationFailed, setValidationFailed] = useState(false);

    const [popup, setPopup] = useState({ show: false, type: "success", title: "", message: "", onConfirm: null });
    const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
    const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);

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

    const handlePreSubmit = (e) => {
        e.preventDefault(); 
        if (!form.code || !form.name) {
            setValidationFailed(true);
            return showNotify("warning", "ข้อมูลไม่ครบถ้วน", "กรุณากรอกรหัสและชื่อคู่ค้าให้ครบถ้วนก่อนบันทึก");
        }
        setIsConfirmSaveOpen(true); 
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setIsConfirmSaveOpen(false); 
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

    const handlePreCancel = () => {
        setIsConfirmCancelOpen(true);
    };

    return (
        <AuthGate>
            <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
                
                {popup.show && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
                        <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-150">
                            <div className="flex justify-center">
                                {popup.type === "success" && <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 flex items-center justify-center rounded-full text-emerald-500"><CheckCircle2 className="w-8 h-8" /></div>}
                                {popup.type === "error" && <div className="w-16 h-16 bg-rose-50 border border-rose-100 flex items-center justify-center rounded-full text-rose-500"><XCircle className="w-8 h-8" /></div>}
                                {popup.type === "warning" && <div className="w-16 h-16 bg-amber-50 border border-amber-100 flex items-center justify-center rounded-full text-amber-500"><AlertCircle className="w-8 h-8" /></div>}
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{popup.title}</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">{popup.message}</p>
                            </div>
                            <button
                                onClick={closePopup}
                                className="w-full py-3.5 bg-[#1F3B8B] hover:bg-blue-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                )}

                {isConfirmSaveOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all print:hidden">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 max-w-sm w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="mx-auto w-16 h-16 bg-[#1F3B8B]/10 rounded-full flex items-center justify-center border border-[#1F3B8B]/20">
                                <ShieldCheck className="w-8 h-8 text-[#1F3B8B]" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">ยืนยันลงทะเบียน</h2>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed px-2">ระบบจะทำการบันทึกข้อมูลคู่ค้านี้เข้าสู่ฐานข้อมูลกลาง</p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmSaveOpen(false)}
                                    className="flex-1 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-colors active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-[#1F3B8B] text-white rounded-xl py-3 text-xs font-bold uppercase tracking-widest shadow-md transition-all hover:bg-blue-900 disabled:opacity-70 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isConfirmCancelOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all print:hidden">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 max-w-sm w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
                                <AlertTriangle className="w-8 h-8 text-rose-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">ยกเลิกรายการ?</h2>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed px-2">ข้อมูลที่คุณกรอกไว้ทั้งหมดจะไม่ถูกบันทึกและจะสูญหาย</p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmCancelOpen(false)}
                                    className="flex-1 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-colors active:scale-95"
                                >
                                    กรอกต่อ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="flex-1 bg-rose-600 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-widest shadow-md transition-all hover:bg-rose-700 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" /> ยืนยันยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="max-w-5xl mx-auto space-y-8 pb-20">

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6">
                        <div className="space-y-2">
                            <button
                                onClick={handlePreCancel}
                                className="flex items-center gap-2 text-slate-400 hover:text-[#1F3B8B] transition-colors text-xs font-bold uppercase tracking-widest mb-4"
                            >
                                <ArrowLeft className="w-4 h-4" /> กลับสู่ทะเบียนคู่ค้า
                            </button>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                ลงทะเบียนคู่ค้าใหม่
                            </h1>
                            <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                สร้างข้อมูลทะเบียนบริษัทคู่ค้าเข้าสู่ระบบส่วนกลาง
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handlePreSubmit} className="space-y-8">

                        <section className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-slate-50 text-[#1F3B8B] rounded-lg border border-slate-200">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">ข้อมูลพื้นฐานบริษัท</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                        รหัสคู่ค้า (Code) <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            name="code" value={form.code} onChange={handleChange}
                                            placeholder="เช่น VND-001"
                                            className={`w-full bg-slate-50 border ${validationFailed && !form.code ? 'border-rose-400 bg-rose-50' : 'border-slate-200'} rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] outline-none transition-all placeholder:text-slate-400`}
                                        />
                                    </div>
                                    {validationFailed && !form.code && (
                                        <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 ml-1 animate-in fade-in">
                                            <AlertTriangle className="w-3 h-3" /> กรุณาระบุรหัสคู่ค้า
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                        เลขผู้เสียภาษี (Tax ID)
                                    </label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            name="taxId" value={form.taxId} onChange={handleChange}
                                            placeholder="ระบุตัวเลข 13 หลัก"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold tabular-nums text-slate-900 focus:bg-white focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] outline-none transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1 flex items-center gap-1.5">
                                        ชื่อนิติบุคคล / ชื่อร้านค้า <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            name="name" value={form.name} onChange={handleChange}
                                            placeholder="ชื่อจดทะเบียนบริษัท..."
                                            className={`w-full bg-slate-50 border ${validationFailed && !form.name ? 'border-rose-400 bg-rose-50' : 'border-slate-200'} rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] outline-none transition-all placeholder:text-slate-400`}
                                        />
                                    </div>
                                    {validationFailed && !form.name && (
                                        <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 ml-1 animate-in fade-in">
                                            <AlertTriangle className="w-3 h-3" /> กรุณาระบุชื่อบริษัทหรือร้านค้า
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-slate-50 text-[#1F3B8B] rounded-lg border border-slate-200">
                                    <User className="w-5 h-5" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">การติดต่อและที่อยู่</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1 flex items-center gap-1.5">ผู้ติดต่อหลัก</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            name="contactName" value={form.contactName} onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1 flex items-center gap-1.5">เบอร์โทรศัพท์</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            name="phone" value={form.phone} onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold tabular-nums text-slate-900 outline-none focus:bg-white focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1 flex items-center gap-1.5">อีเมลติดต่องาน</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            name="email" type="email" value={form.email} onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1 flex items-center gap-1.5">ที่อยู่สำนักงาน</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                                        <textarea
                                            name="address" value={form.address} onChange={handleChange}
                                            rows="3"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-slate-50 text-[#1F3B8B] rounded-lg border border-slate-200">
                                    <CalendarClock className="w-5 h-5" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">เงื่อนไขทางธุรกิจ</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">เครดิตเทอม (วัน)</p>
                                        <p className="text-[10px] font-medium text-slate-500">ชำระเงินหลังจากวางบิล</p>
                                    </div>
                                    <input
                                        name="creditDays" type="number" value={form.creditDays} onChange={handleChange}
                                        className="w-24 bg-white border border-slate-200 rounded-xl p-3 text-center font-bold text-lg text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] tabular-nums transition-all"
                                    />
                                </div>

                                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">จัดส่งพัสดุ (วัน)</p>
                                        <p className="text-[10px] font-medium text-slate-500">ระยะเวลาจัดส่งโดยประมาณ</p>
                                    </div>
                                    <input
                                        name="avgLeadTime" type="number" value={form.avgLeadTime} onChange={handleChange}
                                        className="w-24 bg-white border border-slate-200 rounded-xl p-3 text-center font-bold text-lg text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] tabular-nums transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-4">
                            <button
                                type="button"
                                onClick={handlePreCancel}
                                className="w-full sm:w-auto px-8 py-3.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl uppercase tracking-widest hover:bg-slate-50 transition-colors active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:w-auto bg-[#1F3B8B] hover:bg-blue-900 text-white px-10 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {isSubmitting ? "กำลังตรวจสอบ..." : "บันทึกข้อมูลคู่ค้า"}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </AuthGate>
    );
}