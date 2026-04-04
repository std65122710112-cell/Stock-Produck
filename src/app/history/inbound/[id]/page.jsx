"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Printer,
    FileCheck,
    User,
    Calendar,
    Hash,
    Clipboard,
    Package,
    MapPin,
    DollarSign,
    ShieldCheck,
    Info,
    Warehouse,
    Activity
} from "lucide-react";

export default function GoodsReceiptDetailPage({ params }) {
    const { id } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDetail() {
            try {
                const res = await apiFetch(`/inventory/receipt/${id}`, { method: "GET" });
                if (res && typeof res === 'object') {
                    setData(res);
                }
            } catch (error) {
                console.error("Critical Load Error", error);
            } finally {
                setLoading(false);
            }
        }
        loadDetail();
    }, [id]);

    const { totalQty, totalValue } = useMemo(() => {
        if (!data?.items) return { totalQty: 0, totalValue: 0 };
        return data.items.reduce((acc, item) => ({
            totalQty: acc.totalQty + Number(item.quantity || 0),
            totalValue: acc.totalValue + (Number(item.quantity || 0) * Number(item.unitCost || 0))
        }), { totalQty: 0, totalValue: 0 });
    }, [data]);

    const formatCurrency = (num) => Number(num).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNumber = (num) => Number(num).toLocaleString('th-TH');

    if (loading) {
        return (
            <AuthGate>
                <div className="flex flex-col justify-center items-center h-[70vh] space-y-6">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1e3b8a] rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">กำลังเรียกข้อมูลเอกสาร...</p>
                </div>
            </AuthGate>
        );
    }

    if (!data) {
        return (
            <AuthGate>
                <div className="p-20 text-center space-y-6">
                    <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 border-rose-100">
                        <ShieldCheck className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase italic">ไม่พบข้อมูลเอกสาร (404)</h2>
                    <Link href="/history" className="inline-flex items-center gap-2 bg-[#1e3b8a] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
                        กลับสู่หน้าประวัติ
                    </Link>
                </div>
            </AuthGate>
        );
    }

    return (
        <AuthGate>
            {/* CSS สำหรับคุมการปริ้นให้อยู่ในหน้าเดียว */}
            <style jsx global>{`
                @media print {
                    @page { size: auto; margin: 5mm; }
                    body { background: white !important; }
                    .print-compact { zoom: 0.85; }
                }
            `}</style>

            <div className="max-w-6xl mx-auto space-y-6 pb-20 print:pb-0 print:space-y-2 print-compact">

                {/* TOP NAVIGATION BAR */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden px-4">
                    <Link
                        href="/history"
                        className="group flex items-center gap-2 text-xs font-black text-slate-400 hover:text-[#1e3b8a] transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> ย้อนกลับ
                    </Link>

                </div>

                {/* MAIN DOCUMENT BOX */}
                <section className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.1)] overflow-hidden relative print:shadow-none print:border-slate-300 print:rounded-2xl">



                    {/* Document Header Part */}
                    <div className="p-10 md:p-14 border-b border-slate-100 bg-slate-50/50 relative z-10 print:p-6 print:bg-white">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8 print:gap-2">
                            <div className="space-y-4 print:space-y-1">

                                <h1 className="text-4xl font-black text-slate-950 tracking-tight flex flex-col md:flex-row md:items-center gap-3 print:text-2xl">
                                    รายละเอียดการรับสินค้า
                                </h1>
                                <p className="text-slate-500 text-sm font-bold flex items-center gap-2 italic print:text-[10px]">
                                    <FileCheck className="w-5 h-5 text-emerald-500 print:w-3 print:h-3" />
                                    ตรวจสอบความถูกต้องของพัสดุและจำนวนสต๊อก
                                </p>
                            </div>

                            <div className="text-left md:text-right space-y-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-w-[250px] print:p-3 print:min-w-fit print:border-none print:shadow-none">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขที่เอกสาร (Document No.)</p>
                                <p className="text-3xl font-black text-[#1e3b8a] tabular-nums tracking-tighter leading-none print:text-xl">{data.receiptNo}</p>
                                
                            </div>
                        </div>
                    </div>

                    {/* Info Matrix Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 relative z-10 border-b border-slate-100 print:grid-cols-4 print:divide-x print:divide-y-0">
                        <div className="p-8 space-y-2 print:p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 print:text-[8px]">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" /> วันที่รับเข้าระบบ
                            </p>
                            <p className="text-sm font-black text-slate-800 tabular-nums print:text-xs">{new Date(data.createdAt).toLocaleString('th-TH')}</p>
                        </div>
                        <div className="p-8 space-y-2 print:p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 print:text-[8px]">
                                <User className="w-3.5 h-3.5 text-indigo-500" /> ผู้ทำรายการรับของ
                            </p>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight print:text-xs">
                                {data.user ? `${data.user.firstName} ${data.user.lastName}` : data.receivedBy}
                            </p>
                        </div>
                        <div className="p-8 space-y-2 print:p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 print:text-[8px]">
                                <Clipboard className="w-3.5 h-3.5 text-amber-500" /> อ้างอิงใบสั่งซื้อ (PO)
                            </p>

                            <p className="text-sm font-black text-[#1e3b8a] uppercase tracking-tight tabular-nums print:text-xs">
                                {data.purchaseOrder?.poNumber || "ไม่พบเอกสารอ้างอิง"}
                            </p>
                        </div>
                        <div className="p-8 space-y-2 bg-slate-50/30 print:p-4 print:bg-white">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 print:text-[8px]">
                                <Info className="w-3.5 h-3.5 text-slate-500" /> หมายเหตุตรวจสอบ
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed print:text-[9px]">
                                {data.remarks ? `"${data.remarks}"` : "ไม่มีบันทึกเพิ่มเติม"}
                            </p>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="p-8 md:p-12 relative z-10 print:p-4">
                        <div className="mb-6 flex items-center justify-between print:mb-2">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 print:text-[10px]">
                                <Package className="w-4 h-4 text-[#1e3b8a] print:w-3 print:h-3" /> รายการพัสดุที่ตรวจรับ
                            </h2>
                            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full tabular-nums print:bg-white">
                                ทั้งหมด: {data.items?.length || 0} รายการ
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm print:rounded-none print:border-slate-300 print:shadow-none">
                            <table className="min-w-full text-base text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 print:bg-white print:border-b-2 print:border-slate-800">
                                    <tr className="text-[10px] font-black text-slate-950 uppercase tracking-widest print:text-[8px]">
                                        <th className="p-6 print:p-2">รายละเอียดสินค้า</th>
                                        <th className="p-6 print:p-2">พื้นที่จัดเก็บ</th>
                                        <th className="p-6 text-right print:p-2">จำนวน</th>
                                        <th className="p-6 text-right print:p-2">ราคาทุน</th>
                                        <th className="p-6 text-right text-slate-950 bg-slate-100/50 print:p-2 print:bg-white">ยอดรวม (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {data.items?.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 print:p-2">
                                                <div className="font-black text-sm text-slate-950 uppercase tracking-tight print:text-xs">
                                                    {item.product?.name}
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 mt-1.5 tabular-nums print:mt-0 print:text-[8px]">
                                                    <Hash className="w-3 h-3" /> {item.product?.sku}
                                                </div>
                                            </td>
                                            <td className="p-6 print:p-2">
                                                <div className="flex items-center gap-2.5">
                                                    {/* ปรับเป็นสี Indigo-600 เพื่อเพิ่มมิติและแยกหมวดหมู่ข้อมูลด้วยสายตา */}
                                                    <Warehouse className="w-4 h-4 text-indigo-600 print:hidden" />
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight print:text-[9px]">
                                                            {item.location?.warehouse?.code || "DEFAULT-WH"}
                                                        </p>
                                                        {/* ปรับ font-black และเพิ่มความเข้มเป็น slate-500 เพื่อให้คมชัดขึ้น */}
                                                        <p className="text-[9px] font-black text-slate-500 uppercase print:text-[7px] tracking-tighter">
                                                            Loc: {item.location?.code || "-"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right print:p-2">
                                                <span className="font-black text-slate-950 tabular-nums text-sm print:text-xs">
                                                    {formatNumber(item.quantity)}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right print:p-2">
                                                <div className="font-bold text-slate-500 text-xs tabular-nums print:text-[10px]">
                                                    {formatCurrency(item.unitCost)}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right font-black text-[#1e3b8a] tabular-nums text-sm bg-slate-50/30 print:p-2 print:bg-white print:text-slate-950 print:text-xs">
                                                {formatCurrency(item.quantity * (item.unitCost || 0))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-white border-t border-slate-950 text-slate-950 print:border-t">
                                    <tr>
                                        <td colSpan="2" className="p-8 text-right uppercase tracking-[0.3em] text-[10px] font-black text-slate-400 print:p-2 print:text-[8px]">
                                            สรุปยอดสุทธิ (Total Summary):
                                        </td>
                                        <td className="p-8 text-right print:p-2">
                                            <div className="font-black text-emerald-600 text-xl tabular-nums print:text-sm">{formatNumber(totalQty)}</div>
                                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mt-1 print:text-[6px]">จำนวนหน่วยรวม</p>
                                        </td>
                                        <td className="p-8 print:p-2"></td>
                                        <td className="p-8 text-right bg-slate-50/50 print:p-2 print:bg-white">
                                            <div className="font-black text-emerald-600 text-2xl tabular-nums print:text-base">{formatCurrency(totalValue)}</div>
                                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mt-1 print:text-[6px]">มูลค่ารวมพัสดุ</p>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </AuthGate>
    );
}