"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Printer,
  FileText,
  Banknote,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function DeliveryOrderDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await apiFetch(`/outbound/delivery-orders/${id}`, {
          method: "GET",
        });
        if (res) setData(res.data || res);
      } catch (error) {
        console.error("Load Error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  const getFullName = (userObj) => {
    return userObj?.firstName
      ? `${userObj.firstName} ${userObj.lastName || ""}`.trim()
      : "---";
  };

  const memoizedItems = useMemo(() => data?.items || [], [data]);

  const { totalQty, totalValue } = useMemo(() => {
    return memoizedItems.reduce(
      (acc, item) => ({
        totalQty: acc.totalQty + Number(item.quantity || 0),
        totalValue:
          acc.totalValue +
          Number(item.quantity || 0) * (item.product?.unitCost || 0),
      }),
      { totalQty: 0, totalValue: 0 },
    );
  }, [memoizedItems]);

  if (loading) return <SystemLoader />;
  if (!data) return <NotFoundState />;

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-slate-50 py-10 px-4 print:bg-white print:py-0">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* --- แถบปุ่มควบคุม (ซ่อนเวลาพิมพ์) --- */}
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
              className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
            >
              <Printer className="w-4 h-4" /> พิมพ์ใบนำจ่ายสินค้า
            </button>
          </div>

          {/* --- ตัวแผ่นเอกสาร (Main Paper) --- */}
          <div className="bg-white border border-slate-200 shadow-2xl rounded-sm overflow-hidden flex flex-col print:shadow-none print:border-slate-300 min-h-[1100px]">
            {/* 1. ส่วนหัวเอกสาร (Header) */}
            <div className="bg-[#1F3B8B] text-white p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  <FileText className="w-10 h-10 text-blue-300/40" />{" "}
                  ใบนำจ่ายสินค้า (DO)
                </h1>
                <p className="text-blue-200/80 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />{" "}
                  ตัดยอดสต๊อกและทำรายการสำเร็จแล้ว
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-black text-blue-200/50 uppercase tracking-[0.3em] mb-1">
                  เลขที่ใบนำจ่าย
                </span>
                <span className="text-3xl font-black tabular-nums tracking-tight">
                  {data.doNo}
                </span>
              </div>
            </div>

            {/* 2. ข้อมูลพรรณนา (Header Info Matrix) */}
            <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-slate-100">
              <BillInfoItem
                label="วันที่จ่ายออก"
                value={
                  new Date(data.createdAt).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) + " น."
                }
              />
              <BillInfoItem
                label="แผนกที่เบิกจ่าย"
                value={data.requisition?.department?.name || "ไม่ระบุแผนก"}
              />
              <BillInfoItem
                label="เลขอ้างอิงใบเบิก (SR)"
                value={data.reference || "เบิกจ่ายโดยตรง"}
                isPrimary
              />
            </div>

            {/* 3. ขั้นตอนตรวจสอบพนักงาน (Audit Trail) */}
            <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-y-6 justify-between items-center">
              <AuditGroup
                label="ผู้ขอเบิกพัสดุ"
                value={getFullName(data.requisition?.user)}
              />
              <AuditGroup
                label="ผู้อนุมัติใบเบิก"
                value={getFullName(data.requisition?.approver)}
              />
              <AuditGroup
                label="เจ้าหน้าที่คลังผู้จ่าย"
                value={getFullName(data.user)}
                isMain
              />
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  สถานะปัจจุบัน
                </span>
                <span className="text-[11px] font-black text-emerald-600 px-4 py-1 rounded-full border border-emerald-200 bg-white">
                  จ่ายพัสดุแล้ว
                </span>
              </div>
            </div>

            {/* 4. ตารางรายการสินค้า (Items Table) */}
            <div className="flex-1">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b-2 border-slate-900">
                    <th className="px-10 py-5 text-left text-[11px] font-black uppercase tracking-widest text-slate-900">
                      รายละเอียดสินค้า
                    </th>
                    <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest text-slate-900">
                      ตำแหน่งจัดเก็บ
                    </th>
                    <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-widest text-slate-900">
                      จำนวนเบิก
                    </th>
                    <th className="px-6 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-900">
                      ทุน/หน่วย
                    </th>
                    <th className="px-10 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-900">
                      รวม (บาท)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memoizedItems.map((item) => {
                    const unitCost = item.product?.unitCost || 0;
                    return (
                      <tr key={item.id}>
                        <td className="px-10 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 uppercase">
                              {item.product?.name}
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                              รหัสสินค้า: {item.product?.sku}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                            <MapPin className="w-3.5 h-3.5 opacity-40" />
                            {item.location?.warehouse?.name || "คลังหลัก"} (
                            {item.location?.code})
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center font-black text-slate-900 tabular-nums">
                          {item.quantity?.toLocaleString()}{" "}
                          <span className="text-[9px] text-slate-400 ml-1">
                            {item.product?.unit?.name}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-right text-slate-400 tabular-nums text-sm">
                          {unitCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-10 py-6 text-right font-black text-slate-900 tabular-nums text-sm bg-slate-50/20">
                          {(item.quantity * unitCost).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. ส่วนสรุปท้ายเอกสาร (Footer) */}
            <div className="border-t-2 border-slate-900 bg-slate-50 p-10 flex flex-col md:flex-row justify-between gap-10">
              <div className="max-w-md space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  วัตถุประสงค์ในการเบิก
                </span>
                <p className="text-sm font-bold text-slate-700 leading-relaxed italic border-l-4 border-slate-200 pl-6 py-1">
                  {data.requisition?.purpose ||
                    "ใช้สำหรับงานดำเนินงานภายในแผนกตามที่ได้รับอนุมัติ"}
                </p>
              </div>

              <div className="space-y-4 min-w-[280px]">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    รวมจำนวนพัสดุ
                  </span>
                  <span className="text-lg font-black tabular-nums text-slate-900">
                    {totalQty?.toLocaleString()} หน่วย
                  </span>
                </div>
                <div className="flex justify-between items-end border-t-2 border-slate-200 pt-5">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B] mb-1">
                    มูลค่าเบิกจ่ายสุทธิ
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 mr-2">
                      บาท / THB
                    </span>
                    <span className="text-4xl font-black text-[#1F3B8B] tabular-nums tracking-tighter">
                      {totalValue?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ส่วนลายเซ็นสำหรับการพิมพ์ (Print Only) */}
            <div className="hidden print:grid grid-cols-3 gap-12 px-10 pb-20 mt-20 text-center">
              <Signature label="พนักงานผู้จ่ายของ" />
              <Signature label="พนักงานผู้รับของ" />
              <Signature label="ผู้อนุมัติทำรายการ" />
            </div>
          </div>

          <div className="text-center pt-4 pb-12 opacity-30">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.5em]">
              ระบบบริหารจัดการพัสดุคงคลัง • TJC Group Corporate
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
    <div className="space-y-1.5">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      <p
        className={`text-base font-bold ${isPrimary ? "text-[#1F3B8B]" : "text-slate-900"} leading-tight`}
      >
        {value}
      </p>
    </div>
  );
}

function AuditGroup({ label, value, isMain = false }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </span>
      <span
        className={`text-sm font-bold ${isMain ? "text-[#1F3B8B]" : "text-slate-700"}`}
      >
        {value}
      </span>
    </div>
  );
}

function Signature({ label }) {
  return (
    <div className="space-y-8">
      <div className="border-b border-slate-900 pb-2"></div>
      <p className="text-[10px] font-black uppercase text-slate-950">{label}</p>
    </div>
  );
}

function SystemLoader() {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 gap-4">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
        กำลังประมวลผลข้อมูลเอกสารนำจ่าย...
      </p>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="h-screen flex flex-col justify-center items-center text-center p-10 space-y-6">
      <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
        ไม่พบเอกสารในระบบฐานข้อมูล
      </h2>
      <button
        onClick={() => window.history.back()}
        className="text-xs font-bold text-[#1F3B8B] border-b-2 border-[#1F3B8B] pb-1 uppercase tracking-widest"
      >
        ย้อนกลับ
      </button>
    </div>
  );
}
