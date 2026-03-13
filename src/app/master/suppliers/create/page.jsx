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
    AlertCircle
} from "lucide-react";

export default function CreateSupplierPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Popup State ---
    const [popup, setPopup] = useState({
        show: false,
        type: "success", // success | error | warning
        title: "",
        message: "",
        onConfirm: null
    });

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
    };

    const showNotify = (type, title, message, onConfirm = null) => {
        setPopup({ show: true, type, title, message, onConfirm });
    };

    const closePopup = () => {
        const callback = popup.onConfirm;
        setPopup({ ...popup, show: false });
        if (callback) callback();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.code || !form.name) {
            return showNotify("warning", "ข้อมูลไม่ครบถ้วน", "กรุณากรอกรหัสและชื่อคู่ค้าให้ครบถ้วนก่อนบันทึก");
        }

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

    return (
        <AuthGate>
            {/* --- CUSTOM POPUP MODAL --- */}
            {popup.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                        <div className="p-8 text-center space-y-4">
                            <div className="flex justify-center">
                                {popup.type === "success" && <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><CheckCircle2 className="w-10 h-10" /></div>}
                                {popup.type === "error" && <div className="p-3 bg-rose-50 rounded-full text-rose-600"><XCircle className="w-10 h-10" /></div>}
                                {popup.type === "warning" && <div className="p-3 bg-amber-50 rounded-full text-amber-600"><AlertCircle className="w-10 h-10" /></div>}
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{popup.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{popup.message}</p>
                            </div>
                            <button
                                onClick={closePopup}
                                className="w-full py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-lg"
                            >
                                ตกลง (Confirm)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto py-10 px-6 bg-white ">

                {/* 1. TOP NAVIGATION & TITLE */}
                <div className="mb-10 space-y-4 text-left">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลัก
                    </button>
                    <div className="flex justify-between items-end border-b border-slate-100 pb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ลงทะเบียนคู่ค้าใหม่</h1>
                            <p className="text-slate-500 text-sm mt-1 uppercase tracking-wider font-medium">New Supplier Registration</p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-indigo-100">
                                Global Registry
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">

                    {/* 2. CORPORATE IDENTITY SECTION */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">1. ข้อมูลพื้นฐานบริษัท</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 text-left block">รหัสคู่ค้า (Code) *</label>
                                <input
                                    name="code" value={form.code} onChange={handleChange}
                                    placeholder="เช่น VND-001"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-mono font-bold text-indigo-600 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 text-left block">เลขผู้เสียภาษี (Tax ID)</label>
                                <input
                                    name="taxId" value={form.taxId} onChange={handleChange}
                                    placeholder="ระบุตัวเลข 13 หลัก"
                                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 text-left block">ชื่อนิติบุคคล / ชื่อร้านค้า *</label>
                                <input
                                    name="name" value={form.name} onChange={handleChange}
                                    placeholder="ชื่อจดทะเบียนบริษัท..."
                                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    {/* 3. CONTACT DETAILS SECTION */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">2. การติดต่อและที่อยู่</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="space-y-1.5 text-left">
                                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5"><User className="w-3 h-3" /> ผู้ติดต่อหลัก</label>
                                <input
                                    name="contactName" value={form.contactName} onChange={handleChange}
                                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5 text-left">
                                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5"><Phone className="w-3 h-3" /> เบอร์โทรศัพท์</label>
                                <input
                                    name="phone" value={form.phone} onChange={handleChange}
                                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5 text-left">
                                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5"><Mail className="w-3 h-3" /> อีเมลติดต่องาน</label>
                                <input
                                    name="email" type="email" value={form.email} onChange={handleChange}
                                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5 text-left">
                                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> ที่อยู่สำนักงาน</label>
                                <textarea
                                    name="address" value={form.address} onChange={handleChange}
                                    rows="1"
                                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium outline-none focus:border-indigo-500 transition-all resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 4. TERMS & CONDITIONS */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-left">
                            <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">3. เงื่อนไขทางธุรกิจ</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-indigo-500" /> เครดิตเทอม (วัน)</p>
                                    <p className="text-[10px] text-slate-400 leading-none">ชำระเงินหลังจากวางบิล</p>
                                </div>
                                <input
                                    name="creditDays" type="number" value={form.creditDays} onChange={handleChange}
                                    className="w-20 bg-white border border-slate-200 rounded-lg p-2.5 text-center font-mono font-bold text-lg text-slate-800 outline-none shadow-sm"
                                />
                            </div>

                            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-500" /> จัดส่งพัสดุ (วัน)</p>
                                    <p className="text-[10px] text-slate-400 leading-none">ระยะเวลาโดยประมาณ</p>
                                </div>
                                <input
                                    name="avgLeadTime" type="number" value={form.avgLeadTime} onChange={handleChange}
                                    className="w-20 bg-white border border-slate-200 rounded-lg p-2.5 text-center font-mono font-bold text-lg text-slate-800 outline-none shadow-sm"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 5. SUBMIT ACTION BAR */}
                    <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-slate-400 italic">
                            <ShieldCheck className="w-5 h-5 opacity-50" />
                            <span className="text-xs font-medium">Data Integrity Protocol: Validated by TJC Core</span>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 sm:flex-none px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none bg-slate-900 hover:bg-indigo-600 text-white px-12 py-3.5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? "กำลังส่งข้อมูล..." : <><Check className="w-4 h-4" /> บันทึกข้อมูลคู่ค้า</>}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="mt-20 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">
                        TJC GROUP • Supply Chain Intelligence
                    </p>
                </div>
            </div>
        </AuthGate>
    );
}