"use client";

import React, { useState, useEffect } from 'react';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    Building2, Save, Upload, MapPin, Hash,
    Phone, Mail, Globe, Image as ImageIcon, Loader2, Info,
    CheckCircle2, X, AlertTriangle, Map, Navigation
} from "lucide-react";

export default function CompanySettingsPage() {
    const [formData, setFormData] = useState({
        name: '', branch: '', address: '', subDistrict: '',
        district: '', province: '', zipCode: '', taxId: '',
        phone: '', email: '', logoUrl: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // State สำหรับ Pop-up ยืนยันการบันทึก
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // 💡 1. ดึงข้อมูลบริษัทจากหลังบ้านเมื่อเปิดหน้าเว็บ
    useEffect(() => {
        async function fetchSettings() {
            try {
                const data = await apiFetch("/api/settings/company");
                if (data) {
                    setFormData(data);
                }
            } catch (error) {
                toast.error("ไม่สามารถโหลดข้อมูลบริษัทได้");
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, []);

    // 💡 2. จัดการการเปลี่ยนรูปโลโก้ (แปลงเป็น Base64)
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                return toast.error("ขนาดไฟล์โลโก้ต้องไม่เกิน 2MB");
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logoUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // 💡 3. ฟังก์ชันดักฟอร์มเพื่อเรียก Pop-up
    const handlePreSubmit = (e) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    // 💡 4. บันทึกข้อมูลจริง (เมื่อกดยืนยันใน Pop-up)
    const executeSave = async () => {
        setShowConfirmModal(false);
        setIsSaving(true);
        try {
            await apiFetch("/api/settings/company", {
                method: "POST",
                body: JSON.stringify(formData)
            });
            toast.success("บันทึกข้อมูลบริษัทเรียบร้อยแล้ว");
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />

            {/* 🔴 CONFIRMATION MODAL */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full mx-4 shadow-2xl border-2 border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border-2 border-amber-100 shadow-inner">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-2">ยืนยันการบันทึกข้อมูล?</h3>
                        <p className="text-xs font-bold text-slate-500 mb-8">ข้อมูลนี้จะถูกนำไปใช้ในหัวเอกสาร PDF ทั้งหมด (PR/PO/GR) ตรวจสอบความถูกต้องก่อนยืนยัน</p>

                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={executeSave}
                                className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" /> ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 min-h-screen pb-20">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-slate-100 pb-8">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-slate-950 text-white rounded-[1.5rem] shadow-xl border-2 border-slate-800">
                            <Building2 className="w-8 h-8 text-sky-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-1">Company Profile Settings</p>
                            <h1 className="text-4xl font-black text-slate-950 tracking-tighter uppercase italic">ตั้งค่าข้อมูลบริษัท</h1>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mt-2">
                                <Info className="w-4 h-4 text-sky-500" /> ข้อมูลที่แสดงในหัวเอกสาร PDF (PR/PO/GR)
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handlePreSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                    {/* LEFT COL: LOGO UPLOAD */}
                    <div className="xl:col-span-4 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm transition-all hover:shadow-lg">
                            <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest flex items-center gap-2.5 mb-6">
                                <ImageIcon className="w-5 h-5 text-indigo-500" /> โลโก้บริษัท (Company Logo)
                            </h2>

                            <div className="relative group w-full aspect-square max-w-[300px] mx-auto">
                                <div className="border-4 border-dashed border-slate-200 rounded-[2.5rem] p-4 flex flex-col items-center justify-center bg-slate-50 w-full h-full overflow-hidden transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/30">
                                    {formData.logoUrl ? (
                                        <img src={formData.logoUrl} className="w-full h-full object-contain mix-blend-multiply" alt="Company Logo" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-300">
                                            <Building2 className="w-16 h-16 mb-4 opacity-50" />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">No Logo Attached</span>
                                        </div>
                                    )}

                                    <label className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white rounded-[2rem] backdrop-blur-sm">
                                        <Upload className="w-8 h-8 mb-3 text-sky-400 animate-bounce" />
                                        <span className="text-xs font-black uppercase tracking-widest">อัปโหลดโลโก้ใหม่</span>
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6 pt-5 border-t-2 border-slate-50 text-center">
                                <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest bg-amber-50 px-4 py-2 rounded-xl inline-flex items-center gap-2 border border-amber-100">
                                    <Info className="w-3 h-3" /> แนะนำ: ใช้ไฟล์พื้นหลังโปร่งใส (PNG) ขนาดไม่เกิน 2MB
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: FORM DATA */}
                    <div className="xl:col-span-8 space-y-6">
                        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-8 transition-all hover:shadow-lg">

                            {/* 1. Basic Info - แยกเป็นการ์ดย่อย */}
                            <div className="bg-slate-50/50 p-6 md:p-8 rounded-[2rem] border border-slate-100 space-y-6">
                                <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest flex items-center gap-2.5 pb-4 border-b-2 border-slate-200/60">
                                    <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-sky-600" />
                                    </div>
                                    ข้อมูลพื้นฐาน (Basic Information)
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-950 ml-1 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-indigo-500" /> ชื่อบริษัท (เต็ม)
                                        </label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-2xl p-4 text-sm font-black text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300" placeholder="เช่น บริษัท ทีเจซี คอร์ปอเรชั่น จำกัด" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-950 ml-1 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-rose-500" /> สาขา / Branch
                                        </label>
                                        <input type="text" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-2xl p-4 text-sm font-black text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300" placeholder="เช่น สำนักงานใหญ่" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-950 ml-1 flex items-center gap-2">
                                            <Hash className="w-4 h-4 text-amber-500" /> เลขผู้เสียภาษี (Tax ID)
                                        </label>
                                        <input type="text" value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-2xl p-4 text-sm font-black text-slate-900 tabular-nums focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300 tracking-wider" placeholder="0000000000000" />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Address Info - แยกเป็นการ์ดย่อย */}
                            <div className="bg-slate-50/50 p-6 md:p-8 rounded-[2rem] border border-slate-100 space-y-6">
                                <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest flex items-center gap-2.5 pb-4 border-b-2 border-slate-200/60">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                        <Navigation className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    ที่อยู่และที่ตั้ง (Address Details)
                                </h2>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-950 ml-1 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-emerald-600" /> ที่อยู่ (เลขที่ / หมู่ / อาคาร / ถนน)
                                        </label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-2xl p-4 text-sm font-black text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300" placeholder="กรอกรายละเอียดที่อยู่" />
                                    </div>

                                    {/* ปรับจาก 4 คอลัมน์เบียดๆ เป็น 2 คอลัมน์กว้างๆ */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1 flex items-center gap-1.5"><Map className="w-3.5 h-3.5 text-emerald-400" /> ตำบล</label>
                                            <input type="text" placeholder="แขวง/ตำบล" value={formData.subDistrict} onChange={e => setFormData({ ...formData, subDistrict: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-xl p-3.5 text-sm font-black text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> อำเภอ</label>
                                            <input type="text" placeholder="เขต/อำเภอ" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-xl p-3.5 text-sm font-black text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-emerald-600" /> จังหวัด</label>
                                            <input type="text" placeholder="จังหวัด" value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-xl p-3.5 text-sm font-black text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-emerald-700" /> รหัสไปรษณีย์</label>
                                            <input type="text" placeholder="10000" value={formData.zipCode} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-xl p-3.5 text-sm font-black text-slate-900 tabular-nums focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm tracking-widest" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Contact Info - แยกเป็นการ์ดย่อย */}
                            <div className="bg-slate-50/50 p-6 md:p-8 rounded-[2rem] border border-slate-100 space-y-6">
                                <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest flex items-center gap-2.5 pb-4 border-b-2 border-slate-200/60">
                                    <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                                        <Phone className="w-4 h-4 text-violet-600" />
                                    </div>
                                    ข้อมูลติดต่อ (Contact Information)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-950 ml-1 flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-violet-500" /> เบอร์โทรศัพท์
                                        </label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-2xl p-4 text-sm font-black text-slate-900 tabular-nums focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300" placeholder="02-XXX-XXXX" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-950 ml-1 flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-sky-500" /> อีเมลติดต่อ
                                        </label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border-2 border-slate-200/60 rounded-2xl p-4 text-sm font-black text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300" placeholder="contact@company.com" />
                                    </div>
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="pt-8 border-t-2 border-slate-100 flex justify-end">
                                <button
                                    disabled={isSaving}
                                    type="submit"

                                    className="w-full md:w-auto bg-emerald-600 text-white px-14 py-4 rounded-full font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {isSaving ? "SAVING DATA..." : "บันทึกข้อมูลบริษัท"}
                                </button>
                            </div>

                        </div>
                    </div>
                </form>
            </div>
        </AuthGate>
    );
}