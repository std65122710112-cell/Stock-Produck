"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Send,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

/**
 * แก้ path นี้ให้ตรงกับหน้ารายการจริงของคุณ
 */
const LIST_PATH = "/accounting/payments";

const todayInput = () => new Date().toISOString().split("T")[0];

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

const getPaidByName = (payment) => {
  const fullName = [payment?.paidBy?.firstName, payment?.paidBy?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || payment?.paidBy?.username || payment?.paidByName || "-";
};

const getInvoicePayments = (invoice) => {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];

  return payments.filter((payment) => {
    return !payment.status || payment.status === "ACTIVE";
  });
};

const getPaidAndOutstanding = (invoice) => {
  const activePayments = getInvoicePayments(invoice);

  const paidAmount = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amountPaid || 0),
    0
  );

  const outstandingAmount = Math.max(
    Number(invoice?.grandTotal || 0) - paidAmount,
    0
  );

  return {
    paidAmount: round2(paidAmount),
    outstandingAmount: round2(outstandingAmount < 0 ? 0 : outstandingAmount),
    paymentRoundCount: activePayments.length,
  };
};

const normalizeInvoicePayments = (invoice) => {
  const sortedPayments = [...getInvoicePayments(invoice)].sort((a, b) => {
    const dateA = new Date(a.paymentDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.paymentDate || b.createdAt || 0).getTime();

    if (dateA !== dateB) return dateA - dateB;

    return (
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime()
    );
  });

  const grandTotal = Number(invoice?.grandTotal || 0);
  let runningPaid = 0;

  return sortedPayments.map((payment, index) => {
    const amount = Number(payment.amountPaid || 0);
    const beforeOutstanding = round2(Math.max(grandTotal - runningPaid, 0));

    runningPaid = round2(runningPaid + amount);

    const afterOutstanding = round2(Math.max(grandTotal - runningPaid, 0));
    const roundNo = index + 1;
    const totalRounds = sortedPayments.length;

    let paymentType = "PARTIAL";
    let paymentTypeLabel = "แบ่งจ่าย";

    if (totalRounds === 1 && afterOutstanding <= 0.01) {
      paymentType = "FULL";
      paymentTypeLabel = "จ่ายทั้งหมด";
    } else if (afterOutstanding <= 0.01) {
      paymentType = "CLOSING";
      paymentTypeLabel = "ปิดยอดแบ่งจ่าย";
    }

    return {
      ...payment,
      roundNo,
      totalRounds,
      beforeOutstanding,
      afterOutstanding,
      paymentType,
      paymentTypeLabel,
      roundLabel:
        paymentType === "FULL"
          ? "จ่ายทั้งหมด"
          : `${paymentTypeLabel} รอบที่ ${roundNo}/${totalRounds}`,
    };
  });
};

const paymentRequestStatusInfo = {
  PENDING: {
    label: "รออนุมัติ",
    className: "bg-amber-50 text-amber-700 border-amber-100",
    icon: Clock,
  },
  APPROVED: {
    label: "อนุมัติแล้ว / รอจ่าย",
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

export default function APPaymentInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id;

  const [loading, setLoading] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [saving, setSaving] = useState(false);

  const [invoice, setInvoice] = useState(null);
  const [allPaymentRequests, setAllPaymentRequests] = useState([]);

  const [form, setForm] = useState({
    paymentMode: "FULL",
    amountRequested: "",
    requestedPaymentDate: todayInput(),
    paymentMethod: "TRANSFER",
    referenceNo: "",
    remarks: "",
  });

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;

    setLoading(true);

    try {
      const res = await apiFetch(`/ap/invoices/${invoiceId}`);
      const data = res?.data || res || null;

      setInvoice(data);
    } catch (err) {
      console.error("Load invoice detail error:", err);
      toast.error(err.message || "โหลดรายละเอียดใบตั้งหนี้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  const loadPaymentRequestStatuses = useCallback(async () => {
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
    await Promise.all([loadInvoice(), loadPaymentRequestStatuses()]);
  }, [loadInvoice, loadPaymentRequestStatuses]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const paymentHistory = useMemo(() => normalizeInvoicePayments(invoice), [invoice]);

  const latestPaymentRequest = useMemo(() => {
    if (!invoice?.id) return null;

    const requests = allPaymentRequests.filter((request) => {
      return (request.invoiceId || request.invoice?.id) === invoice.id;
    });

    return requests.reduce((best, request) => {
      if (!best) return request;

      const bestPriority = requestPriority[best.status] || 0;
      const nextPriority = requestPriority[request.status] || 0;

      const bestTime = new Date(best.createdAt || 0).getTime();
      const nextTime = new Date(request.createdAt || 0).getTime();

      if (
        nextPriority > bestPriority ||
        (nextPriority === bestPriority && nextTime > bestTime)
      ) {
        return request;
      }

      return best;
    }, null);
  }, [allPaymentRequests, invoice?.id]);

  const { paidAmount, outstandingAmount, paymentRoundCount } =
    getPaidAndOutstanding(invoice);

  useEffect(() => {
    if (!invoice) return;

    setForm((prev) => ({
      ...prev,
      paymentMode: "FULL",
      amountRequested: String(outstandingAmount || ""),
    }));
  }, [invoice, outstandingAmount]);

  const latestRequestInfo = latestPaymentRequest
    ? getRequestStatusInfo(latestPaymentRequest.status)
    : null;
  const LatestStatusIcon = latestRequestInfo?.icon;
  const hasActiveRequest =
    latestPaymentRequest &&
    isActivePaymentRequestStatus(latestPaymentRequest.status);

  const canCreatePaymentRequest =
    invoice &&
    invoice.status !== "PAID" &&
    Number(outstandingAmount || 0) > 0.01 &&
    !hasActiveRequest;

  const isFullPayment = form.paymentMode === "FULL";
  const displayAmount = isFullPayment
    ? outstandingAmount
    : Number(form.amountRequested || 0);

  const updateForm = (key, value) => {
    setForm((prev) => {
      const nextForm = {
        ...prev,
        [key]: value,
      };

      if (key === "paymentMode") {
        if (value === "FULL") {
          nextForm.amountRequested = String(outstandingAmount || "");
        }

        if (value === "PARTIAL") {
          nextForm.amountRequested = "";
        }
      }

      return nextForm;
    });
  };

  const handleCreatePaymentRequest = async () => {
    if (!invoice?.id) {
      toast.error("ไม่พบใบตั้งหนี้");
      return;
    }

    const amount =
      form.paymentMode === "FULL"
        ? outstandingAmount
        : Number(form.amountRequested || 0);

    if (amount <= 0) {
      toast.error("ยอดขอจ่ายต้องมากกว่า 0");
      return;
    }

    if (amount > outstandingAmount + 0.01) {
      toast.error(`ยอดขอจ่ายเกินยอดคงเหลือ ฿${formatMoney(outstandingAmount)}`);
      return;
    }

    if (form.paymentMode === "PARTIAL" && amount >= outstandingAmount - 0.01) {
      toast.error("กรณีแบ่งจ่าย ยอดขอจ่ายต้องน้อยกว่ายอดคงเหลือ");
      return;
    }

    setSaving(true);

    try {
      const paymentModeText =
        form.paymentMode === "FULL" ? "ขอจ่ายทั้งหมด" : "ขอแบ่งจ่าย";

      await apiFetch("/ap/payment-requests", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: invoice.id,
          amountRequested: amount,
          requestedPaymentDate: form.requestedPaymentDate || undefined,
          paymentMethod: form.paymentMethod,
          referenceNo: form.referenceNo || null,
          remarks: [paymentModeText, form.remarks].filter(Boolean).join(" | "),
        }),
      });

      toast.success("ส่งคำขอจ่ายเงินเพื่อรออนุมัติสำเร็จ");
      await loadAll();
    } catch (err) {
      console.error("Create payment request error:", err);
      toast.error(err.message || "สร้างคำขอจ่ายเงินไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGate requiredPermissions={["AP_PAYMENT_MANAGE"]}>
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
                <FileText className="text-blue-600" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  รายละเอียดใบตั้งหนี้
                </h1>

                <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2 mt-1">
                  <Wallet size={14} className="text-blue-500 shrink-0" />
                  ตรวจประวัติแบ่งจ่ายและสร้างคำขอจ่ายจากบิลนี้
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadAll}
              disabled={loading || loadingStatuses}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs tracking-widest hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 w-fit"
            >
              <RefreshCw
                size={15}
                className={loading || loadingStatuses ? "animate-spin" : ""}
              />
              โหลดข้อมูลใหม่
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingBox text="กำลังโหลดรายละเอียดใบตั้งหนี้" />
        ) : !invoice ? (
          <EmptyBox text="ไม่พบข้อมูลใบตั้งหนี้" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard
                label="ยอดสุทธิ"
                value={`฿${formatMoney(invoice.grandTotal)}`}
                sub={invoice.invoiceNo || "-"}
                tone="blue"
              />

              <SummaryCard
                label="จ่ายแล้ว"
                value={`฿${formatMoney(paidAmount)}`}
                sub={`${paymentRoundCount} รอบจ่าย`}
                tone="emerald"
              />

              <SummaryCard
                label="ยอดคงเหลือ"
                value={`฿${formatMoney(outstandingAmount)}`}
                sub="ยอดที่ยังสามารถขอจ่ายได้"
                tone="rose"
              />

              <SummaryCard
                label="ยอดที่จะขอจ่าย"
                value={`฿${formatMoney(displayAmount)}`}
                sub={form.paymentMode === "FULL" ? "จ่ายทั้งหมด" : "แบ่งจ่าย"}
                tone="amber"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <SectionTitle
                    icon={FileText}
                    title="ข้อมูลใบตั้งหนี้"
                    subtitle="รายละเอียดบิลและสถานะคำขอจ่ายล่าสุด"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    <InfoBox
                      label="เลขที่ใบแจ้งหนี้"
                      value={invoice.invoiceNo || "-"}
                      sub={`TAX: ${invoice.taxInvoiceNo || "N/A"}`}
                      tone="blue"
                    />

                    <InfoBox
                      label="ซัพพลายเออร์"
                      value={invoice.supplier?.name || "-"}
                      sub={`Code: ${invoice.supplier?.code || "-"}`}
                    />

                    <InfoBox
                      label="PO / GR"
                      value={`PO: ${invoice.purchaseOrder?.poNumber || "-"}`}
                      sub={`GR: ${invoice.goodsReceipt?.receiptNo || "-"}`}
                    />

                    <InfoBox
                      label="วันครบกำหนด"
                      value={formatDateTH(invoice.dueDate)}
                      sub={`วันรับเอกสาร: ${formatDateTH(invoice.receiveDate)}`}
                    />
                  </div>

                  {latestPaymentRequest && latestRequestInfo && LatestStatusIcon && (
                    <div className="mt-5 bg-slate-50 border border-slate-100 rounded-3xl p-4">
                      <div className="text-[10px] font-black text-slate-400 tracking-widest mb-2">
                        คำขอจ่ายล่าสุด
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-900">
                            {latestPaymentRequest.requestNo || "-"}
                          </div>

                          <div className="text-xs font-bold text-slate-400 mt-1">
                            ยอดขอจ่าย ฿
                            {formatMoney(latestPaymentRequest.amountRequested)} |
                            วันที่ขอ {formatDateTH(latestPaymentRequest.createdAt)}
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black border w-fit ${latestRequestInfo.className}`}
                        >
                          <LatestStatusIcon size={11} />
                          {latestRequestInfo.label}
                        </span>
                      </div>
                    </div>
                  )}
                </section>

                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <SectionTitle
                    icon={Banknote}
                    title="ตารางประวัติแบ่งจ่าย"
                    subtitle="แสดงรอบการจ่ายจริงจาก Payment Voucher ของบิลนี้"
                  />

                  <PaymentHistoryTable payments={paymentHistory} />
                </section>
              </div>

              <aside className="space-y-6">
                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <SectionTitle
                    icon={Send}
                    title="สร้างคำขอจ่าย"
                    subtitle="เลือกจ่ายทั้งหมดหรือแบ่งจ่ายบางส่วน"
                  />

                  {!canCreatePaymentRequest ? (
                    <div className="mt-5 bg-amber-50 border border-amber-100 rounded-3xl p-5 text-sm font-bold text-amber-700">
                      {hasActiveRequest
                        ? "บิลนี้มีคำขอจ่ายที่ยังรออนุมัติหรืออนุมัติแล้วรอจ่ายอยู่ จึงยังสร้างคำขอใหม่ไม่ได้"
                        : "บิลนี้ไม่มียอดคงเหลือให้ขอจ่ายแล้ว"}
                    </div>
                  ) : (
                    <div className="mt-5 space-y-5">
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => updateForm("paymentMode", "FULL")}
                          className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                            form.paymentMode === "FULL"
                              ? "bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-100"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-sm font-black text-slate-900">
                            จ่ายทั้งหมด
                          </div>

                          <div className="text-lg font-black text-blue-700 mt-2">
                            ฿{formatMoney(outstandingAmount)}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateForm("paymentMode", "PARTIAL")}
                          className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                            form.paymentMode === "PARTIAL"
                              ? "bg-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-100"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-sm font-black text-slate-900">
                            แบ่งจ่าย
                          </div>

                          <div className="text-xs font-bold text-slate-400 mt-1">
                            กรอกยอดบางส่วน
                          </div>
                        </button>
                      </div>

                      <FormInput
                        label={
                          form.paymentMode === "FULL"
                            ? "ยอดขอจ่ายทั้งหมด"
                            : "ยอดแบ่งจ่ายครั้งนี้"
                        }
                        type="number"
                        value={
                          form.paymentMode === "FULL"
                            ? String(outstandingAmount || "")
                            : form.amountRequested
                        }
                        onChange={(value) => updateForm("amountRequested", value)}
                        disabled={form.paymentMode === "FULL"}
                      />

                      <FormInput
                        label="วันที่ต้องการจ่าย"
                        type="date"
                        value={form.requestedPaymentDate}
                        onChange={(value) =>
                          updateForm("requestedPaymentDate", value)
                        }
                      />

                      <FormSelect
                        label="วิธีการจ่ายเงิน"
                        value={form.paymentMethod}
                        onChange={(value) => updateForm("paymentMethod", value)}
                      />

                      <FormInput
                        label="เลขอ้างอิง"
                        value={form.referenceNo}
                        onChange={(value) => updateForm("referenceNo", value)}
                        placeholder="เช่น เลขที่เช็ค / Ref No."
                      />

                      <FormTextarea
                        label="หมายเหตุ"
                        value={form.remarks}
                        onChange={(value) => updateForm("remarks", value)}
                        placeholder="เช่น แบ่งจ่ายงวดที่ 1"
                      />

                      <button
                        type="button"
                        onClick={handleCreatePaymentRequest}
                        disabled={saving}
                        className="w-full bg-blue-600 text-white rounded-xl px-5 py-3 font-black text-xs tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {saving ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                        ส่งคำขออนุมัติ
                      </button>
                    </div>
                  )}
                </section>

                <section className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl">
                  <div className="text-[10px] font-black text-slate-300 tracking-widest">
                    สรุปยอด
                  </div>

                  <div className="mt-4 space-y-3">
                    <DarkSummaryLine
                      label="ยอดสุทธิ"
                      value={`฿${formatMoney(invoice.grandTotal)}`}
                    />

                    <DarkSummaryLine
                      label="จ่ายแล้ว"
                      value={`฿${formatMoney(paidAmount)}`}
                    />

                    <DarkSummaryLine
                      label="คงเหลือ"
                      value={`฿${formatMoney(outstandingAmount)}`}
                    />

                    <DarkSummaryLine
                      label="ยอดขอจ่ายครั้งนี้"
                      value={`฿${formatMoney(displayAmount)}`}
                    />
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </AuthGate>
  );
}

function PaymentHistoryTable({ payments }) {
  if (!payments.length) {
    return (
      <div className="mt-5 border border-dashed border-slate-200 rounded-3xl p-8 text-center">
        <div className="text-sm font-black text-slate-500">
          บิลนี้ยังไม่มีประวัติการจ่าย
        </div>

        <div className="text-xs font-bold text-slate-400 mt-2">
          หากส่งคำขอและได้รับอนุมัติ รายการจ่ายจะมาแสดงหลังฝ่ายการเงินบันทึกจ่าย
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200">
      <table className="w-full min-w-[1000px] bg-white text-sm">
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
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <tr key={payment.id || payment.pvNo} className="hover:bg-slate-50">
              <Td align="center">
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 text-[10px] font-black">
                  {payment.roundLabel}
                </span>
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

function InfoBox({ label, value, sub, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 border-slate-100 text-slate-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  };

  return (
    <div className={`border rounded-3xl p-4 ${toneClass[tone] || toneClass.slate}`}>
      <div className="text-[10px] font-black text-slate-400 tracking-widest">
        {label}
      </div>

      <div className="text-sm font-black mt-1 truncate">{value}</div>

      {sub && <div className="text-[11px] font-bold text-slate-400 mt-1">{sub}</div>}
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
    <div className={`border rounded-3xl p-5 ${toneClass[tone] || toneClass.slate}`}>
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

function DarkSummaryLine({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-xs font-bold text-slate-300">
      <span>{label}</span>
      <span className="font-black text-white">{value}</span>
    </div>
  );
}

function FormInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 tracking-[0.1em] ml-1">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 shadow-sm ${
          disabled
            ? "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
            : "bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-600"
        }`}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 tracking-[0.1em] ml-1">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all"
      >
        <option value="TRANSFER">โอนเงิน</option>
        <option value="CHEQUE">เช็ค</option>
        <option value="CASH">เงินสด</option>
        <option value="OTHER">อื่น ๆ</option>
      </select>
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
        rows={5}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 resize-none"
      />
    </div>
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
    <th className={`px-4 py-4 text-[10px] font-black tracking-widest uppercase ${alignClass}`}>
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
