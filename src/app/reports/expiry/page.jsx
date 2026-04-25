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
  RefreshCcw,
  PackageSearch,
  MapPin,
  History,
  MinusCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NEAR_EXPIRY_DAYS = 30;

function isValidDateValue(value) {
  if (value === null || value === undefined) return false;

  const raw = String(value).trim();
  if (!raw || raw === "-" || raw.toLowerCase() === "null") return false;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;

  const year = date.getFullYear();
  if (year < 2000 || year > 2200) return false;

  return true;
}

function getManufacturingDate(item) {
  return (
    item?.mfgDate ||
    item?.manufacturingDate ||
    item?.manufactureDate ||
    item?.productionDate ||
    item?.lot?.mfgDate ||
    null
  );
}

function getExpirationDate(item) {
  return (
    item?.expirationDate ||
    item?.expDate ||
    item?.expiryDate ||
    item?.lot?.expDate ||
    null
  );
}

function toStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateDaysRemaining(expirationDate) {
  if (!isValidDateValue(expirationDate)) return null;

  const today = toStartOfDay(new Date());
  const exp = toStartOfDay(new Date(expirationDate));

  return Math.ceil((exp.getTime() - today.getTime()) / MS_PER_DAY);
}

function normalizeExpiryItem(item) {
  const manufacturingDate = getManufacturingDate(item);
  const expirationDate = getExpirationDate(item);
  const hasExpiryDate = isValidDateValue(expirationDate);

  if (!hasExpiryDate) {
    return {
      ...item,
      manufacturingDate: isValidDateValue(manufacturingDate)
        ? manufacturingDate
        : null,
      expirationDate: null,
      status: "NO_EXPIRY",
      daysRemaining: null,
    };
  }

  const daysRemaining = calculateDaysRemaining(expirationDate);

  let status = "NORMAL";

  if (daysRemaining < 0) {
    status = "EXPIRED";
  } else if (daysRemaining <= NEAR_EXPIRY_DAYS) {
    status = "NEAR_EXPIRY";
  }

  return {
    ...item,
    manufacturingDate: isValidDateValue(manufacturingDate)
      ? manufacturingDate
      : null,
    expirationDate,
    status,
    daysRemaining,
  };
}

function formatThaiDate(date) {
  if (!isValidDateValue(date)) return "-";

  return new Date(date).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatThaiDateTime(date) {
  if (!isValidDateValue(date)) {
    return {
      date: "-",
      time: "-",
    };
  }

  return {
    date: new Date(date).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: new Date(date).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

export default function ExpiryMonitorPage() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const normalizedData = useMemo(() => {
    return (reportData || []).map(normalizeExpiryItem);
  }, [reportData]);

  const fetchReport = async () => {
    setLoading(true);

    try {
      const res = await apiFetch(
        `/api/reports/inventory/expiry?status=${filterStatus}`,
      );

      if (res?.success) {
        setReportData(Array.isArray(res.data) ? res.data : []);
      } else if (Array.isArray(res)) {
        setReportData(res);
      } else {
        setReportData([]);
      }
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลวันหมดอายุได้");
      console.error("Fetch Error:", error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    let filtered = normalizedData.filter((item) => {
      const matchKeyword =
        !keyword ||
        String(item.productName || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.sku || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.lotNumber || "")
          .toLowerCase()
          .includes(keyword);

      if (!matchKeyword) return false;

      if (filterStatus === "all") return true;
      if (filterStatus === "normal") return item.status === "NORMAL";
      if (filterStatus === "near") return item.status === "NEAR_EXPIRY";
      if (filterStatus === "expired") return item.status === "EXPIRED";
      if (filterStatus === "no_expiry") return item.status === "NO_EXPIRY";

      return true;
    });

    return filtered.sort((a, b) => {
      const aUpdated = isValidDateValue(a.updatedAt)
        ? new Date(a.updatedAt).getTime()
        : 0;

      const bUpdated = isValidDateValue(b.updatedAt)
        ? new Date(b.updatedAt).getTime()
        : 0;

      return bUpdated - aUpdated;
    });
  }, [normalizedData, searchTerm, filterStatus]);

  const summary = useMemo(() => {
    return {
      total: normalizedData.length,
      normal: normalizedData.filter((i) => i.status === "NORMAL").length,
      near: normalizedData.filter((i) => i.status === "NEAR_EXPIRY").length,
      expired: normalizedData.filter((i) => i.status === "EXPIRED").length,
      noExpiry: normalizedData.filter((i) => i.status === "NO_EXPIRY").length,
    };
  }, [normalizedData]);

  const getStatusConfig = (status) => {
    switch (status) {
      case "EXPIRED":
        return {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
          dot: "bg-rose-500",
          icon: <AlertCircle className="w-3 h-3" />,
          label: "หมดอายุแล้ว",
        };

      case "NEAR_EXPIRY":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          dot: "bg-amber-500",
          icon: <Clock className="w-3 h-3" />,
          label: "ใกล้หมดอายุ",
        };

      case "NO_EXPIRY":
        return {
          bg: "bg-slate-50",
          text: "text-slate-600",
          border: "border-slate-200",
          dot: "bg-slate-400",
          icon: <MinusCircle className="w-3 h-3" />,
          label: "ไม่กำหนดวันหมดอายุ",
        };

      default:
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          dot: "bg-emerald-500",
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: "ปกติ",
        };
    }
  };

  const getStatusText = (item) => {
    if (item.status === "NO_EXPIRY") {
      return "ไม่กำหนดวันหมดอายุ";
    }

    if (item.status === "EXPIRED") {
      return `เกิน ${Math.abs(Number(item.daysRemaining || 0))} วัน`;
    }

    return `เหลือ ${Number(item.daysRemaining || 0)} วัน`;
  };

  return (
    <AuthGate>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                {summary.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SummaryCard
            title="ปกติ (Normal)"
            count={summary.normal}
            color="emerald"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          />

          <SummaryCard
            title="ใกล้หมดอายุ (Near Expiry)"
            count={summary.near}
            color="amber"
            icon={<Clock className="w-5 h-5 text-amber-600" />}
          />

          <SummaryCard
            title="หมดอายุแล้ว (Expired)"
            count={summary.expired}
            color="rose"
            icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
          />

          <SummaryCard
            title="ไม่กำหนดวันหมดอายุ"
            count={summary.noExpiry}
            color="slate"
            icon={<MinusCircle className="w-5 h-5 text-slate-600" />}
          />
        </div>

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
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto">
              {[
                { id: "all", label: "ทุกล็อต" },
                { id: "normal", label: "ปกติ" },
                { id: "near", label: "ใกล้หมด" },
                { id: "expired", label: "หมดอายุ" },
                { id: "no_expiry", label: "ไม่ระบุวัน" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterStatus(item.id)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                    filterStatus === item.id
                      ? "bg-white text-[#1F3B8B] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
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
                    วันที่ผลิต
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
                    <td colSpan="8" className="py-24 text-center">
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
                    const updated = formatThaiDateTime(item.updatedAt);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">
                              {item.sku || "-"}
                            </span>

                            <span className="text-sm font-semibold text-slate-800 line-clamp-1">
                              {item.productName || "-"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-sm font-medium text-slate-600">
                          {item.lotNumber || "-"}
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-500">
                          {item.locations?.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#1F3B8B]" />
                                {item.locations[0].warehouseName || "-"}
                              </span>

                              <span className="pl-4">
                                {item.locations[0].zoneName || "-"} /{" "}
                                {item.locations[0].locationName || "-"}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="py-4 px-6 text-center">
                          <span className="text-sm font-bold text-slate-800 tabular-nums">
                            {Number(item.quantity || 0).toLocaleString()}
                          </span>

                          <span className="text-[10px] text-slate-400 block font-bold uppercase">
                            {item.unitName || "หน่วย"}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="text-sm font-semibold text-slate-700">
                            {formatThaiDate(item.manufacturingDate)}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          {item.status === "NO_EXPIRY" ? (
                            <div className="text-sm font-bold text-slate-400">
                              ไม่กำหนด
                            </div>
                          ) : (
                            <div className="text-sm font-semibold text-slate-700">
                              {formatThaiDate(item.expirationDate)}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-slate-500">
                            <History className="w-3.5 h-3.5 opacity-50" />

                            <div className="flex flex-col text-[11px]">
                              <span className="font-medium text-slate-600">
                                {updated.date}
                              </span>

                              <span className="opacity-70">
                                {updated.time} น.
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

                            {getStatusText(item)}
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

function SummaryCard({ title, count, color, icon }) {
  const themes = {
    emerald: "border-l-emerald-500 bg-emerald-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
    rose: "border-l-rose-500 bg-rose-50/30",
    slate: "border-l-slate-400 bg-slate-50/40",
  };

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${
        themes[color] || themes.slate
      } p-5 rounded-xl flex items-center gap-4 shadow-sm`}
    >
      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          {title}
        </p>

        <p className="text-2xl font-bold text-slate-900 tabular-nums">
          {Number(count || 0).toLocaleString()}
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
