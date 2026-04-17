"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Archive,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function LowStockAlertPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- PAGINATION STATE ---
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/inventory/low-stock-alerts");
        if (res && res.success) {
          setAlerts(res.data || []);
        } else {
          setAlerts(Array.isArray(res) ? res : []);
        }
      } catch (e) {
        console.error("API Error:", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // --- SORTING & PAGINATION LOGIC ---
  const sortedData = useMemo(() => {
    return [...alerts].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    );
  }, [alerts]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, page]);

  // Reset page เมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    setPage(1);
  }, [alerts.length]);

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 print:hidden">
          <div>

          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                <ShieldAlert className="w-6 h-6 text-[#1F3B8B]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  รายการสินค้าใกล้หมด
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                  <Archive className="w-4 h-4 text-slate-400" />
                  รายการพัสดุที่ต่ำกว่าเกณฑ์ควบคุมมาตรฐาน
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl flex flex-col items-end min-w-[200px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                รายการที่ตรวจพบ (Total Alerts)
              </span>
              <span className="text-2xl font-bold text-rose-600 tabular-nums">
                {alerts.length.toLocaleString()}{" "}
                <span className="text-xs text-slate-400 uppercase font-bold">
                  Items
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* --- DATA TABLE SECTION --- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    รายละเอียดสินค้า / SKU
                  </th>
                  <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    คงเหลือปัจจุบัน
                  </th>
                  <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    เกณฑ์ขั้นต่ำ (Min)
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    สถานะความเสี่ยง
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    อัปเดตล่าสุด
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <TableSkeleton />
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-200" />
                        <p className="text-slate-400 font-medium">
                          สต๊อกพัสดุอยู่ในระดับปกติ
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const isCritical = item.currentStock === 0;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">
                              {item.sku}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 line-clamp-1">
                              {item.name}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-center">
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-lg font-bold tabular-nums ${isCritical ? "text-rose-600" : "text-orange-500"}`}
                            >
                              {item.currentStock.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                              {item.unit || "ชิ้น"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-center">
                          <div className="flex flex-col items-center text-slate-600">
                            <span className="text-sm font-bold tabular-nums">
                              {item.threshold.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase italic">
                              Min
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold ${
                              isCritical
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isCritical ? "bg-rose-500 animate-pulse" : "bg-orange-500"}`}
                            ></span>
                            {isCritical
                              ? "วิกฤต (Out of Stock)"
                              : "เฝ้าระวัง (Low Stock)"}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex flex-col items-end gap-0.5 text-slate-500">
                            <span className="text-xs font-bold tabular-nums">
                              {new Date(item.updatedAt).toLocaleDateString(
                                "th-TH",
                              )}
                            </span>
                            <span className="text-[10px] opacity-70">
                              {new Date(item.updatedAt).toLocaleTimeString(
                                "th-TH",
                                { hour: "2-digit", minute: "2-digit" },
                              )}{" "}
                              น.
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- PAGINATION CONTROL --- */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 print:hidden">
            <p className="text-xs font-medium text-slate-500">
              แสดง {(page - 1) * itemsPerPage + 1} -{" "}
              {Math.min(page * itemsPerPage, sortedData.length)} จาก{" "}
              {sortedData.length} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronsLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              <div className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                {page} / {totalPages}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronsRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

function TableSkeleton() {
  return [...Array(5)].map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="py-4 px-6">
        <div className="h-4 bg-slate-100 rounded w-48" />
      </td>
      <td className="py-4 px-6">
        <div className="h-6 bg-slate-100 rounded w-12 mx-auto" />
      </td>
      <td className="py-4 px-6">
        <div className="h-6 bg-slate-100 rounded w-12 mx-auto" />
      </td>
      <td className="py-4 px-6">
        <div className="h-7 bg-slate-100 rounded w-32" />
      </td>
      <td className="py-4 px-6 text-right">
        <div className="h-4 bg-slate-100 rounded w-20 ml-auto" />
      </td>
    </tr>
  ));
}
