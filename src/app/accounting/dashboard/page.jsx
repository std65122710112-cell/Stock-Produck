"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getAccessToken } from "@/lib/auth";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
  Download,
  ArrowLeft
} from "lucide-react";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTH = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getApiEndpointHref = (path) => {
  if (!path) return "#";
  if (/^https?:\/\//i.test(path)) return path;

  const rawBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  const cleanBase = rawBase.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (cleanBase) return `${cleanBase}${cleanPath}`;

  return cleanPath;
};

const getStatusInfo = (status) => {
  switch (status) {
    case "PAID":
      return {
        label: "ชำระแล้ว",
        className: "bg-emerald-50 text-emerald-700 border-emerald-100",
      };
    case "PARTIAL_PAID":
      return {
        label: "ชำระบางส่วน",
        className: "bg-blue-50 text-blue-700 border-blue-100",
      };
    case "PENDING":
    default:
      return {
        label: "รอชำระ",
        className: "bg-amber-50 text-amber-700 border-amber-100",
      };
  }
};

const bucketConfig = [
  {
    key: "notDue",
    label: "ยังไม่ครบกำหนด",
    sub: "Not Due",
    icon: CheckCircle2,
    tone: "emerald",
  },
  {
    key: "overdue1To30",
    label: "เกินกำหนด 1-30 วัน",
    sub: "1-30 Days",
    icon: Clock,
    tone: "amber",
  },
  {
    key: "overdue31To60",
    label: "เกินกำหนด 31-60 วัน",
    sub: "31-60 Days",
    icon: CalendarClock,
    tone: "orange",
  },
  {
    key: "overdue61To90",
    label: "เกินกำหนด 61-90 วัน",
    sub: "61-90 Days",
    icon: AlertTriangle,
    tone: "rose",
  },
  {
    key: "overdueOver90",
    label: "เกินกำหนด > 90 วัน",
    sub: "Over 90 Days",
    icon: ShieldAlert,
    tone: "red",
  },
];

export default function APAgingDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [supplierSummary, setSupplierSummary] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [filters, setFilters] = useState({
    supplierId: "",
    status: "ALL",
    onlyOverdue: false,
    keyword: "",
  });

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await apiFetch("/master/suppliers");
      setSuppliers(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.warn("Load suppliers failed:", err);
    }
  }, []);

  const loadAgingReport = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (filters.supplierId) params.set("supplierId", filters.supplierId);
      if (filters.status && filters.status !== "ALL") {
        params.set("status", filters.status);
      }
      if (filters.onlyOverdue) params.set("onlyOverdue", "true");

      const res = await apiFetch(`/ap/reports/aging?${params.toString()}`);
      const data = res?.data || res || {};

      setRows(data.rows || []);
      setSummary(data.summary || {});
      setSupplierSummary(data.supplierSummary || []);
    } catch (err) {
      console.error("Load AP Aging Report Error:", err);
      toast.error(err.message || "โหลดรายงานเจ้าหนี้คงค้างไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filters.supplierId, filters.status, filters.onlyOverdue]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadAgingReport();
  }, [loadAgingReport]);

  const filteredRows = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter((row) => {
      const text = [
        row.invoiceNo,
        row.taxInvoiceNo,
        row.supplier?.name,
        row.supplier?.code,
        row.purchaseOrder?.poNumber,
        row.goodsReceipt?.receiptNo,
        row.agingBucketLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [rows, filters.keyword]);

  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const token = getAccessToken();

      if (!token) {
        toast.error("ไม่พบ Token กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่");
        return;
      }

      const params = new URLSearchParams();

      if (filters.supplierId) params.set("supplierId", filters.supplierId);
      if (filters.status && filters.status !== "ALL") {
        params.set("status", filters.status);
      }
      if (filters.onlyOverdue) {
        params.set("onlyOverdue", "true");
      }

      const url = getApiEndpointHref(
        `/ap/reports/aging/export?${params.toString()}`
      );

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) {
        let message = "Export Excel ไม่สำเร็จ";
        try {
          const err = await res.json();
          message = err.message || message;
        } catch { }
        throw new Error(message);
      }

      const blob = await res.blob();
      const fileUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
      a.href = fileUrl;
      a.download = `AP-Aging-${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(fileUrl);
      toast.success("Export Excel สำเร็จ");
    } catch (err) {
      console.error("Export AP Aging Excel Error:", err);
      toast.error(err.message || "Export Excel ไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  };

  const overdueAmount =
    Number(summary.overdue1To30 || 0) +
    Number(summary.overdue31To60 || 0) +
    Number(summary.overdue61To90 || 0) +
    Number(summary.overdueOver90 || 0);

  const overdueCount = filteredRows.filter(
    (row) => Number(row.daysOverdue || 0) > 0
  ).length;

  return (
    <AuthGate requiredPermissions={["AP_READ"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen animate-in fade-in duration-500">

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                <BarChart3 className="text-[#1F3B8B]" size={22} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  แดชบอร์ด บัญชีเจ้าหนี้
                </h1>
                <p className="text-sm text-slate-500 font-bold mt-1 flex items-center gap-2">
                  <Wallet size={14} className="text-blue-500 shrink-0" />
                  AP Aging Dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="bg-white border border-slate-300 text-[#1F3B8B] px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 flex-1 md:flex-none outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-95"
            >
              {exporting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {exporting ? "กำลัง Export..." : "Export Excel"}
            </button>

            <button
              type="button"
              onClick={loadAgingReport}
              disabled={loading}
              className="bg-[#1F3B8B] border border-transparent text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-900 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 flex-1 md:flex-none outline-none focus:ring-2 focus:ring-[#1F3B8B] focus:ring-offset-1 active:scale-95"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              โหลดข้อมูลใหม่
            </button>
          </div>
        </div>

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            label="ยอดค้างจ่ายทั้งหมด"
            value={`฿${formatMoney(summary.totalOutstandingAmount)}`}
            sub={`${summary.totalInvoices || 0} ใบแจ้งหนี้`}
            tone="blue"
          />
          <SummaryCard
            label="ยังไม่ครบกำหนด"
            value={`฿${formatMoney(summary.notDue)}`}
            sub="ยอดที่ยังไม่ถึงวันชำระ"
            tone="emerald"
          />
          <SummaryCard
            label="ยอดเกินกำหนด"
            value={`฿${formatMoney(overdueAmount)}`}
            sub={`${overdueCount} รายการเกินกำหนด`}
            tone="rose"
          />
          <SummaryCard
            label="ยอดจ่ายแล้ว"
            value={`฿${formatMoney(summary.totalPaidAmount)}`}
            sub="จากรายการที่ยังเกี่ยวข้อง"
            tone="slate"
          />
        </div>

        {/* --- AGING BUCKETS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {bucketConfig.map((bucket) => (
            <BucketCard
              key={bucket.key}
              label={bucket.label}
              sub={bucket.sub}
              value={summary[bucket.key]}
              icon={bucket.icon}
              tone={bucket.tone}
            />
          ))}
        </div>

        {/* --- TOP SUPPLIERS (FULL WIDTH GRID) --- */}
        <div className="bg-white border-2 border-slate-300 rounded-xl shadow-md overflow-hidden">
          <div className="p-5 md:p-6 bg-slate-50/50 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-[#1F3B8B]" />
              <h3 className="text-[13px] font-black text-slate-700 tracking-widest uppercase">
                ซัพพลายเออร์ยอดค้างสูงสุด (Top 8)
              </h3>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {supplierSummary.slice(0, 8).map((item, index) => (
                <div key={item.supplier?.id || index} className="flex flex-col p-4 rounded-xl border border-slate-200 bg-white hover:border-[#1F3B8B]/30 hover:shadow-sm transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">#{index + 1}</div>
                    <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">เกิน {item.maxDaysOverdue || 0} วัน</div>
                  </div>
                  <div className="text-[13px] font-bold text-slate-900 truncate group-hover:text-[#1F3B8B] transition-colors" title={item.supplier?.name}>
                    {item.supplier?.name || "-"}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-1">
                    จำนวน: {item.invoiceCount} ใบแจ้งหนี้
                  </div>
                  <div className="text-lg font-black text-rose-600 mt-3 tabular-nums">
                    ฿{formatMoney(item.outstandingAmount)}
                  </div>
                </div>
              ))}

              {supplierSummary.length === 0 && (
                <div className="col-span-full py-8 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  ไม่มีข้อมูลซัพพลายเออร์คงค้าง
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- INVOICE TABLE (FULL WIDTH) --- */}
        <div className="bg-white border-2 border-slate-300 rounded-xl shadow-md overflow-hidden flex flex-col">

          {/* Table Header & Filters */}
          <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-[#1F3B8B]" />
                <h3 className="text-[13px] font-black text-slate-700 tracking-widest uppercase">
                  รายการใบแจ้งหนี้คงค้าง
                </h3>
              </div>
              <div className="bg-blue-50 text-[#1F3B8B] px-3 py-1 rounded-md text-[11px] font-bold border border-blue-100 w-fit">
                พบ {filteredRows.length} รายการ
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.keyword}
                  onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                  placeholder="ค้นหาเลขบิล / ซัพพลายเออร์ / PO / GR"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-11 pr-4 py-2.5 text-[13px] font-bold outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm placeholder:text-slate-300"
                />
              </div>

              <select
                value={filters.supplierId}
                onChange={(e) => setFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-[13px] font-bold outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm cursor-pointer"
              >
                <option value="">ซัพพลายเออร์ทั้งหมด</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-[13px] font-bold outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm cursor-pointer"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="PENDING">รอชำระ</option>
                <option value="PARTIAL_PAID">ชำระบางส่วน</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none hover:text-[#1F3B8B] transition-colors w-fit">
              <input
                type="checkbox"
                checked={filters.onlyOverdue}
                onChange={(e) => setFilters((prev) => ({ ...prev, onlyOverdue: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#1F3B8B] focus:ring-[#1F3B8B]/20"
              />
              แสดงเฉพาะรายการที่เกินกำหนดชำระ
            </label>
          </div>

          {/* Table Data */}
          <div className="overflow-x-auto w-full relative">
            <table className="w-full min-w-[1200px] text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-wider whitespace-nowrap">
                  <th className="px-6 py-4 text-left">ใบแจ้งหนี้</th>
                  <th className="px-6 py-4 text-left min-w-[200px]">ซัพพลายเออร์</th>
                  <th className="px-6 py-4 text-left">กำหนดชำระ</th>
                  <th className="px-6 py-4 text-left">ช่วงอายุหนี้</th>
                  <th className="px-6 py-4 text-right">ยอดสุทธิ</th>
                  <th className="px-6 py-4 text-right">จ่ายแล้ว</th>
                  <th className="px-6 py-4 text-right">คงเหลือ</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((row) => {
                  const statusInfo = getStatusInfo(row.status);
                  const isOverdue = Number(row.daysOverdue || 0) > 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5 align-top">
                        <div className="font-black text-[#1F3B8B] text-[13px] uppercase tracking-wide">
                          {row.invoiceNo}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1">
                        ใบกำกับภาษี : {row.taxInvoiceNo || "N/A"}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                          PO: {row.purchaseOrder?.poNumber || "-"}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                          GR: {row.goodsReceipt?.receiptNo || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <div className="font-bold text-slate-900 text-[13px] truncate" title={row.supplier?.name}>
                          {row.supplier?.name || "-"}
                        </div>
                        <div className="text-[10px] font-black text-[#1F3B8B] uppercase tracking-widest mt-1">
                          ID: {row.supplier?.code || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <div className="font-black text-slate-900 text-[13px] tabular-nums">
                          {formatDateTH(row.dueDate)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                          วันที่เอกสาร: {formatDateTH(row.issueDate)}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <div className={`inline-flex px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${isOverdue ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                          {row.agingBucketLabel}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-tighter">
                          {isOverdue ? `เกินกำหนด ${row.daysOverdue} วัน` : "ยังไม่เกินกำหนด"}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-right align-top font-black text-slate-900 text-[13px] tabular-nums">
                        ฿{formatMoney(row.grandTotal)}
                      </td>

                      <td className="px-6 py-5 text-right align-top font-bold text-emerald-600 text-[13px] tabular-nums">
                        ฿{formatMoney(row.paidAmount)}
                      </td>

                      <td className="px-6 py-5 text-right align-top font-black text-rose-600 text-[13px] tabular-nums">
                        ฿{formatMoney(row.outstandingAmount)}
                      </td>

                      <td className="px-6 py-5 text-center align-top">
                        <span className={`inline-flex px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm whitespace-nowrap ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-16 text-center text-[11px] text-slate-400 font-bold tracking-widest uppercase italic">
                      ไม่พบรายการเจ้าหนี้คงค้างตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AuthGate>
  );
}

// --- SUB-COMPONENTS ---

function SummaryCard({ label, value, sub, tone = "slate" }) {
  const themes = {
    slate: "border-l-slate-400 bg-slate-50/50",
    blue: "border-l-[#1F3B8B] bg-[#1F3B8B]/5",
    emerald: "border-l-emerald-500 bg-emerald-50/30",
    rose: "border-l-rose-500 bg-rose-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
  };

  return (
    <div style={{ containerType: "inline-size" }} className={`bg-white border border-slate-200 border-l-4 ${themes[tone] || themes.slate} p-5 rounded-xl shadow-sm transition-all hover:shadow-md flex flex-col justify-center min-w-0`}>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">
        {label}
      </p>
      <div style={{ fontSize: "clamp(1.25rem, 10cqw, 1.875rem)" }} className="font-black text-slate-900 tabular-nums tracking-tighter whitespace-nowrap">
        {value}
      </div>
      <p className="text-xs font-bold text-slate-400 mt-1.5 truncate">
        {sub}
      </p>
    </div>
  );
}

function BucketCard({ label, sub, value, icon: Icon, tone = "slate" }) {
  const themes = {
    emerald: "border-l-emerald-500 bg-emerald-50/30 text-emerald-700",
    amber: "border-l-amber-500 bg-amber-50/30 text-amber-700",
    orange: "border-l-orange-500 bg-orange-50/30 text-orange-700",
    rose: "border-l-rose-500 bg-rose-50/30 text-rose-700",
    red: "border-l-red-600 bg-red-50/30 text-red-700",
    slate: "border-l-slate-400 bg-slate-50/50 text-slate-700",
  };

  return (
    <div style={{ containerType: "inline-size" }} className={`bg-white border border-slate-200 border-l-4 ${themes[tone] || themes.slate} p-5 rounded-xl shadow-sm transition-all hover:shadow-md flex flex-col justify-center min-w-0`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase truncate">{sub}</div>
          <div className="text-xs font-bold text-slate-700 mt-1 truncate">{label}</div>
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white shadow-sm border border-slate-100">
          <Icon size={14} className="opacity-80" />
        </div>
      </div>
      <div style={{ fontSize: "clamp(1.1rem, 10cqw, 1.5rem)" }} className="font-black tabular-nums tracking-tighter whitespace-nowrap text-slate-900 mt-2">
        ฿{formatMoney(value)}
      </div>
    </div>
  );
}