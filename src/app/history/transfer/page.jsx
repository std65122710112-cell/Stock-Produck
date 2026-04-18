"use client";

import React, { useEffect, useState, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  ArrowRightLeft,
  ChevronRight,
  AlertCircle,
  Package,
  Truck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function TransferHistoryPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadHistory() {
    try {
      // เรียก API ตาม Path ที่กำหนด
      const res = await apiFetch("/api/transfer/history", { method: "GET" });
      const data = Array.isArray(res) ? res : res?.data || [];
      setTransfers(data);
    } catch (e) {
      console.error("Load Error:", e);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const memoizedTransfers = useMemo(() => transfers, [transfers]);

  return (
    <div className="w-full">
      <Toaster position="top-right" />

      {/* --- DATA TABLE SECTION --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="py-4 px-6">วันที่โอนย้าย / เวลา</th>
                <th className="py-4 px-6">เลขที่เอกสาร (TF)</th>
                <th className="py-4 px-6">สถานะการโอน</th>
                <th className="py-4 px-6 text-center">จำนวนรายการ</th>
                <th className="py-4 px-6">ผู้ทำรายการ</th>
                <th className="py-4 px-6 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-slate-400">
                    กำลังดึงข้อมูลประวัติการโอนย้าย...
                  </td>
                </tr>
              ) : memoizedTransfers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-12 h-12 text-slate-200" />
                      <p className="text-slate-400 font-medium text-sm">
                        ไม่พบข้อมูลประวัติการโอนย้ายพัสดุ
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                memoizedTransfers.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    {/* วันที่ / เวลา */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col text-slate-600">
                        <span className="text-sm font-bold tabular-nums">
                          {new Date(t.createdAt).toLocaleDateString("th-TH")}
                        </span>
                        <span className="text-[10px] font-medium opacity-70">
                          {new Date(t.createdAt).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          น.
                        </span>
                      </div>
                    </td>

                    {/* Transfer Number */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-[#1F3B8B] tabular-nums tracking-tight">
                          {t.transferNo}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      {t.status === "SHIPPED" || t.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                          <Truck className="w-3 h-3" /> ระหว่างขนส่ง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> โอนย้ายสำเร็จ
                        </span>
                      )}
                    </td>

                    {/* Item Count */}
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 font-bold text-xs tabular-nums">
                        <Package className="w-3.5 h-3.5" />
                        {t._count?.items || 0}
                      </div>
                    </td>

                    {/* Issuer */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">
                            {t.issuedUser
                              ? `${t.issuedUser.firstName} ${t.issuedUser.lastName}`
                              : "พนักงานคลัง"}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-black">
                            Transfer Issuer
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/history/transfer/${t.id}`}
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-[#1F3B8B] px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 hover:border-[#1F3B8B] transition-all shadow-sm"
                      >
                        VIEW <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
