"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    ClipboardList,
    Plus,
    History,
    User,
    Hash,
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Truck,
    ChevronRight,
    ChevronLeft,
    ChevronsRight,
    ChevronsLeft,
    Package,
    ArrowUpRight,
    ArrowLeft,
    Calendar,
    LayoutGrid,
    TrendingUp,
    Info,
    MessageSquareText,
    Briefcase,
    Loader2
} from "lucide-react";

export default function StockRequisitionListPage() {
    const [requisitions, setRequisitions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('LIST');
    const [selectedSR, setSelectedSR] = useState(null);

    const [page, setPage] = useState(1);
    const limit = 20;

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

    const handleSelectSR = (sr) => {
        setSelectedSR(sr);
        setViewMode('DETAIL');
        window.scrollTo(0, 0);
    };

    const getStatusBadge = (status) => {
        const baseClass = "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 w-fit";
        switch (status) {
            case 'PENDING':
                return <span className={`${baseClass} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-3.5 h-3.5" /> รออนุมัติ</span>;
            case 'APPROVED':
                return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว</span>;
            case 'REJECTED':
                return <span className={`${baseClass} bg-rose-50 text-rose-600 border-rose-100`}><XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ</span>;
            case 'DISPATCHED':
                return <span className={`${baseClass} bg-indigo-50 text-indigo-600 border-indigo-100`}><Truck className="w-3.5 h-3.5" /> จ่ายของแล้ว</span>;
            case 'COMPLETED':
                return <span className={`${baseClass} bg-blue-50 text-blue-600 border-blue-100`}><CheckCircle2 className="w-3.5 h-3.5" /> เสร็จสิ้น</span>;
            default:
                return <span className={`${baseClass} bg-slate-50 text-slate-600 border-slate-200`}>{status}</span>;
        }
    };

    const calculateGrandTotal = () => {
        if (!selectedSR || !selectedSR.items) return 0;
        return selectedSR.items.reduce((sum, item) => {
            const cost = Number(item.product?.unitCost) || Number(item.product?.price) || 0;
            const qty = Number(item.quantity) || 0;
            return sum + (cost * qty);
        }, 0);
    };

    const grandTotalValue = viewMode === 'DETAIL' ? calculateGrandTotal() : 0;

    const totalCount = requisitions.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paginatedRequisitions = requisitions.slice((page - 1) * limit, page * limit);

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">

                    {/* ฝั่งซ้าย: กลุ่มหัวข้อ และ ปุ่มย้อนกลับ */}
                    <div className="flex flex-col gap-4">
                        {/* ปุ่มย้อนกลับ (แสดงเฉพาะเมื่ออยู่หน้า DETAIL) */}
                        {viewMode === 'DETAIL' && (
                            <button
                                onClick={() => setViewMode('LIST')}
                                className="flex items-center gap-2 w-fit text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                            </button>
                        )}

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                                <Truck className="w-6 h-6 text-[#1F3B8B]" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                    {viewMode === 'LIST' ? 'รายการใบขอเบิก (SR)' : 'รายละเอียดใบเบิก'}
                                </h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium">
                                    Inventory Outbound Management & History
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ฝั่งขวา: ปุ่มสร้างใหม่ / ยอดรวม */}
                    <div className="flex flex-row items-center gap-4 w-full md:w-auto">
                        {viewMode === 'LIST' ? (
                            <Link
                                href="/inventory/requisition/create"
                                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-emerald-700 shadow-sm active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> สร้างใบขอเบิกใหม่
                            </Link>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl flex flex-col items-end min-w-[220px] shadow-sm">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                    มูลค่ารวมใบเบิก (Total Value)
                                </span>
                                <span className="text-2xl font-bold text-emerald-600 tabular-nums">
                                    ฿ {grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- LIST VIEW --- */}
                {viewMode === 'LIST' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SummaryCard
                                title="รายการใบเบิกทั้งหมด"
                                count={totalCount}
                                unit="รายการ"
                                color="slate"
                                icon={<LayoutGrid className="w-5 h-5 text-slate-600" />}
                            />
                            <SummaryCard
                                title="รอการอนุมัติ"
                                count={requisitions.filter(r => r.status === 'PENDING').length}
                                unit="รายการ"
                                color="amber"
                                icon={<Clock className="w-5 h-5 text-amber-600" />}
                            />
                            <div className="bg-emerald-50/30 border border-emerald-200 border-l-4 border-l-emerald-500 p-5 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                </div>
                                <p className="text-xs font-bold text-slate-600 tracking-tight">เฉพาะผู้ที่มีสิทธิ์เข้าถึงข้อมูลเท่านั้น</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่ขอเบิก</th>
                                            <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เลขที่เอกสาร (SR)</th>
                                            <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วัตถุประสงค์ / โครงการ</th>
                                            <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ขอเบิก / แผนก</th>
                                            <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                                            <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ดำเนินการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan="6" className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" /></td>
                                            </tr>
                                        ) : paginatedRequisitions.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="py-20 text-center text-slate-400 font-medium italic">ไม่พบประวัติรายการใบเบิก</td>
                                            </tr>
                                        ) : (
                                            paginatedRequisitions.map((req) => (
                                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <span className="text-xs font-bold text-slate-600 tabular-nums">
                                                            {new Date(req.createdAt).toLocaleDateString('th-TH')}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mb-0.5">
                                                                {req.srNumber}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                                <Package className="w-3 h-3" /> {req._count?.items || req.items?.length || 0} รายการ
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-800 line-clamp-1">"{req.purpose}"</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Ref: {req.referenceNo || "---"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-700">{req.user?.firstName} {req.user?.lastName}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{req.department?.name || "ระบุไม่ได้"}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex justify-center">
                                                            {getStatusBadge(req.status)}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <button
                                                            onClick={() => handleSelectSR(req)}
                                                            className="text-[11px] font-bold text-[#1F3B8B] hover:underline flex items-center gap-1 ml-auto"
                                                        >
                                                            ดูข้อมูล <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {!isLoading && totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/50 print:hidden">
                                    <p className="text-xs font-medium text-slate-500">
                                        หน้า {page} จาก {totalPages} | รวม {totalCount.toLocaleString()} รายการ
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <PaginationButton onClick={() => setPage(1)} disabled={page === 1} icon={<ChevronsLeft className="w-4 h-4" />} />
                                        <PaginationButton onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} icon={<ChevronLeft className="w-4 h-4" />} />

                                        <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm">
                                            {page} / {totalPages}
                                        </div>

                                        <PaginationButton onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} icon={<ChevronRight className="w-4 h-4" />} />
                                        <PaginationButton onClick={() => setPage(totalPages)} disabled={page === totalPages} icon={<ChevronsRight className="w-4 h-4" />} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* --- DETAIL VIEW --- */}
                {viewMode === 'DETAIL' && selectedSR && (
                    <div className="space-y-6 animate-in fade-in duration-500">


                        {/* กล่องเนื้อหาหลัก (กรอบนอกชัดขึ้น shadow ลอยขึ้น) */}
                        <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden">

                            {/* Detail Header */}
                            <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">เลขที่ใบเบิก</span>
                                    <h2 className="text-2xl md:text-3xl font-black text-[#1F3B8B] tabular-nums">{selectedSR.srNumber}</h2>
                                </div>
                                <div className="flex gap-8">
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">วันที่ส่งคำขอ</p>
                                        <p className="text-base font-bold text-slate-900">{new Date(selectedSR.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">สถานะปัจจุบัน</p>
                                        <div className="flex justify-end">{getStatusBadge(selectedSR.status)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Detail Content Grid (โครงเดิม ฟอนต์เข้มและใหญ่ขึ้น) */}
                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-slate-200">
                                <DetailInfoItem icon={<User className="text-indigo-500" />} label="ผู้ขอเบิกพัสดุ" value={`${selectedSR.user?.firstName} ${selectedSR.user?.lastName}`} subValue={selectedSR.department?.name || 'ส่วนกลาง'} />
                                <DetailInfoItem icon={<Hash className="text-amber-500" />} label="เลขอ้างอิงโครงการ" value={selectedSR.referenceNo || '---'} />
                                <DetailInfoItem icon={<ShieldCheck className="text-emerald-500" />} label="ผู้อนุมัติเอกสาร" value={selectedSR.approver?.firstName ? `${selectedSR.approver.firstName} ${selectedSR.approver.lastName}` : "-"} />
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    {/* ลบแท็ก icon ออก และลบ flex ออกจาก class */}
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">วัตถุประสงค์การใช้งาน</p>
                                    <p className="text-base text-slate-800 font-semibold leading-relaxed p-5 bg-slate-50 rounded-xl border border-slate-100 italic">"{selectedSR.purpose}"</p>
                                </div>
                                <div className="space-y-3">
                                    {/* ลบแท็ก icon ออก และลบ flex ออกจาก class */}
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">หมายเหตุ (Remarks)</p>
                                    <p className="text-base text-slate-800 font-semibold leading-relaxed p-5 bg-slate-50 rounded-xl border border-slate-100">{selectedSR.remarks || "--- ไม่มีการระบุข้อมูลเพิ่มเติม ---"}</p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="px-8 pb-8">
                                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2"><Package className="w-5 h-5 text-[#1F3B8B]" /> รายการพัสดุและมูลค่าเบิกจ่าย</h3>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold uppercase text-slate-600">
                                                <th className="p-4 text-center w-16">ลำดับ</th>
                                                <th className="p-4 text-left">รายการพัสดุ / SKU</th>
                                                <th className="p-4 text-right">ราคา/หน่วย</th>
                                                <th className="p-4 text-center w-32">จำนวนเบิก</th>
                                                <th className="p-4 text-right">รวมมูลค่า</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedSR.items?.map((item, idx) => {
                                                const unitCost = Number(item.product?.unitCost) || Number(item.product?.price) || 0;
                                                const rowTotal = unitCost * Number(item.quantity);
                                                return (
                                                    <tr key={idx} className="text-base">
                                                        <td className="p-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                                                        <td className="p-4">
                                                            <p className="font-bold text-slate-900">{item.product?.name}</p>
                                                            <p className="text-xs text-blue-600 font-bold uppercase mt-0.5">SKU: {item.product?.sku}</p>
                                                        </td>
                                                        <td className="p-4 text-right tabular-nums font-semibold text-slate-700">฿{unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className="p-4 text-center"><span className="px-3 py-1 bg-slate-100 rounded-md font-bold text-[#1F3B8B]">{item.quantity}</span></td>
                                                        <td className="p-4 text-right tabular-nums font-bold text-slate-900">฿{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-[#1F3B8B]/5 font-bold">
                                            <tr>
                                                <td colSpan="4" className="p-5 text-right text-sm uppercase text-slate-600 tracking-wider">มูลค่าประมาณการสุทธิ</td>
                                                <td className="p-5 text-right text-xl text-emerald-600 tabular-nums">฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}

// --- SUB-COMPONENTS ---

function SummaryCard({ title, count, unit, color, icon }) {
    const themes = {
        slate: "border-l-slate-400 bg-slate-50/50",
        amber: "border-l-amber-500 bg-amber-50/30",
    };
    return (
        <div className={`bg-white border border-slate-200 border-l-4 ${themes[color] || themes.slate} p-5 rounded-xl flex items-center gap-4 shadow-sm transition-all hover:shadow-md`}>
            <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100">{icon}</div>
            <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{title}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">{count.toLocaleString()}</span>
                    {unit && <span className="text-xs font-bold text-slate-500 uppercase">{unit}</span>}
                </div>
            </div>
        </div>
    );
}

function DetailInfoItem({ label, value, subValue }) {
    return (
        <div className="flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</span>
            <span className="text-base font-bold text-slate-900">{value}</span>
            {subValue && <span className="text-xs font-bold text-[#1F3B8B] uppercase mt-0.5">{subValue}</span>}
        </div>
    );
}

function PaginationButton({ onClick, disabled, icon }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm"
        >
            {icon}
        </button>
    );
}