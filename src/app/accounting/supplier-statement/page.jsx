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
  Users,
  FileText,
  CheckCircle2,
  Clock
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

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500 min-h-screen">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                  <Building2 className="w-7 h-7 text-[#1F3B8B]" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                    รายงานเจ้าหนี้รายซัพพลายเออร์
                  </h1>
                  <p className="text-sm text-slate-500 mt-1.5 font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Supplier Statement
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="bg-[#1F3B8B] text-white px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-[#152865] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 w-full xl:w-auto active:scale-95 outline-none focus:ring-2 focus:ring-[#1F3B8B] focus:ring-offset-1"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                โหลดข้อมูลใหม่
              </button>
            </div>
          </div>
        </div>

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            label="จำนวนซัพพลายเออร์"
            value={`${summary.supplierCount || 0}`}
            sub={`${summary.invoiceCount || 0} ใบแจ้งหนี้`}
            tone="slate"
            
          />
          <SummaryCard
            label="ยอดตั้งหนี้ทั้งหมด"
            value={`฿ ${formatMoney(summary.totalInvoiceAmount)}`}
            sub="รวมยอดใบแจ้งหนี้"
            tone="blue"
           
          />
          <SummaryCard
            label="ยอดชำระแล้ว"
            value={`฿ ${formatMoney(summary.totalPaidAmount)}`}
            sub="เฉพาะรายการจ่ายปกติ"
            tone="emerald"
           
          />
          <SummaryCard
            label="ยอดคงค้าง"
            value={`฿ ${formatMoney(summary.totalOutstandingAmount)}`}
            sub={`เกินกำหนด ฿${formatMoney(summary.overdueAmount)}`}
            tone="rose"
           
          />
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Filters */}
          <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"
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
                className="w-full bg-white border border-slate-300 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 placeholder:text-slate-300 shadow-sm transition-all text-slate-900"
              />
            </div>

            <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-600 uppercase tracking-widest cursor-pointer bg-white border border-slate-200 rounded-xl px-5 py-3.5 shadow-sm hover:bg-slate-50 transition-colors w-full lg:w-auto">
              <input
                type="checkbox"
                checked={filters.onlyOutstanding}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    onlyOutstanding: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#1F3B8B] focus:ring-[#1F3B8B]/20"
              />
              แสดงเฉพาะที่มียอดคงค้าง
            </label>
          </div>

          {/* Supplier Grid */}
          <div className="p-6 md:p-8 bg-slate-50/30">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                <span className="text-xs font-bold uppercase tracking-widest">กำลังโหลดข้อมูลซัพพลายเออร์...</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Building2 className="w-8 h-8 opacity-50" />
                <span className="text-xs font-bold uppercase tracking-widest">ไม่พบข้อมูลซัพพลายเออร์</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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

// --- SUB COMPONENTS ---

function SupplierCard({ row, onOpen }) {
  const outstanding = Number(row.totalOutstandingAmount || 0);
  const overdue = Number(row.overdueAmount || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-[#1F3B8B]/30 transition-all flex flex-col shadow-sm group">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 border border-[#1F3B8B]/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6 text-[#1F3B8B]" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 truncate">
            {row.supplier?.name || "-"}
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            รหัส: {row.supplier?.code || "-"} | เลขภาษี: {row.supplier?.taxId || "-"}
          </p>
        </div>

        <span
          className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm w-fit ${
            outstanding > 0
              ? "bg-rose-50 text-rose-600 border-rose-100"
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}
        >
          {outstanding > 0 ? "มียอดค้าง" : "ไม่มีค้าง"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
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
        <div className="mt-4 bg-rose-50 border border-rose-100 rounded-lg px-4 py-3 text-xs font-bold text-rose-600 flex items-center gap-2 uppercase tracking-wider shadow-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          เกินกำหนด ฿{formatMoney(overdue)}
        </div>
      )}

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={onOpen}
          className="w-full bg-slate-50 text-[#1F3B8B] border border-slate-200 hover:bg-[#1F3B8B] hover:text-white rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm outline-none focus:ring-2 focus:ring-[#1F3B8B]/20 active:scale-95"
        >
          <Eye className="w-4 h-4" />
          ดู Statement
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }) {
  const themes = {
    slate: "border-l-slate-400 bg-slate-50/50",
    blue: "border-l-[#1F3B8B] bg-[#1F3B8B]/5",
    emerald: "border-l-emerald-500 bg-emerald-50/30",
    rose: "border-l-rose-500 bg-rose-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
  };
  
  return (
    <div 
      style={{ containerType: "inline-size" }} /* 1. เพิ่มตัวนี้ให้กล่องแม่วัดความกว้างตัวเองได้ */
      className={`bg-white border border-slate-200 border-l-4 ${themes[tone] || themes.slate} p-5 rounded-xl shadow-sm transition-all hover:shadow-md flex flex-col justify-center min-w-0`}
    >
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">{label}</p>
      
      {/* 2. เอาคลาส truncate หรือ text-3xl ออก, ใส่ whitespace-nowrap และคุมขนาดฟอนต์ด้วย style */}
      <div 
        style={{ fontSize: "clamp(1rem, 10cqw, 1.875rem)" }} 
        className="font-black text-slate-900 tabular-nums tracking-tighter whitespace-nowrap"
      >
        {value}
      </div>
      
      <p className="text-xs font-bold text-slate-400 mt-1.5 truncate">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900 bg-slate-50 border-slate-100",
    emerald: "text-emerald-600 bg-emerald-50/50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50/50 border-rose-100",
  };

  return (
    <div 
      style={{ containerType: "inline-size" }} /* 1. เพิ่มตัวนี้ให้การ์ดวัดความกว้างตัวเองได้ */
      className={`p-3 rounded-xl border flex flex-col justify-center min-w-0 ${tones[tone] || tones.slate}`}
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
        {label}
      </p>

      {/* 2. ใช้ clamp() เพื่อย่อ/ขยายฟอนต์ตามขนาดกล่อง และห้ามตกบรรทัด */}
      <div 
        style={{ fontSize: "clamp(10px, 12cqw, 14px)" }} 
        className="font-black tabular-nums tracking-tighter whitespace-nowrap"
      >
        {value}
      </div>
    </div>
  );
}