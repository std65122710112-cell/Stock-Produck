"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  XCircle,
  ChevronRight,
  Truck,
  FileText
} from "lucide-react";

const DETAIL_BASE_PATH = "/accounting/payment-requests";

const todayInput = () => new Date().toISOString().split("T")[0];

const firstDayOfMonthInput = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

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

const getPaymentMethodLabel = (method) => {
  const map = {
    TRANSFER: "โอนเงิน",
    CHEQUE: "เช็ค",
    CASH: "เงินสด",
    OTHER: "อื่น ๆ",
  };

  return map[method] || method || "-";
};

const requestStatusInfo = {
  PENDING: {
    label: "รออนุมัติ",
    className: "bg-amber-50 text-amber-600 border-amber-100",
    icon: Clock,
  },
  APPROVED: {
    label: "อนุมัติแล้ว",
    className: "bg-[#1F3B8B]/10 text-[#1F3B8B] border-[#1F3B8B]/20",
    icon: BadgeCheck,
  },
  REJECTED: {
    label: "ไม่อนุมัติ",
    className: "bg-rose-50 text-rose-600 border-rose-100",
    icon: XCircle,
  },
  PAID: {
    label: "จ่ายแล้ว",
    className: "bg-emerald-50 text-emerald-600 border-emerald-100",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "ยกเลิก",
    className: "bg-slate-50 text-slate-500 border-slate-200",
    icon: Ban,
  },
};

const getStatusInfo = (status) =>
  requestStatusInfo[status] || requestStatusInfo.PENDING;

const getInvoicePaymentStats = (request) => {
  const summary = request?.invoiceSummary || {};
  const invoice = request?.invoice || {};
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];

  const paidRoundCount = payments.filter(
    (payment) => !payment?.status || payment?.status === "ACTIVE"
  ).length;

  return {
    grandTotal: Number(summary.grandTotal || invoice.grandTotal || 0),
    paidAmount: Number(summary.paidAmount || 0),
    outstandingAmount: Number(summary.outstandingAmount || 0),
    paidRoundCount,
  };
};

export default function APPaymentApprovalTablePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    rejectedCount: 0,
    paidCount: 0,
    paidAmount: 0,
    cancelledCount: 0,
  });

  const [filters, setFilters] = useState({
    keyword: "",
    status: "PENDING",
    from: firstDayOfMonthInput(),
    to: todayInput(),
  });

  const loadRequests = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (filters.keyword.trim()) {
        params.set("keyword", filters.keyword.trim());
      }

      if (filters.status && filters.status !== "ALL") {
        params.set("status", filters.status);
      }

      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await apiFetch(`/ap/payment-requests?${params.toString()}`);
      const data = res?.data || res || {};

      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setSummary(
        data.summary || {
          totalCount: 0,
          totalAmount: 0,
          pendingCount: 0,
          pendingAmount: 0,
          approvedCount: 0,
          approvedAmount: 0,
          rejectedCount: 0,
          paidCount: 0,
          paidAmount: 0,
          cancelledCount: 0,
        }
      );
    } catch (err) {
      console.error("Load payment requests error:", err);
      toast.error(err?.message || "โหลดรายการคำขออนุมัติจ่ายเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filters.keyword, filters.status, filters.from, filters.to]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const tableRows = useMemo(() => {
    return requests.map((request) => {
      const invoice = request?.invoice || {};
      const supplier = invoice?.supplier || {};
      const stats = getInvoicePaymentStats(request);

      return {
        ...request,
        invoice,
        supplier,
        stats,
      };
    });
  }, [requests]);

  const goToDetail = (requestId) => {
    if (!requestId) return;
    router.push(`${DETAIL_BASE_PATH}/${encodeURIComponent(requestId)}`);
  };

  return (
    <AuthGate requiredPermissions={["AP_PAYMENT_APPROVE"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#1F3B8B]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight break-words">
                  ตารางรายการคำขออนุมัติจ่ายเงิน
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2 break-words">
                  <Wallet size={16} className="text-blue-500 shrink-0" />
                  Payment Request Approval & Management
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-slate-50 shadow-sm active:scale-95 disabled:opacity-50 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-[#1F3B8B]"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> โหลดข้อมูลใหม่
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            label="รออนุมัติ (Pending)"
            value={`${summary.pendingCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.pendingAmount)}`}
            tone="amber"
          />
          <SummaryCard
            label="อนุมัติแล้ว (Approved)"
            value={`${summary.approvedCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.approvedAmount)}`}
            tone="blue"
          />
          <SummaryCard
            label="ไม่อนุมัติ (Rejected)"
            value={`${summary.rejectedCount || 0}`}
            sub="รายการที่ถูกปฏิเสธ"
            tone="rose"
          />
          <SummaryCard
            label="จ่ายแล้ว (Paid)"
            value={`${summary.paidCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.paidAmount)}`}
            tone="emerald"
          />
        </div>

        {/* MAIN CONTAINER */}
        <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col animate-in fade-in duration-500">
          
          {/* SEARCH & FILTERS SECTION */}
          <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6">
              
              <div className="w-full lg:flex-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  ค้นหาข้อมูล (Search)
                </label>
                <div className="relative group">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors"
                  />
                  <input
                    value={filters.keyword}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        keyword: e.target.value,
                      }))
                    }
                    placeholder="ค้นหาเลขที่คำขอ / ใบแจ้งหนี้ / ซัพพลายเออร์ / เลขอ้างอิง..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full lg:w-auto">
                <FilterInput
                  label="จากวันที่"
                  type="date"
                  value={filters.from}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, from: value }))
                  }
                />

                <FilterInput
                  label="ถึงวันที่"
                  type="date"
                  value={filters.to}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, to: value }))
                  }
                />

                <div className="col-span-1 sm:col-span-2 md:col-span-1 flex flex-col space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">
                    สถานะเอกสาร
                  </label>
                  {/* แก้ไขเครื่องหมายปิดแท็กให้ถูกต้อง */}
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="w-full lg:w-[200px] bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm cursor-pointer transition-all"
                  >
                    <option value="ALL">ทั้งหมด</option>
                    <option value="PENDING">รออนุมัติ</option>
                    <option value="APPROVED">อนุมัติแล้ว</option>
                    <option value="REJECTED">ไม่อนุมัติ</option>
                    <option value="PAID">จ่ายแล้ว</option>
                    <option value="CANCELLED">ยกเลิก</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="overflow-x-auto w-full relative">
            {loading ? (
              <LoadingBox text="กำลังโหลดรายการคำขออนุมัติ..." />
            ) : tableRows.length === 0 ? (
              <EmptyBox text="ไม่พบรายการคำขออนุมัติจ่ายเงินในขณะนี้" />
            ) : (
              <table className="min-w-full border-collapse text-left w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-wider whitespace-nowrap">
                    <Th minWidth="200px">คำขอ / สถานะ</Th>
                    <Th minWidth="240px">ซัพพลายเออร์ / วิธีจ่าย</Th>
                    <Th minWidth="200px">ใบแจ้งหนี้ / อ้างอิง</Th>
                    <Th minWidth="160px">กำหนดเวลา / รอบ</Th>
                    <Th align="right" minWidth="200px">สรุปยอดเงิน</Th>
                    <Th align="center" minWidth="120px">จัดการ</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {tableRows.map((request) => (
                    <RequestTableRow
                      key={request.id}
                      request={request}
                      onDetail={() => goToDetail(request.id)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

// --- SUB-COMPONENTS ---

function SummaryCard({ label, value, sub, tone }) {
  const themes = {
    slate: "border-l-slate-400 bg-slate-50/50",
    blue: "border-l-[#1F3B8B] bg-[#1F3B8B]/5",
    emerald: "border-l-emerald-500 bg-emerald-50/30",
    rose: "border-l-rose-500 bg-rose-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
  };
  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${themes[tone] || themes.slate} p-5 rounded-xl shadow-sm transition-all hover:shadow-md flex flex-col justify-center min-w-0`}>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">{label}</p>
      <span className="text-2xl font-black text-slate-900 tabular-nums break-words">{value}</span>
      <p className="text-xs font-bold text-slate-400 mt-1.5 truncate">{sub}</p>
    </div>
  );
}

function FilterInput({ label, type = "text", value, onChange }) {
  return (
    <div className="flex flex-col items-start w-full space-y-2">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all"
      />
    </div>
  );
}

function RequestTableRow({ request, onDetail }) {
  const status = getStatusInfo(request?.status);
  const StatusIcon = status?.icon || Clock;
  const invoice = request?.invoice || {};
  const supplier = request?.supplier || {};
  const stats = request?.stats || {};

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      {/* Col 1: คำขอ / สถานะ */}
      <Td>
        <div className="font-black text-[#1F3B8B] uppercase text-[13px] tracking-wide whitespace-nowrap">
          {request?.requestNo || "-"}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter whitespace-nowrap">
          ผู้ขอ: {request?.requestedByName || "-"}
        </div>
        <div className="mt-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${status.className}`}
          >
            <StatusIcon size={12} strokeWidth={2.5} />
            {status.label}
          </span>
        </div>
      </Td>

      {/* Col 2: ซัพพลายเออร์ / วิธีจ่าย */}
      <Td>
        <div className="font-bold text-slate-900 text-[13px] truncate max-w-[220px]" title={supplier?.name}>
          {supplier?.name || "-"}
        </div>
        <div className="text-[10px] font-black text-[#1F3B8B] mt-0.5 tracking-widest uppercase">
          ID: {supplier?.code || "-"}
        </div>
        <div className="mt-2.5 font-bold text-slate-700 text-[12px] flex items-center gap-1.5">
          {getPaymentMethodLabel(request?.paymentMethod)}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[200px] uppercase tracking-tighter" title={request?.referenceNo}>
          เลขที่อ้างอิง: {request?.referenceNo || "-"}
        </div>
      </Td>

      {/* Col 3: ใบแจ้งหนี้ / อ้างอิง */}
      <Td>
        <div className="font-bold text-slate-900 text-[13px] whitespace-nowrap">
         ใบแจ้งหนี้: {invoice?.invoiceNo || "-"}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter whitespace-nowrap">
        ใบกำกับภาษี: {invoice?.taxInvoiceNo || "N/A"}
        </div>
        <div className="mt-2.5 font-bold text-slate-700 text-[12px] whitespace-nowrap">
          PO: {invoice?.purchaseOrder?.poNumber || "-"}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter whitespace-nowrap">
          GR: {invoice?.goodsReceipt?.receiptNo || "-"}
        </div>
      </Td>

      {/* Col 4: กำหนดเวลา / รอบ */}
      <Td>
        <div className="font-bold text-slate-700 tabular-nums text-[13px] whitespace-nowrap">
          {formatDateTH(request?.createdAt)}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter whitespace-nowrap">
          กำหนดจ่าย: {formatDateTH(request?.requestedPaymentDate)}
        </div>
        <div className="mt-2.5">
          {stats.paidRoundCount > 0 ? (
            <span className="inline-flex items-center justify-center rounded-md bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 text-[10px] font-black tabular-nums shadow-sm whitespace-nowrap">
              {stats.paidRoundCount} รอบ
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">
              ยังไม่จ่าย
            </span>
          )}
        </div>
      </Td>

      {/* Col 5: สรุปยอดเงิน */}
      <Td align="right">
        <div className="w-full max-w-[180px] ml-auto space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">ยอดขอจ่าย:</span>
            <span className="font-black text-rose-600 tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(request?.amountRequested)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">จ่ายแล้ว:</span>
            <span className="font-black text-emerald-600 tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(stats.paidAmount)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">คงเหลือ:</span>
            <span className="font-black text-slate-900 tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(stats.outstandingAmount)}</span>
          </div>
        </div>
      </Td>

      {/* Col 6: จัดการ */}
      <Td align="center">
        <button
          type="button"
          onClick={onDetail}
          className="inline-flex items-center gap-2 bg-white text-[#1F3B8B] border border-slate-200 px-4 py-2 rounded-lg text-[11px] font-bold tracking-wide hover:border-[#1F3B8B] hover:bg-[#1F3B8B] hover:text-white transition-all shadow-sm whitespace-nowrap outline-none focus:ring-2 focus:ring-[#1F3B8B]"
        >
          <Eye size={14} />
          รายละเอียด
        </button>
      </Td>
    </tr>
  );
}

function Th({ children, align = "left", minWidth }) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <th
      style={{ minWidth: minWidth }}
      className={`px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${alignClass}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return <td className={`px-6 py-5 align-top ${alignClass}`}>{children}</td>;
}

function LoadingBox({ text }) {
  return (
    <div className="bg-white py-24 text-center flex flex-col items-center justify-center mx-auto w-full">
      <RefreshCw className="animate-spin mb-4 text-[#1F3B8B]" size={32} />
      <span className="text-slate-400 font-bold break-words">{text}</span>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="bg-white py-24 text-center flex flex-col items-center justify-center mx-auto w-full">
      <Search className="mb-4 text-slate-300" size={32} />
      <span className="text-slate-500 font-bold tracking-widest text-lg break-words">{text}</span>
    </div>
  );
}