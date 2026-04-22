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
} from "lucide-react";

/**
 * ถ้า path หน้ารายการของคุณไม่ใช่ /payment-requests
 * ให้แก้ตรงนี้เป็น path จริง เช่น "/admin/payment-requests"
 */
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
    return !payment.status || payment.status === "ACTIVE";
  });

  const sortedPayments = [...activePayments].sort((a, b) => {
    const dateA = new Date(a.paymentDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.paymentDate || b.createdAt || 0).getTime();

    if (dateA !== dateB) return dateA - dateB;

    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  const currentPaidPaymentId =
    currentRequest?.paidPaymentId || currentRequest?.paidPayment?.id || null;

  const grandTotal = Number(invoice?.grandTotal || 0);
  let runningPaid = 0;

  return sortedPayments.map((payment, index) => {
    const amount = Number(payment.amountPaid || 0);
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
        currentPaidPaymentId && payment.id === currentPaidPaymentId,
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

  const [approveModal, setApproveModal] = useState({
    isOpen: false,
    note: "",
  });

  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    reason: "",
  });

  const loadDetail = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    try {
      const res = await apiFetch(`/ap/payment-requests/${id}`);
      const data = res?.data || res || null;

      setRequest(data);
    } catch (err) {
      console.error("Load payment request detail error:", err);
      toast.error(err.message || "โหลดรายละเอียดคำขอจ่ายเงินไม่สำเร็จ");
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
  const StatusIcon = status.icon;

  const paymentHistory = useMemo(() => {
    return normalizeInvoicePayments(invoice, request);
  }, [invoice, request]);

  const currentPaymentAmount = Number(
    request?.paidPayment?.amountPaid || request?.amountRequested || 0
  );

  const outstandingBeforeThisRequest =
    request?.status === "PAID"
      ? round2(Number(invoiceSummary.outstandingAmount || 0) + currentPaymentAmount)
      : round2(Number(invoiceSummary.outstandingAmount || 0));

  const outstandingAfterThisRequest = round2(
    Math.max(outstandingBeforeThisRequest - Number(request?.amountRequested || 0), 0)
  );

  const canApprove = request?.status === "PENDING";

  const handleApprove = async () => {
    if (!request?.id) return;

    setActionLoading(true);

    try {
      await apiFetch(`/ap/payment-requests/${request.id}/approve`, {
        method: "PUT",
        body: JSON.stringify({
          approvalNote: approveModal.note || null,
        }),
      });

      toast.success("อนุมัติคำขอจ่ายเงินสำเร็จ");
      setApproveModal({ isOpen: false, note: "" });
      await loadDetail();
    } catch (err) {
      console.error("Approve payment request error:", err);
      toast.error(err.message || "อนุมัติคำขอจ่ายเงินไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request?.id) return;

    if (!rejectModal.reason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการไม่อนุมัติ");
      return;
    }

    setActionLoading(true);

    try {
      await apiFetch(`/ap/payment-requests/${request.id}/reject`, {
        method: "PUT",
        body: JSON.stringify({
          rejectReason: rejectModal.reason,
        }),
      });

      toast.success("ไม่อนุมัติคำขอจ่ายเงินสำเร็จ");
      setRejectModal({ isOpen: false, reason: "" });
      await loadDetail();
    } catch (err) {
      console.error("Reject payment request error:", err);
      toast.error(err.message || "ไม่อนุมัติคำขอจ่ายเงินไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthGate requiredPermissions={["AP_PAYMENT_APPROVE"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1500px] mx-auto px-4 xl:px-6 py-8 space-y-8 min-h-screen bg-slate-50/50">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => router.push(LIST_PATH)}
                className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shrink-0"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                <ShieldCheck className="text-blue-600" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  รายละเอียดคำขอจ่ายเงิน
                </h1>

                <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2 mt-1">
                  <Wallet size={14} className="text-blue-500 shrink-0" />
                  ตรวจรายละเอียดบิล ประวัติแบ่งจ่าย และอนุมัติรายการ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadDetail}
              disabled={loading}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs tracking-widest hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 w-fit"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              โหลดข้อมูลใหม่
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingBox text="กำลังโหลดรายละเอียดคำขอจ่ายเงิน" />
        ) : !request ? (
          <EmptyBox text="ไม่พบรายละเอียดคำขอจ่ายเงิน" />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="ยอดใบแจ้งหนี้"
                value={`฿${formatMoney(invoiceSummary.grandTotal)}`}
                sub={invoice.invoiceNo || "-"}
                tone="blue"
              />

              <SummaryCard
                label="จ่ายแล้วก่อนหน้า"
                value={`฿${formatMoney(invoiceSummary.paidAmount)}`}
                sub={`${paymentHistory.length} รอบจ่ายที่บันทึกแล้ว`}
                tone="emerald"
              />

              <SummaryCard
                label="ยอดขอจ่ายครั้งนี้"
                value={`฿${formatMoney(request.amountRequested)}`}
                sub={getPaymentMethodLabel(request.paymentMethod)}
                tone="rose"
              />

              <SummaryCard
                label="คงเหลือหลังคำขอนี้"
                value={`฿${formatMoney(
                  request.status === "PAID"
                    ? invoiceSummary.outstandingAmount
                    : outstandingAfterThisRequest
                )}`}
                sub={
                  request.status === "PAID"
                    ? "หลังบันทึกจ่ายจริง"
                    : "คำนวณจากยอดขอจ่าย"
                }
                tone="amber"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black text-blue-700 uppercase">
                          {request.requestNo || "-"}
                        </h2>

                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border ${status.className}`}
                        >
                          <StatusIcon size={11} />
                          {status.label}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-400 mt-2">
                        วันที่ขอ: {formatDateTH(request.createdAt)} | วันที่ต้องการจ่าย:{" "}
                        {formatDateTH(request.requestedPaymentDate)}
                      </p>
                    </div>

                    {canApprove && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setApproveModal({ isOpen: true, note: "" })}
                          disabled={actionLoading}
                          className="bg-blue-50 text-blue-700 px-5 py-3 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 disabled:opacity-60"
                        >
                          <BadgeCheck size={15} />
                          อนุมัติ
                        </button>

                        <button
                          type="button"
                          onClick={() => setRejectModal({ isOpen: true, reason: "" })}
                          disabled={actionLoading}
                          className="bg-rose-50 text-rose-700 px-5 py-3 rounded-xl text-xs font-black hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2 disabled:opacity-60"
                        >
                          <XCircle size={15} />
                          ไม่อนุมัติ
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <InfoBox
                      icon={UserCheck}
                      label="ผู้ขอจ่าย"
                      value={request.requestedByName || "-"}
                      sub={`เลขอ้างอิง: ${request.referenceNo || "-"}`}
                    />

                    <InfoBox
                      icon={CreditCard}
                      label="วิธีจ่าย"
                      value={getPaymentMethodLabel(request.paymentMethod)}
                      sub={`ยอดขอจ่าย ฿${formatMoney(request.amountRequested)}`}
                    />

                    {request.approvedByName && (
                      <InfoBox
                        icon={BadgeCheck}
                        label="ผู้อนุมัติ"
                        value={request.approvedByName}
                        sub={`วันที่อนุมัติ: ${formatDateTH(request.approvedAt)}`}
                        tone="blue"
                      />
                    )}

                    {request.rejectedByName && (
                      <InfoBox
                        icon={XCircle}
                        label="ผู้ไม่อนุมัติ"
                        value={request.rejectedByName}
                        sub={`วันที่ไม่อนุมัติ: ${formatDateTH(request.rejectedAt)}`}
                        tone="rose"
                      />
                    )}

                    {request.paidPayment && (
                      <InfoBox
                        icon={ReceiptText}
                        label="บันทึกจ่ายแล้ว"
                        value={`PV: ${request.paidPayment.pvNo || "-"}`}
                        sub={`วันที่จ่าย: ${formatDateTH(
                          request.paidPayment.paymentDate
                        )} | ยอด ฿${formatMoney(request.paidPayment.amountPaid)}`}
                        tone="emerald"
                      />
                    )}
                  </div>

                  {request.rejectReason && (
                    <div className="mt-5 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm font-bold text-rose-700">
                      เหตุผลที่ไม่อนุมัติ: {request.rejectReason}
                    </div>
                  )}

                  {request.remarks && (
                    <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-600">
                      หมายเหตุ: {request.remarks}
                    </div>
                  )}
                </section>

                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <SectionTitle
                    icon={Banknote}
                    title="ตารางประวัติแบ่งจ่ายของบิลนี้"
                    subtitle="แสดงรอบจ่ายที่เคยบันทึกจริงจาก Payment Voucher"
                  />

                  <PaymentHistoryTable
                    payments={paymentHistory}
                    invoice={invoice}
                    request={request}
                  />
                </section>
              </div>

              <aside className="space-y-6">
                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <SectionTitle
                    icon={FileText}
                    title="รายละเอียดบิล"
                    subtitle="ข้อมูลใบแจ้งหนี้ / PO / GR"
                  />

                  <div className="space-y-3 mt-5">
                    <SummaryLine
                      label="เลขที่ใบแจ้งหนี้"
                      value={invoice.invoiceNo || "-"}
                      strong
                    />

                    <SummaryLine
                      label="เลขที่ใบกำกับภาษี"
                      value={invoice.taxInvoiceNo || "N/A"}
                    />

                    <SummaryLine
                      label="วันออกเอกสาร"
                      value={formatDateTH(invoice.issueDate)}
                    />

                    <SummaryLine
                      label="วันครบกำหนด"
                      value={formatDateTH(invoice.dueDate)}
                    />

                    <SummaryLine
                      label="PO"
                      value={invoice.purchaseOrder?.poNumber || "-"}
                    />

                    <SummaryLine
                      label="GR"
                      value={invoice.goodsReceipt?.receiptNo || "-"}
                    />

                    <SummaryLine
                      label="ยอดก่อน VAT"
                      value={`฿${formatMoney(invoice.subTotal)}`}
                    />

                    <SummaryLine
                      label="VAT"
                      value={`฿${formatMoney(invoice.vatAmount)}`}
                    />

                    <SummaryLine
                      label="หัก ณ ที่จ่าย"
                      value={`฿${formatMoney(invoice.whtAmount)}`}
                    />

                    <div className="pt-4 border-t border-slate-200">
                      <SummaryLine
                        label="ยอดสุทธิ"
                        value={`฿${formatMoney(invoice.grandTotal)}`}
                        strong
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <SectionTitle
                    icon={Building2}
                    title="ซัพพลายเออร์"
                    subtitle="ข้อมูลผู้ขาย/เจ้าหนี้"
                  />

                  <div className="mt-5 space-y-3">
                    <SummaryLine
                      label="ชื่อผู้ขาย"
                      value={supplier.name || "-"}
                      strong
                    />

                    <SummaryLine label="รหัส" value={supplier.code || "-"} />

                    <SummaryLine
                      label="เลขประจำตัวผู้เสียภาษี"
                      value={supplier.taxId || "-"}
                    />

                    <SummaryLine
                      label="เครดิต"
                      value={
                        supplier.creditDays !== undefined &&
                        supplier.creditDays !== null
                          ? `${supplier.creditDays} วัน`
                          : "-"
                      }
                    />
                  </div>
                </section>

                <section className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl">
                  <div className="text-[10px] font-black text-slate-300 tracking-widest">
                    สรุปการพิจารณา
                  </div>

                  <div className="mt-4 space-y-3">
                    <DarkSummaryLine
                      label="ยอดคงเหลือก่อนคำขอนี้"
                      value={`฿${formatMoney(outstandingBeforeThisRequest)}`}
                    />

                    <DarkSummaryLine
                      label="ยอดขอจ่ายครั้งนี้"
                      value={`฿${formatMoney(request.amountRequested)}`}
                    />

                    <DarkSummaryLine
                      label="ยอดคงเหลือหลังคำขอนี้"
                      value={`฿${formatMoney(
                        request.status === "PAID"
                          ? invoiceSummary.outstandingAmount
                          : outstandingAfterThisRequest
                      )}`}
                    />
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}

        {approveModal.isOpen && (
          <TextActionModal
            title="อนุมัติคำขอจ่ายเงิน"
            subtitle={request?.requestNo}
            icon={BadgeCheck}
            tone="blue"
            label="หมายเหตุการอนุมัติ"
            placeholder="เช่น อนุมัติให้จ่ายตามเอกสาร"
            value={approveModal.note}
            loading={actionLoading}
            confirmText="ยืนยันอนุมัติ"
            onChange={(value) =>
              setApproveModal((prev) => ({
                ...prev,
                note: value,
              }))
            }
            onClose={() =>
              setApproveModal({
                isOpen: false,
                note: "",
              })
            }
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
            onChange={(value) =>
              setRejectModal((prev) => ({
                ...prev,
                reason: value,
              }))
            }
            onClose={() =>
              setRejectModal({
                isOpen: false,
                reason: "",
              })
            }
            onSubmit={handleReject}
          />
        )}
      </div>
    </AuthGate>
  );
}

function PaymentHistoryTable({ payments, invoice, request }) {
  if (!payments.length) {
    return (
      <div className="mt-5 border border-dashed border-slate-200 rounded-3xl p-8 text-center">
        <div className="text-sm font-black text-slate-500">
          บิลนี้ยังไม่มีประวัติการจ่าย
        </div>

        <div className="text-xs font-bold text-slate-400 mt-2">
          คำขอนี้จะเป็นรอบแรก หากได้รับอนุมัติและฝ่ายการเงินบันทึกจ่าย
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200">
      <table className="w-full min-w-[1050px] bg-white text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <Th align="center">รอบ</Th>
            <Th>PV No.</Th>
            <Th>วันที่จ่าย</Th>
            <Th>วิธีจ่าย</Th>
            <Th align="right">ยอดก่อนจ่าย</Th>
            <Th align="right">ยอดจ่าย</Th>
            <Th align="right">คงเหลือหลังจ่าย</Th>
            <Th>ผู้บันทึก</Th>
            <Th align="center">เอกสาร</Th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <tr
              key={payment.id}
              className={
                payment.isCurrentRequestPayment
                  ? "bg-emerald-50/70"
                  : "hover:bg-slate-50"
              }
            >
              <Td align="center">
                <div className="inline-flex flex-col items-center gap-1">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 text-[10px] font-black">
                    {payment.roundLabel}
                  </span>

                  {payment.isCurrentRequestPayment && (
                    <span className="text-[9px] font-black text-emerald-700">
                      รายการนี้
                    </span>
                  )}
                </div>
              </Td>

              <Td>
                <div className="font-black text-slate-800">
                  {payment.pvNo || "-"}
                </div>

                <div className="text-[10px] font-bold text-slate-400 mt-1">
                  Ref: {payment.referenceNo || "-"}
                </div>
              </Td>

              <Td>
                <div className="font-bold text-slate-700">
                  {formatDateTH(payment.paymentDate)}
                </div>
              </Td>

              <Td>
                <div className="font-bold text-slate-700">
                  {getPaymentMethodLabel(payment.paymentMethod)}
                </div>
              </Td>

              <Td align="right">
                <div className="font-black text-slate-700">
                  ฿{formatMoney(payment.beforeOutstanding)}
                </div>
              </Td>

              <Td align="right">
                <div className="font-black text-emerald-700">
                  ฿{formatMoney(payment.amountPaid)}
                </div>
              </Td>

              <Td align="right">
                <div className="font-black text-rose-600">
                  ฿{formatMoney(payment.afterOutstanding)}
                </div>
              </Td>

              <Td>
                <div className="font-bold text-slate-700">
                  {getPaidByName(payment)}
                </div>
              </Td>

              <Td align="center">
                {payment.id ? (
                  <a
                    href={`/ap/payments/${payment.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                  >
                    <Printer size={12} />
                    PDF
                  </a>
                ) : (
                  "-"
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-slate-700" />
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-900 tracking-widest">
          {title}
        </h3>

        <p className="text-[11px] font-bold text-slate-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value, sub, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 border-slate-100 text-slate-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
  };

  return (
    <div className={`border rounded-3xl p-4 ${toneClass[tone] || toneClass.slate}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className="shrink-0 mt-0.5" />

        <div className="min-w-0">
          <div className="text-[10px] font-black text-slate-400 tracking-widest">
            {label}
          </div>

          <div className="text-sm font-black mt-1 truncate">{value}</div>

          {sub && (
            <div className="text-[11px] font-bold text-slate-400 mt-1">
              {sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

function SummaryLine({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-3 text-xs font-bold text-slate-500">
      <span>{label}</span>

      <span
        className={`text-right ${
          strong ? "font-black text-blue-700" : "font-black text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DarkSummaryLine({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-xs font-bold text-slate-300">
      <span>{label}</span>
      <span className="font-black text-white">{value}</span>
    </div>
  );
}

function TextActionModal({
  title,
  subtitle,
  icon: Icon,
  tone,
  label,
  placeholder,
  value,
  loading,
  confirmText,
  onChange,
  onClose,
  onSubmit,
}) {
  const toneClass = {
    blue: {
      iconBox: "bg-blue-50 text-blue-600 border-blue-100",
      button: "bg-blue-600 hover:bg-blue-700",
    },
    rose: {
      iconBox: "bg-rose-50 text-rose-600 border-rose-100",
      button: "bg-rose-600 hover:bg-rose-700",
    },
  };

  const currentTone = toneClass[tone] || toneClass.blue;

  return (
    <ModalFrame title={title} subtitle={subtitle} icon={Icon} onClose={onClose}>
      <div className="space-y-5">
        <div
          className={`border rounded-2xl p-4 flex items-start gap-3 ${currentTone.iconBox}`}
        >
          <Icon size={22} className="shrink-0" />

          <div>
            <div className="font-black text-sm">{title}</div>

            <div className="text-xs font-bold opacity-80 mt-1">
              เอกสาร: {subtitle || "-"}
            </div>
          </div>
        </div>

        <FormTextarea
          label={label}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            ปิด
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className={`px-7 py-3 text-white rounded-xl font-black text-xs tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 ${currentTone.button}`}
          >
            {loading && <RefreshCw size={15} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ModalFrame({ title, subtitle, icon: Icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon size={22} className="text-blue-300" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-black tracking-widest truncate">
                {title}
              </h3>

              <p className="text-[10px] font-bold text-slate-400 truncate">
                {subtitle || "Payment Approval"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder = "" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 tracking-[0.1em] ml-1">
        {label}
      </label>

      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 placeholder:text-slate-300 resize-none"
      />
    </div>
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

function LoadingBox({ text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] py-20 text-center text-slate-400 font-bold">
      <RefreshCw className="animate-spin mx-auto mb-3" size={24} />
      {text}
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] py-20 text-center text-slate-400 font-bold tracking-widest">
      {text}
    </div>
  );
}
