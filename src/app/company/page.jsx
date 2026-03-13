"use client";

import React, { useState, useEffect } from 'react';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    Building2, Save, Upload, MapPin, Hash,
    Phone, Mail, Globe, Image as ImageIcon, Loader2, Info
} from "lucide-react";

export default function CompanySettingsPage() {
    const [formData, setFormData] = useState({
        name: '', branch: '', address: '', subDistrict: '',
        district: '', province: '', zipCode: '', taxId: '',
        phone: '', email: '', logoUrl: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

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

    // 💡 3. บันทึกข้อมูล
    const handleSubmit = async (e) => {
        e.preventDefault();
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
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-5xl mx-auto p-4 md:p-10 space-y-8 min-h-screen">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-lg">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Company Profile</h1>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                <Info className="w-3 h-3" /> ข้อมูลที่แสดงในหัวเอกสาร PDF (PR/PO/GR)
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* LEFT COL: LOGO & STATUS */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Company Logo</label>

                            <div className="relative group">
                                <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-4 flex flex-col items-center justify-center bg-slate-50/50 aspect-square overflow-hidden transition-all group-hover:border-indigo-200">
                                    {formData.logoUrl ? (
                                        <img src={formData.logoUrl} className="w-full h-full object-contain mix-blend-multiply" alt="Company Logo" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-300">
                                            <ImageIcon className="w-16 h-16 mb-2" />
                                            <span className="text-[10px] font-black uppercase italic">No Logo Attached</span>
                                        </div>
                                    )}

                                    <label className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white rounded-[1.8rem]">
                                        <Upload className="w-6 h-6 mb-2" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Change Logo</span>
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-50">
                                <p className="text-[10px] text-slate-400 font-bold italic text-center uppercase">แนะนำ: ใช้รูปพื้นหลังโปร่งใส (PNG)</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: FORM DATA */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">

                            {/* Basic Info */}
                            <div className="space-y-6">
                                <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> ข้อมูลพื้นฐานบริษัท
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">ชื่อบริษัท (เต็ม)</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 focus:bg-indigo-50/10 outline-none transition-all" placeholder="เช่น บริษัท ทีเจซี คอร์ปอเรชั่น จำกัด" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">สาขา / Branch</label>
                                        <input type="text" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none" placeholder="เช่น สำนักงานใหญ่" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest"><Hash className="w-3 h-3 inline mr-1" /> เลขผู้เสียภาษี (Tax ID)</label>
                                        <input type="text" value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-mono font-black focus:border-indigo-500 outline-none" placeholder="0000000000000" />
                                    </div>
                                </div>
                            </div>

                            {/* Address Info */}
                            <div className="space-y-6 pt-6 border-t border-slate-50">
                                <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.25em] flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> ที่อยู่และที่ตั้ง
                                </h2>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">ที่อยู่ (เลขที่ / หมู่ / อาคาร / ถนน)</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <input type="text" placeholder="ตำบล" value={formData.subDistrict} onChange={e => setFormData({ ...formData, subDistrict: e.target.value })} className="border-2 border-slate-100 rounded-xl p-3 text-xs font-bold focus:border-indigo-500 outline-none" />
                                        <input type="text" placeholder="อำเภอ" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} className="border-2 border-slate-100 rounded-xl p-3 text-xs font-bold focus:border-indigo-500 outline-none" />
                                        <input type="text" placeholder="จังหวัด" value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} className="border-2 border-slate-100 rounded-xl p-3 text-xs font-bold focus:border-indigo-500 outline-none" />
                                        <input type="text" placeholder="รหัสไปรษณีย์" value={formData.zipCode} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} className="border-2 border-slate-100 rounded-xl p-3 text-xs font-black focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-6 pt-6 border-t border-slate-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1"><Phone className="w-3 h-3" /> เบอร์โทรศัพท์</label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1"><Mail className="w-3 h-3" /> อีเมลติดต่อ</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-10 flex justify-end">
                                <button
                                    disabled={isSaving}
                                    type="submit"
                                    className="w-full md:w-auto bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-600 shadow-2xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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