"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import {
    ArrowLeft, Printer, Truck, User, Calendar, Hash, Info,
    Package, MapPin, CheckCircle2, Activity, AlertTriangle,
    Clock, UserCheck, MoveRight, Database, ChevronRight, Warehouse as WhIcon
} from "lucide-react";

export default function TransferDetailPage({ params }) {
    const { id } = use(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function loadDetail() {
            try {
                const res = await apiFetch(`/api/transfer/${id}`, { method: "GET" });
                const finalData = res?.success ? res.data : res;
                if (isMounted && finalData) setData(finalData);
            } catch (error) {
                console.error("Load Error:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadDetail();
        return () => { isMounted = false; };
    }, [id]);

    const memoizedItems = useMemo(() => data?.items || [], [data]);

    // 💡 ฟังก์ชันช่วยแสดงชื่อตำแหน่งแบบแยกส่วนประกอบ (ละเอียดพิเศษ)
    const renderDetailedLocation = (loc, colorClass = "text-slate-600") => {
        if (!loc) return <span className="text-slate-300">ไม่ระบุตำแหน่ง</span>;
        return (
            <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                    <WhIcon size={12} className="text-slate-400" />
                    <span className="font-black text-[11px] text-slate-900 uppercase">
                        {loc.warehouse?.name} ({loc.warehouse?.code})
                    </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">โซน: {loc.zone?.name || loc.zone?.code || 'ทั่วไป'}</span>
                    <span className={`${colorClass} font-black underline underline-offset-2`}>ตำแหน่ง: {loc.code}</span>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-screen space-y-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Transaction Details...</p>
        </div>
    );

    if (!data) return (
        <div className="h-screen flex flex-col items-center justify-center space-y-6">
            <AlertTriangle size={48} className="text-rose-500" />
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">404 - ไม่พบข้อมูลเอกสาร</h2>
            <Link href="/inventory/transfer/history" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase transition-all hover:bg-slate-800">กลับไปหน้าประวัติ</Link>
        </div>
    );

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { background: white !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6 print:py-0 print:px-0">

                {/* --- Top Navbar --- */}
                <div className="flex items-center justify-between no-print">
                    <Link href="/history" className="flex items-center gap-2 text-slate-400 hover:text-slate-950 transition-all font-black text-[10px] uppercase tracking-[0.2em]">
                        <ArrowLeft size={16} /> Back to history
                    </Link>
                </div>

                {/* --- Main Document --- */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden print:border-2 print:border-slate-950 print:rounded-none">

                    {/* Header: Status Bar */}
                    <div className={`p-3 text-center text-white text-[10px] font-black uppercase tracking-[0.5em] ${data.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        {data.status === 'COMPLETED' ? 'Transaction Completed & Verified' : 'Logistics In-Transit Process'}
                    </div>

                    {/* Section 1: Identity & Summary */}
                    <div className="p-10 md:p-14 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row justify-between items-start gap-10">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                                <Activity size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Internal Asset Transfer</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">รายละเอียดใบโอนย้าย</h1>
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> {new Date(data.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                <span className="flex items-center gap-2"><Clock size={14} className="text-slate-400" /> {new Date(data.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                            </div>
                        </div>

                        <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl min-w-[300px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Database size={60} /></div>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">Reference ID (TO)</p>
                            <h2 className="text-4xl font-black font-mono tracking-tighter uppercase">{data.transferNo}</h2>
                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase opacity-50 tracking-widest">Current Node:</span>
                                <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${data.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {data.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Flow Summary Card */}
                    <div className="px-10 py-8 border-b border-slate-100 bg-white">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20">
                            {/* Origin WH Summary */}
                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">คลังต้นทาง (Origin)</p>
                                <p className="text-lg font-black text-slate-800 uppercase">{data.items?.[0]?.fromLocation?.warehouse?.name || 'N/A'}</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <MoveRight size={32} className="text-slate-200" />
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mt-1">In-Transit</span>
                            </div>
                            {/* Target WH Summary */}
                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">คลังปลายทาง (Destination)</p>
                                <p className="text-lg font-black text-slate-800 uppercase">{data.items?.[0]?.toLocation?.warehouse?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Personnel Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b border-slate-100">
                        {/* Issued By */}
                        <div className="p-10 space-y-4">
                            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Truck size={14} /> Outbound Verification
                            </h3>
                            <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-500"><User size={24} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ผู้ส่ง (Issued By)</p>
                                    <p className="text-sm font-black text-slate-800 uppercase italic">{data.issuedUser?.firstName} {data.issuedUser?.lastName}</p>
                                </div>
                            </div>
                        </div>
                        {/* Received By */}
                        <div className="p-10 space-y-4">
                            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserCheck size={14} /> Inbound Verification
                            </h3>
                            {data.receivedAt ? (
                                <div className="flex items-center gap-4 bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100 shadow-inner">
                                    <div className="w-12 h-12 rounded-full bg-white border border-emerald-200 flex items-center justify-center text-emerald-500"><UserCheck size={24} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">ผู้รับ (Received By)</p>
                                        <p className="text-sm font-black text-slate-800 uppercase italic">{data.receivedUser?.firstName} {data.receivedUser?.lastName}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center p-5 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-[10px] font-black uppercase tracking-widest italic">
                                    -- อยู่ระหว่างรอการยืนยันปลายทาง --
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Items Manifest (The Detail) */}
                    <div className="p-10 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-900 text-white rounded-2xl"><Package size={20} /></div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-950 underline decoration-slate-200 underline-offset-8">ตารางรายละเอียดพัสดุรายตำแหน่ง</h2>
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="p-6">ข้อมูลพัสดุ (SKU / Name)</th>
                                        <th className="p-6">ต้นทาง (Origin)</th>
                                        <th className="p-6">ปลายทาง (Target)</th>
                                        <th className="p-6 text-center">ยอดส่ง</th>
                                        <th className="p-6 text-center">ยอดรับจริง</th>
                                        <th className="p-6 text-center">ส่วนต่าง</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {memoizedItems.map((item) => {
                                        const diff = item.receivedQty !== null ? item.receivedQty - item.shippedQty : 0;
                                        const isMissing = diff < 0;
                                        return (
                                            <tr key={item.id} className={`hover:bg-slate-50/80 transition-all ${isMissing ? 'bg-rose-50/40' : ''}`}>
                                                <td className="p-6 align-top">
                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight mb-1">{item.product.name}</p>
                                                    <span className="text-[10px] font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shadow-sm">SKU: {item.product.sku}</span>
                                                </td>
                                                <td className="p-6 align-top">
                                                    {renderDetailedLocation(item.fromLocation, "text-rose-500")}
                                                </td>
                                                <td className="p-6 align-top">
                                                    {renderDetailedLocation(item.toLocation, "text-emerald-600")}
                                                </td>
                                                <td className="p-6 text-center align-middle">
                                                    <p className="text-lg font-black font-mono text-slate-700">{item.shippedQty}</p>
                                                </td>
                                                <td className="p-6 text-center align-middle">
                                                    <p className={`text-lg font-black font-mono ${item.receivedQty === null ? 'text-slate-200' : 'text-slate-900'}`}>
                                                        {item.receivedQty !== null ? item.receivedQty : '--'}
                                                    </p>
                                                </td>
                                                <td className="p-6 text-center align-middle">
                                                    {item.receivedQty !== null ? (
                                                        <div className={`inline-flex px-4 py-1 rounded-xl text-[11px] font-black tabular-nums shadow-sm ${isMissing ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                                            {diff === 0 ? 'ครบถ้วน' : diff}
                                                        </div>
                                                    ) : <span className="text-slate-200 font-black">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 5: Security Alerts */}
                    {memoizedItems.some(it => it.receivedQty !== null && it.receivedQty < it.shippedQty) && (
                        <div className="mx-10 mb-10 p-8 bg-slate-950 rounded-[2.5rem] flex items-center gap-8 text-white border-l-[10px] border-rose-600 shadow-2xl">
                            <div className="p-4 bg-rose-600 rounded-2xl shadow-lg shadow-rose-600/30"><AlertTriangle size={32} /></div>
                            <div>
                                <h4 className="text-base font-black uppercase tracking-[0.2em] text-rose-500 mb-1">Security Audit Notification (ตรวจพบยอดขาด)</h4>
                                <p className="text-xs text-slate-400 font-bold leading-relaxed">ตรวจพบสินค้าขาดหายระหว่างกระบวนการจัดส่งภายใน (Discrepancy Detected) ระบบได้ทำการล็อกข้อมูลพนักงานที่เกี่ยวข้องและประทับเวลาเพื่อใช้ในการสอบสวนความปลอดภัยเรียบร้อยแล้ว</p>
                            </div>
                        </div>
                    )}

                    {/* Section 6: Document Remark & Signature */}
                    <div className="p-10 md:p-14 bg-slate-50/50 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info size={14} /> หมายเหตุเพิ่มเติม (Remarks)</p>
                                <div className="p-6 bg-white rounded-3xl border border-slate-200 text-sm font-bold text-slate-600 leading-relaxed min-h-[120px] shadow-inner">
                                    {data.reason || "ไม่ระบุข้อมูลหมายเหตุสำหรับรายการนี้"}
                                </div>
                            </div>
                            {/* Signatures for Print Only */}
                            <div className="grid grid-cols-2 gap-6 items-end hidden print:grid pb-6">
                                <div className="text-center space-y-14">
                                    <div className="border-b-2 border-slate-900 w-full" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">เจ้าหน้าที่ผู้โอน (ISSUER)</p>
                                </div>
                                <div className="text-center space-y-14">
                                    <div className="border-b-2 border-slate-900 w-full" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">เจ้าหน้าที่ผู้รับ (RECEIVER)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Footer Ledgers --- */}
                <div className="text-center pt-8 opacity-40 no-print">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                        <Database size={14} /> Secure Internal Asset Ledger • TJC Group 2026 • Ledger ID: {id.slice(0, 13).toUpperCase()}
                    </p>
                </div>
            </div>
        </AuthGate>
    );
}