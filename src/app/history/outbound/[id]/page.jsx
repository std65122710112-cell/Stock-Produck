"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import {
    ArrowLeft,
    Printer,
    Truck,
    User,
    Calendar,
    Hash,
    ClipboardList,
    Package,
    MapPin,
    ShieldCheck,
    Info,
    UserCheck,
    Database,
    FileText,
    MessageSquareText,
    CheckCircle2
} from "lucide-react";

export default function DeliveryOrderDetailPage({ params }) {
    const { id } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDetail() {
            try {
                const res = await apiFetch(`/outbound/delivery-orders/${id}`, { method: "GET" });
                setData(res);
            } catch (error) {
                console.error("Error loading DO detail:", error);
            } finally {
                setLoading(false);
            }
        }
        loadDetail();
    }, [id]);

    if (loading) {
        return (
            <AuthGate>
                <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">กำลังเรียกข้อมูลจากคลังสินค้า...</p>
                </div>
            </AuthGate>
        );
    }

    if (!data) {
        return (
            <AuthGate>
                <div className="p-20 text-center space-y-4">
                    <p className="text-rose-500 font-black uppercase tracking-widest text-xl">ไม่พบข้อมูลใบนำจ่าย (404 Not Found)</p>
                    <Link href="/history" className="text-slate-500 underline font-bold">กลับสู่หน้าประวัติ</Link>
                </div>
            </AuthGate>
        );
    }

    const totalQty = data.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
    const formatNumber = (num) => Number(num).toLocaleString('th-TH');

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 md:px-0">

                {/* --- ส่วนหัวและการจัดการ --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6 gap-4 print:hidden pt-4">
                    <div className="space-y-1">
                        <Link href="/history" className="text-[10px] font-black text-slate-400 hover:text-indigo-600 mb-2 flex items-center gap-1 uppercase tracking-widest transition-colors">
                            <ArrowLeft className="w-3 h-3" /> ย้อนกลับ
                        </Link>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                            ใบนำจ่ายสินค้า (DO)
                            <span className="not-italic bg-indigo-600 text-white text-[9px] px-3 py-1 rounded-full tracking-[0.2em] font-black shadow-sm">VERIFIED</span>
                        </h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> TJC GROUP • ข้อมูลการตัดยอดคงคลังแบบถาวร
                        </p>
                    </div>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all">
                        <Printer className="w-4 h-4" /> พิมพ์เอกสาร (Print)
                    </button>
                </div>

                {/* --- 1. ข้อมูลหลัก (Main Summary) --- */}
                <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 opacity-[0.05] pointer-events-none rotate-12">
                        <Truck className="w-64 h-64" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Shipment ID</p>
                                <p className="font-mono font-black text-3xl text-indigo-400 tracking-tighter">{data.doNo}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">เลขที่อ้างอิงใบเบิก (SR Ref.)</p>
                                <p className="font-black text-sm text-slate-200 uppercase">{data.reference || "---"}</p>
                            </div>
                        </div>

                        <div className="border-l border-white/10 pl-10 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">วันที่นำจ่ายพัสดุ</p>
                                <p className="font-black text-sm text-slate-200">{new Date(data.createdAt).toLocaleString('th-TH')}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">สถานที่นำสินค้าไปส่ง</p>
                                <p className="font-black text-sm text-slate-200 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {data.deliveryLocation || "ไม่ระบุสถานที่ส่ง"}
                                </p>
                            </div>
                        </div>

                        <div className="border-l border-white/10 pl-10 space-y-4 text-right md:text-left">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">จำนวนที่จ่ายออกรวม</p>
                                <p className="font-mono font-black text-4xl text-emerald-400">{formatNumber(totalQty)}</p>
                                <span className="text-[9px] uppercase text-slate-500 font-bold">Items Dispatched</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 2. ข้อมูลพนักงาน (Personnel Involved) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ข้อมูลผู้เบิกและผู้อนุมัติ (ดึงจาก Requisition) */}
                    <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm grid grid-cols-2 gap-8">
                        <div className="space-y-4 border-r border-slate-100 pr-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-indigo-500" /> ข้อมูลผู้เบิกพัสดุ
                            </h3>
                            <div>
                                <p className="text-sm font-black text-slate-900 uppercase">
                                    {data.requisition?.user 
                                        ? `${data.requisition.user.firstName} ${data.requisition.user.lastName}` 
                                        : "ไม่พบข้อมูลผู้เบิก (ข้อมูลเก่า)"}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest italic opacity-60">
                                    ORIGINAL REQUESTER
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserCheck className="w-4 h-4" /> ผู้อนุมัติจ่ายสินค้า
                            </h3>
                            <div>
                                <p className="text-sm font-black text-slate-900 uppercase">
                                    {data.requisition?.approver 
                                        ? `${data.requisition.approver.firstName} ${data.requisition.approver.lastName}` 
                                        : "อนุมัติผ่านระบบอัตโนมัติ"}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest italic opacity-60">
                                    MANAGEMENT VERIFIED
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ข้อมูลเจ้าหน้าที่คลังที่นำของออก (issuedBy) */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Truck className="w-4 h-4 text-indigo-500" /> เจ้าหน้าที่ผู้นำจ่าย (คลัง)
                        </h3>
                        <div>
                            <p className="text-sm font-black text-slate-900 uppercase">
                                {data.user ? `${data.user.firstName} ${data.user.lastName}` : "System Admin"}
                            </p>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase mt-0.5 tracking-widest italic">
                                WAREHOUSE DISPATCHER
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. หมายเหตุบันทึกหลักฐาน */}
                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm shrink-0 border border-amber-50">
                        <MessageSquareText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1 italic">บันทึกหลักฐานการนำจ่าย (Dispatch Remarks)</p>
                        <p className="text-sm font-bold text-amber-900 leading-relaxed italic">
                            {data.remarks ? `"${data.remarks}"` : "--- ไม่มีบันทึกหมายเหตุเพิ่มเติมสำหรับการนำจ่ายใบงานนี้ ---"}
                        </p>
                    </div>
                </div>

                {/* --- 4. ตารางรายการสินค้า (Manifested Items) --- */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" /> ตรวจสอบรายการพัสดุที่จ่ายออกจริง
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white border-b border-slate-100">
                                <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">
                                    <th className="p-6 w-12 text-center">#</th>
                                    <th className="p-6 w-1/3">รายการสินค้า / รหัส (SKU)</th>
                                    <th className="p-6">คลังและตำแหน่งที่หยิบสินค้า (Source)</th>
                                    <th className="p-6 text-right">จำนวนจ่ายจริง</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.items?.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6 text-center text-[10px] font-black text-slate-300">{idx + 1}</td>
                                        <td className="p-6">
                                            <p className="font-black text-xs text-slate-900 uppercase tracking-tight">
                                                {item.product?.name}
                                            </p>
                                            <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 tracking-widest italic uppercase">
                                                SKU: {item.product?.sku}
                                            </p>
                                        </td>
                                        <td className="p-6">
                                            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl font-black text-[10px] text-slate-600 uppercase">
                                                <MapPin className="w-3 h-3 text-indigo-500" />
                                                WH: {item.location?.warehouse?.code} | POS: {item.location?.code}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-5 py-2 rounded-2xl border border-indigo-100 font-mono font-black text-xl">
                                                {formatNumber(item.quantity)}
                                                <span className="text-[9px] font-bold uppercase opacity-50 ml-1">
                                                    {item.product?.unit?.name || "ชิ้น"}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- FOOTER & SIGNATURES --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 py-10 border-t border-slate-100">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Data Integrity Verified</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] leading-relaxed max-w-sm italic">
                            รายการนี้ได้รับการประมวลผลผ่านระบบความปลอดภัยสูงสุดของ TJC GROUP ข้อมูลสต๊อกได้รับการอัปเดตแบบ Real-time และบันทึกไว้ใน Audit Log ของระบบ
                        </p>
                    </div>

                    <div className="flex justify-end gap-12 text-center items-end h-32">
                        <div className="space-y-3">
                            <div className="border-b-2 border-slate-200 w-48 pb-1 italic text-slate-200 font-mono text-[8px]">DIGITAL AUTHENTICATION</div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">เจ้าหน้าที่ผู้นำจ่าย</p>
                        </div>
                        <div className="space-y-3">
                            <div className="border-b-2 border-slate-200 w-48 pb-1"></div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ผู้รับสินค้า (ปลายทาง)</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* สไตล์สำหรับการสั่งพิมพ์ */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    .print-hidden { display: none !important; }
                    .max-w-6xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    .rounded-[3rem], .rounded-[2.5rem], .rounded-[2rem] { border-radius: 0.5rem !important; }
                    .bg-slate-900 { background: #0f172a !important; -webkit-print-color-adjust: exact; }
                    .bg-amber-50 { background: #fffbeb !important; border: 1px solid #fde68a !important; }
                }
            `}</style>
        </AuthGate>
    );
}