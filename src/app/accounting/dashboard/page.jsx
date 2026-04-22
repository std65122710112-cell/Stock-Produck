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
    label: "เกินกำหนดมากกว่า 90 วัน",
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
        `/ap/reports/aging/export?${params.toString()}`,
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
        } catch {
          // response ไม่ใช่ JSON
        }

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
    (row) => Number(row.daysOverdue || 0) > 0,
  ).length;

  return (
    <AuthGate requiredPermissions={["AP_READ"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-none mx-auto px-0 py-8 space-y-8 min-h-screen">
        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
              <BarChart3 className="text-blue-600" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                AP Aging Dashboard
              </h1>
              <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2">
                <Wallet size={14} className="text-blue-500 shrink-0" />
                รายงานเจ้าหนี้คงค้างตามอายุหนี้
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 w-fit"
            >
              {exporting ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              {exporting ? "กำลัง Export" : "Export Excel"}
            </button>

            <button
              type="button"
              onClick={loadAgingReport}
              disabled={loading}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs tracking-widest hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 w-fit"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              โหลดข้อมูลใหม่
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/60 border-b border-slate-200 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-blue-600" />
                  <h3 className="text-xs font-black text-slate-700 tracking-widest">
                    รายการใบแจ้งหนี้คงค้าง
                  </h3>
                </div>

                <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black border border-blue-100 w-fit">
                  {filteredRows.length} รายการ
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="relative lg:col-span-2">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={filters.keyword}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        keyword: e.target.value,
                      }))
                    }
                    placeholder="ค้นหาเลขบิล / ซัพพลายเออร์ / PO / GR"
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-600 placeholder:text-slate-300"
                  />
                </div>

                <select
                  value={filters.supplierId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      supplierId: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
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
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
                >
                  <option value="ALL">ทุกสถานะ</option>
                  <option value="PENDING">รอชำระ</option>
                  <option value="PARTIAL_PAID">ชำระบางส่วน</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.onlyOverdue}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      onlyOverdue: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-blue-600"
                />
                แสดงเฉพาะรายการที่เกินกำหนดชำระ
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-xs">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 tracking-[0.14em] bg-white">
                    <th className="px-4 py-4 text-left">ใบแจ้งหนี้</th>
                    <th className="px-4 py-4 text-left">ซัพพลายเออร์</th>
                    <th className="px-4 py-4 text-left">กำหนดชำระ</th>
                    <th className="px-4 py-4 text-left">ช่วงอายุหนี้</th>
                    <th className="px-4 py-4 text-right">ยอดสุทธิ</th>
                    <th className="px-4 py-4 text-right">จ่ายแล้ว</th>
                    <th className="px-4 py-4 text-right">คงเหลือ</th>
                    <th className="px-4 py-4 text-center">สถานะ</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const statusInfo = getStatusInfo(row.status);
                    const isOverdue = Number(row.daysOverdue || 0) > 0;

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 transition-all"
                      >
                        <td className="px-4 py-4 align-top">
                          <div className="font-black text-blue-700 uppercase">
                            {row.invoiceNo}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            TAX: {row.taxInvoiceNo || "N/A"}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            PO: {row.purchaseOrder?.poNumber || "-"} | GR:{" "}
                            {row.goodsReceipt?.receiptNo || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="font-bold text-slate-800 flex items-center gap-2 max-w-[260px]">
                            <Building2
                              size={13}
                              className="text-slate-400 shrink-0"
                            />
                            <span className="truncate">
                              {row.supplier?.name || "-"}
                            </span>
                          </div>
                          <div className="text-[10px] font-black text-slate-400 mt-1">
                            รหัส: {row.supplier?.code || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="font-black text-slate-900">
                            {formatDateTH(row.dueDate)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            วันที่เอกสาร: {formatDateTH(row.issueDate)}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div
                            className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black border ${
                              isOverdue
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}
                          >
                            {row.agingBucketLabel}
                          </div>

                          <div className="text-[10px] font-bold text-slate-400 mt-1">
                            {isOverdue
                              ? `เกินกำหนด ${row.daysOverdue} วัน`
                              : "ยังไม่เกินกำหนด"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right align-top font-black text-slate-900">
                          ฿{formatMoney(row.grandTotal)}
                        </td>

                        <td className="px-4 py-4 text-right align-top font-bold text-emerald-700">
                          ฿{formatMoney(row.paidAmount)}
                        </td>

                        <td className="px-4 py-4 text-right align-top font-black text-rose-600">
                          ฿{formatMoney(row.outstandingAmount)}
                        </td>

                        <td className="px-4 py-4 text-center align-top">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black border ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-14 text-center text-slate-400 font-bold tracking-widest italic"
                      >
                        ไม่พบรายการเจ้าหนี้คงค้างตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/60 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-slate-600" />
                <h3 className="text-xs font-black text-slate-700 tracking-widest">
                  ซัพพลายเออร์ยอดค้างสูงสุด
                </h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {supplierSummary.slice(0, 8).map((item, index) => (
                <div key={item.supplier?.id || index} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">
                        {index + 1}. {item.supplier?.name || "-"}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 mt-1">
                        {item.invoiceCount} ใบแจ้งหนี้ | เกินสูงสุด{" "}
                        {item.maxDaysOverdue || 0} วัน
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-rose-600">
                        ฿{formatMoney(item.outstandingAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {supplierSummary.length === 0 && (
                <div className="p-10 text-center text-xs font-bold text-slate-400">
                  ไม่มีข้อมูลซัพพลายเออร์คงค้าง
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

function SummaryCard({ label, value, sub, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 border-slate-200 text-slate-900",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
  };

  return (
    <div
      className={`border rounded-3xl p-5 ${toneClass[tone] || toneClass.slate}`}
    >
      <div className="text-[10px] font-black text-slate-400 tracking-[0.2em]">
        {label}
      </div>
      <div className="text-2xl font-black mt-2">{value}</div>
      <div className="text-[11px] font-bold text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

function BucketCard({ label, sub, value, icon: Icon, tone = "slate" }) {
  const toneClass = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
    red: "bg-red-50 border-red-100 text-red-700",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div
      className={`border rounded-3xl p-5 ${toneClass[tone] || toneClass.slate}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black text-slate-400 tracking-[0.16em]">
            {sub}
          </div>
          <div className="text-xs font-black text-slate-700 mt-1">{label}</div>
        </div>

        <div className="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center border border-white">
          <Icon size={18} />
        </div>
      </div>

      <div className="text-xl font-black mt-4">฿{formatMoney(value)}</div>
    </div>
  );
}
