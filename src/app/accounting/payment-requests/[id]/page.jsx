"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Wallet,
  X,
  XCircle,
  Check,
  Calculator
} from "lucide-react";

const LIST_PATH = "/accounting/payment-requests";

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

const getPaidByName = (payment) => {
  const fullName = [payment?.paidBy?.firstName, payment?.paidBy?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || payment?.paidBy?.username || "-";
};

const normalizeInvoicePayments = (invoice, currentRequest) => {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];

  const activePayments = payments.filter((payment) => {
    return !payment?.status || payment?.status === "ACTIVE";
  });

  const sortedPayments = [...activePayments].sort((a, b) => {
    const dateA = new Date(a?.paymentDate || a?.createdAt || 0).getTime();
    const dateB = new Date(b?.paymentDate || b?.createdAt || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
  });

  const currentPaidPaymentId =
    currentRequest?.paidPaymentId || currentRequest?.paidPayment?.id || null;

  const grandTotal = Number(invoice?.grandTotal || 0);
  let runningPaid = 0;

  return sortedPayments.map((payment, index) => {
    const amount = Number(payment?.amountPaid || 0);
    const beforeOutstanding = round2(Math.max(grandTotal - runningPaid, 0));

    runningPaid = round2(runningPaid + amount);

    const afterOutstanding = round2(Math.max(grandTotal - runningPaid, 0));
    const roundNo = index + 1;
    const totalRounds = sortedPayments.length;

    let paymentTypeLabel = "แบ่งจ่าย";

    if (totalRounds === 1 && afterOutstanding <= 0.01) {
      paymentTypeLabel = "จ่ายทั้งหมด";
    } else if (afterOutstanding <= 0.01) {
      paymentTypeLabel = "ปิดยอดแบ่งจ่าย";
    }

    return {
      ...payment,
      roundNo,
      totalRounds,
      beforeOutstanding,
      afterOutstanding,
      paymentTypeLabel,
      roundLabel:
        paymentTypeLabel === "จ่ายทั้งหมด"
          ? "จ่ายทั้งหมด"
          : `${paymentTypeLabel} รอบที่ ${roundNo}/${totalRounds}`,
      isCurrentRequestPayment:
        currentPaidPaymentId && payment?.id === currentPaidPaymentId,
    };
  });
};

export default function APPaymentRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [request, setRequest] = useState(null);

  const [approveModal, setApproveModal] = useState({ isOpen: false, note: "" });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, reason: "" });
  const [successPopup, setSuccessPopup] = useState({ isOpen: false, type: "" });

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/ap/payment-requests/${encodeURIComponent(id)}`);
      const data = res?.data || res || null;
      setRequest(data);
    } catch (err) {
      console.error("Load payment request detail error:", err);
      toast.error(err?.message || "โหลดรายละเอียดคำขอจ่ายเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const invoice = request?.invoice || {};
  const supplier = invoice?.supplier || {};
  const invoiceSummary = request?.invoiceSummary || {};
  const status = getStatusInfo(request?.status);
  const StatusIcon = status?.icon || Clock;

  const paymentHistory = useMemo(() => {
    return normalizeInvoicePayments(invoice, request);
  }, [invoice, request]);

  const currentPaymentAmount = Number(
    request?.paidPayment?.amountPaid || request?.amountRequested || 0
  );

  const outstandingBeforeThisRequest =
    request?.status === "PAID"
      ? round2(Number(invoiceSummary?.outstandingAmount || 0) + currentPaymentAmount)
      : round2(Number(invoiceSummary?.outstandingAmount || 0));

  const outstandingAfterThisRequest = round2(
    Math.max(outstandingBeforeThisRequest - Number(request?.amountRequested || 0), 0)
  );

  const canApprove = request?.status === "PENDING";

  const handleApprove = async () => {
    if (!request?.id) return;
    setActionLoading(true);
    try {
      await apiFetch(`/ap/payment-requests/${encodeURIComponent(request.id)}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approvalNote: approveModal.note?.trim() || null,
        }),
      });

      setApproveModal({ isOpen: false, note: "" });
      setSuccessPopup({ isOpen: true, type: "APPROVE" });
      await loadDetail();
    } catch (err) {
      console.error("Approve payment request error:", err);
      toast.error(err?.message || "อนุมัติคำขอจ่ายเงินไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request?.id) return;
    if (!rejectModal.reason?.trim()) {
      toast.error("กรุณาระบุเหตุผลในการไม่อนุมัติ");
      return;
    }
    setActionLoading(true);
    try {
      await apiFetch(`/ap/payment-requests/${encodeURIComponent(request.id)}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rejectReason: rejectModal.reason.trim(),
        }),
      });

      setRejectModal({ isOpen: false, reason: "" });
      setSuccessPopup({ isOpen: true, type: "REJECT" });
      await loadDetail();
    } catch (err) {
      console.error("Reject payment request error:", err);
      toast.error(err?.message || "ไม่อนุมัติคำขอจ่ายเงินไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthGate requiredPermissions={["AP_PAYMENT_APPROVE"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <button
              onClick={() => router.push(LIST_PATH)}
              className="flex items-center gap-2 w-fit text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F3B8B] rounded-md"
            >
              <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#1F3B8B]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight break-words">
                  รายละเอียดคำขอจ่ายเงิน
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2 break-words">
                  <Wallet size={16} className="text-blue-500 shrink-0" />
                  ตรวจรายละเอียดบิล ประวัติแบ่งจ่าย และอนุมัติรายการ
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDetail}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-slate-50 shadow-sm active:scale-95 disabled:opacity-50 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-[#1F3B8B]"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> โหลดข้อมูลใหม่
          </button>
        </div>

        {loading ? (
          <LoadingBox text="กำลังโหลดรายละเอียดคำขอจ่ายเงิน" />
        ) : !request ? (
          <EmptyBox text="ไม่พบรายละเอียดคำขอจ่ายเงิน" />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard
                label="ยอดใบแจ้งหนี้"
                value={`฿${formatMoney(invoiceSummary?.grandTotal)}`}
                sub={invoice?.invoiceNo || "-"}
                tone="blue"
              />
              <SummaryCard
                label="จ่ายแล้วก่อนหน้า"
                value={`฿${formatMoney(invoiceSummary?.paidAmount)}`}
                sub={`${paymentHistory.length} รอบจ่ายที่บันทึกแล้ว`}
                tone="emerald"
              />
              <SummaryCard
                label="ยอดขอจ่ายครั้งนี้"
                value={`฿${formatMoney(request?.amountRequested)}`}
                sub={getPaymentMethodLabel(request?.paymentMethod)}
                tone="rose"
              />
              <SummaryCard
                label="คงเหลือหลังคำขอนี้"
                value={`฿${formatMoney(request?.status === "PAID" ? invoiceSummary?.outstandingAmount : outstandingAfterThisRequest)}`}
                sub={request?.status === "PAID" ? "หลังบันทึกจ่ายจริง" : "คำนวณจากยอดขอจ่าย"}
                tone="amber"
              />
            </div>

            <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1.5 w-full md:w-auto">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">เลขที่คำขอจ่ายเงิน</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl md:text-3xl font-black text-[#1F3B8B] tabular-nums break-words">{request?.requestNo || "-"}</h2>
                    <span className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 ${status.className}`}>
                      <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2 break-words">
                    วันที่ขอ: {formatDateTH(request?.createdAt)} <span className="mx-2 text-slate-300">|</span> วันที่ต้องการจ่าย: {formatDateTH(request?.requestedPaymentDate)}
                  </p>
                </div>

                {canApprove && (
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => setRejectModal({ isOpen: true, reason: "" })}
                      disabled={actionLoading}
                      className="flex-1 md:flex-none justify-center bg-white border border-rose-200 text-rose-600 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-rose-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <XCircle size={16} /> ไม่อนุมัติ
                    </button>
                    <button
                      type="button"
                      onClick={() => setApproveModal({ isOpen: true, note: "" })}
                      disabled={actionLoading}
                      className="flex-1 md:flex-none justify-center bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-60 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <BadgeCheck size={16} /> อนุมัติการจ่ายเงิน
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#1F3B8B]" /> ข้อมูลการดำเนินการ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <DetailInfoItem label="ผู้ขอจ่าย" value={request?.requestedByName || "-"} subValue={`Ref: ${request?.referenceNo || "-"}`} />
                  <DetailInfoItem label="วิธีจ่าย / ยอดขอจ่าย" value={getPaymentMethodLabel(request?.paymentMethod)} subValue={`฿${formatMoney(request?.amountRequested)}`} />

                  {request?.approvedByName && (
                    <DetailInfoItem label="ผู้อนุมัติ" value={request.approvedByName} subValue={`วันที่อนุมัติ: ${formatDateTH(request?.approvedAt)}`} valueColor="text-emerald-600" />
                  )}
                  {request?.rejectedByName && (
                    <DetailInfoItem label="ผู้ไม่อนุมัติ" value={request.rejectedByName} subValue={`วันที่ไม่อนุมัติ: ${formatDateTH(request?.rejectedAt)}`} valueColor="text-rose-600" />
                  )}
                  {request?.paidPayment && (
                    <DetailInfoItem label="บันทึกจ่ายแล้ว (PV)" value={request.paidPayment?.pvNo || "-"} subValue={`${formatDateTH(request.paidPayment?.paymentDate)} | ฿${formatMoney(request.paidPayment?.amountPaid)}`} valueColor="text-[#1F3B8B]" />
                  )}
                </div>

                {(request?.rejectReason || request?.remarks) && (
                  <div className="mt-6 space-y-4">
                    {request?.rejectReason && (
                      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-sm font-bold text-rose-700 break-words">
                        <span className="uppercase text-xs tracking-widest block mb-1">เหตุผลที่ไม่อนุมัติ</span>
                        {request.rejectReason}
                      </div>
                    )}
                    {request?.remarks && (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-700 break-words">
                        <span className="uppercase text-xs tracking-widest block mb-1 text-slate-500">หมายเหตุ</span>
                        {request.remarks}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  <div className="space-y-4">
                    <h3 className="text-[13px] font-black text-[#1F3B8B] flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> ข้อมูลซัพพลายเออร์ / ผู้ขาย
                    </h3>
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col gap-5 h-full">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0">ชื่อผู้ขาย</span>
                        <span className="text-[13px] font-black text-[#1F3B8B] text-right break-words">{supplier?.name || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0">รหัสผู้ขาย</span>
                        <span className="text-[13px] font-black text-slate-900 text-right break-words">{supplier?.code || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0">เลขประจำตัวผู้เสียภาษี</span>
                        <span className="text-[13px] font-black text-slate-900 text-right break-words">{supplier?.taxId || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0">เครดิต (วัน)</span>
                        <span className="text-[13px] font-black text-slate-900 text-right">
                          {supplier?.creditDays !== undefined && supplier?.creditDays !== null ? `${supplier.creditDays} วัน` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[13px] font-black text-[#1F3B8B] flex items-center gap-2">
                      <Calculator className="w-4 h-4" /> สรุปการพิจารณายอดเงิน
                    </h3>
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col h-full">
                      <div className="flex flex-col gap-5">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[13px] font-bold text-slate-500 shrink-0">ยอดคงเหลือก่อนคำขอนี้</span>
                          <span className="text-[13px] font-black text-slate-900 text-right tabular-nums break-words">฿{formatMoney(outstandingBeforeThisRequest)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[13px] font-bold text-slate-500 shrink-0">ยอดขอจ่ายครั้งนี้</span>
                          <span className="text-[13px] font-black text-slate-900 text-right tabular-nums break-words">฿{formatMoney(request?.amountRequested)}</span>
                        </div>
                      </div>
                      <div className="mt-auto pt-5 border-t border-slate-200">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[13px] font-bold text-slate-500 shrink-0">ยอดคงเหลือหลังคำขอนี้</span>
                          <span className="text-lg font-black text-emerald-600 text-right tabular-nums drop-shadow-sm break-words">
                            ฿{formatMoney(request?.status === "PAID" ? invoiceSummary?.outstandingAmount : outstandingAfterThisRequest)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-12">
                  <h3 className="text-[13px] font-black text-[#1F3B8B] flex items-center gap-2">
                    <FileText className="w-4 h-4" /> รายละเอียดใบแจ้งหนี้ (Invoice Details)
                  </h3>
                  <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-8 items-stretch">
                      <div className="flex flex-col gap-5">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[13px] font-bold text-slate-500 shrink-0">เลขที่ใบแจ้งหนี้</span>
                          <span className="text-[13px] font-black text-[#1F3B8B] text-right break-words">{invoice?.invoiceNo || "-"}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[13px] font-bold text-slate-500 shrink-0">เลขที่ใบกำกับภาษี</span>
                          <span className="text-[13px] font-black text-slate-900 text-right break-words">{invoice?.taxInvoiceNo || "-"}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[13px] font-bold text-slate-500 shrink-0">วันออกเอกสาร</span>
                          <span className="text-[13px] font-black text-slate-900 text-right break-words">{formatDateTH(invoice?.issueDate)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[13px] font-bold text-slate-500 shrink-0">วันครบกำหนด</span>
                          <span className="text-[13px] font-black text-slate-900 text-right break-words">{formatDateTH(invoice?.dueDate)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[13px] font-bold text-slate-500 shrink-0">PO / GR</span>
                          <span className="text-[11px] font-black text-slate-900 text-right uppercase tracking-tight break-words">
                            {invoice?.purchaseOrder?.poNumber || "-"} / {invoice?.goodsReceipt?.receiptNo || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col h-full">
                        <div className="flex flex-col gap-5">
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-[13px] font-bold text-slate-500 shrink-0">ยอดก่อน VAT</span>
                            <span className="text-[13px] font-black text-slate-900 text-right tabular-nums break-words">฿{formatMoney(invoice?.subTotal)}</span>
                          </div>
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-[13px] font-bold text-slate-500 shrink-0">VAT</span>
                            <span className="text-[13px] font-black text-slate-900 text-right tabular-nums break-words">฿{formatMoney(invoice?.vatAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-[13px] font-bold text-slate-500 shrink-0">หัก ณ ที่จ่าย</span>
                            <span className="text-[13px] font-black text-slate-900 text-right tabular-nums break-words">฿{formatMoney(invoice?.whtAmount)}</span>
                          </div>
                        </div>

                        <div className="mt-auto pt-5 border-t border-slate-200">
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-[13px] font-bold text-slate-500 shrink-0">ยอดสุทธิ (Grand Total)</span>
                            <span className="text-base font-black text-[#1F3B8B] text-right tabular-nums break-words">฿{formatMoney(invoice?.grandTotal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-[#1F3B8B]" /> ตารางประวัติการจ่ายของบิลนี้
                </h3>
                <PaymentHistoryTable payments={paymentHistory} invoice={invoice} request={request} />
              </div>
            </div>
          </div>
        )}

        {approveModal.isOpen && (
          <TextActionModal
            title="ยืนยันการอนุมัติคำขอจ่ายเงิน"
            subtitle={request?.requestNo}
            icon={BadgeCheck}
            tone="emerald"
            label="หมายเหตุการอนุมัติ (ถ้ามี)"
            placeholder="เช่น อนุมัติให้จ่ายตามเอกสาร"
            value={approveModal.note}
            loading={actionLoading}
            confirmText="ยืนยันอนุมัติ"
            onChange={(value) => setApproveModal((prev) => ({ ...prev, note: value }))}
            onClose={() => setApproveModal({ isOpen: false, note: "" })}
            onSubmit={handleApprove}
          />
        )}

        {rejectModal.isOpen && (
          <TextActionModal
            title="ไม่อนุมัติคำขอจ่ายเงิน"
            subtitle={request?.requestNo}
            icon={XCircle}
            tone="rose"
            label="เหตุผลในการไม่อนุมัติ *"
            placeholder="เช่น เอกสารไม่ครบ, ยอดไม่ตรง, รอตรวจสอบเพิ่มเติม"
            value={rejectModal.reason}
            loading={actionLoading}
            confirmText="ยืนยันไม่อนุมัติ"
            onChange={(value) => setRejectModal((prev) => ({ ...prev, reason: value }))}
            onClose={() => setRejectModal({ isOpen: false, reason: "" })}
            onSubmit={handleReject}
          />
        )}

        {successPopup.isOpen && (
          <SuccessModal
            type={successPopup.type}
            onClose={() => setSuccessPopup({ isOpen: false, type: "" })}
          />
        )}
      </div>
    </AuthGate>
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
    <div className={`bg-white border border-slate-200 border-l-4 ${themes[tone] || themes.slate} p-5 rounded-xl shadow-sm transition-all hover:shadow-md flex flex-col justify-center min-w-0`}>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">{label}</p>
      <span className="text-2xl font-black text-slate-900 tabular-nums break-words">{value}</span>
      <p className="text-xs font-bold text-slate-400 mt-1.5 truncate">{sub}</p>
    </div>
  );
}

function DetailInfoItem({ label, value, subValue, valueColor = "text-slate-900" }) {
  return (
    <div className="flex flex-col justify-center min-w-0">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">{label}</span>
      <span className={`text-base font-bold ${valueColor} break-words`}>{value}</span>
      {subValue && <span className="text-xs font-bold text-slate-400 uppercase mt-0.5 break-words">{subValue}</span>}
    </div>
  );
}

function PaymentHistoryTable({ payments }) {
  if (!payments.length) {
    return (
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center bg-slate-50/50 mx-auto w-full">
        <div className="text-sm font-black text-slate-500">บิลนี้ยังไม่มีประวัติการจ่าย</div>
        <div className="text-xs font-bold text-slate-400 mt-2">คำขอนี้จะเป็นรอบแรก หากได้รับอนุมัติและฝ่ายการเงินบันทึกจ่าย</div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
              <th className="p-4 text-center w-24 whitespace-nowrap">รอบ</th>
              <th className="p-4 text-left whitespace-nowrap">PV No.</th>
              <th className="p-4 text-left whitespace-nowrap">วันที่จ่าย</th>
              <th className="p-4 text-left whitespace-nowrap">วิธีจ่าย</th>
              <th className="p-4 text-right whitespace-nowrap">ยอดก่อนจ่าย</th>
              <th className="p-4 text-right whitespace-nowrap">ยอดจ่าย</th>
              <th className="p-4 text-right whitespace-nowrap">คงเหลือหลังจ่าย</th>
              <th className="p-4 text-left whitespace-nowrap">ผู้บันทึก</th>
              <th className="p-4 text-center whitespace-nowrap">เอกสาร</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {payments.map((payment) => (
              <tr key={payment?.id} className={`text-sm ${payment?.isCurrentRequestPayment ? "bg-emerald-50/40" : "hover:bg-slate-50"}`}>
                <td className="p-4 text-center whitespace-nowrap">
                  <div className="inline-flex flex-col items-center gap-1">
                    <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 text-[10px] font-black">
                      {payment?.roundLabel}
                    </span>
                    {payment?.isCurrentRequestPayment && <span className="text-[10px] font-black text-emerald-600">รายการนี้</span>}
                  </div>
                </td>
                <td className="p-4 whitespace-nowrap">
                  <div className="font-bold text-[#1F3B8B]">{payment?.pvNo || "-"}</div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">เลขที่อ้างอิง: {payment?.referenceNo || "-"}</div>
                </td>
                <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{formatDateTH(payment?.paymentDate)}</td>
                <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{getPaymentMethodLabel(payment?.paymentMethod)}</td>
                <td className="p-4 text-right font-semibold tabular-nums text-slate-600 whitespace-nowrap">฿{formatMoney(payment?.beforeOutstanding)}</td>
                <td className="p-4 text-right font-black tabular-nums text-emerald-600 whitespace-nowrap">฿{formatMoney(payment?.amountPaid)}</td>
                <td className="p-4 text-right font-bold tabular-nums text-rose-600 whitespace-nowrap">฿{formatMoney(payment?.afterOutstanding)}</td>
                <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{getPaidByName(payment)}</td>
                <td className="p-4 text-center whitespace-nowrap">
                  {payment?.id ? (
                    <a href={`/ap/payments/${encodeURIComponent(payment.id)}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1F3B8B] hover:underline focus:outline-none focus:ring-2 focus:ring-[#1F3B8B] rounded-sm">
                      <Printer className="w-3.5 h-3.5" /> PDF
                    </a>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextActionModal({ title, subtitle, icon: Icon, tone, label, placeholder, value, loading, confirmText, onChange, onClose, onSubmit }) {
  const isEmerald = tone === "emerald";
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isEmerald ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <Icon size={24} />
          </div>
          <div className="mt-1 min-w-0">
            <h3 className="text-lg font-black text-slate-900 break-words">{title}</h3>
            <p className="text-sm font-bold text-slate-500 mt-1 break-words">เลขที่เอกสาร: {subtitle || "-"}</p>
          </div>
        </div>
        <div className="p-6 space-y-4 bg-slate-50/50">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">{label}</label>
            <textarea
              rows={4}
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B] placeholder:text-slate-400 resize-none shadow-sm"
            />
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white flex-wrap">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className={`px-6 py-2.5 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 ${isEmerald ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'}`}
          >
            {loading && <RefreshCw size={16} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ type, onClose }) {
  const isApprove = type === "APPROVE";
  const bgColor = isApprove ? "bg-emerald-500" : "bg-rose-500";
  const title = isApprove ? "อนุมัติเสร็จสิ้น" : "ไม่อนุมัติเสร็จสิ้น";
  const desc = isApprove ? "รายการนี้ถูกอนุมัติและอัปเดตสถานะเรียบร้อยแล้ว" : "รายการนี้ถูกปฏิเสธและอัปเดตสถานะเรียบร้อยแล้ว";

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col items-center p-8 scale-100 animate-in zoom-in text-center">
        <div className={`w-16 h-16 rounded-full ${bgColor} flex items-center justify-center text-white mb-5 shadow-lg`}>
          <Check size={32} strokeWidth={3} />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-sm font-bold text-slate-500 mb-8">{desc}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  );
}

function LoadingBox({ text }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl py-24 px-4 text-center text-slate-400 font-bold flex flex-col items-center justify-center mx-auto w-full">
      <RefreshCw className="animate-spin mb-4 text-[#1F3B8B]" size={32} />
      <span className="break-words max-w-full">{text}</span>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl py-24 px-4 text-center text-slate-500 font-bold tracking-widest text-lg mx-auto w-full break-words">
      {text}
    </div>
  );
}