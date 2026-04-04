"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import {
    ArrowLeft, FileCheck, User, Calendar, Hash, Clipboard, Package,
    ShieldCheck, Info, Warehouse, Activity, Building2, FileSignature,
    ShoppingCart, UserCheck
} from "lucide-react";

export default function GoodsReceiptDetailPage({ params }) {
    const { id } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDetail() {
            try {
                const res = await apiFetch(`/inventory/receipt/${id}`, { method: "GET" });
                if (res) setData(res);
            } catch (error) {
                console.error("Critical Load Error", error);
            } finally {
                setLoading(false);
            }
        }
        loadDetail();
    }, [id]);

    // 💡 ฟังก์ชันช่วยดึงชื่อแบบ Safe Name ( firstName + lastName )
    const getFullName = (userObj, fallback = "ไม่ระบุ") => {
        if (userObj?.firstName) {
            return `${userObj.firstName} ${userObj.lastName || ""}`.trim();
        }
        return fallback;
    };

    // --- 💡 Logic การดึงชื่อผู้ทำรายการ (แมพตาม Backend ที่คุณส่งมา) ---

    // 1. ผู้ขอซื้อ (PR) -> เข้าไปที่ PO -> Requisition -> User
    const prUser = useMemo(() =>
        getFullName(data?.purchaseOrder?.requisition?.user, "ไม่ระบุพนักงานขอซื้อ"),
        [data]);

    // 2. ผู้อนุมัติ (Approver) -> เข้าไปที่ Requisition -> approvals (Array) -> ตัวแรก -> Approver
    const approverUser = useMemo(() => {
        const approval = data?.purchaseOrder?.requisition?.approvals?.[0];
        if (approval?.approver) return getFullName(approval.approver);
        return "อนุมัติผ่านระบบ";
    }, [data]);

    // 3. ผู้สั่งซื้อ (PO) -> เข้าไปที่ PO -> User
    const poUser = useMemo(() =>
        getFullName(data?.purchaseOrder?.user, "ไม่ระบุพนักงานจัดซื้อ"),
        [data]);

    // 4. ผู้ตรวจรับสินค้า (GR) -> อยู่ที่ชั้นนอกสุด (data.user)
    const grUser = useMemo(() =>
        getFullName(data?.user, "ไม่ระบุผู้รับสินค้า"),
        [data]);

    // 5. ชื่อคู่ค้า (Supplier) -> เช็คทั้ง Relation และฟิลด์ vendorName
    const supplierDisplayName = useMemo(() => {
        return data?.purchaseOrder?.supplier?.name || data?.purchaseOrder?.vendorName || "ไม่ระบุคู่ค้า";
    }, [data]);


    const { totalQty, totalValue } = useMemo(() => {
        if (!data?.items) return { totalQty: 0, totalValue: 0 };
        return data.items.reduce((acc, item) => ({
            totalQty: acc.totalQty + Number(item.quantity || 0),
            totalValue: acc.totalValue + (Number(item.quantity || 0) * Number(item.unitCost || 0))
        }), { totalQty: 0, totalValue: 0 });
    }, [data]);

    const formatCurrency = (num) => Number(num).toLocaleString('th-TH', { minimumFractionDigits: 2 });
    const formatNumber = (num) => Number(num).toLocaleString('th-TH');

    if (loading) return <SystemLoader />;
    if (!data) return <NotFoundState />;

    return (
        <AuthGate>
            <style jsx global>{`
                @media print { @page { size: auto; margin: 5mm; } body { background: white !important; } .print-compact { zoom: 0.85; } }
            `}</style>

            <div className="max-w-6xl mx-auto space-y-6 pb-20 print:pb-0 print-compact">

                <div className="print:hidden px-4">
                    <Link href="/history" className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-[#1e3b8a] uppercase tracking-widest">
                        <ArrowLeft className="w-4 h-4" /> ย้อนกลับสู่ประวัติ
                    </Link>
                </div>

                <section className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-xl overflow-hidden print:shadow-none print:border-slate-300 print:rounded-2xl">

                    {/* Document Header */}
                    <div className="p-10 md:p-14 border-b border-slate-100 bg-slate-50/50 print:p-6 print:bg-white">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="space-y-4">
                                <h1 className="text-4xl font-black text-slate-950 tracking-tight">รายละเอียดการรับสินค้า</h1>
                                <p className="text-slate-500 text-sm font-bold flex items-center gap-2 italic">
                                    <FileCheck className="w-5 h-5 text-emerald-500" /> ตรวจรับและนำสินค้าเข้าคลังสำเร็จ
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 text-right min-w-62.5 print:p-2 print:border-none">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขที่ใบรับสินค้า (GR No.)</p>
                                <p className="text-3xl font-black text-[#1e3b8a]">{data.receiptNo}</p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Data Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-100">
                        <InfoItem icon={<Calendar className="text-blue-500" />} label="วันที่ทำรายการ" value={new Date(data.createdAt).toLocaleString('th-TH')} />
                        <InfoItem icon={<User className="text-indigo-500" />} label="ผู้ตรวจรับ (GR)" value={grUser} />
                        <InfoItem icon={<Building2 className="text-emerald-500" />} label="คู่ค้า (Supplier)" value={supplierDisplayName} />
                        <InfoItem icon={<Clipboard className="text-amber-500" />} label="อ้างอิงใบสั่งซื้อ" value={data.purchaseOrder?.poNumber || "-"} />
                        <InfoItem icon={<Info className="text-slate-500" />} label="หมายเหตุ" value={data.remarks || "ไม่มี"} bg="bg-slate-50/30" />
                    </div>

                    {/* 🚀 Transaction Flow Timeline (ครบ 4 ขั้นตอน) */}
                    <div className="p-10 border-b border-slate-100 bg-white print:p-6">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600" /> ขั้นตอนการดำเนินงาน (Audit Trail)
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
                            {/* เส้นเชื่อม */}
                            <div className="hidden md:block absolute top-6 left-[12%] right-[12%] h-0.5 border-t-2 border-dashed border-slate-100 -z-10"></div>

                            <FlowStep icon={<FileSignature className="text-amber-600" />} label="1. ผู้ขอซื้อ (PR)" name={prUser} sub={data?.purchaseOrder?.requisition?.prNumber} bg="bg-amber-50" />
                            <FlowStep icon={<UserCheck className="text-emerald-600" />} label="2. ผู้อนุมัติ (PR)" name={approverUser} sub="Verified" bg="bg-emerald-50" />
                            <FlowStep icon={<ShoppingCart className="text-indigo-600" />} label="3. ผู้สั่งซื้อ (PO)" name={poUser} sub={data?.purchaseOrder?.poNumber} bg="bg-indigo-50" />
                            <FlowStep icon={<Package className="text-blue-600" />} label="4. ผู้รับสินค้า (GR)" name={grUser} sub={data.receiptNo} bg="bg-blue-50" />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="p-8 md:p-12 bg-slate-50/30 print:p-4 print:bg-white">
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-800" /> รายการพัสดุในเอกสาร
                            </h2>
                        </div>
                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none">
                            <table className="min-w-full text-left">
                                <thead className="bg-slate-900 text-white print:bg-white print:text-black print:border-b-2">
                                    <tr className="text-[10px] font-black uppercase tracking-widest">
                                        <th className="p-6">รายการสินค้า</th>
                                        <th className="p-6">จัดเก็บที่</th>
                                        <th className="p-6 text-right">จำนวน</th>
                                        <th className="p-6 text-right">ทุน/หน่วย</th>
                                        <th className="p-6 text-right">รวม (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.items?.map((item) => (
                                        <tr key={item.id} className="text-sm font-bold text-slate-800">
                                            <td className="p-6">
                                                <p className="text-slate-950 uppercase">{item.product?.name}</p>
                                                <p className="text-[10px] text-blue-600 font-black mt-1 tracking-tighter">SKU: {item.product?.sku}</p>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-[11px] text-slate-900 font-black">{item.location?.warehouse?.name || "คลังหลัก"}</p>
                                                <p className="text-[10px] text-slate-400 uppercase">Loc: {item.location?.code}</p>
                                            </td>
                                            <td className="p-6 text-right tabular-nums">{formatNumber(item.quantity)}</td>
                                            <td className="p-6 text-right text-slate-400 tabular-nums">{formatCurrency(item.unitCost)}</td>
                                            <td className="p-6 text-right font-black text-blue-900 tabular-nums bg-slate-50/30">
                                                {formatCurrency(item.quantity * (item.unitCost || 0))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-900 bg-slate-50">
                                    <tr className="font-black">
                                        <td colSpan="2" className="p-6 text-right text-[10px] uppercase text-slate-400 tracking-widest">Grand Total Summary</td>
                                        <td className="p-6 text-right text-lg text-emerald-600">{formatNumber(totalQty)}</td>
                                        <td className="p-8"></td>
                                        <td className="p-6 text-right text-xl text-emerald-600 bg-emerald-50/50">฿{formatCurrency(totalValue)}</td>
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

// --- Internal UI Components ---

function InfoItem({ icon, label, value, bg = "" }) {
    return (
        <div className={`p-8 space-y-2 ${bg} print:p-3`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">{icon} {label}</p>
            <p className="text-[13px] font-black text-slate-800 leading-tight">{value}</p>
        </div>
    );
}

function FlowStep({ icon, label, name, sub, bg }) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center mb-3 shadow-md border-2 border-white`}>{icon}</div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-[11px] font-black text-slate-900 line-clamp-1">{name}</p>
            <p className="text-[9px] font-mono text-slate-400 mt-0.5">{sub || "-"}</p>
        </div>
    );
}

function SystemLoader() {
    return (
        <div className="flex flex-col justify-center items-center h-screen bg-[#f8fafc] gap-6">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-800 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[10px]">Verifying Document Integrity</p>
        </div>
    );
}

function NotFoundState() {
    return (
        <div className="p-20 text-center space-y-6 h-screen flex flex-col justify-center items-center">
            <ShieldCheck className="w-20 h-20 text-rose-500" />
            <h2 className="text-3xl font-black text-slate-950 uppercase italic">ไม่พบข้อมูลใบรับสินค้านี้</h2>
            <Link href="/history" className="bg-blue-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">ย้อนกลับ</Link>
        </div>
    );
}