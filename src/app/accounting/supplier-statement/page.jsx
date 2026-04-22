"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Building2,
  Search,
  RefreshCw,
  Wallet,
  AlertTriangle,
  Eye,
} from "lucide-react";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SupplierStatementListPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    supplierCount: 0,
    invoiceCount: 0,
    totalInvoiceAmount: 0,
    totalPaidAmount: 0,
    totalOutstandingAmount: 0,
    overdueAmount: 0,
  });

  const [filters, setFilters] = useState({
    keyword: "",
    onlyOutstanding: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (filters.keyword.trim()) {
        params.set("keyword", filters.keyword.trim());
      }

      if (filters.onlyOutstanding) {
        params.set("onlyOutstanding", "true");
      }

      const res = await apiFetch(
        `/ap/reports/supplier-statement/summary?${params.toString()}`
      );

      const data = res?.data || res || {};

      setRows(data.rows || []);
      setSummary(
        data.summary || {
          supplierCount: 0,
          invoiceCount: 0,
          totalInvoiceAmount: 0,
          totalPaidAmount: 0,
          totalOutstandingAmount: 0,
          overdueAmount: 0,
        }
      );
    } catch (err) {
      console.error("Load supplier statement summary error:", err);
      toast.error(err.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filters.keyword, filters.onlyOutstanding]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = (supplierId) => {
    if (!supplierId) {
      toast.error("ไม่พบรหัสซัพพลายเออร์");
      return;
    }

    router.push(`/accounting/supplier-statement/${supplierId}`);
  };

  return (
    <AuthGate requiredPermissions={["AP_READ"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1500px] mx-auto px-4 xl:px-6 py-8 space-y-8 min-h-screen bg-slate-50/50">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Building2 className="text-blue-600" />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  Supplier Statement
                </h1>
                <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2 mt-1">
                  <Wallet size={14} className="text-blue-500" />
                  รายงานเจ้าหนี้รายซัพพลายเออร์
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadData}
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
            label="จำนวนซัพพลายเออร์"
            value={`${summary.supplierCount || 0}`}
            sub={`${summary.invoiceCount || 0} ใบแจ้งหนี้`}
          />

          <SummaryCard
            label="ยอดตั้งหนี้ทั้งหมด"
            value={`฿${formatMoney(summary.totalInvoiceAmount)}`}
            sub="รวมยอดใบแจ้งหนี้"
            tone="blue"
          />

          <SummaryCard
            label="ยอดชำระแล้ว"
            value={`฿${formatMoney(summary.totalPaidAmount)}`}
            sub="เฉพาะรายการจ่ายปกติ"
            tone="emerald"
          />

          <SummaryCard
            label="ยอดคงค้าง"
            value={`฿${formatMoney(summary.totalOutstandingAmount)}`}
            sub={`เกินกำหนด ฿${formatMoney(summary.overdueAmount)}`}
            tone="rose"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="relative flex-1">
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
                  placeholder="ค้นหาชื่อซัพพลายเออร์ / รหัส / เลขภาษี"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-300"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600 cursor-pointer bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <input
                  type="checkbox"
                  checked={filters.onlyOutstanding}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      onlyOutstanding: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-blue-600"
                />
                แสดงเฉพาะที่มียอดคงค้าง
              </label>
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="py-20 text-center text-slate-400 font-bold">
                <RefreshCw className="animate-spin mx-auto mb-3" size={24} />
                กำลังโหลดข้อมูลซัพพลายเออร์
              </div>
            ) : rows.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-bold tracking-widest">
                ไม่พบข้อมูลซัพพลายเออร์
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rows.map((row) => (
                  <SupplierCard
                    key={row.supplier?.id || row.supplier?.code}
                    row={row}
                    onOpen={() => openDetail(row.supplier?.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

function SupplierCard({ row, onOpen }) {
  const outstanding = Number(row.totalOutstandingAmount || 0);
  const overdue = Number(row.overdueAmount || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
            <Building2 size={18} className="text-blue-600" />
          </div>

          <h3 className="font-black text-slate-900 truncate">
            {row.supplier?.name || "-"}
          </h3>

          <p className="text-[10px] font-bold text-slate-400 mt-1">
            รหัส: {row.supplier?.code || "-"} | เลขภาษี:{" "}
            {row.supplier?.taxId || "-"}
          </p>
        </div>

        <span
          className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black border ${
            outstanding > 0
              ? "bg-rose-50 text-rose-700 border-rose-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-100"
          }`}
        >
          {outstanding > 0 ? "มียอดค้าง" : "ไม่มีค้าง"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <MiniStat label="ใบแจ้งหนี้" value={`${row.invoiceCount || 0} ใบ`} />
        <MiniStat
          label="เกินกำหนดสูงสุด"
          value={`${row.maxDaysOverdue || 0} วัน`}
        />
        <MiniStat
          label="จ่ายแล้ว"
          value={`฿${formatMoney(row.totalPaidAmount)}`}
          tone="emerald"
        />
        <MiniStat
          label="ยอดคงค้าง"
          value={`฿${formatMoney(row.totalOutstandingAmount)}`}
          tone="rose"
        />
      </div>

      {overdue > 0 && (
        <div className="mt-4 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 text-xs font-black text-rose-700 flex items-center gap-2">
          <AlertTriangle size={14} />
          เกินกำหนด ฿{formatMoney(overdue)}
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="mt-5 w-full bg-slate-900 text-white rounded-2xl py-3 text-xs font-black tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
      >
        <Eye size={15} />
        ดู Statement
      </button>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone = "slate" }) {
  const toneClass = {
    slate: "bg-white border-slate-200 text-slate-900",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
  };

  return (
    <div
      className={`border rounded-3xl p-5 ${
        toneClass[tone] || toneClass.slate
      }`}
    >
      <div className="text-[10px] font-black text-slate-400 tracking-[0.2em]">
        {label}
      </div>
      <div className="text-xl xl:text-2xl font-black mt-2 break-words">
        {value}
      </div>
      <div className="text-[11px] font-bold text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 border-slate-100 text-slate-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
  };

  return (
    <div
      className={`border rounded-2xl px-3 py-3 ${
        toneClass[tone] || toneClass.slate
      }`}
    >
      <div className="text-[9px] font-black text-slate-400 tracking-widest">
        {label}
      </div>
      <div className="text-xs font-black mt-1 break-words">{value}</div>
    </div>
  );
}