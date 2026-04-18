"use client";

import React, { useState, useEffect } from 'react';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    Building2, Save, Upload, MapPin, Hash,
    Phone, Mail, Globe, Image as ImageIcon, Loader2, Info,
    CheckCircle2, AlertTriangle, Map, Navigation, Settings
} from "lucide-react";

export default function CompanySettingsPage() {
    const [formData, setFormData] = useState({
        name: '', branch: '', address: '', subDistrict: '',
        district: '', province: '', zipCode: '', taxId: '',
        phone: '', email: '', logoUrl: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const data = await apiFetch("/api/settings/company");
                if (data) setFormData(data);
            } catch (error) {
                toast.error("ไม่สามารถโหลดข้อมูลบริษัทได้");
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) return toast.error("ขนาดไฟล์โลโก้ต้องไม่เกิน 2MB");
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, logoUrl: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const handlePreSubmit = (e) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

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

    if (isLoading) return <SystemLoader />;

    return (
        <AuthGate>
            <Toaster position="top-right" />

            {/* --- CONFIRMATION MODAL --- */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 border border-amber-100">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">ยืนยันการบันทึกข้อมูล?</h3>
                        <p className="text-xs font-bold text-slate-500 mb-8 leading-relaxed">
                            ข้อมูลนี้จะถูกนำไปใช้ในหัวเอกสาร PDF (PR/PO/GR/DO/TF) ทั้งหมดในระบบ โปรดตรวจสอบความถูกต้องก่อนยืนยัน
                        </p>
                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 bg-slate-50 text-slate-600 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={executeSave}
                                className="flex-1 bg-[#1F3B8B] text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" /> ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* พื้นหลังเทาอ่อนเพื่อให้ Content ขาวเด่นขึ้น */}
            <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
                
                <div className="max-w-[1400px] mx-auto space-y-8">
                    
                    {/* --- HEADER SECTION --- */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white text-[#1F3B8B] rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                                <Settings className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                    ตั้งค่าข้อมูลบริษัท (Company Profile)
                                </h1>
                                <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    จัดการข้อมูลและโลโก้เพื่อใช้สำหรับออกเอกสารภายในระบบ
                                </p>
                            </div>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-widest shadow-sm">
                            <Info className="w-4 h-4 text-[#1F3B8B]" /> Configuration Mode
                        </div>
                    </div>

                    <form onSubmit={handlePreSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                        {/* --- LEFT COL: LOGO UPLOAD --- */}
                        <div className="xl:col-span-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm sticky top-8">
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2.5 mb-6 border-b border-slate-100 pb-4">
                                <ImageIcon className="w-5 h-5 text-[#1F3B8B]" /> โลโก้บริษัท (Company Logo)
                            </h2>

                            <div className="relative group w-full aspect-square max-w-[280px] mx-auto">
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 w-full h-full overflow-hidden transition-all group-hover:border-[#1F3B8B] group-hover:bg-blue-50/30">
                                    {formData.logoUrl ? (
                                        <img src={formData.logoUrl} className="w-full h-full object-contain mix-blend-multiply" alt="Company Logo" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-300">
                                            <Building2 className="w-16 h-16 mb-4 opacity-40" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ยังไม่มีรูปโลโก้</span>
                                        </div>
                                    )}

                                    <label className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white rounded-2xl backdrop-blur-sm">
                                        <Upload className="w-8 h-8 mb-3 text-white animate-bounce" />
                                        <span className="text-xs font-bold uppercase tracking-widest">อัปโหลดรูปภาพ</span>
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 text-center border-t border-slate-100 pt-6">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" /> แนะนำ: PNG โปร่งใส ขนาดไม่เกิน 2MB
                                </p>
                            </div>
                        </div>

                        {/* --- RIGHT COL: FORM DATA --- */}
                        <div className="xl:col-span-8 space-y-8">
                            
                            {/* 1. Basic Info */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                    <Building2 className="w-5 h-5 text-[#1F3B8B]" /> ข้อมูลพื้นฐานองค์กร (General Information)
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <FormInput 
                                            label="ชื่อบริษัท (Company Name)" 
                                            icon={<Building2 size={16} className="text-slate-400" />}
                                            value={formData.name} 
                                            onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                            placeholder="เช่น บริษัท ทีเจซี คอร์ปอเรชั่น จำกัด" 
                                            required
                                        />
                                    </div>
                                    <FormInput 
                                        label="สาขา (Branch)" 
                                        icon={<MapPin size={16} className="text-slate-400" />}
                                        value={formData.branch} 
                                        onChange={e => setFormData({ ...formData, branch: e.target.value })} 
                                        placeholder="เช่น สำนักงานใหญ่" 
                                    />
                                    <FormInput 
                                        label="เลขประจำตัวผู้เสียภาษี (Tax ID)" 
                                        icon={<Hash size={16} className="text-slate-400" />}
                                        value={formData.taxId} 
                                        onChange={e => setFormData({ ...formData, taxId: e.target.value })} 
                                        placeholder="0000000000000" 
                                        isTabular
                                    />
                                </div>
                            </div>

                            {/* 2. Address Info */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                    <Navigation className="w-5 h-5 text-[#1F3B8B]" /> ที่อยู่และที่ตั้ง (Address Details)
                                </h2>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> รายละเอียดที่อยู่ (เลขที่ / หมู่ / อาคาร / ถนน)
                                        </label>
                                        <textarea 
                                            value={formData.address} 
                                            onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                            className="w-full border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-900 focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] outline-none transition-all placeholder:text-slate-300 resize-none h-24 bg-slate-50 focus:bg-white" 
                                            placeholder="กรอกรายละเอียดที่อยู่" 
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormInput label="ตำบล / แขวง" icon={<Map size={16} className="text-slate-400" />} value={formData.subDistrict} onChange={e => setFormData({ ...formData, subDistrict: e.target.value })} placeholder="ระบุตำบล" />
                                        <FormInput label="อำเภอ / เขต" icon={<MapPin size={16} className="text-slate-400" />} value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} placeholder="ระบุอำเภอ" />
                                        <FormInput label="จังหวัด" icon={<Globe size={16} className="text-slate-400" />} value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} placeholder="ระบุจังหวัด" />
                                        <FormInput label="รหัสไปรษณีย์" icon={<Hash size={16} className="text-slate-400" />} value={formData.zipCode} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} placeholder="10000" isTabular />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Contact Info */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                    <Phone className="w-5 h-5 text-[#1F3B8B]" /> ข้อมูลติดต่อ (Contact Information)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormInput label="เบอร์โทรศัพท์" icon={<Phone size={16} className="text-slate-400" />} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="02-XXX-XXXX" isTabular />
                                    <FormInput label="อีเมลติดต่อ" icon={<Mail size={16} className="text-slate-400" />} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contact@company.com" type="email" />
                                </div>
                            </div>

                            {/* --- ACTION BUTTON --- */}
                            <div className="flex justify-end pt-4">
                                <button
                                    disabled={isSaving}
                                    type="submit"
                                    className="w-full md:w-auto bg-[#1F3B8B] text-white px-10 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-blue-900 shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {isSaving ? "Saving Configuration..." : "บันทึกการตั้งค่าระบบ"}
                                </button>
                            </div>

                        </div>
                    </form>
                </div>
            </div>
        </AuthGate>
    );
}

// --- SUB-COMPONENT ---
function FormInput({ label, value, onChange, placeholder, type = "text", icon, isTabular = false, required = false }) {
    return (
        <div className="space-y-2 relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    {icon}
                </div>
                <input 
                    type={type} 
                    value={value} 
                    onChange={onChange} 
                    required={required}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-slate-900 focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:font-medium ${isTabular ? 'tabular-nums tracking-wider' : ''}`} 
                    placeholder={placeholder} 
                />
            </div>
        </div>
    );
}

function SystemLoader() {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] animate-pulse">Loading Company Configuration...</p>
        </div>
    );
}