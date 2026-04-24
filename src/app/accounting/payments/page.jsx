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
  const payments = Array.isArray(invoice?.payments) ? invoice?.payments : [];
  return payments.filter((payment) => {
    return !payment?.status || payment?.status === "ACTIVE";
  });
};

const getPaidAndOutstanding = (invoice) => {
  const activePayments = getInvoicePayments(invoice);
  const paidFromPayments = activePayments.reduce(
    (sum, payment) => sum + Number(payment?.amountPaid || 0),
    0
  );
  const paidAmount =
    invoice?.paidAmount !== undefined
      ? Number(invoice?.paidAmount || 0)
      : paidFromPayments;
  const outstandingAmount =
    invoice?.outstandingAmount !== undefined
      ? Number(invoice?.outstandingAmount || 0)
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
    className: "bg-amber-50 text-amber-600 border-amber-100",
    icon: Clock,
  },
  APPROVED: {
    label: "อนุมัติแล้ว / รอจ่าย",
    shortLabel: "อนุมัติแล้ว",
    className: "bg-[#1F3B8B]/10 text-[#1F3B8B] border-[#1F3B8B]/20",
    icon: BadgeCheck,
  },
  REJECTED: {
    label: "ไม่อนุมัติ",
    shortLabel: "ไม่อนุมัติ",
    className: "bg-rose-50 text-rose-600 border-rose-100",
    icon: XCircle,
  },
  PAID: {
    label: "จ่ายรอบนี้แล้ว",
    shortLabel: "จ่ายแล้ว",
    className: "bg-emerald-50 text-emerald-600 border-emerald-100",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "ยกเลิกคำขอ",
    shortLabel: "ยกเลิก",
    className: "bg-slate-50 text-slate-500 border-slate-200",
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
      toast.error(err?.message || "โหลดใบตั้งหนี้ที่รอขอจ่ายไม่สำเร็จ");
    } finally {
      setLoadingPayable(false);
    }
  }, []);

  const loadApprovedRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/ap/payment-requests?status=APPROVED");
      const data = res?.data || res || {};
      setApprovedRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (err) {
      console.error("Load approved payment requests error:", err);
      toast.error(err?.message || "โหลดรายการที่อนุมัติแล้วไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllPaymentRequestStatuses = useCallback(async () => {
    setLoadingStatuses(true);
    try {
      const res = await apiFetch("/ap/payment-requests?status=ALL");
      const data = res?.data || res || {};
      setAllPaymentRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (err) {
      console.error("Load payment request statuses error:", err);
      toast.error(err?.message || "โหลดสถานะคำขอจ่ายไม่สำเร็จ");
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
  }, [loadPayableInvoices, loadApprovedRequests, loadAllPaymentRequestStatuses]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const latestRequestByInvoiceId = useMemo(() => {
    const map = new Map();
    for (const request of allPaymentRequests) {
      const invoiceId = request?.invoiceId || request?.invoice?.id;
      if (!invoiceId) continue;
      const current = map.get(invoiceId);
      if (!current) {
        map.set(invoiceId, request);
        continue;
      }
      const currentPriority = requestPriority[current?.status] || 0;
      const nextPriority = requestPriority[request?.status] || 0;
      const currentTime = new Date(current?.createdAt || 0).getTime();
      const nextTime = new Date(request?.createdAt || 0).getTime();

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
        return inv?.status !== "PAID" && Number(outstandingAmount || 0) > 0.01;
      })
      .map((inv) => ({
        ...inv,
        latestPaymentRequest: latestRequestByInvoiceId.get(inv?.id) || null,
      }));

    const keyword = requestSearch.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((inv) => {
      const text = [
        inv?.invoiceNo,
        inv?.taxInvoiceNo,
        inv?.supplier?.name,
        inv?.supplier?.code,
        inv?.purchaseOrder?.poNumber,
        inv?.goodsReceipt?.receiptNo,
        inv?.latestPaymentRequest?.requestNo,
        inv?.latestPaymentRequest?.status,
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
      const invoice = request?.invoice || {};
      const supplier = invoice?.supplier || {};
      const text = [
        request?.requestNo,
        request?.referenceNo,
        invoice?.invoiceNo,
        invoice?.taxInvoiceNo,
        supplier?.name,
        supplier?.code,
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
        const latestRequest = inv?.latestPaymentRequest;
        const blocked =
          latestRequest && isActivePaymentRequestStatus(latestRequest?.status);

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
        acc.amount += Number(request?.amountRequested || 0);
        return acc;
      },
      { count: 0, amount: 0 }
    );
  }, [filteredApprovedRequests]);

  const goToInvoiceDetail = (invoiceId) => {
    if (!invoiceId) return;
    router.push(`${INVOICE_DETAIL_BASE_PATH}/${encodeURIComponent(invoiceId)}`);
  };

  const goToRequestDetail = (requestId) => {
    if (!requestId) return;
    router.push(`${REQUEST_DETAIL_BASE_PATH}/${encodeURIComponent(requestId)}`);
  };

  return (
    <AuthGate requiredPermissions={["AP_PAYMENT_MANAGE"]}>
      <Toaster position="top-right" />
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                <CreditCard className="w-6 h-6 text-[#1F3B8B]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight break-words">
                  บันทึกจ่ายเงินเจ้าหนี้
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2 break-words">
                  <Wallet size={16} className="text-blue-500 shrink-0" />
                  AP Payment
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAll}
            disabled={loading || loadingPayable || loadingStatuses}
            className="flex items-center justify-center gap-2 bg-[#1F3B8B] border border-transparent text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-blue-900 shadow-sm active:scale-95 disabled:opacity-50 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-[#1F3B8B] focus:ring-offset-1"
          >
            <RefreshCw
              size={16}
              className={loading || loadingPayable || loadingStatuses ? "animate-spin" : ""}
            />
            โหลดข้อมูลใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard
            label="ใบตั้งหนี้ที่ขอจ่ายได้"
            value={`${requestSummary.requestableCount}`}
            sub={`ยอดขอจ่ายได้ ฿${formatMoney(requestSummary.requestableAmount)}`}
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

        <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col animate-in fade-in duration-500">
          <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200">
            <div className="flex flex-wrap gap-3 mb-6">
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

            {activeTab === "request" ? (
              <div className="relative w-full group">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  ค้นหาข้อมูล (Search)
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" />
                  <input
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    placeholder="ค้นหาเลขที่ใบแจ้งหนี้ / ซัพพลายเออร์ / PO / GR / สถานะ..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            ) : (
              <div className="relative w-full group">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  ค้นหาข้อมูล (Search)
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" />
                  <input
                    value={paySearch}
                    onChange={(e) => setPaySearch(e.target.value)}
                    placeholder="ค้นหาเลขที่คำขอ / ใบแจ้งหนี้ / ซัพพลายเออร์ / เลขอ้างอิง..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto w-full relative">
            {activeTab === "request" ? (
              <RequestInvoiceTable
                loading={loadingPayable || loadingStatuses}
                rows={filteredPayableInvoices}
                onDetail={goToInvoiceDetail}
              />
            ) : (
              <ApprovedPaymentTable
                loading={loading}
                rows={filteredApprovedRequests}
                onDetail={goToRequestDetail}
              />
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

function RequestInvoiceTable({ loading, rows, onDetail }) {
  if (loading) return <LoadingBox text="กำลังโหลดใบตั้งหนี้และสถานะคำขอจ่าย" />;
  if (rows.length === 0) return <EmptyBox text="ไม่พบใบตั้งหนี้ที่ยังมียอดค้างให้ขอจ่าย" />;

  return (
    <table className="min-w-full border-collapse text-left w-full">
      <thead className="bg-slate-100 border-b border-slate-200">
        <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-wider whitespace-nowrap">
          <Th minWidth="280px">ใบแจ้งหนี้ / ซัพพลายเออร์</Th>
          <Th minWidth="180px">อ้างอิง / รอบจ่าย</Th>
          <Th align="right" minWidth="220px">สรุปยอดเงิน</Th>
          <Th minWidth="180px">สถานะคำขอล่าสุด</Th>
          <Th align="center" minWidth="120px">จัดการ</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map((invoice) => (
          <RequestInvoiceRow key={invoice?.id} invoice={invoice} onDetail={() => onDetail(invoice?.id)} />
        ))}
      </tbody>
    </table>
  );
}

function ApprovedPaymentTable({ loading, rows, onDetail }) {
  if (loading) return <LoadingBox text="กำลังโหลดรายการอนุมัติรอจ่าย" />;
  if (rows.length === 0) return <EmptyBox text="ไม่พบรายการที่อนุมัติแล้วรอบันทึกจ่าย" />;

  return (
    <table className="min-w-full border-collapse text-left w-full">
      <thead className="bg-slate-100 border-b border-slate-200">
        <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-wider whitespace-nowrap">
          <Th minWidth="240px">คำขอ / ใบแจ้งหนี้</Th>
          <Th minWidth="240px">ซัพพลายเออร์ / วิธีจ่าย</Th>
          <Th minWidth="180px">การอนุมัติ</Th>
          <Th align="right" minWidth="220px">สรุปยอดเงิน</Th>
          <Th align="center" minWidth="120px">จัดการ</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map((request) => (
          <ApprovedPaymentRow key={request?.id} request={request} onDetail={() => onDetail(request?.id)} />
        ))}
      </tbody>
    </table>
  );
}

function RequestInvoiceRow({ invoice, onDetail }) {
  const { paidAmount, outstandingAmount, paymentRoundCount } = getPaidAndOutstanding(invoice);
  const latestRequest = invoice?.latestPaymentRequest;
  const requestInfo = latestRequest ? getRequestStatusInfo(latestRequest?.status) : null;
  const StatusIcon = requestInfo?.icon;
  const isOverdue = invoice?.dueDate ? new Date(invoice.dueDate) < new Date() : false;

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <Td>
        <div className="font-black text-[#1F3B8B] uppercase text-[13px] tracking-wide">
          {invoice?.invoiceNo || "-"}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
          ใบกำกับภาษี: {invoice?.taxInvoiceNo || "N/A"}
        </div>
        
        <div className="font-bold text-slate-900 text-[13px] mt-2.5 truncate max-w-[240px]" title={invoice?.supplier?.name}>
          {invoice?.supplier?.name || "-"}
        </div>
        <div className="text-[10px] font-black text-[#1F3B8B] mt-0.5 tracking-widest uppercase">
          ID: {invoice?.supplier?.code || "-"}
        </div>

        <div className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
          ครบกำหนด: {formatDateTH(invoice?.dueDate)}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              <AlertTriangle size={10} />
              เกินกำหนด
            </span>
          )}
        </div>
      </Td>

      <Td>
        <div className="font-bold text-slate-900 text-[13px] whitespace-nowrap">
          PO: {invoice?.purchaseOrder?.poNumber || "-"}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter whitespace-nowrap">
          GR: {invoice?.goodsReceipt?.receiptNo || "-"}
        </div>
        <div className="mt-3">
          {paymentRoundCount > 0 ? (
            <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 text-[10px] font-black tabular-nums shadow-sm whitespace-nowrap">
              {paymentRoundCount} รอบ
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">
              ยังไม่จ่าย
            </span>
          )}
        </div>
      </Td>

      <Td align="right">
        <div className="w-full max-w-[180px] ml-auto space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">ยอดสุทธิ:</span>
            <span className="font-black text-[#1F3B8B] tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(invoice?.grandTotal)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">จ่ายแล้ว:</span>
            <span className="font-black text-emerald-600 tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(paidAmount)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">คงเหลือ:</span>
            <span className="font-black text-rose-600 tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(outstandingAmount)}</span>
          </div>
        </div>
      </Td>

      <Td>
        {latestRequest && requestInfo && StatusIcon ? (
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${requestInfo.className}`}
            >
              <StatusIcon size={12} strokeWidth={2.5} />
              {requestInfo.label}
            </span>
            <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter whitespace-nowrap">
              {latestRequest?.requestNo || "-"}
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap">
              ฿{formatMoney(latestRequest?.amountRequested)}
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
            ยังไม่มีคำขอ
          </span>
        )}
      </Td>

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

function ApprovedPaymentRow({ request, onDetail }) {
  const invoice = request?.invoice || {};
  const supplier = invoice?.supplier || {};
  const invoiceSummary = request?.invoiceSummary || {};

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      {/* แก้ไข: นำไอคอนและการเว้นช่องว่างออกเพื่อให้ข้อความชิดซ้ายเป็นระเบียบ */}
      <Td>
        <div className="font-black text-emerald-600 uppercase text-[13px] tracking-wide whitespace-nowrap">
          {request?.requestNo || "-"}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[200px] uppercase tracking-tighter" title={request?.referenceNo}>
         เลขที่อ้างอิง: {request?.referenceNo || "-"}
        </div>
        
        <div className="font-bold text-slate-900 text-[13px] mt-2.5 whitespace-nowrap">
          ใบแจ้งหนี้: {invoice?.invoiceNo || "-"}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter whitespace-nowrap">
        ใบกำกับภาษี: {invoice?.taxInvoiceNo || "N/A"}
        </div>
      </Td>

      {/* แก้ไข: นำไอคอน Building2 และ Wallet ออก และจัด left-alignment ใหม่ */}
      <Td>
        <div className="font-bold text-slate-900 text-[13px] truncate max-w-[220px]" title={supplier?.name}>
          {supplier?.name || "-"}
        </div>
        <div className="text-[10px] font-black text-[#1F3B8B] mt-0.5 tracking-widest uppercase">
          CODE: {supplier?.code || "-"}
        </div>
        <div className="mt-2.5 font-bold text-slate-700 text-[12px]">
          {getPaymentMethodLabel(request?.paymentMethod)}
        </div>
      </Td>

      <Td>
        <div className="font-bold text-slate-700 tabular-nums text-[13px] whitespace-nowrap flex items-center gap-1.5">
          <Clock size={14} className="text-amber-500" />
          {formatDateTH(request?.approvedAt)}
        </div>
        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter whitespace-nowrap pl-5">
          ผู้อนุมัติ: {request?.approvedByName || "-"}
        </div>
      </Td>

      <Td align="right">
        <div className="w-full max-w-[180px] ml-auto space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">ยอดอนุมัติ:</span>
            <span className="font-black text-emerald-600 tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(request?.amountRequested)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">ยอดเต็ม:</span>
            <span className="font-black text-[#1F3B8B] tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(invoiceSummary?.grandTotal)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold">คงเหลือ:</span>
            <span className="font-black text-rose-600 tabular-nums text-[13px] whitespace-nowrap">฿{formatMoney(invoiceSummary?.outstandingAmount)}</span>
          </div>
        </div>
      </Td>

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
      <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums tracking-tighter truncate">
        {value}
        <span className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">รายการ</span>
      </div>
      <p className="text-xs font-bold text-slate-400 mt-1.5 truncate">{sub}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-2 border outline-none active:scale-95 focus:ring-2 focus:ring-[#1F3B8B]/20 ${
        active
          ? "bg-[#1F3B8B] text-white border-[#1F3B8B] shadow-sm"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
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