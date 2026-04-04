"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    ClipboardList,
    Plus,
    History,
    User,
    Hash,
    AlertTriangle,
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Truck,
    ChevronRight,
    Search,
    Package,
    Database
} from "lucide-react";

export default function StockRequisitionListPage() {
    const [requisitions, setRequisitions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchRequisitions() {
            try {
                const res = await apiFetch("/outbound/requisitions");
                setRequisitions(Array.isArray(res) ? res : []);
            } catch (error) {
                toast.error("ไม่สามารถโหลดรายการใบเบิกได้");
            } finally {
                setIsLoading(false);
            }
        }
        fetchRequisitions();
    }, []);

    const getStatusBadge = (status) => {
        // ปรับขนาดฟอนต์จาก text-[9px] เป็น text-xs
        const baseClass = "px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm flex items-center gap-1.5 w-fit mx-auto";
        switch (status) {
            case 'PENDING':
                return <span className={`${baseClass} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-4 h-4" /> รออนุมัติ</span>;
            case 'APPROVED':
                return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-4 h-4" /> อนุมัติแล้ว</span>;
            case 'REJECTED':
                return <span className={`${baseClass} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-4 h-4" /> ไม่อนุมัติ</span>;
            case 'DISPATCHED':
                return <span className={`${baseClass} bg-indigo-50 text-indigo-600 border-indigo-100`}><Truck className="w-4 h-4" /> จ่ายของแล้ว</span>;
            default:
                return <span className={`${baseClass} bg-slate-50 text-slate-500 border-slate-200`}>{status}</span>;
        }
    };

    const getPriorityBadge = (priority) => {
        // ปรับขนาดฟอนต์จาก text-[10px] เป็น text-xs
        if (priority === 'URGENT') return <span className="flex items-center gap-1.5 text-rose-600 font-black text-xs tracking-tight uppercase bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100"><AlertTriangle className="w-4 h-4" /> ด่วนมาก (URGENT)</span>;
        if (priority === 'HIGH') return <span className="flex items-center gap-1.5 text-amber-600 font-black text-xs tracking-tight uppercase bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100"><Clock className="w-4 h-4" /> ด่วน (HIGH)</span>;
        return <span className="flex items-center gap-1.5 text-emerald-600 font-black text-xs tracking-tight uppercase bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100"><CheckCircle2 className="w-4 h-4" /> ปกติ (NORMAL)</span>;
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-2">
                        {/* ปรับฟอนต์ให้ใหญ่ขึ้นและแปลเป็นไทย */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-wider w-fit">
                            <Truck className="w-4 h-4" /> ระบบคลังสินค้าขาออก (Inventory Outbound)
                        </div>
                        {/* ปรับขนาดหัวข้อเป็น text-5xl และสีเป็น text-slate-950 (สีเข้มสุด) */}
                        <h1 className="text-5xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                            รายการใบขอเบิก (SR)
                        </h1>
                        <p className="text-slate-600 text-base font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 text-slate-400" />
                            รายการประวัติใบขอเบิกพัสดุ (Requisition Queue)
                        </p>
                    </div>
                    <Link
                        href="/inventory/requisition/create"
                        className="group flex items-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-xl shadow-slate-200 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        สร้างใบขอเบิกใหม่
                    </Link>
                </div>

                {/* STATUS SUMMARY BAR (Static) */}
                <div className="flex items-center gap-4 px-2">
                    {/* กล่องที่ 1: สีพาสเทลม่วงอมน้ำเงิน (Indigo) */}
                    <div className="flex items-center gap-2 bg-indigo-50 px-5 py-2.5 rounded-2xl border-2 border-indigo-200 shadow-sm">
                        <History className="w-5 h-5 text-indigo-500" />
                        {/* เปลี่ยน text-slate-700 เป็น text-slate-900 (สีเข้ม) */}
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            รายการที่รอประมวลผล: {requisitions.length} รายการ
                        </span>
                    </div>

                    {/* กล่องที่ 2: สีพาสเทลเขียว (Emerald) */}
                    <div className="flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-2xl border-2 border-emerald-200 shadow-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        {/* เปลี่ยน text-slate-600 เป็น text-slate-900 (สีเข้ม) */}
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            เฉพาะผู้ที่มีสิทธิ์เข้าถึงข้อมูลเท่านั้น
                        </span>
                    </div>
                </div>

                {/* DATA TABLE CONTAINER (Performance Optimized) */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-900 font-black text-sm tracking-wide">
                                    <th className="p-6">วันที่ขอเบิก</th>
                                    <th className="p-6">เลขที่เอกสาร (SR)</th>
                                    <th className="p-6">วัตถุประสงค์ / โครงการ</th>
                                    <th className="p-6">ผู้ขอเบิก / แผนก</th>
                                    <th className="p-6 text-center">ความเร่งด่วน</th>
                                    <th className="p-6 text-center">สถานะการอนุมัติ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black tracking-wide text-sm mt-2">กำลังโหลดข้อมูลรายการใบเบิก...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : requisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-500 font-black tracking-wide text-sm">ไม่พบประวัติรายการใบเบิก</p>
                                        </td>
                                    </tr>
                                ) : (
                                    requisitions.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/80 group cursor-default transition-colors">
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="font-mono text-sm text-slate-600 flex items-center gap-2">
                                                    {/* 1. เปลี่ยนจาก group-hover:bg-indigo-500 เป็น group-hover:bg-blue-500 */}
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                    {new Date(req.createdAt).toLocaleDateString('th-TH')}
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="flex flex-col">

                                                    <span className="font-black text-blue-800 uppercase tracking-tight text-base tabular-nums group-hover:text-blue-600 transition-colors">
                                                        {req.srNumber}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                                        <Package className="w-3.5 h-3.5" /> จำนวน {req._count?.items || 0} รายการ
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="max-w-[300px]">
                                                    <p className="font-bold text-slate-800 text-sm truncate">"{req.purpose}"</p>
                                                    <p className="text-xs font-bold text-slate-500 mt-1.5 tracking-tight">อ้างอิง: {req.referenceNo || "---"}</p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-100 p-2 rounded-full shadow-sm group-hover:bg-white transition-colors">
                                                        <User className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-slate-800 truncate">
                                                            {req.user?.firstName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-bold tracking-tight mt-0.5">
                                                            {req.department?.name || "ระบุไม่ได้"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex justify-center w-full">
                                                    {getPriorityBadge(req.priority)}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex justify-center w-full">
                                                    {getStatusBadge(req.status)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* BOTTOM COMPLIANCE NOTE (Static) */}
                <div className="flex flex-col md:flex-row justify-between items-center px-8 py-5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2.5 text-nowrap">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        {/* เปลี่ยนจาก text-slate-500 เป็น text-slate-800 */}
                        <span className="text-xs font-black text-slate-800 tracking-wider">
                            บันทึกข้อมูลการเบิกจ่ายภายใน
                        </span>
                    </div>
                    {/* เปลี่ยนจาก text-slate-400 เป็น text-slate-700 */}
                    <div className="text-xs font-bold text-slate-700 tracking-wider mt-3 md:mt-0">
                        จำนวนรายการประวัติทั้งหมด: {requisitions.length} รายการ
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}