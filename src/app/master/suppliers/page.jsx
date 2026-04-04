"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    Users,
    Plus,
    Search,
    Truck,
    Phone,
    Mail,
    MapPin,
    Clock,
    ShieldCheck,
    Database,
    CreditCard,
    X,
    Save,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Eye,
    Edit3,
    Building2,
    Info,
    User,
    FileText,
    CalendarClock
} from "lucide-react";
import Link from "next/link";

export default function SupplierManagementPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // --- สถานะ Modal ต่างๆ ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isConfirmEditPopupOpen, setIsConfirmEditPopupOpen] = useState(false); // 🔒 สถานะ Popup ยืนยันซ้ำ
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [popup, setPopup] = useState({ show: false, type: "success", title: "", message: "", onConfirm: null });

    const showNotify = (type, title, message, onConfirm = null) => {
        setPopup({ show: true, type, title, message, onConfirm });
    };

    const closePopup = () => {
        const callback = popup.onConfirm;
        setPopup(prev => ({ ...prev, show: false }));
        if (callback) callback();
    };

    const loadSuppliers = async () => {
        try {
            const data = await apiFetch("/master/suppliers").catch(() => []);
            setSuppliers(Array.isArray(data) ? data : []);
        } catch (e) {
            showNotify("error", "ดึงข้อมูลไม่สำเร็จ", "ไม่สามารถเชื่อมต่อฐานข้อมูลคู่ค้าได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadSuppliers(); }, []);

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [suppliers, searchTerm]);

    // --- Action Handlers ---
    const handleViewDetail = (supplier) => {
        setSelectedSupplier(supplier);
        setIsDetailModalOpen(true);
    };

    const openEditMode = () => {
        setIsDetailModalOpen(false); // ปิดหน้าดูรายละเอียด
        setIsEditModalOpen(true);   // เปิดหน้าแก้ไข
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setSelectedSupplier(prev => ({ ...prev, [name]: value }));
    };

    // 🔒 ฟังก์ชันดักจับก่อน Submit จริง เพื่อเปิดหน้าต่างยืนยัน
    const preEditSubmit = (e) => {
        e.preventDefault(); // หยุดการส่งฟอร์มทันที
        setIsConfirmEditPopupOpen(true); // เปิดหน้าต่างยืนยัน
    };

    // 🔒 ฟังก์ชันสั่ง Submit หลัก (ทำงานหลังจากกดยืนยันใน Popup ที่สอง)
    const confirmTheSaveAction = async () => {
        setIsConfirmEditPopupOpen(false);
        // สร้าง Event จำลองเพื่อไม่ให้กระทบลอจิกเดิมที่ต้องการ e.preventDefault()
        handleEditSubmit({ preventDefault: () => { } });
    };

    // ลอจิกการบันทึกข้อมูลเดิม 100%
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                name: selectedSupplier.name?.trim(),
                taxId: selectedSupplier.taxId?.trim(),
                contactName: selectedSupplier.contactName?.trim(),
                phone: selectedSupplier.phone?.trim(),
                email: selectedSupplier.email?.trim(),
                address: selectedSupplier.address?.trim(),
                creditDays: Number(selectedSupplier.creditDays),
                avgLeadTime: Number(selectedSupplier.avgLeadTime)
            };

            await apiFetch(`/master/suppliers/${selectedSupplier.id}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            showNotify("success", "แก้ไขสำเร็จ", "อัปเดตข้อมูลคู่ค้าเรียบร้อยแล้ว", () => {
                setIsEditModalOpen(false);
                loadSuppliers();
            });
        } catch (error) {
            showNotify("error", "เกิดข้อผิดพลาด", error.message || "ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthGate>
            {/* 🛡️ ป๊อปอัพแจ้งเตือน (Notification) */}
            {popup.show && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
                    <div className="bg-white w-full max-w-xs rounded-2xl border border-slate-200 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in duration-150">
                        <div className="flex justify-center">
                            {popup.type === "success" && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
                            {popup.type === "error" && <XCircle className="w-12 h-12 text-rose-500" />}
                            {popup.type === "warning" && <AlertCircle className="w-12 h-12 text-amber-500" />}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-slate-900">{popup.title}</h3>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">{popup.message}</p>
                        </div>
                        <button onClick={closePopup} className="w-full py-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md">ตกลง</button>
                    </div>
                </div>
            )}

            {/* 🔍 ป๊อปอัพแสดงรายละเอียด (Detail View) */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all print:hidden">
                    <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-base font-black text-slate-950 uppercase tracking-widest flex items-center gap-2.5">
                                <Info className="w-5 h-5 text-indigo-500" /> รายละเอียดข้อมูลคู่ค้า
                            </h2>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 bg-white rounded-full shadow-sm border border-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg uppercase tabular-nums">{selectedSupplier?.name.charAt(0)}</div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedSupplier?.name}</h3>
                                    <p className="text-xs font-black text-indigo-600 font-mono tracking-widest uppercase mt-2 bg-indigo-50 px-3 py-1 rounded-lg w-fit border border-indigo-100">{selectedSupplier?.code}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-6 text-base border-t border-slate-100 pt-8">
                                <div className="space-y-1 text-left">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <User className="w-3.5 h-3.5 text-sky-500" /> ผู้ติดต่อ
                                    </p>
                                    <p className="font-bold text-slate-800">{selectedSupplier?.contactName || "-"}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <FileText className="w-3.5 h-3.5 text-emerald-500" /> เลขผู้เสียภาษี
                                    </p>
                                    <p className="font-mono font-bold text-slate-800 tabular-nums">{selectedSupplier?.taxId || "-"}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <Phone className="w-3.5 h-3.5 text-indigo-500" /> เบอร์โทรศัพท์
                                    </p>
                                    <p className="font-bold text-slate-800 tabular-nums">{selectedSupplier?.phone || "-"}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <Mail className="w-3.5 h-3.5 text-rose-500" /> อีเมลติดต่อ
                                    </p>
                                    <p className="font-bold text-slate-800">{selectedSupplier?.email || "-"}</p>
                                </div>
                                <div className="col-span-2 space-y-1 text-left">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <MapPin className="w-3.5 h-3.5 text-amber-500" /> ที่อยู่จัดส่งเอกสาร
                                    </p>
                                    <p className="text-slate-600 font-bold leading-relaxed">{selectedSupplier?.address || "-"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="text-center space-y-1.5">
                                    <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                        <CalendarClock className="w-3.5 h-3.5 text-indigo-500" /> เครดิตเทอม
                                    </p>
                                    <p className="text-2xl font-black text-slate-900 font-mono tabular-nums">{selectedSupplier?.creditDays || 0} วัน</p>
                                </div>
                                <div className="text-center space-y-1.5 border-l border-slate-200 pl-4">
                                    <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                        <Truck className="w-3.5 h-3.5 text-emerald-500" /> ระยะจัดส่ง
                                    </p>
                                    <p className="text-2xl font-black text-slate-900 font-mono tabular-nums">{selectedSupplier?.avgLeadTime || 0} วัน</p>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="flex-1 py-3.5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-800 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors active:scale-95"
                                >
                                    ปิดหน้าต่าง
                                </button>
                                <button
                                    onClick={openEditMode}
                                    className="flex-[2] inline-flex items-center justify-center gap-2.5 bg-white text-slate-700 border-2 border-slate-200 rounded-xl py-3.5 text-sm font-black uppercase tracking-widest transition-all shadow-sm hover:bg-sky-600 hover:text-white hover:border-sky-600 hover:shadow-lg active:scale-95"
                                >
                                    <Edit3 className="w-5 h-5 opacity-70" /> แก้ไขข้อมูลคู่ค้า
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛠️ ป๊อปอัพแก้ไข (Edit Modal) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
                    <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-base font-black text-slate-950 uppercase tracking-widest flex items-center gap-2.5">
                                <Edit3 className="w-5 h-5 text-sky-600" /> แก้ไขข้อมูล
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 bg-white rounded-full shadow-sm border border-slate-100 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {/* 🔒 เปลี่ยนมาเรียก preEditSubmit แทน handleEditSubmit เพื่อเด้ง Popup ยืนยัน */}
                        <form onSubmit={preEditSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5 text-left">
                                    <label className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <Building2 className="w-3.5 h-3.5 text-sky-500" /> ชื่อบริษัท *
                                    </label>
                                    <input name="name" value={selectedSupplier?.name || ""} onChange={handleEditChange} className="w-full border-2 border-slate-200 focus:border-sky-500 rounded-xl p-3.5 text-base font-bold text-slate-900 outline-none transition-colors" required />
                                </div>
                                <div className="space-y-1.5 text-left">
                                    <label className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <Phone className="w-3.5 h-3.5 text-indigo-500" /> เบอร์โทรศัพท์
                                    </label>
                                    <input name="phone" value={selectedSupplier?.phone || ""} onChange={handleEditChange} className="w-full border-2 border-slate-200 focus:border-indigo-500 rounded-xl p-3.5 text-base font-bold tabular-nums text-slate-900 outline-none transition-colors" />
                                </div>
                                <div className="space-y-1.5 text-left">
                                    <label className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <CalendarClock className="w-3.5 h-3.5 text-indigo-500" /> เครดิต (วัน)
                                    </label>
                                    <input type="number" name="creditDays" value={selectedSupplier?.creditDays || 0} onChange={handleEditChange} className="w-full border-2 border-slate-200 focus:border-indigo-500 rounded-xl p-3.5 text-base font-mono font-black tabular-nums text-slate-900 outline-none transition-colors" />
                                </div>
                                <div className="space-y-1.5 text-left">
                                    <label className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <Truck className="w-3.5 h-3.5 text-emerald-500" /> จัดส่ง (วัน)
                                    </label>
                                    <input type="number" name="avgLeadTime" value={selectedSupplier?.avgLeadTime || 0} onChange={handleEditChange} className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl p-3.5 text-base font-mono font-black tabular-nums text-slate-900 outline-none transition-colors" />
                                </div>
                                <div className="md:col-span-2 space-y-1.5 text-left">
                                    <label className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <MapPin className="w-3.5 h-3.5 text-amber-500" /> ที่อยู่สำนักงาน
                                    </label>
                                    <textarea name="address" value={selectedSupplier?.address || ""} onChange={handleEditChange} rows="3" className="w-full border-2 border-slate-200 focus:border-amber-500 rounded-xl p-3.5 text-base font-bold text-slate-900 outline-none resize-none transition-colors" />
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-100 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3.5 text-sm font-black text-slate-500 bg-slate-100 rounded-xl uppercase tracking-widest transition-colors hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-900/10 transition-all disabled:opacity-70 active:scale-95"
                                >
                                    <Save className="w-5 h-5 opacity-70" /> ยืนยันแก้ไข
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🔒 1. ป๊อปอัพยืนยันการแก้ไขข้อมูล (Double Confirmation Popup) */}
            {isConfirmEditPopupOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all print:hidden">
                    <div className="bg-white rounded-3xl border-4 border-slate-100 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.3)] p-10 max-w-sm w-full text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:hidden">

                        <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none rotate-12 text-slate-900">
                            <CheckCircle2 className="w-32 h-32" />
                        </div>

                        <div className="mx-auto w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center border-4 border-emerald-100 shadow-inner">
                            <AlertCircle className="w-12 h-12 text-emerald-600 animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">ระบบจัดการข้อมูลคู่ค้า</p>
                            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-tight">ยืนยันการแก้ไขข้อมูล</h2>
                            <p className="text-sm font-bold text-slate-600 leading-relaxed italic px-4">คุณต้องการบันทึกข้อมูลที่แก้ไขใช่หรือไม่?</p>
                        </div>

                        <div className="pt-6 grid grid-cols-2 gap-4 relative z-10">
                            <button
                                type="button"
                                onClick={() => setIsConfirmEditPopupOpen(false)}
                                className="py-4 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 rounded-2xl hover:bg-slate-200 hover:text-slate-800 transition-colors active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={confirmTheSaveAction}
                                disabled={isSubmitting}
                                className="bg-slate-950 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest shadow-2xl transition-all hover:bg-emerald-600 disabled:opacity-70 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" /> {isSubmitting ? "กำลังบันทึก..." : "ยืนยัน"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- หน้าจอหลัก (Table View) ปรับโครงสร้างครอบด้วย Layout ของธีม --- */}
            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-slate-950 tracking-tight flex items-center gap-3 uppercase">
                            ศูนย์บริหารคู่ค้า
                        </h1>
                    </div>
                    <Link
                        href="/master/suppliers/create"
                        className="group flex items-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-xl shadow-slate-200 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        ลงทะเบียนคู่ค้าใหม่
                    </Link>
                </div>

                {/* SEARCH AND SUMMARY BAR */}
                <div className="flex flex-col md:flex-row items-center gap-4 px-2">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="ค้นหาคู่ค้าตามรหัส หรือ ชื่อบริษัท..."
                            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-2xl outline-none font-bold text-base text-slate-800 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-indigo-50 px-6 py-3.5 rounded-2xl border-2 border-indigo-200 shadow-sm whitespace-nowrap">
                        <Users className="w-5 h-5 text-indigo-500" />
                        {/* เพิ่ม tabular-nums เพื่อให้ตัวเลขกลมสวย จัดเรียงเป๊ะ และไม่มีขีดทับเลข 0 */}
                        <span className="text-sm font-black text-slate-900 uppercase tracking-wide tabular-nums">
                            {suppliers.length} ทั้งหมด
                        </span>
                    </div>
                </div>

                {/* DATA TABLE CONTAINER */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-900 font-black text-base tracking-wide">
                                    <th className="p-6">รหัส</th>
                                    <th className="p-6">บริษัท / ร้านค้า</th>
                                    <th className="p-6">ผู้ติดต่อ</th>
                                    <th className="p-6 text-center">เครดิต (วัน)</th>
                                    <th className="p-6 text-center">รายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black tracking-wide text-sm mt-2">กำลังโหลดข้อมูล...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSuppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-32 text-center">
                                            <Database className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-500 font-black tracking-wide text-base">Data Not Found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSuppliers.map((sup) => (
                                        <tr key={sup.id} className="hover:bg-slate-50/80 group cursor-default transition-colors">
                                            <td className="p-6 whitespace-nowrap">
                                                {/* เอา font-mono ออก เพื่อให้เลข 0 กลมเกลี้ยงไม่มีขีดทับ แต่ยังคง tabular-nums ไว้ */}
                                                <div className="text-lg font-black text-blue-800 uppercase tabular-nums flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                    {sup.code}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 text-lg">{sup.name}</span>
                                                    <span className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                                        <Phone className="w-4 h-4" /> {sup.phone || "-"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-bold text-slate-700 text-base">{sup.contactName || "-"}</span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className="font-black text-slate-800 text-lg tabular-nums bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                                    {sup.creditDays || 0}
                                                </span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex justify-center w-full">
                                                    <button
                                                        onClick={() => handleViewDetail(sup)}
                                                        className="inline-flex items-center gap-2 bg-white text-slate-700 border-2 border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm hover:bg-[#1e3b8a] hover:text-white hover:border-[#1e3b8a] hover:shadow-md hover:shadow-blue-900/20 active:scale-95"
                                                    >
                                                        <Eye className="w-4 h-4" /> ดูข้อมูล
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AuthGate>
    );
}