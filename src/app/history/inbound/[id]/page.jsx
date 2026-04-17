"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin, Printer, FileText } from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function GoodsReceiptDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await apiFetch(`/inventory/receipt/${id}`, { method: "GET" });
        if (res) setData(res);
      } catch (error) {
        console.error("Load Error", error);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  const getFullName = (userObj) => {
    return userObj?.firstName ? `${userObj.firstName} ${userObj.lastName || ""}`.trim() : "---";
  };

  const { totalQty, totalValue } = useMemo(() => {
    if (!data?.items) return { totalQty: 0, totalValue: 0 };
    return data.items.reduce((acc, item) => ({
      totalQty: acc.totalQty + Number(item.quantity || 0),
      totalValue: acc.totalValue + (Number(item.quantity || 0) * Number(item.unitCost || 0))
    }), { totalQty: 0, totalValue: 0 });
  }, [data]);

  if (loading) return <SystemLoader />;
  if (!data) return <NotFoundState />;

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
        
        {/* คอนเทนเนอร์หลักที่ขยายกว้างขึ้นเพื่อลดช่องว่างข้างเครื่อง */}
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* แถบนำทางและเครื่องมือ */}
          <div className="flex justify-between items-center print:hidden">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-slate-400 hover:text-[#1F3B8B] font-bold text-sm transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 
              กลับไปหน้ารวมประวัติ
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" /> พิมพ์ใบตรวจรับสินค้า
            </button>
          </div>

          {/* แผ่นเอกสารหลัก (Single Sheet Bill Design) */}
          <div className="bg-white border border-slate-200 shadow-2xl rounded-sm overflow-hidden flex flex-col print:shadow-none print:border-slate-300">
            
            {/* ส่วนหัวเอกสาร (Navy Header) */}
            <div className="bg-[#1F3B8B] text-white p-10 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-4">
                   <FileText className="w-10 h-10 text-blue-300/50" /> รายละเอียดใบรับสินค้า
                </h1>
                <p className="text-blue-200/70 text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> สินค้าถูกนำเข้าคลังและตรวจสอบสถานะเรียบร้อยแล้ว
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[11px] font-black text-blue-200/40 uppercase tracking-[0.4em] mb-2">เลขที่เอกสาร / Document No.</span>
                <span className="text-4xl font-black tabular-nums tracking-tighter leading-none">{data.receiptNo}</span>
              </div>
            </div>

            {/* ส่วนข้อมูลพรรณนา (Information Matrix) */}
            <div className="p-10 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-slate-100">
              <BillInfoItem label="วันที่รับสินค้าสำเร็จ" value={new Date(data.createdAt).toLocaleDateString('th-TH', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              }) + " น."} />
              <BillInfoItem label="ชื่อบริษัทคู่ค้า / ผู้จำหน่าย" value={data?.purchaseOrder?.supplier?.name || data?.purchaseOrder?.vendorName || "ไม่พบข้อมูลคู่ค้า"} />
              <BillInfoItem label="เลขอ้างอิงใบสั่งซื้อ (PO)" value={data.purchaseOrder?.poNumber || "รับเข้าโดยตรง (Manual)"} isPrimary />
            </div>

            {/* ส่วนบันทึกการตรวจสอบ (Workflow Audit) - บรรทัดเดียวเต็มแผ่น */}
            <div className="px-10 md:px-12 py-8 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-y-8 justify-between items-center">
               <AuditGroup label="ผู้ทำรายการขอซื้อ (PR)" value={getFullName(data?.purchaseOrder?.requisition?.user)} />
               <AuditGroup label="พนักงานจัดซื้อ (PO)" value={getFullName(data?.purchaseOrder?.user)} />
               <AuditGroup label="ผู้ตรวจรับพัสดุเข้าคลัง (GR)" value={getFullName(data?.user)} active />
               <div className="flex flex-col gap-2 text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะเอกสารปัจจุบัน</span>
                  <div className="px-5 py-1.5 rounded-full border-2 border-emerald-500 text-emerald-600 font-black text-xs uppercase tracking-tighter bg-white shadow-sm">
                    รายการสำเร็จ (Received)
                  </div>
               </div>
            </div>

            {/* ส่วนรายการสินค้า (Items Table) */}
            <div className="flex-1 min-h-[400px]">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b-4 border-slate-900">
                    <th className="px-12 py-6 text-left text-[12px] font-black uppercase tracking-widest text-slate-900">รายละเอียดพัสดุและรหัสสินค้า</th>
                    <th className="px-6 py-6 text-left text-[12px] font-black uppercase tracking-widest text-slate-900">คลังเก็บสินค้า</th>
                    <th className="px-6 py-6 text-center text-[12px] font-black uppercase tracking-widest text-slate-900">จำนวนที่รับ</th>
                    <th className="px-6 py-6 text-right text-[12px] font-black uppercase tracking-widest text-slate-900">ราคาทุน/หน่วย</th>
                    <th className="px-12 py-6 text-right text-[12px] font-black uppercase tracking-widest text-slate-900">ยอดรวมสุทธิ (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-12 py-8">
                        <div className="flex flex-col gap-1">
                          <span className="text-[15px] font-black text-slate-950 uppercase">{item.product?.name}</span>
                          <span className="text-[11px] font-black text-blue-600 tracking-tighter bg-blue-50 w-fit px-2 py-0.5 rounded">
                            รหัส: {item.product?.sku}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-8">
                        <div className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
                           <MapPin className="w-4 h-4 text-rose-500 opacity-60" />
                           {item.location?.warehouse?.name || "คลังหลัก"} ({item.location?.code})
                        </div>
                      </td>
                      <td className="px-6 py-8 text-center font-black text-slate-900 tabular-nums text-lg">
                        {item.quantity?.toLocaleString()}
                      </td>
                      <td className="px-6 py-8 text-right text-slate-500 tabular-nums font-bold">
                        {item.unitCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-12 py-8 text-right font-black text-slate-900 tabular-nums text-lg bg-slate-50/30">
                        {(item.quantity * (item.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ส่วนสรุปผลและลายเซ็น (Footer Summary) */}
            <div className="border-t-4 border-slate-900 bg-slate-50 p-12 flex flex-col md:flex-row justify-between gap-16">
              <div className="max-w-xl space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">หมายเหตุการตรวจรับ (Audit Remarks)</span>
                <p className="text-base font-bold text-slate-700 leading-relaxed italic border-l-4 border-slate-200 pl-6 py-2">
                  {data.remarks || "ไม่มีข้อความระบุเพิ่มเติมสำหรับรายการนี้"}
                </p>
              </div>
              
              <div className="space-y-6 min-w-[320px]">
                <div className="flex justify-between items-center text-slate-500 border-b border-slate-200 pb-4">
                  <span className="text-[11px] font-black uppercase tracking-widest">รวมจำนวนพัสดุทั้งสิ้น</span>
                  <span className="text-xl font-black tabular-nums text-slate-900">{totalQty?.toLocaleString()} หน่วย</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] text-[#1F3B8B] mb-2">ยอดรวมราคาสุทธิ</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 mr-3">บาท / THB</span>
                    <span className="text-5xl font-black text-[#1F3B8B] tabular-nums tracking-tighter">
                      {totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* บันทึกท้ายใบเสร็จ */}
          <div className="text-center pt-6 pb-12 opacity-40">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.6em]">
               Stock Management System • Official Digital Registry • TJC Group Corporate
            </p>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

// --- Internal Support Components ---

function BillInfoItem({ label, value, isPrimary = false }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 w-fit">{label}</p>
      <p className={`text-[17px] font-bold ${isPrimary ? "text-[#1F3B8B]" : "text-slate-900"} leading-tight tracking-tight`}>
        {value}
      </p>
    </div>
  );
}

function AuditGroup({ label, value, active = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-[15px] font-black ${active ? "text-[#1F3B8B]" : "text-slate-700"} tracking-tight`}>{value}</span>
    </div>
  );
}

function SystemLoader() {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-white gap-6">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1F3B8B] rounded-full animate-spin"></div>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">กำลังประมวลผลเอกสารบิลดิจิทัล...</p>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="h-screen flex flex-col justify-center items-center text-center bg-white p-12 space-y-8">
      <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
         <FileText className="w-12 h-12 text-rose-500 opacity-40" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">ไม่พบข้อมูลเอกสารในฐานข้อมูล</h2>
      <button 
        onClick={() => window.history.back()} 
        className="px-10 py-4 bg-[#1F3B8B] text-white font-black text-xs uppercase tracking-[0.3em] rounded-sm hover:bg-slate-900 transition-all shadow-xl"
      >
        ย้อนกลับ
      </button>
    </div>
  );
}