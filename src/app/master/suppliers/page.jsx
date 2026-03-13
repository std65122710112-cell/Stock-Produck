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
    Info
} from "lucide-react";
import Link from "next/link";

export default function SupplierManagementPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // --- สถานะ Modal ต่างๆ ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
                    <div className="bg-white w-full max-w-xs rounded-xl border border-slate-200 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in duration-150">
                        <div className="flex justify-center">
                            {popup.type === "success" && <CheckCircle2 className="w-10 h-10 text-emerald-500" />}
                            {popup.type === "error" && <XCircle className="w-10 h-10 text-rose-500" />}
                            {popup.type === "warning" && <AlertCircle className="w-10 h-10 text-amber-500" />}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-slate-900">{popup.title}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{popup.message}</p>
                        </div>
                        <button onClick={closePopup} className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase transition-all shadow-md">ตกลง</button>
                    </div>
                </div>
            )}

            {/* 🔍 ป๊อปอัพแสดงรายละเอียด (Detail View) */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
                    <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Info className="w-4 h-4 text-indigo-500" /> รายละเอียดข้อมูลคู่ค้า</h2>
                            <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-2xl font-black">{selectedSupplier?.name.charAt(0)}</div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 leading-none">{selectedSupplier?.name}</h3>
                                    <p className="text-[10px] font-bold text-indigo-600 font-mono tracking-widest uppercase mt-2">{selectedSupplier?.code}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-6 text-sm border-t border-slate-50 pt-8">
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ผู้ติดต่อ</p>
                                    <p className="font-bold text-slate-800">{selectedSupplier?.contactName || "-"}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขผู้เสียภาษี</p>
                                    <p className="font-mono font-bold text-slate-800">{selectedSupplier?.taxId || "-"}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เบอร์โทรศัพท์</p>
                                    <p className="font-bold text-slate-800">{selectedSupplier?.phone || "-"}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">อีเมลติดต่อ</p>
                                    <p className="font-bold text-slate-800">{selectedSupplier?.email || "-"}</p>
                                </div>
                                <div className="col-span-2 space-y-1 text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ที่อยู่จัดส่งเอกสาร</p>
                                    <p className="text-slate-600 font-medium leading-relaxed">{selectedSupplier?.address || "-"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                <div className="text-center space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">เครดิตเทอม</p>
                                    <p className="text-xl font-black text-slate-900 font-mono">{selectedSupplier?.creditDays || 0} วัน</p>
                                </div>
                                <div className="text-center space-y-1 border-l border-slate-200">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ระยะจัดส่ง</p>
                                    <p className="text-xl font-black text-slate-900 font-mono">{selectedSupplier?.avgLeadTime || 0} วัน</p>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button onClick={() => setIsDetailModalOpen(false)} className="flex-1 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">ปิดหน้าต่าง</button>
                                <button onClick={openEditMode} className="flex-[2] bg-slate-900 hover:bg-indigo-600 text-white rounded-xl py-3 text-xs font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2">
                                    <Edit3 className="w-4 h-4" /> แก้ไขข้อมูลคู่ค้า
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛠️ ป๊อปอัพแก้ไข (Edit Modal) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
                    <div className="bg-white w-full max-w-lg rounded-xl border border-slate-200 shadow-2xl overflow-hidden relative">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-900 uppercase">แก้ไขข้อมูล</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ชื่อบริษัท *</label>
                                    <input name="name" value={selectedSupplier?.name || ""} onChange={handleEditChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold focus:border-indigo-500 outline-none" required />
                                </div>
                                <div className="space-y-1 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">เบอร์โทรศัพท์</label>
                                    <input name="phone" value={selectedSupplier?.phone || ""} onChange={handleEditChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="space-y-1 text-left">
                                    <label className="text-[10px] font-black text-indigo-600 uppercase ml-1">เครดิต (วัน)</label>
                                    <input type="number" name="creditDays" value={selectedSupplier?.creditDays || 0} onChange={handleEditChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-mono font-bold outline-none" />
                                </div>
                                <div className="space-y-1 text-left">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase ml-1">จัดส่ง (วัน)</label>
                                    <input type="number" name="avgLeadTime" value={selectedSupplier?.avgLeadTime || 0} onChange={handleEditChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-mono font-bold outline-none" />
                                </div>
                                <div className="md:col-span-2 space-y-1 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ที่อยู่สำนักงาน</label>
                                    <textarea name="address" value={selectedSupplier?.address || ""} onChange={handleEditChange} rows="2" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-indigo-500 outline-none resize-none" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 text-xs font-bold text-slate-400 uppercase hover:text-slate-600">ยกเลิก</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 text-white rounded-lg py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                    {isSubmitting ? "กำลังบันทึก..." : <><Save className="w-4 h-4" /> ยืนยันแก้ไข</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- หน้าจอหลัก (Table View) --- */}
            <div className="max-w-350 mx-auto h-200 max-h-250 space-y-6 pb-10">
                <div className="flex justify-between items-end border-b border-slate-100 pb-8">
                    <div className="text-left space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">ศูนย์บริหารคู่ค้า</h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Database className="w-3.5 h-3.5" /> TJC Supply Chain Standard Registry</p>
                    </div>
                    <Link href="/master/suppliers/create" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-slate-900 transition-all flex items-center gap-2 shadow-xl shadow-indigo-100">
                        <Plus className="w-4 h-4" /> ลงทะเบียนคู่ค้าใหม่
                    </Link>
                </div>

                {/* ส่วนค้นหา */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                        <input type="text" placeholder="ค้นหาคู่ค้าตามรหัส หรือ ชื่อบริษัท..." className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-lg outline-none font-bold text-sm text-left transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-600 tabular-nums">{suppliers.length} ทั้งหมด</span>
                    </div>
                </div>

                {/* ตารางข้อมูลที่สะอาดตา */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                    <th className="px-6 py-4">รหัส</th>
                                    <th className="px-6 py-4">บริษัท / ร้านค้า</th>
                                    <th className="px-6 py-4">ผู้ติดต่อ</th>
                                    <th className="px-6 py-4 text-center">เครดิต (วัน)</th>
                                    <th className="px-6 py-4 text-right">รายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="5" className="py-20 text-center"><div className="w-8 h-8 border-2 border-t-indigo-600 rounded-full animate-spin mx-auto"></div></td></tr>
                                ) : filteredSuppliers.map((sup) => (
                                    <tr key={sup.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-bold text-indigo-500 text-xs">{sup.code}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{sup.name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sup.phone || "-"}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{sup.contactName || "-"}</td>
                                        <td className="px-6 py-4 text-center font-mono font-black text-slate-700">{sup.creditDays || 0}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewDetail(sup)}
                                                className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> ดูข้อมูล
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filteredSuppliers.length === 0 && (
                                    <tr><td colSpan="5" className="py-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.2em]">Data Not Found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-3 py-10 opacity-30">
                    <ShieldCheck className="w-4 h-4 text-slate-900" />
                    <span className="text-[9px] text-slate-900 font-black uppercase tracking-[0.4em]">TJC CORE MASTER DATA SYNC</span>
                </div>
            </div>
        </AuthGate>
    );
}