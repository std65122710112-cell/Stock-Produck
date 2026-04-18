"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    Users, Plus, Search, Truck, Phone, Mail, MapPin,
    CalendarClock, Database, X, Save, CheckCircle2,
    XCircle, AlertCircle, Eye, Edit3, Building2, Info,
    User, FileText, Briefcase, ChevronRight
} from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

export default function SupplierManagementPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // --- Modal States ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isConfirmEditPopupOpen, setIsConfirmEditPopupOpen] = useState(false);
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

    const handleViewDetail = (supplier) => {
        setSelectedSupplier(supplier);
        setIsDetailModalOpen(true);
    };

    const openEditMode = () => {
        setIsDetailModalOpen(false);
        setIsEditModalOpen(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setSelectedSupplier(prev => ({ ...prev, [name]: value }));
    };

    const preEditSubmit = (e) => {
        e.preventDefault();
        setIsConfirmEditPopupOpen(true);
    };

    const confirmTheSaveAction = async () => {
        setIsConfirmEditPopupOpen(false);
        handleEditSubmit({ preventDefault: () => { } });
    };

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

            toast.success("อัปเดตข้อมูลคู่ค้าเรียบร้อยแล้ว");
            setIsEditModalOpen(false);
            loadSuppliers();
        } catch (error) {
            toast.error(error.message || "ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthGate>
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen ">
                <Toaster position="top-right" />

                {/* 🛡️ Notification Popup */}
                {popup.show && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
                            <div className="flex justify-center mb-6">
                                {popup.type === "success" && <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>}
                                {popup.type === "error" && <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100"><XCircle className="w-8 h-8 text-rose-500" /></div>}
                                {popup.type === "warning" && <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100"><AlertCircle className="w-8 h-8 text-amber-500" /></div>}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{popup.title}</h3>
                            <p className="text-sm text-slate-500 mb-8 leading-relaxed">{popup.message}</p>
                            <button onClick={closePopup} className="w-full py-3.5 bg-[#1F3B8B] hover:bg-blue-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md">รับทราบ</button>
                        </div>
                    </div>
                )}

                {/* 🔍 Detail Modal */}
                {isDetailModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all print:hidden">
                        <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2.5">
                                    <Info className="w-5 h-5 text-[#1F3B8B]" /> ข้อมูลคู่ค้า
                                </h2>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-[#1F3B8B]/10 rounded-2xl flex items-center justify-center text-[#1F3B8B] text-3xl font-black uppercase tabular-nums border border-[#1F3B8B]/20">
                                        {selectedSupplier?.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900 leading-tight">{selectedSupplier?.name}</h3>
                                        <p className="text-xs font-bold text-[#1F3B8B] tracking-widest uppercase mt-2 bg-blue-50 px-3 py-1 rounded-lg w-fit border border-blue-100">
                                            {selectedSupplier?.code}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 text-sm border-t border-slate-100 pt-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3 h-3 text-slate-400" /> ผู้ติดต่อ</p>
                                        <p className="font-bold text-slate-800">{selectedSupplier?.contactName || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3 h-3 text-slate-400" /> เลขผู้เสียภาษี</p>
                                        <p className="font-bold text-slate-800 tabular-nums">{selectedSupplier?.taxId || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> เบอร์โทรศัพท์</p>
                                        <p className="font-bold text-slate-800 tabular-nums">{selectedSupplier?.phone || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /> อีเมลติดต่อ</p>
                                        <p className="font-bold text-slate-800">{selectedSupplier?.email || "-"}</p>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400" /> ที่อยู่จัดส่งเอกสาร</p>
                                        <p className="text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{selectedSupplier?.address || "-"}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <div className="text-center space-y-1.5 border-r border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-center items-center gap-1.5">
                                            <CalendarClock className="w-3.5 h-3.5" /> เครดิตเทอม
                                        </p>
                                        <p className="text-2xl font-black text-slate-900 tabular-nums">{selectedSupplier?.creditDays || 0} <span className="text-sm text-slate-500 font-bold">วัน</span></p>
                                    </div>
                                    <div className="text-center space-y-1.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-center items-center gap-1.5">
                                            <Truck className="w-3.5 h-3.5" /> ระยะจัดส่ง
                                        </p>
                                        <p className="text-2xl font-black text-slate-900 tabular-nums">{selectedSupplier?.avgLeadTime || 0} <span className="text-sm text-slate-500 font-bold">วัน</span></p>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button onClick={() => setIsDetailModalOpen(false)} className="flex-1 py-3.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl uppercase tracking-widest hover:bg-slate-200 transition-colors">ปิดหน้าต่าง</button>
                                    <button onClick={openEditMode} className="flex-[2] flex items-center justify-center gap-2 bg-[#1F3B8B] text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-blue-900 shadow-md transition-all active:scale-95">
                                        <Edit3 className="w-4 h-4" /> แก้ไขข้อมูลคู่ค้า
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🛠️ Edit Modal */}
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
                        <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2.5">
                                    <Edit3 className="w-5 h-5 text-[#1F3B8B]" /> แก้ไขข้อมูล
                                </h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={preEditSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ชื่อบริษัท *</label>
                                        <input name="name" value={selectedSupplier?.name || ""} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 focus:border-[#1F3B8B] focus:bg-white rounded-xl p-3.5 text-sm font-bold text-slate-900 outline-none transition-colors" required />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">เบอร์โทรศัพท์</label>
                                        <input name="phone" value={selectedSupplier?.phone || ""} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 focus:border-[#1F3B8B] focus:bg-white rounded-xl p-3.5 text-sm font-bold tabular-nums text-slate-900 outline-none transition-colors" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">เครดิต (วัน)</label>
                                        <input type="number" name="creditDays" value={selectedSupplier?.creditDays || 0} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 focus:border-[#1F3B8B] focus:bg-white rounded-xl p-3.5 text-sm font-bold tabular-nums text-slate-900 outline-none transition-colors" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">จัดส่ง (วัน)</label>
                                        <input type="number" name="avgLeadTime" value={selectedSupplier?.avgLeadTime || 0} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 focus:border-[#1F3B8B] focus:bg-white rounded-xl p-3.5 text-sm font-bold tabular-nums text-slate-900 outline-none transition-colors" />
                                    </div>
                                    <div className="md:col-span-2 space-y-2 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ที่อยู่สำนักงาน</label>
                                        <textarea name="address" value={selectedSupplier?.address || ""} onChange={handleEditChange} rows="3" className="w-full bg-slate-50 border border-slate-200 focus:border-[#1F3B8B] focus:bg-white rounded-xl p-3.5 text-sm font-medium text-slate-900 outline-none resize-none transition-colors" />
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-100 flex gap-4">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl uppercase tracking-widest hover:bg-slate-200 transition-colors">ยกเลิก</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50">
                                        <Save className="w-4 h-4" /> ยืนยันแก้ไข
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 🔒 Confirm Edit Popup */}
                {isConfirmEditPopupOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
                            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 mb-6">
                                <AlertCircle className="w-8 h-8 text-[#1F3B8B]" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-2">ยืนยันการแก้ไขข้อมูล</h3>
                            <p className="text-xs text-slate-500 mb-8 leading-relaxed">คุณต้องการบันทึกข้อมูลที่แก้ไขใช่หรือไม่?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsConfirmEditPopupOpen(false)} className="flex-1 bg-slate-50 text-slate-600 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200">ยกเลิก</button>
                                <button onClick={confirmTheSaveAction} disabled={isSubmitting} className="flex-1 bg-[#1F3B8B] text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MAIN PAGE CONTENT --- */}
                
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                            <Briefcase className="w-6 h-6 text-[#1F3B8B]" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                ศูนย์บริหารคู่ค้า (Supplier Management)
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                                <Database className="w-4 h-4 text-emerald-500" />
                                จัดการข้อมูลทะเบียนคู่ค้าและผู้จัดจำหน่าย
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/master/suppliers/create"
                        className="flex items-center justify-center gap-2 bg-[#1F3B8B] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-900 shadow-sm transition-all w-full md:w-auto"
                    >
                        <Plus className="w-4 h-4" /> ลงทะเบียนคู่ค้าใหม่
                    </Link>
                </div>

                {/* SEARCH AND SUMMARY BAR */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 relative w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาคู่ค้าตามรหัส หรือ ชื่อบริษัท..."
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#1F3B8B] rounded-lg outline-none font-bold text-sm text-slate-800 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 rounded-lg border border-slate-200 w-full md:w-auto justify-center">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest tabular-nums">
                            ทั้งหมด {suppliers.length} รายการ
                        </span>
                    </div>
                </div>

                {/* DATA TABLE */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto min-h-[500px]">
                        <table className="min-w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <th className="p-5">รหัสคู่ค้า</th>
                                    <th className="p-5">บริษัท / ร้านค้า</th>
                                    <th className="p-5">ผู้ติดต่อ</th>
                                    <th className="p-5 text-center">เครดิต (วัน)</th>
                                    <th className="p-5 text-right">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase mt-2">Loading Suppliers...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSuppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">ไม่พบข้อมูลคู่ค้า</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSuppliers.map((sup) => (
                                        <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-5 whitespace-nowrap">
                                                <span className="text-sm font-bold text-[#1F3B8B] uppercase tabular-nums">
                                                    {sup.code}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-sm">{sup.name}</span>
                                                    <span className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                                        <Phone className="w-3 h-3" /> {sup.phone || "-"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className="font-medium text-slate-700 text-sm">{sup.contactName || "-"}</span>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className="font-bold text-slate-700 text-sm tabular-nums bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                                                    {sup.creditDays || 0}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right">
                                                <button
                                                    onClick={() => handleViewDetail(sup)}
                                                    className="inline-flex items-center gap-2 bg-white text-[#1F3B8B] border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                                >
                                                    <Eye className="w-4 h-4" /> ข้อมูล
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </AuthGate>
    );
}