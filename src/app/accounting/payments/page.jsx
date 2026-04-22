"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileText,
  RefreshCw,
  Search,
  Send,
  Wallet,
  XCircle,
} from "lucide-react";

/**
 * แก้ path 2 ตัวนี้ให้ตรงกับตำแหน่งไฟล์จริงของคุณ
 *
 * ตัวอย่างที่แนะนำ:
 * app/ap/payments/page.jsx
 * app/ap/payments/invoices/[id]/page.jsx
 * app/ap/payments/requests/[id]/page.jsx
 */
const INVOICE_DETAIL_BASE_PATH = "/accounting/payments/invoices";
const REQUEST_DETAIL_BASE_PATH = "/accounting/payments/requests";

const round2 = (value) => Number(Number(value || 0).toFixed(2));

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

const getInvoicePayments = (invoice) => {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];

  return payments.filter((payment) => {
    return !payment.status || payment.status === "ACTIVE";
  });
};

const getPaidAndOutstanding = (invoice) => {
  const activePayments = getInvoicePayments(invoice);

  const paidFromPayments = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amountPaid || 0),
    0
  );

  const paidAmount =
    invoice?.paidAmount !== undefined
      ? Number(invoice.paidAmount || 0)
      : paidFromPayments;

  const outstandingAmount =
    invoice?.outstandingAmount !== undefined
      ? Number(invoice.outstandingAmount || 0)
      : Math.max(Number(invoice?.grandTotal || 0) - paidAmount, 0);

  return {
    paidAmount: round2(paidAmount),
    outstandingAmount: round2(outstandingAmount < 0 ? 0 : outstandingAmount),
    paymentRoundCount: activePayments.length,
  };
};

const paymentRequestStatusInfo = {
  PENDING: {
    label: "รออนุมัติ",
    shortLabel: "รออนุมัติ",
    className: "bg-amber-50 text-amber-700 border-amber-100",
    icon: Clock,
  },
  APPROVED: {
    label: "อนุมัติแล้ว / รอจ่าย",
    shortLabel: "อนุมัติแล้ว",
    className: "bg-blue-50 text-blue-700 border-blue-100",
    icon: BadgeCheck,
  },
  REJECTED: {
    label: "ไม่อนุมัติ",
    shortLabel: "ไม่อนุมัติ",
    className: "bg-rose-50 text-rose-700 border-rose-100",
    icon: XCircle,
  },
  PAID: {
    label: "จ่ายรอบนี้แล้ว",
    shortLabel: "จ่ายแล้ว",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "ยกเลิกคำขอ",
    shortLabel: "ยกเลิก",
    className: "bg-slate-100 text-slate-500 border-slate-200",
    icon: Ban,
  },
};

const getRequestStatusInfo = (status) =>
  paymentRequestStatusInfo[status] || paymentRequestStatusInfo.PENDING;

const isActivePaymentRequestStatus = (status) =>
  ["PENDING", "APPROVED"].includes(status);

const requestPriority = {
  APPROVED: 50,
  PENDING: 40,
  PAID: 30,
  REJECTED: 20,
  CANCELLED: 10,
};

export default function APPaymentsTablePage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("request");

  const [loading, setLoading] = useState(false);
  const [loadingPayable, setLoadingPayable] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const [payableInvoices, setPayableInvoices] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [allPaymentRequests, setAllPaymentRequests] = useState([]);

  const [requestSearch, setRequestSearch] = useState("");
  const [paySearch, setPaySearch] = useState("");

  const loadPayableInvoices = useCallback(async () => {
    setLoadingPayable(true);

    try {
      const res = await apiFetch("/ap/invoices/payable");
      const rows = Array.isArray(res) ? res : res?.data || [];

      setPayableInvoices(rows);
    } catch (err) {
      console.error("Load payable invoices error:", err);
      toast.error(err.message || "โหลดใบตั้งหนี้ที่รอขอจ่ายไม่สำเร็จ");
    } finally {
      setLoadingPayable(false);
    }
  }, []);

  const loadApprovedRequests = useCallback(async () => {
    setLoading(true);

    try {
      const res = await apiFetch("/ap/payment-requests?status=APPROVED");
      const data = res?.data || res || {};

      setApprovedRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      console.error("Load approved payment requests error:", err);
      toast.error(err.message || "โหลดรายการที่อนุมัติแล้วไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllPaymentRequestStatuses = useCallback(async () => {
    setLoadingStatuses(true);

    try {
      const res = await apiFetch("/ap/payment-requests?status=ALL");
      const data = res?.data || res || {};

      setAllPaymentRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      console.error("Load payment request statuses error:", err);
      toast.error(err.message || "โหลดสถานะคำขอจ่ายไม่สำเร็จ");
    } finally {
      setLoadingStatuses(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadPayableInvoices(),
      loadApprovedRequests(),
      loadAllPaymentRequestStatuses(),
    ]);
  }, [
    loadPayableInvoices,
    loadApprovedRequests,
    loadAllPaymentRequestStatuses,
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const latestRequestByInvoiceId = useMemo(() => {
    const map = new Map();

    for (const request of allPaymentRequests) {
      const invoiceId = request.invoiceId || request.invoice?.id;

      if (!invoiceId) continue;

      const current = map.get(invoiceId);

      if (!current) {
        map.set(invoiceId, request);
        continue;
      }

      const currentPriority = requestPriority[current.status] || 0;
      const nextPriority = requestPriority[request.status] || 0;

      const currentTime = new Date(current.createdAt || 0).getTime();
      const nextTime = new Date(request.createdAt || 0).getTime();

      if (
        nextPriority > currentPriority ||
        (nextPriority === currentPriority && nextTime > currentTime)
      ) {
        map.set(invoiceId, request);
      }
    }

    return map;
  }, [allPaymentRequests]);

  const filteredPayableInvoices = useMemo(() => {
    const rows = payableInvoices
      .filter((inv) => {
        const { outstandingAmount } = getPaidAndOutstanding(inv);

        return inv.status !== "PAID" && Number(outstandingAmount || 0) > 0.01;
      })
      .map((inv) => ({
        ...inv,
        latestPaymentRequest: latestRequestByInvoiceId.get(inv.id) || null,
      }));

    const keyword = requestSearch.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter((inv) => {
      const text = [
        inv.invoiceNo,
        inv.taxInvoiceNo,
        inv.supplier?.name,
        inv.supplier?.code,
        inv.purchaseOrder?.poNumber,
        inv.goodsReceipt?.receiptNo,
        inv.latestPaymentRequest?.requestNo,
        inv.latestPaymentRequest?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [payableInvoices, latestRequestByInvoiceId, requestSearch]);

  const filteredApprovedRequests = useMemo(() => {
    const keyword = paySearch.trim().toLowerCase();

    if (!keyword) return approvedRequests;

    return approvedRequests.filter((request) => {
      const invoice = request.invoice || {};
      const supplier = invoice.supplier || {};

      const text = [
        request.requestNo,
        request.referenceNo,
        invoice.invoiceNo,
        invoice.taxInvoiceNo,
        supplier.name,
        supplier.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [approvedRequests, paySearch]);

  const requestSummary = useMemo(() => {
    return filteredPayableInvoices.reduce(
      (acc, inv) => {
        const { outstandingAmount } = getPaidAndOutstanding(inv);

        const latestRequest = inv.latestPaymentRequest;
        const blocked =
          latestRequest && isActivePaymentRequestStatus(latestRequest.status);

        acc.totalCount += 1;
        acc.totalOutstanding += Number(outstandingAmount || 0);

        if (blocked) {
          acc.waitingCount += 1;
        } else {
          acc.requestableCount += 1;
          acc.requestableAmount += Number(outstandingAmount || 0);
        }

        return acc;
      },
      {
        totalCount: 0,
        totalOutstanding: 0,
        requestableCount: 0,
        requestableAmount: 0,
        waitingCount: 0,
      }
    );
  }, [filteredPayableInvoices]);

  const paySummary = useMemo(() => {
    return filteredApprovedRequests.reduce(
      (acc, request) => {
        acc.count += 1;
        acc.amount += Number(request.amountRequested || 0);

        return acc;
      },
      { count: 0, amount: 0 }
    );
  }, [filteredApprovedRequests]);

  const goToInvoiceDetail = (invoiceId) => {
    if (!invoiceId) return;
    router.push(`${INVOICE_DETAIL_BASE_PATH}/${invoiceId}`);
  };

  const goToRequestDetail = (requestId) => {
    if (!requestId) return;
    router.push(`${REQUEST_DETAIL_BASE_PATH}/${requestId}`);
  };

  return (
    <AuthGate requiredPermissions={["AP_PAYMENT_MANAGE"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 xl:px-6 py-8 space-y-8 min-h-screen bg-slate-50/50">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                <CreditCard className="text-emerald-600" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  AP Payment
                </h1>

                <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2 mt-1">
                  <Wallet size={14} className="text-emerald-500 shrink-0" />
                  ตารางรายการขอจ่ายและรายการอนุมัติแล้ว แยกหน้าเพื่อดูรายละเอียด
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadAll}
              disabled={loading || loadingPayable || loadingStatuses}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs tracking-widest hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 w-fit"
            >
              <RefreshCw
                size={15}
                className={
                  loading || loadingPayable || loadingStatuses
                    ? "animate-spin"
                    : ""
                }
              />
              โหลดข้อมูลใหม่
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            label="ใบตั้งหนี้ที่ขอจ่ายได้"
            value={`${requestSummary.requestableCount}`}
            sub={`ยอดขอจ่ายได้ ฿${formatMoney(
              requestSummary.requestableAmount
            )}`}
            tone="blue"
          />

          <SummaryCard
            label="มีคำขอแล้ว / รอขั้นตอน"
            value={`${requestSummary.waitingCount}`}
            sub="รออนุมัติ / อนุมัติแล้ว"
            tone="amber"
          />

          <SummaryCard
            label="รายการอนุมัติรอจ่าย"
            value={`${paySummary.count}`}
            sub={`ยอดรอบันทึกจ่าย ฿${formatMoney(paySummary.amount)}`}
            tone="emerald"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-white">
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "request"}
                onClick={() => setActiveTab("request")}
                icon={Send}
                label="สร้างคำขอจ่าย"
              />

              <TabButton
                active={activeTab === "pay"}
                onClick={() => setActiveTab("pay")}
                icon={CreditCard}
                label="จ่ายรายการที่อนุมัติแล้ว"
              />
            </div>
          </div>

          {activeTab === "request" ? (
            <RequestInvoiceTableSection
              loading={loadingPayable || loadingStatuses}
              rows={filteredPayableInvoices}
              search={requestSearch}
              setSearch={setRequestSearch}
              onDetail={goToInvoiceDetail}
            />
          ) : (
            <ApprovedPaymentTableSection
              loading={loading}
              rows={filteredApprovedRequests}
              search={paySearch}
              setSearch={setPaySearch}
              onDetail={goToRequestDetail}
            />
          )}
        </div>
      </div>
    </AuthGate>
  );
}

function RequestInvoiceTableSection({
  loading,
  rows,
  search,
  setSearch,
  onDetail,
}) {
  return (
    <div>
      <div className="p-5 border-b border-slate-100">
        <div className="relative max-w-xl">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่ใบแจ้งหนี้ / ซัพพลายเออร์ / PO / GR / สถานะ"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <LoadingBox text="กำลังโหลดใบตั้งหนี้และสถานะคำขอจ่าย" />
        ) : rows.length === 0 ? (
          <EmptyBox text="ไม่พบใบตั้งหนี้ที่ยังมียอดค้างให้ขอจ่าย" />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[1250px] bg-white text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <Th>ใบแจ้งหนี้</Th>
                  <Th>ซัพพลายเออร์</Th>
                  <Th>PO / GR</Th>
                  <Th align="right">ยอดสุทธิ</Th>
                  <Th align="right">จ่ายแล้ว</Th>
                  <Th align="right">คงเหลือ</Th>
                  <Th align="center">รอบจ่าย</Th>
                  <Th>สถานะคำขอล่าสุด</Th>
                  <Th align="center">จัดการ</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((invoice) => (
                  <RequestInvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    onDetail={() => onDetail(invoice.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovedPaymentTableSection({
  loading,
  rows,
  search,
  setSearch,
  onDetail,
}) {
  return (
    <div>
      <div className="p-5 border-b border-slate-100">
        <div className="relative max-w-xl">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่คำขอ / ใบแจ้งหนี้ / ซัพพลายเออร์ / เลขอ้างอิง"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-emerald-600 focus:bg-white placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <LoadingBox text="กำลังโหลดรายการอนุมัติรอจ่าย" />
        ) : rows.length === 0 ? (
          <EmptyBox text="ไม่พบรายการที่อนุมัติแล้วรอบันทึกจ่าย" />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[1200px] bg-white text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <Th>เลขที่คำขอ</Th>
                  <Th>ใบแจ้งหนี้</Th>
                  <Th>ซัพพลายเออร์</Th>
                  <Th>อนุมัติเมื่อ</Th>
                  <Th>วิธีจ่าย</Th>
                  <Th align="right">ยอดอนุมัติ</Th>
                  <Th align="right">ยอดใบแจ้งหนี้</Th>
                  <Th align="right">คงเหลือ</Th>
                  <Th align="center">จัดการ</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((request) => (
                  <ApprovedPaymentRow
                    key={request.id}
                    request={request}
                    onDetail={() => onDetail(request.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestInvoiceRow({ invoice, onDetail }) {
  const { paidAmount, outstandingAmount, paymentRoundCount } =
    getPaidAndOutstanding(invoice);

  const latestRequest = invoice.latestPaymentRequest;
  const requestInfo = latestRequest
    ? getRequestStatusInfo(latestRequest.status)
    : null;
  const StatusIcon = requestInfo?.icon;

  const isOverdue = invoice.dueDate
    ? new Date(invoice.dueDate) < new Date()
    : false;

  const hasActiveRequest =
    latestRequest && isActivePaymentRequestStatus(latestRequest.status);

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <Td>
        <div className="font-black text-blue-700 uppercase">
          {invoice.invoiceNo || "-"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          TAX: {invoice.taxInvoiceNo || "N/A"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
          ครบกำหนด: {formatDateTH(invoice.dueDate)}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-rose-600">
              <AlertTriangle size={10} />
              เกินกำหนด
            </span>
          )}
        </div>
      </Td>

      <Td>
        <div className="font-black text-slate-800 flex items-center gap-2 max-w-[260px]">
          <Building2 size={14} className="text-slate-400 shrink-0" />
          <span className="truncate">{invoice.supplier?.name || "-"}</span>
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          Code: {invoice.supplier?.code || "-"}
        </div>
      </Td>

      <Td>
        <div className="font-bold text-slate-700">
          PO: {invoice.purchaseOrder?.poNumber || "-"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          GR: {invoice.goodsReceipt?.receiptNo || "-"}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-blue-700">
          ฿{formatMoney(invoice.grandTotal)}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-emerald-700">
          ฿{formatMoney(paidAmount)}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-rose-600">
          ฿{formatMoney(outstandingAmount)}
        </div>
      </Td>

      <Td align="center">
        {paymentRoundCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-[10px] font-black">
            {paymentRoundCount} รอบ
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-400">
            ยังไม่จ่าย
          </span>
        )}
      </Td>

      <Td>
        {latestRequest && requestInfo && StatusIcon ? (
          <div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black border ${requestInfo.className}`}
            >
              <StatusIcon size={11} />
              {requestInfo.label}
            </span>

            <div className="text-[10px] font-bold text-slate-400 mt-1">
              {latestRequest.requestNo || "-"} | ฿
              {formatMoney(latestRequest.amountRequested)}
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-400">
            ยังไม่มีคำขอ
          </span>
        )}
      </Td>

      <Td align="center">
        <button
          type="button"
          onClick={onDetail}
          className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
            hasActiveRequest
              ? "bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white"
              : "bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white"
          }`}
        >
          <Eye size={13} />
          ดูรายละเอียด
        </button>
      </Td>
    </tr>
  );
}

function ApprovedPaymentRow({ request, onDetail }) {
  const invoice = request.invoice || {};
  const supplier = invoice.supplier || {};
  const invoiceSummary = request.invoiceSummary || {};

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <Td>
        <div className="font-black text-emerald-700 uppercase">
          {request.requestNo || "-"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          Ref: {request.referenceNo || "-"}
        </div>
      </Td>

      <Td>
        <div className="font-black text-slate-800">
          {invoice.invoiceNo || "-"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          TAX: {invoice.taxInvoiceNo || "N/A"}
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
        <div className="font-bold text-slate-700">
          {formatDateTH(request.approvedAt)}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-1">
          ผู้อนุมัติ: {request.approvedByName || "-"}
        </div>
      </Td>

      <Td>
        <div className="font-bold text-slate-700">
          {getPaymentMethodLabel(request.paymentMethod)}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-emerald-700">
          ฿{formatMoney(request.amountRequested)}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-blue-700">
          ฿{formatMoney(invoiceSummary.grandTotal)}
        </div>
      </Td>

      <Td align="right">
        <div className="font-black text-rose-600">
          ฿{formatMoney(invoiceSummary.outstandingAmount)}
        </div>
      </Td>

      <Td align="center">
        <button
          type="button"
          onClick={onDetail}
          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all"
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
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

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
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

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

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
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
