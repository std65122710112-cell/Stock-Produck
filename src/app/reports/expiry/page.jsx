"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import AuthGate from "@/components/AuthGate";
import {
  CalendarClock,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCcw,
  PackageSearch,
  MapPin,
  History,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ExpiryMonitorPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/reports/inventory/expiry?status=${filterStatus}`,
      );
      if (res.success) {
        setReportData(res.data || []);
      }
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลวันหมดอายุได้");
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filterStatus]);

  const filteredData = useMemo(() => {
    let filtered = reportData.filter(
      (item) =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    return filtered.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    );
  }, [reportData, searchTerm]);

  const getStatusConfig = (status) => {
    switch (status) {
      case "EXPIRED":
        return {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
          dot: "bg-rose-500",
          icon: <AlertCircle className="w-3 h-3" />,
        };
      case "NEAR_EXPIRY":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          dot: "bg-amber-500",
          icon: <Clock className="w-3 h-3" />,
        };
      default:
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          dot: "bg-emerald-500",
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
    }
  };

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <div className="w-full max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
              <CalendarClock className="w-6 h-6 text-[#1F3B8B]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                รายงานตรวจสอบวันหมดอายุ
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Inventory Expiry & Lot Ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl flex flex-col items-end min-w-40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Total Lots
              </span>
              <span className="text-xl font-bold text-[#1F3B8B] tabular-nums">
                {reportData.length.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard
            title="ปกติ (Normal)"
            count={reportData.filter((i) => i.status === "NORMAL").length}
            color="emerald"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          />
          <SummaryCard
            title="ใกล้หมดอายุ (Near Expiry)"
            count={reportData.filter((i) => i.status === "NEAR_EXPIRY").length}
            color="amber"
            icon={<Clock className="w-5 h-5 text-amber-600" />}
          />
          <SummaryCard
            title="หมดอายุแล้ว (Expired)"
            count={reportData.filter((i) => i.status === "EXPIRED").length}
            color="rose"
            icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
          />
        </div>

        {/* FILTER & SEARCH */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 print:hidden">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
              placeholder="ค้นหาชื่อสินค้า, SKU หรือ เลขล็อต..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {["all", "near", "expired"].map((id) => (
                <button
                  key={id}
                  onClick={() => setFilterStatus(id)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    filterStatus === id
                      ? "bg-white text-[#1F3B8B] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {id === "all"
                    ? "ทุกล็อต"
                    : id === "near"
                      ? "ใกล้หมด"
                      : "หมดอายุ"}
                </button>
              ))}
            </div>
            <button
              onClick={fetchReport}
              className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-sm shrink-0"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCcw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    ข้อมูลพัสดุ / SKU
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    เลขล็อต
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    ตำแหน่งจัดเก็บ
                  </th>
                  <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    คงเหลือ
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    วันหมดอายุ
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    อัปเดตล่าสุด
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <TableSkeleton />
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <PackageSearch className="w-12 h-12 text-slate-200" />
                        <p className="text-slate-400 font-medium text-sm">
                          ไม่พบข้อมูลพัสดุในระบบ
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const style = getStatusConfig(item.status);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">
                              {item.sku}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 line-clamp-1">
                              {item.productName}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-slate-600">
                          {item.lotNumber}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500">
                          {item.locations?.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#1F3B8B]" />{" "}
                                {item.locations[0].warehouseName}
                              </span>
                              <span className="pl-4">
                                {item.locations[0].zoneName} /{" "}
                                {item.locations[0].locationName}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-sm font-bold text-slate-800 tabular-nums">
                            {item.quantity.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">
                            {item.unitName}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm font-semibold text-slate-700">
                            {item.expirationDate
                              ? new Date(
                                  item.expirationDate,
                                ).toLocaleDateString("th-TH")
                              : "-"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-slate-500">
                            <History className="w-3.5 h-3.5 opacity-50" />
                            <div className="flex flex-col text-[11px]">
                              <span className="font-medium text-slate-600">
                                {new Date(item.updatedAt).toLocaleDateString(
                                  "th-TH",
                                )}
                              </span>
                              <span className="opacity-70">
                                {new Date(item.updatedAt).toLocaleTimeString(
                                  "th-TH",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}{" "}
                                น.
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold ${style.bg} ${style.text} ${style.border}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
                            ></span>
                            {item.status === "EXPIRED"
                              ? `เกิน ${Math.abs(item.daysRemaining)} วัน`
                              : `เหลือ ${item.daysRemaining} วัน`}
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
      </div>
    </AuthGate>
  );
}

// --- Sub-components ---
function SummaryCard({ title, count, color, icon }) {
  const themes = {
    emerald: "border-l-emerald-500 bg-emerald-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
    rose: "border-l-rose-500 bg-rose-50/30",
  };

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${themes[color]} p-5 rounded-xl flex items-center gap-4 shadow-sm`}
    >
      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          {title}
        </p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">
          {count.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return [...Array(5)].map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-50 rounded w-1/2" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 rounded w-20" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 rounded w-24" />
      </td>
      <td className="px-6 py-4 text-center">
        <div className="h-4 bg-slate-100 rounded w-10 mx-auto" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 rounded w-20" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-100 rounded w-24" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="h-6 bg-slate-100 rounded w-20 ml-auto" />
      </td>
    </tr>
  ));
}
