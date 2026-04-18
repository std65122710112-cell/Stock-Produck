"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin, Printer, FileText, MoveRight, AlertTriangle, Warehouse } from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function TransferDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await apiFetch(`/api/transfer/${id}`, { method: "GET" });
        const finalData = res?.success ? res.data : res;
        if (finalData) setData(finalData);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเรียกข้อมูลเอกสาร", error);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  const getFullName = (userObj) => {
    return userObj?.firstName ? `${userObj.firstName} ${userObj.lastName || ""}`.trim() : "---";
  };

  const memoizedItems = useMemo(() => data?.items || [], [data]);

  const totalQty = useMemo(() => {
    return memoizedItems.reduce((acc, item) => ({
      shipped: acc.shipped + (item.shippedQty || 0),
      received: acc.received + (item.receivedQty || 0)
    }), { shipped: 0, received: 0 });
  }, [memoizedItems]);

  if (loading) return <SystemLoader />;
  if (!data) return <NotFoundState />;

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
        
        {/* คอนเทนเนอร์หลัก 1400px เพื่อลดช่องว่างข้างเครื่อง */}
        <div className="max-w-350 mx-auto space-y-6">
          
          {/* ปุ่มเครื่องมือและการนำทาง */}
          <div className="flex justify-between items-center print:hidden">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-slate-400 hover:text-[#1F3B8B] font-bold text-sm transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 
              กลับไปหน้าประวัติการเคลื่อนไหว
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
            >
              <Printer className="w-4 h-4" /> พิมพ์ใบโอนย้ายพัสดุ
            </button>
          </div>

          {/* แผ่นเอกสารหลัก (Single Sheet Paper Design) */}
          <div className="bg-white border border-slate-200 shadow-2xl rounded-sm overflow-hidden flex flex-col print:shadow-none print:border-slate-300 min-h-250">
            
            {/* 1. ส่วนหัวเอกสาร (Header) */}
            <div className="bg-[#1F3B8B] text-white p-10 md:p-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-4">
                   <MoveRight className="w-10 h-10 text-blue-300/40" /> รายละเอียดการโอนย้าย
                </h1>
                <p className="text-blue-200/80 text-sm font-bold uppercase tracking-[0.25em] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {data.status === 'COMPLETED' ? 'รายการยืนยันการรับสำเร็จ' : 'อยู่ระหว่างขั้นตอนการขนส่งภายใน'}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[11px] font-black text-blue-200/40 uppercase tracking-[0.4em] mb-2">เลขที่เอกสารการโอน</span>
                <span className="text-4xl font-black tabular-nums tracking-tighter leading-none">{data.transferNo}</span>
              </div>
            </div>

            {/* 2. ข้อมูลสรุปคลังต้นทาง-ปลายทาง (Movement Logic) */}
            <div className="p-10 md:p-14 grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-slate-100">
              <BillInfoItem label="วันที่บันทึกโอนย้าย" value={new Date(data.createdAt).toLocaleDateString('th-TH', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              }) + " น."} />
              
              <div className="flex items-center gap-8 md:col-span-2">
                <BillInfoItem label="คลังสินค้าต้นทาง (Origin)" value={data.items?.[0]?.fromLocation?.warehouse?.name || "ไม่ระบุ"} isPrimary />
                <div className="pt-6"><MoveRight size={24} className="text-slate-200" /></div>
                <BillInfoItem label="คลังสินค้าปลายทาง (Target)" value={data.items?.[0]?.toLocation?.warehouse?.name || "ไม่ระบุ"} isPrimary />
              </div>
            </div>

            {/* 3. รายละเอียดพนักงานผู้ทำรายการ (Personnel Audit) */}
            <div className="px-10 md:px-14 py-8 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-y-8 justify-between items-center">
               <AuditGroup label="พนักงานผู้จ่ายโอน (Issuer)" value={getFullName(data.issuedUser)} />
               <AuditGroup label="พนักงานผู้ตรวจรับ (Receiver)" value={data.receivedAt ? getFullName(data.receivedUser) : "--- รอการรับพัสดุ ---"} />
               <div className="flex flex-col gap-2 text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะกระบวนการ</span>
                  <div className={`px-5 py-1.5 rounded-full border-2 font-black text-xs uppercase tracking-tighter bg-white shadow-sm ${data.status === 'COMPLETED' ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}`}>
                    {data.status === 'COMPLETED' ? 'โอนย้ายสำเร็จ (COMPLETED)' : 'ระหว่างขนส่ง (SHIPPED)'}
                  </div>
               </div>
            </div>

            {/* 4. ตารางรายการสินค้าโอนย้าย (Transfer Manifest) */}
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b-4 border-slate-900">
                    <th className="px-14 py-6 text-left text-[12px] font-black uppercase tracking-widest text-slate-900">รายการพัสดุและรหัสสินค้า</th>
                    <th className="px-6 py-6 text-left text-[12px] font-black uppercase tracking-widest text-slate-900">จากช่อง {'>'} ไปยังช่อง</th>
                    <th className="px-6 py-6 text-center text-[12px] font-black uppercase tracking-widest text-slate-900">ยอดส่ง</th>
                    <th className="px-6 py-6 text-center text-[12px] font-black uppercase tracking-widest text-slate-900">ยอดรับจริง</th>
                    <th className="px-14 py-6 text-right text-[12px] font-black uppercase tracking-widest text-slate-900">ผลต่าง (Loss)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memoizedItems.map((item) => {
                    const diff = item.receivedQty !== null ? item.receivedQty - item.shippedQty : 0;
                    return (
                      <tr key={item.id} className={`${diff < 0 ? 'bg-rose-50/30' : 'hover:bg-slate-50/20'}`}>
                        <td className="px-14 py-8">
                          <div className="flex flex-col gap-1">
                            <span className="text-[15px] font-black text-slate-950 uppercase">{item.product?.name}</span>
                            <span className="text-[11px] font-black text-indigo-600 tracking-tighter uppercase">รหัส: {item.product?.sku}</span>
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex flex-col gap-1.5 text-[11px] font-bold">
                             <div className="text-rose-500 flex items-center gap-1.5">
                               <Warehouse size={12} className="opacity-40" /> {item.fromLocation?.code}
                             </div>
                             <div className="text-emerald-600 flex items-center gap-1.5">
                               <MapPin size={12} className="opacity-40" /> {item.toLocation?.code}
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-8 text-center font-black text-slate-900 tabular-nums text-lg">
                          {item.shippedQty?.toLocaleString()}
                        </td>
                        <td className="px-6 py-8 text-center font-black text-slate-900 tabular-nums text-lg">
                          {item.receivedQty !== null ? item.receivedQty?.toLocaleString() : "--"}
                        </td>
                        <td className="px-14 py-8 text-right">
                          {item.receivedQty !== null ? (
                            <span className={`text-lg font-black tabular-nums ${diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                               {diff === 0 ? 'ครบถ้วน' : diff}
                            </span>
                          ) : <span className="text-slate-200">รอยืนยัน</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. ส่วนสรุปท้ายบิลและการเซ็นชื่อ (Footer Summary) */}
            <div className="border-t-4 border-slate-900 bg-slate-50 p-10 md:p-14 flex flex-col md:flex-row justify-between gap-16">
              <div className="max-w-xl space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">สาเหตุการโอนย้ายพัสดุ (Transfer Reason)</span>
                <p className="text-base font-bold text-slate-700 leading-relaxed italic border-l-4 border-slate-200 pl-6 py-2">
                  {data.reason || "เป็นการโอนย้ายพัสดุตามปกติเพื่อปรับปรุงการจัดเก็บหรือเตรียมเบิกจ่าย"}
                </p>
                {/* Security Alert (กรณีมียอดหาย) */}
                {memoizedItems.some(it => it.receivedQty !== null && it.receivedQty < it.shippedQty) && (
                   <div className="mt-6 flex items-center gap-3 text-rose-600 bg-white border border-rose-100 p-4 rounded-xl shadow-sm">
                      <AlertTriangle size={24} className="shrink-0" />
                      <p className="text-xs font-black uppercase">แจ้งเตือน: ตรวจพบยอดพัสดุขาดหายระหว่างการโอนย้าย โปรดตรวจสอบความปลอดภัยทันที</p>
                   </div>
                )}
              </div>
              
              <div className="space-y-6 min-w-[320px]">
                <div className="flex justify-between items-center text-slate-500 border-b border-slate-200 pb-4">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">จำนวนรวมทั้งหมดที่ส่ง</span>
                  <span className="text-xl font-black tabular-nums text-slate-900">{totalQty.shipped?.toLocaleString()} หน่วย</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-[13px] font-black uppercase tracking-[0.5em] text-[#1F3B8B] mb-2">สรุปยอดรับจริง</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 mr-3">หน่วย / Unit</span>
                    <span className="text-5xl font-black text-[#1F3B8B] tabular-nums tracking-tighter">
                      {totalQty.received?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ส่วนลายเซ็นสำหรับการพิมพ์ (Print Only) */}
            <div className="hidden print:grid grid-cols-2 gap-24 px-14 pb-24 mt-24 text-center">
               <div className="space-y-12">
                  <div className="border-b-2 border-slate-900 pb-2"></div>
                  <p className="text-[11px] font-black uppercase tracking-widest">พนักงานผู้ส่งมอบต้นทาง (Issuer)</p>
               </div>
               <div className="space-y-12">
                  <div className="border-b-2 border-slate-900 pb-2"></div>
                  <p className="text-[11px] font-black uppercase tracking-widest">พนักงานผู้รับมอบปลายทาง (Receiver)</p>
               </div>
            </div>
          </div>

          <div className="text-center pt-6 pb-12 opacity-30">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.6em]">
              Internal Asset Transfer Ledger • TJC Group Enterprise Portal
            </p>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

// --- ฟังก์ชันเสริม (Internal Components) ---

function BillInfoItem({ label, value, isPrimary = false }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 w-fit">{label}</p>
      <p className={`text-[17px] font-bold ${isPrimary ? "text-[#1F3B8B]" : "text-slate-950"} leading-tight tracking-tight`}>
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
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">กำลังเรียกข้อมูลเอกสารการโอนย้ายพัสดุ...</p>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="h-screen flex flex-col justify-center items-center text-center bg-white p-12 space-y-8">
      <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
         <FileText className="w-12 h-12 text-rose-500 opacity-40" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">ไม่พบข้อมูลเอกสารในระบบ</h2>
      <button onClick={() => window.history.back()} className="px-10 py-4 bg-[#1F3B8B] text-white font-black text-xs uppercase tracking-[0.4em] rounded-sm hover:bg-slate-900 transition-all shadow-2xl">
        ย้อนกลับไปหน้าประวัติ
      </button>
    </div>
  );
}