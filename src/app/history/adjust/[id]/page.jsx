"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    ArrowLeft,
    CheckCircle2,
    MapPin,
    Printer,
    FileText,
    ClipboardList,
    AlertTriangle,
    Package,
    Clock,
    UserCheck
} from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function CountTaskDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [doc, setDoc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchDetail() {
            try {
                const res = await apiFetch(`/inventory/count-tasks/${id}`);
                if (res?.success && res.data) {
                    setDoc(res.data);
                } else if (res && typeof res === "object") {
                    setDoc(res.data || res);
                }
            } catch (error) {
                console.error("Security/Load Error:", error);
                router.push('/history');
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchDetail();
    }, [id, router]);

    const getStatusLabel = (status) => {
        const map = {
            PENDING: "รอตรวจนับ",
            COUNTING: "กำลังตรวจนับ",
            REVIEW: "รอตรวจสอบ",
            COMPLETED: "เสร็จสิ้น (Verified)"
        };
        return map[status] || status || "-";
    };

    const getFullName = (userObj) => {
        return userObj?.firstName ? `${userObj.firstName} ${userObj.lastName || ""}`.trim() : "---";
    };

    if (isLoading) return <SystemLoader />;
    if (!doc) return <NotFoundState />;

    return (
        <AuthGate>
            <Toaster position="top-right" />
            {/* พื้นหลังสีเทาอ่อนเพื่อให้แผ่นเอกสารสีขาวดูเด่นขึ้น */}
            <div className="min-h-screen bg-slate-50/50 py-10 px-4 print:bg-white print:py-0">
                
                <div className="max-w-5xl mx-auto space-y-6">
                    
                    {/* --- แถบเครื่องมือด้านบน --- */}
                    <div className="flex justify-between items-center print:hidden">
                        <button 
                            onClick={() => router.back()} 
                            className="flex items-center gap-2 text-slate-400 hover:text-[#1F3B8B] font-bold text-xs uppercase tracking-widest transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 
                            กลับไปหน้าประวัติ
                        </button>
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
                        >
                            <Printer className="w-4 h-4" /> พิมพ์ใบตรวจนับพัสดุ
                        </button>
                    </div>

                    {/* --- ตัวแผ่นเอกสาร (Main Paper) --- */}
                    <div className="bg-white border border-slate-200 shadow-2xl rounded-sm overflow-hidden flex flex-col print:shadow-none print:border-slate-300 min-h-250">
                        
                        {/* 1. ส่วนหัวเอกสารสี Navy */}
                        <div className="bg-[#1F3B8B] text-white p-10 md:p-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="space-y-2">
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-4">
                                    <ClipboardList className="w-10 h-10 text-blue-300/40" /> รายละเอียดการตรวจนับ
                                </h1>
                                <p className="text-blue-200/80 text-xs font-bold uppercase tracking-[0.25em] flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> ตรวจสอบยอดพัสดุในระบบเปรียบเทียบหน้างานจริง (Cycle Count)
                                </p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-[11px] font-black text-blue-200/40 uppercase tracking-[0.4em] mb-2">เลขที่เอกสาร / CNT No.</span>
                                <span className="text-4xl font-black tabular-nums tracking-tighter leading-none">{doc.taskNo}</span>
                            </div>
                        </div>

                        {/* 2. ข้อมูลพรรณนาหัวเอกสาร (Metadata Matrix) */}
                        <div className="p-10 md:p-14 grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-slate-100">
                            <BillInfoItem label="วันที่เริ่มทำรายการ" value={new Date(doc.createdAt).toLocaleDateString('th-TH', { 
                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            }) + " น."} />
                            <BillInfoItem label="สถานะการดำเนินงาน" value={getStatusLabel(doc.status)} isStatus status={doc.status} />
                            <BillInfoItem label="ประเภทการตรวจสอบ" value="รายการตรวจนับตามรอบ (Cycle Count)" isPrimary />
                        </div>

                        {/* 3. ส่วนบันทึกเจ้าหน้าที่ (Audit Trail) */}
                        <div className="px-10 md:px-14 py-8 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-y-8 justify-between items-center">
                            <AuditGroup label="ผู้ออกเอกสาร/สั่งตรวจ" value={getFullName(doc.creator)} />
                            <AuditGroup label="พนักงานผู้รับผิดชอบตรวจนับ" value={getFullName(doc.assignee)} isMain />
                            <div className="flex flex-col gap-2 text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ความถูกต้องของรายการ</span>
                                <div className="px-5 py-1.5 rounded-full border-2 border-slate-200 text-slate-600 font-black text-xs uppercase tracking-tighter bg-white shadow-sm">
                                    {doc.items?.length || 0} รายการที่ตรวจสอบ
                                </div>
                            </div>
                        </div>

                        {/* 4. ตารางรายการตรวจนับ (Count Manifest) */}
                        <div className="flex-1 overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="bg-white border-b-4 border-slate-900">
                                        <th className="px-14 py-6 text-left text-[12px] font-black uppercase tracking-widest text-slate-900">รายละเอียดพัสดุและรหัสสินค้า</th>
                                        <th className="px-6 py-6 text-left text-[12px] font-black uppercase tracking-widest text-slate-900">ตำแหน่งจัดเก็บ</th>
                                        <th className="px-6 py-6 text-center text-[12px] font-black uppercase tracking-widest text-slate-900">ยอดในระบบ</th>
                                        <th className="px-6 py-6 text-center text-[12px] font-black uppercase tracking-widest text-slate-900">ยอดนับได้จริง</th>
                                        <th className="px-14 py-6 text-right text-[12px] font-black uppercase tracking-widest text-slate-900">ส่วนต่าง (Diff)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {doc.items?.map((item) => {
                                        const diff = item.countedQty !== null ? item.countedQty - item.systemQty : null;
                                        return (
                                            <tr key={item.id} className={`${diff !== null && diff !== 0 ? 'bg-rose-50/20' : 'hover:bg-slate-50/20'}`}>
                                                <td className="px-14 py-8">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[15px] font-black text-slate-950 uppercase">{item.product?.name}</span>
                                                        <span className="text-[11px] font-black text-blue-600 tracking-tighter uppercase">รหัส: {item.product?.sku}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8">
                                                    <div className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
                                                        <MapPin className="w-3.5 h-3.5 text-indigo-500 opacity-60" />
                                                        {item.location?.warehouse?.name || "คลังสินค้า"} ({item.location?.code})
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8 text-center font-bold text-slate-400 tabular-nums text-lg">
                                                    {item.systemQty?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-8 text-center font-black text-slate-900 tabular-nums text-lg">
                                                    {item.countedQty !== null ? item.countedQty?.toLocaleString() : "--"}
                                                </td>
                                                <td className="px-14 py-8 text-right">
                                                    {diff !== null ? (
                                                        <span className={`text-lg font-black tabular-nums ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                            {diff === 0 ? 'ครบถ้วน' : (diff > 0 ? `+${diff}` : diff)}
                                                        </span>
                                                    ) : <span className="text-slate-200">รอนับ</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* 5. ส่วนสรุปท้ายบิล (Footer Summary) */}
                        <div className="border-t-4 border-slate-900 bg-slate-50 p-10 md:p-14 flex flex-col md:flex-row justify-between gap-12">
                            <div className="max-w-xl space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">หมายเหตุประกอบการตรวจนับ (Audit Remarks)</span>
                                <p className="text-base font-bold text-slate-700 leading-relaxed italic border-l-4 border-slate-200 pl-6 py-1">
                                    {doc.remarks || "ไม่มีข้อความหมายเหตุเพิ่มเติมสำหรับใบสั่งตรวจนับฉบับนี้"}
                                </p>
                                {doc.items?.some(it => it.countedQty !== null && it.countedQty !== it.systemQty) && (
                                    <div className="mt-6 flex items-center gap-3 text-rose-600 bg-white border border-rose-100 p-4 rounded-xl shadow-sm">
                                        <AlertTriangle size={24} className="shrink-0" />
                                        <p className="text-xs font-black uppercase">แจ้งเตือน: พบรายการที่มีผลต่างจากการตรวจนับ โปรดตรวจสอบและปรับปรุงยอดสต๊อก</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-6 min-w-[320px]">
                                <div className="flex justify-between items-center text-slate-500 border-b border-slate-200 pb-4">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">พัสดุทั้งหมดในรายการ</span>
                                    <span className="text-xl font-black tabular-nums text-slate-950">{doc.items?.length || 0} รายการ</span>
                                </div>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-[13px] font-black uppercase tracking-[0.5em] text-[#1F3B8B] mb-2">สรุปผลการตรวจนับ</span>
                                    <div className="text-right">
                                        <span className={`text-4xl font-black tabular-nums tracking-tighter ${doc.status === 'COMPLETED' ? 'text-[#1F3B8B]' : 'text-amber-500'}`}>
                                            {doc.status === 'COMPLETED' ? 'เสร็จสมบูรณ์' : 'รอดำเนินการ'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ลายเซ็นพนักงานสำหรับการพิมพ์ (Print Only) */}
                        <div className="hidden print:grid grid-cols-2 gap-24 px-14 pb-24 mt-24 text-center">
                            <div className="space-y-12">
                                <div className="border-b-2 border-slate-900 pb-2"></div>
                                <p className="text-[11px] font-black uppercase tracking-widest">เจ้าหน้าที่ผู้ทำการตรวจนับ (EXAMINER)</p>
                            </div>
                            <div className="space-y-12">
                                <div className="border-b-2 border-slate-900 pb-2"></div>
                                <p className="text-[11px] font-black uppercase tracking-widest">ผู้อนุมัติ/หัวหน้าคลัง (AUTHORIZED)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}

// --- ฟังก์ชันเสริม (Internal Components) ---

function BillInfoItem({ label, value, isPrimary = false, isStatus = false, status = "" }) {
    const statusColors = {
        PENDING: "text-amber-500",
        COUNTING: "text-blue-500",
        REVIEW: "text-purple-500",
        COMPLETED: "text-emerald-600"
    };

    return (
        <div className="space-y-2">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 w-fit">{label}</p>
            <p className={`text-[17px] font-bold leading-tight tracking-tight ${isStatus ? statusColors[status] || "text-slate-900" : isPrimary ? "text-[#1F3B8B]" : "text-slate-950"}`}>
                {value}
            </p>
        </div>
    );
}

function AuditGroup({ label, value, isMain = false }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <span className={`text-[16px] font-black ${isMain ? "text-[#1F3B8B]" : "text-slate-800"} tracking-tight`}>{value}</span>
        </div>
    );
}

function SystemLoader() {
    return (
        <div className="h-screen flex flex-col justify-center items-center bg-slate-50 gap-6">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">กำลังเรียกข้อมูลเอกสารการตรวจนับ...</p>
        </div>
    );
}

function NotFoundState() {
    return (
        <div className="h-screen flex flex-col justify-center items-center text-center bg-white p-12 space-y-8">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
                <FileText className="w-12 h-12 text-rose-500 opacity-40" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">ไม่พบข้อมูลเอกสารการตรวจนับในระบบ</h2>
            <button onClick={() => window.history.back()} className="px-10 py-4 bg-[#1F3B8B] text-white font-black text-xs uppercase tracking-[0.4em] rounded-sm hover:bg-slate-900 transition-all shadow-2xl">
                ย้อนกลับไปหน้าประวัติ
            </button>
        </div>
    );
}