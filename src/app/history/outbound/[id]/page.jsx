"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin, Printer, FileText, Banknote } from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function DeliveryOrderDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await apiFetch(`/outbound/delivery-orders/${id}`, { method: "GET" });
        if (res) setData(res.data || res);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร", error);
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

  const { totalQty, totalValue } = useMemo(() => {
    return memoizedItems.reduce((acc, item) => ({
      totalQty: acc.totalQty + Number(item.quantity || 0),
      totalValue: acc.totalValue + (Number(item.quantity || 0) * (item.product?.unitCost || 0))
    }), { totalQty: 0, totalValue: 0 });
  }, [memoizedItems]);

  if (loading) return <SystemLoader />;
  if (!data) return <NotFoundState />;

  return (
    <AuthGate>
      <Toaster position="top-right" />
      {/* ปรับพื้นหลังเป็นสีเทาอ่อนเพื่อให้ตัวบิลสีขาวดูเด่นขึ้น */}
      <div className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0">
        
        {/* ขยายความกว้างเป็น 1400px เพื่อแก้ปัญหาขอบข้างว่างเกินไป */}
        <div className="max-w-350 mx-auto space-y-6">
          
          {/* แถบเครื่องมือด้านบน (ซ่อนเวลาพิมพ์) */}
          <div className="flex justify-between items-center print:hidden">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-slate-400 hover:text-[#1F3B8B] font-bold text-sm transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 
              กลับสู่หน้าประวัติการเคลื่อนไหว
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
            >
              <Printer className="w-4 h-4" /> พิมพ์ใบนำจ่ายพัสดุ (DO)
            </button>
          </div>

          {/* แผ่นเอกสาร (Single Sheet Paper Design) */}
          <div className="bg-white border border-slate-200 shadow-2xl rounded-sm overflow-hidden flex flex-col print:shadow-none print:border-slate-300 min-h-250">
            
            {/* 1. ส่วนหัวบิลสี Navy เข้ม */}
            <div className="bg-[#1F3B8B] text-white p-10 md:p-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">ใบนำจ่ายสินค้า (DO)</h1>
                <p className="text-blue-200/80 text-xs font-bold uppercase tracking-[0.25em] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> ตัดยอดสต๊อกและตรวจสอบรายการสำเร็จแล้ว
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[11px] font-black text-blue-200/50 uppercase tracking-[0.4em] mb-2">เลขที่ใบนำจ่าย</span>
                <span className="text-4xl font-black tabular-nums tracking-tighter leading-none">{data.doNo}</span>
              </div>
            </div>

            {/* 2. ข้อมูลหัวเอกสาร (Grid 3 Columns) */}
            <div className="p-10 md:p-14 grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-slate-100">
              <BillInfoItem label="วันที่จ่ายพัสดุออก" value={new Date(data.createdAt).toLocaleDateString('th-TH', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              }) + " น."} />
              <BillInfoItem label="แผนก/หน่วยงานที่เบิก" value={data.requisition?.department?.name || "สำนักงานส่วนกลาง"} />
              <BillInfoItem label="เลขอ้างอิงใบเบิก (SR)" value={data.reference || "รายการเบิกจ่ายโดยตรง"} isPrimary />
            </div>

            {/* 3. ขั้นตอนพนักงาน (Audit Trail) */}
            <div className="px-10 md:px-14 py-8 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-y-8 justify-between items-center">
               <AuditGroup label="ผู้ทำรายการขอเบิก" value={getFullName(data.requisition?.user)} />
               <AuditGroup label="ผู้อนุมัติใบเบิกสินค้า" value={getFullName(data.requisition?.approver)} />
               <AuditGroup label="เจ้าหน้าที่คลังผู้จ่ายของ" value={getFullName(data.user)} isMain />
               <div className="flex flex-col gap-2 text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะงานปัจจุบัน</span>
                  <span className="text-[12px] font-black text-emerald-600 px-5 py-1.5 rounded-full border-2 border-emerald-500 bg-white inline-block shadow-sm">
                    จ่ายพัสดุสำเร็จ (DISPATCHED)
                  </span>
               </div>
            </div>

            {/* 4. ตารางรายการสินค้า (Full Width Table) */}
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b-4 border-slate-900">
                    <th className="px-14 py-6 text-left text-[12px] font-black uppercase tracking-widest text-slate-900">รายละเอียดพัสดุและรหัสสินค้า</th>
                    <th className="px-6 py-6 text-left text-[12px] font-black uppercase tracking-widest text-slate-900">ตำแหน่งจัดเก็บ</th>
                    <th className="px-6 py-6 text-center text-[12px] font-black uppercase tracking-widest text-slate-900">จำนวนที่เบิก</th>
                    <th className="px-6 py-6 text-right text-[12px] font-black uppercase tracking-widest text-slate-900">ทุน/หน่วย</th>
                    <th className="px-14 py-6 text-right text-[12px] font-black uppercase tracking-widest text-slate-900">รวม (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memoizedItems.map((item) => {
                    const unitCost = item.product?.unitCost || 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-14 py-8">
                          <div className="flex flex-col gap-1">
                            <span className="text-[15px] font-black text-slate-950 uppercase">{item.product?.name}</span>
                            <span className="text-[11px] font-black text-blue-600 tracking-tighter uppercase">รหัสสินค้า: {item.product?.sku}</span>
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
                             <MapPin className="w-3.5 h-3.5 text-rose-400 opacity-60" />
                             {item.location?.warehouse?.name || "คลังสินค้า"} ({item.location?.code})
                          </div>
                        </td>
                        <td className="px-6 py-8 text-center font-black text-slate-900 tabular-nums text-lg">
                          {item.quantity?.toLocaleString()} <span className="text-[10px] text-slate-400 ml-1 font-bold">{item.product?.unit?.name || 'หน่วย'}</span>
                        </td>
                        <td className="px-6 py-8 text-right text-slate-500 tabular-nums font-bold">
                          {unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-14 py-8 text-right font-black text-slate-900 tabular-nums text-lg bg-slate-50/10">
                          {(item.quantity * unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. ส่วนสรุปท้ายบิล (Footer) */}
            <div className="border-t-4 border-slate-900 bg-slate-50 p-10 md:p-14 flex flex-col md:flex-row justify-between gap-12">
              <div className="max-w-xl space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">วัตถุประสงค์ในการเบิกจ่าย</span>
                <p className="text-base font-bold text-slate-700 leading-relaxed italic border-l-4 border-slate-200 pl-6 py-1">
                  {data.requisition?.purpose || "เพื่อใช้ในโครงการหรืองานฝ่ายดำเนินงานตามใบขอเบิกพัสดุที่ได้รับอนุมัติ"}
                </p>
              </div>
              
              <div className="space-y-6 min-w-[320px]">
                <div className="flex justify-between items-center text-slate-500 border-b border-slate-200 pb-4">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">รวมจำนวนพัสดุทั้งหมด</span>
                  <span className="text-xl font-black tabular-nums text-slate-950">{totalQty?.toLocaleString()} หน่วย</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-[13px] font-black uppercase tracking-[0.5em] text-[#1F3B8B] mb-2">ยอดรวมมูลค่าสุทธิ</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 mr-3">THB / บาท</span>
                    <span className="text-5xl font-black text-[#1F3B8B] tabular-nums tracking-tighter">
                      {totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ส่วนลายเซ็นสำหรับการพิมพ์ (Print Only) */}
            <div className="hidden print:grid grid-cols-3 gap-16 px-14 pb-24 mt-24 text-center">
               <div className="space-y-12">
                  <div className="border-b-2 border-slate-900 pb-2"></div>
                  <p className="text-[11px] font-black uppercase tracking-widest">พนักงานผู้เบิกพัสดุ</p>
               </div>
               <div className="space-y-12">
                  <div className="border-b-2 border-slate-900 pb-2"></div>
                  <p className="text-[11px] font-black uppercase tracking-widest">เจ้าหน้าที่คลังผู้จ่าย</p>
               </div>
               <div className="space-y-12">
                  <div className="border-b-2 border-slate-900 pb-2"></div>
                  <p className="text-[11px] font-black uppercase tracking-widest">ผู้อนุมัติ (Authorized)</p>
               </div>
            </div>
          </div>

          {/* ข้อมูลระบบด้านล่างสุด */}
          <div className="text-center pt-4 pb-12 opacity-30">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.6em]">
              Inventory Management Registry • TJC Group Enterprise Portal
            </p>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

// --- ส่วนประกอบย่อย (Internal Components) ---

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
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">กำลังเรียกข้อมูลเอกสารเบิกจ่ายสินค้า...</p>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="h-screen flex flex-col justify-center items-center text-center bg-white p-12 space-y-8">
      <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
         <FileText className="w-12 h-12 text-rose-500 opacity-40" />
      </div>
      <h2 className="text-3xl font-black text-slate-950 tracking-tight uppercase italic">ไม่พบข้อมูลเอกสาร DO ในระบบ</h2>
      <button onClick={() => window.history.back()} className="px-10 py-4 bg-[#1F3B8B] text-white font-black text-xs uppercase tracking-[0.4em] rounded-sm hover:bg-slate-900 transition-all shadow-2xl">
        ย้อนกลับไปหน้าประวัติ
      </button>
    </div>
  );
}