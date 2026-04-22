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
} from "lucide-react";

/**
 * ถ้า path หน้า detail ของคุณไม่ใช่ /payment-requests/[id]
 * ให้แก้ตรงนี้เป็น path จริง เช่น "/admin/payment-requests"
 */
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
    className: "bg-amber-50 text-amber-700 border-amber-100",
    icon: Clock,
  },
  APPROVED: {
    label: "อนุมัติแล้ว",
    className: "bg-blue-50 text-blue-700 border-blue-100",
    icon: BadgeCheck,
  },
  REJECTED: {
    label: "ไม่อนุมัติ",
    className: "bg-rose-50 text-rose-700 border-rose-100",
    icon: XCircle,
  },
  PAID: {
    label: "จ่ายแล้ว",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "ยกเลิก",
    className: "bg-slate-100 text-slate-500 border-slate-200",
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
    (payment) => !payment.status || payment.status === "ACTIVE"
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
      toast.error(err.message || "โหลดรายการคำขออนุมัติจ่ายเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filters.keyword, filters.status, filters.from, filters.to]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const tableRows = useMemo(() => {
    return requests.map((request) => {
      const invoice = request.invoice || {};
      const supplier = invoice.supplier || {};
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
    router.push(`${DETAIL_BASE_PATH}/${requestId}`);
  };

  return (
    <AuthGate requiredPermissions={["AP_PAYMENT_APPROVE"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 xl:px-6 py-8 space-y-8 min-h-screen bg-slate-50/50">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                <ShieldCheck className="text-blue-600" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Payment Request Approval
                </h1>

                <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2 mt-1">
                  <Wallet size={14} className="text-blue-500 shrink-0" />
                  ตารางรายการคำขออนุมัติจ่ายเงิน กดดูรายละเอียดเพื่ออนุมัติ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadRequests}
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
            label="รออนุมัติ"
            value={`${summary.pendingCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.pendingAmount)}`}
            tone="amber"
          />

          <SummaryCard
            label="อนุมัติแล้ว"
            value={`${summary.approvedCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.approvedAmount)}`}
            tone="blue"
          />

          <SummaryCard
            label="ไม่อนุมัติ"
            value={`${summary.rejectedCount || 0}`}
            sub="รายการที่ถูกปฏิเสธ"
            tone="rose"
          />

          <SummaryCard
            label="จ่ายแล้ว"
            value={`${summary.paidCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.paidAmount)}`}
            tone="emerald"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-white">
            <div className="flex flex-col xl:flex-row xl:items-end gap-3">
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
                  placeholder="ค้นหาเลขที่คำขอ / ใบแจ้งหนี้ / ซัพพลายเออร์ / เลขอ้างอิง"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-300"
                />
              </div>

              <FilterInput
                label="จากวันที่"
                type="date"
                value={filters.from}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    from: value,
                  }))
                }
              />

              <FilterInput
                label="ถึงวันที่"
                type="date"
                value={filters.to}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    to: value,
                  }))
                }
              />

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-[0.1em] ml-1">
                  สถานะ
                </label>

                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full xl:w-[190px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
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

          <div className="p-5">
            {loading ? (
              <LoadingBox text="กำลังโหลดรายการคำขออนุมัติ" />
            ) : tableRows.length === 0 ? (
              <EmptyBox text="ไม่พบรายการคำขออนุมัติจ่ายเงิน" />
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <table className="w-full min-w-[1250px] bg-white text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <Th>เลขที่คำขอ</Th>
                      <Th>สถานะ</Th>
                      <Th>วันที่ขอ</Th>
                      <Th>ซัพพลายเออร์</Th>
                      <Th>ใบแจ้งหนี้</Th>
                      <Th align="right">ยอดขอจ่าย</Th>
                      <Th align="right">จ่ายแล้ว</Th>
                      <Th align="right">คงเหลือ</Th>
                      <Th align="center">รอบจ่าย</Th>
                      <Th>วิธีจ่าย</Th>
                      <Th align="center">จัดการ</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {tableRows.map((request) => (
                      <RequestTableRow
                        key={request.id}
                        request={request}
                        onDetail={() => goToDetail(request.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

function RequestTableRow({ request, onDetail }) {
  const status = getStatusInfo(request.status);
  const StatusIcon = status.icon;
  const invoice = request.invoice || {};
  const supplier = request.supplier || {};
  const stats = request.stats || {};

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <Td>
        <div className="font-black text-blue-700 uppercase">
          {request.requestNo || "-"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          ผู้ขอ: {request.requestedByName || "-"}
        </div>
      </Td>

      <Td>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border ${status.className}`}
        >
          <StatusIcon size={11} />
          {status.label}
        </span>
      </Td>

      <Td>
        <div className="font-bold text-slate-700">
          {formatDateTH(request.createdAt)}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          ต้องการจ่าย: {formatDateTH(request.requestedPaymentDate)}
        </div>
      </Td>

      <Td>
        <div className="font-black text-slate-800 flex items-center gap-2 max-w-[260px]">
          <Building2 size={14} className="text-slate-400 shrink-0" />
          <span className="truncate">{supplier.name || "-"}</span>
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          Code: {supplier.code || "-"}
        </div>
      </Td>

      <Td>
        <div className="font-black text-slate-800">
          {invoice.invoiceNo || "-"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          TAX: {invoice.taxInvoiceNo || "N/A"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          PO: {invoice.purchaseOrder?.poNumber || "-"} | GR:{" "}
          {invoice.goodsReceipt?.receiptNo || "-"}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-rose-600">
          ฿{formatMoney(request.amountRequested)}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-emerald-700">
          ฿{formatMoney(stats.paidAmount)}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-slate-900">
          ฿{formatMoney(stats.outstandingAmount)}
        </div>
      </Td>

      <Td align="center">
        {stats.paidRoundCount > 0 ? (
          <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 text-[10px] font-black">
            {stats.paidRoundCount} รอบ
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-400">ยังไม่จ่าย</span>
        )}
      </Td>

      <Td>
        <div className="font-bold text-slate-700">
          {getPaymentMethodLabel(request.paymentMethod)}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          Ref: {request.referenceNo || "-"}
        </div>
      </Td>

      <Td align="center">
        <button
          type="button"
          onClick={onDetail}
          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all"
        >
          <Eye size={13} />
          ดูรายละเอียด
        </button>
      </Td>
    </tr>
  );
}

function Th({ children, align = "left" }) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <th
      className={`px-4 py-4 text-[10px] font-black tracking-widest uppercase ${alignClass}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return <td className={`px-4 py-4 align-top ${alignClass}`}>{children}</td>;
}

function SummaryCard({ label, value, sub, tone = "slate" }) {
  const toneClass = {
    slate: "bg-white border-slate-200 text-slate-900",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
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

function FilterInput({ label, type = "text", value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 tracking-[0.1em] ml-1">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full xl:w-[165px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
      />
    </div>
  );
}

function LoadingBox({ text }) {
  return (
    <div className="py-20 text-center text-slate-400 font-bold">
      <RefreshCw className="animate-spin mx-auto mb-3" size={24} />
      {text}
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="py-20 text-center text-slate-400 font-bold tracking-widest">
      {text}
    </div>
  );
}
