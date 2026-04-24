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
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Send,
  Wallet,
  XCircle,
} from "lucide-react";

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
    return !payment?.status || payment?.status === "ACTIVE";
  });
};

const getPaidAndOutstanding = (invoice) => {
  const activePayments = getInvoicePayments(invoice);

  const paidAmount = activePayments.reduce(
    (sum, payment) => sum + Number(payment?.amountPaid || 0),
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
    const dateA = new Date(a?.paymentDate || a?.createdAt || 0).getTime();
    const dateB = new Date(b?.paymentDate || b?.createdAt || 0).getTime();

    if (dateA !== dateB) return dateA - dateB;

    return (
      new Date(a?.createdAt || 0).getTime() -
      new Date(b?.createdAt || 0).getTime()
    );
  });

  const grandTotal = Number(invoice?.grandTotal || 0);
  let runningPaid = 0;

  return sortedPayments.map((payment, index) => {
    const amount = Number(payment?.amountPaid || 0);
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
    className: "bg-amber-50 text-amber-600 border-amber-100",
    icon: Clock,
  },
  APPROVED: {
    label: "อนุมัติแล้ว / รอจ่าย",
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
      const res = await apiFetch(`/ap/invoices/${encodeURIComponent(invoiceId)}`);
      const data = res?.data || res || null;
      setInvoice(data);
    } catch (err) {
      console.error("Load invoice detail error:", err);
      toast.error(err?.message || "โหลดรายละเอียดใบตั้งหนี้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  const loadPaymentRequestStatuses = useCallback(async () => {
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
    await Promise.all([loadInvoice(), loadPaymentRequestStatuses()]);
  }, [loadInvoice, loadPaymentRequestStatuses]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const paymentHistory = useMemo(() => normalizeInvoicePayments(invoice), [invoice]);

  const latestPaymentRequest = useMemo(() => {
    if (!invoice?.id) return null;
    const requests = allPaymentRequests.filter((request) => {
      return (request?.invoiceId || request?.invoice?.id) === invoice.id;
    });

    return requests.reduce((best, request) => {
      if (!best) return request;
      const bestPriority = requestPriority[best?.status] || 0;
      const nextPriority = requestPriority[request?.status] || 0;
      const bestTime = new Date(best?.createdAt || 0).getTime();
      const nextTime = new Date(request?.createdAt || 0).getTime();

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
    invoice?.status !== "PAID" &&
    Number(outstandingAmount || 0) > 0.01 &&
    !hasActiveRequest;

  const isFullPayment = form.paymentMode === "FULL";
  const displayAmount = isFullPayment
    ? outstandingAmount
    : Number(form.amountRequested || 0);

  const updateForm = (key, value) => {
    setForm((prev) => {
      const nextForm = { ...prev, [key]: value };
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
        headers: { "Content-Type": "application/json" },
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
      toast.error(err?.message || "สร้างคำขอจ่ายเงินไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGate requiredPermissions={["AP_PAYMENT_MANAGE"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={() => router.push(LIST_PATH)}
              className="flex items-center gap-2 w-fit text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F3B8B] rounded-md"
            >
              <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                <FileText className="w-6 h-6 text-[#1F3B8B]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight break-words">
                  รายละเอียดใบตั้งหนี้
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2 break-words">
                  <Wallet size={16} className="text-blue-500 shrink-0" />
                  ตรวจประวัติแบ่งจ่ายและสร้างคำขอจ่ายจากบิลนี้
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAll}
            disabled={loading || loadingStatuses}
            className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-slate-50 shadow-sm active:scale-95 disabled:opacity-50 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-[#1F3B8B]"
          >
            <RefreshCw
              size={16}
              className={loading || loadingStatuses ? "animate-spin" : ""}
            />
            โหลดข้อมูลใหม่
          </button>
        </div>

        {loading ? (
          <LoadingBox text="กำลังโหลดรายละเอียดใบตั้งหนี้" />
        ) : !invoice ? (
          <EmptyBox text="ไม่พบข้อมูลใบตั้งหนี้" />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

            <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col">
              <div className="grid grid-cols-1 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x divide-slate-200">
                <div className="xl:col-span-2 p-6 md:p-8 flex flex-col gap-10">
                  <section>
                    <SectionTitle
                      icon={FileText}
                      title="ข้อมูลใบตั้งหนี้"
                      subtitle="รายละเอียดบิลและสถานะคำขอจ่ายล่าสุด"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
                        value={`PO: ${invoice.purchaseOrder?.poNumber || "-"} / ${invoice.goodsReceipt?.receiptNo || "-"}`}
                        sub={`GR: ${invoice.goodsReceipt?.receiptNo || "-"}`}
                      />
                      <InfoBox
                        label="วันครบกำหนด"
                        value={formatDateTH(invoice.dueDate)}
                        sub={`วันรับเอกสาร: ${formatDateTH(invoice.receiveDate)}`}
                      />
                    </div>

                    {latestPaymentRequest && latestRequestInfo && LatestStatusIcon && (
                      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                          คำขอจ่ายล่าสุด
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-base font-black text-slate-900 break-words">
                              {latestPaymentRequest.requestNo || "-"}
                            </div>
                            <div className="text-xs font-bold text-slate-500 mt-1 break-words">
                              ยอดขอจ่าย ฿{formatMoney(latestPaymentRequest.amountRequested)} |
                              วันที่ขอ {formatDateTH(latestPaymentRequest.createdAt)}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border w-fit shadow-sm whitespace-nowrap ${latestRequestInfo.className}`}
                          >
                            <LatestStatusIcon size={14} />
                            {latestRequestInfo.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                <aside className="p-6 md:p-8 bg-slate-50/30 flex flex-col gap-8">
{/* สรุปยอด White Box - ปรับให้ตัวเลขอยู่บรรทัดล่าง */}
<section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
    สรุปยอด
  </div>
  <div className="space-y-4">
    
    {/* 1. ยอดสุทธิ */}
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-500">ยอดสุทธิ</span>
      <span className="font-black text-slate-900 tabular-nums text-lg tracking-tighter whitespace-nowrap">
        ฿{formatMoney(invoice.grandTotal)}
      </span>
    </div>

    {/* 2. จ่ายแล้ว */}
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-500">จ่ายแล้ว</span>
      <span className="font-black text-slate-900 tabular-nums text-lg tracking-tighter whitespace-nowrap">
        ฿{formatMoney(paidAmount)}
      </span>
    </div>

    <div className="border-t border-slate-100 pt-3">
      {/* 3. คงเหลือ */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-500">คงเหลือ</span>
        <span className="font-black text-slate-900 tabular-nums text-lg tracking-tighter whitespace-nowrap">
          ฿{formatMoney(outstandingAmount)}
        </span>
      </div>
    </div>

    <div className="border-t border-slate-100 pt-3">
      {/* 4. ยอดขอจ่ายครั้งนี้ (สีเขียว) */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-700">ยอดขอจ่ายครั้งนี้</span>
        <span className="font-black text-emerald-600 text-2xl tabular-nums tracking-tighter whitespace-nowrap">
          ฿{formatMoney(displayAmount)}
        </span>
      </div>
    </div>

  </div>
</section>

                  <section className="flex-1">
                    <SectionTitle
                      icon={Send}
                      title="สร้างคำขอจ่าย"
                      subtitle="เลือกจ่ายทั้งหมดหรือแบ่งจ่ายบางส่วน"
                    />

                    {!canCreatePaymentRequest ? (
                      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm font-bold text-amber-700 shadow-sm leading-relaxed">
                        {hasActiveRequest
                          ? "บิลนี้มีคำขอจ่ายที่ยังรออนุมัติหรืออนุมัติแล้วรอจ่ายอยู่ จึงยังสร้างคำขอใหม่ไม่ได้"
                          : "บิลนี้ไม่มียอดคงเหลือให้ขอจ่ายแล้ว"}
                      </div>
                    ) : (
                      <div className="mt-6 space-y-6">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => updateForm("paymentMode", "FULL")}
                            className={`rounded-xl border px-4 py-3 text-center transition-all focus:outline-none ${form.paymentMode === "FULL"
                              ? "bg-[#1F3B8B]/5 border-[#1F3B8B]/30 shadow-sm ring-2 ring-[#1F3B8B]/20"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                              }`}
                          >
                            <div className="text-xs font-black text-slate-900">
                              จ่ายทั้งหมด
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateForm("paymentMode", "PARTIAL")}
                            className={`rounded-xl border px-4 py-3 text-center transition-all focus:outline-none ${form.paymentMode === "PARTIAL"
                              ? "bg-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-200"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                              }`}
                          >
                            <div className="text-xs font-black text-slate-900">
                              แบ่งจ่าย
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>

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
                          className="w-full bg-emerald-600 text-white rounded-lg px-5 py-3.5 font-bold text-sm transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 mt-2"
                        >
                          {saving ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                          ส่งคำขออนุมัติจ่ายเงิน
                        </button>
                      </div>
                    )}
                  </section>
                </aside>
              </div>

              <div className="p-6 md:p-8 border-t border-slate-200 bg-white w-full overflow-hidden">
                <SectionTitle
                  icon={Banknote}
                  title="ตารางประวัติแบ่งจ่าย"
                  subtitle="แสดงรอบการจ่ายจริงจาก Payment Voucher ของบิลนี้"
                />
                <PaymentHistoryTable payments={paymentHistory} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

function SummaryItem({ label, value, sub, textColor }) {
  return (
    <div className="p-6 flex-1 flex flex-col justify-center min-w-0 bg-white">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">
        {label}
      </div>
      <div className={`text-2xl font-black ${textColor} tabular-nums break-words`}>
        {value}
      </div>
      <div className="text-[11px] font-bold text-slate-400 mt-1.5 truncate">
        {sub}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
        <Icon className="w-5 h-5 text-[#1F3B8B]" /> {title}
      </h3>
      {subtitle && <p className="text-[11px] font-bold text-slate-500 mt-1.5 ml-7 break-words">{subtitle}</p>}
    </div>
  );
}

function InfoBox({ label, value, sub, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 border-slate-200",
    blue: "bg-[#1F3B8B]/5 border-[#1F3B8B]/20",
  };
  return (
    <div className={`border rounded-xl p-5 ${toneClass[tone] || toneClass.slate} shadow-sm min-w-0`}>
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">
        {label}
      </div>
      <div className="text-sm font-black text-slate-900 break-words">{value}</div>
      {sub && <div className="text-[11px] font-bold text-slate-500 mt-1.5 break-words">{sub}</div>}
    </div>
  );
}

function FormInput({ label, type = "text", value, onChange, placeholder = "", disabled = false }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">
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
        className={`w-full border rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 shadow-sm ${disabled
          ? "bg-slate-50 border-slate-200 cursor-not-allowed text-slate-500"
          : "bg-white border-slate-300 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20"
          }`}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all"
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
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">
        {label}
      </label>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all placeholder:text-slate-300 resize-none"
      />
    </div>
  );
}

function PaymentHistoryTable({ payments }) {
  if (!payments.length) {
    return (
      <div className="mt-4 border-2 border-dashed border-slate-200 rounded-xl p-8 md:p-10 text-center bg-slate-50/50 w-full mx-auto">
        <div className="text-sm font-black text-slate-500">
          บิลนี้ยังไม่มีประวัติการจ่าย
        </div>
        <div className="text-[11px] font-bold text-slate-400 mt-2">
          หากส่งคำขอและได้รับอนุมัติ รายการจ่ายจะมาแสดงหลังฝ่ายการเงินบันทึกจ่าย
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden w-full relative">
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-slate-100 border-b border-slate-200">
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
          <tbody className="divide-y divide-slate-100 bg-white">
            {payments.map((payment) => (
              <tr key={payment?.id || payment?.pvNo} className="hover:bg-slate-50 transition-colors">
                <Td align="center">
                  <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 text-[10px] font-black whitespace-nowrap">
                    {payment?.roundLabel}
                  </span>
                </Td>
                <Td>
                  <div className="font-bold text-[#1F3B8B] whitespace-nowrap">
                    {payment?.pvNo || "-"}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase whitespace-nowrap">
                    Ref: {payment?.referenceNo || "-"}
                  </div>
                </Td>
                <Td>
                  <div className="font-bold text-slate-700 whitespace-nowrap">
                    {formatDateTH(payment?.paymentDate)}
                  </div>
                </Td>
                <Td>
                  <div className="font-bold text-slate-700 whitespace-nowrap">
                    {getPaymentMethodLabel(payment?.paymentMethod)}
                  </div>
                </Td>
                <Td align="right">
                  <div className="font-semibold tabular-nums text-slate-600 whitespace-nowrap">
                    ฿{formatMoney(payment?.beforeOutstanding)}
                  </div>
                </Td>
                <Td align="right">
                  <div className="font-black tabular-nums text-emerald-600 whitespace-nowrap">
                    ฿{formatMoney(payment?.amountPaid)}
                  </div>
                </Td>
                <Td align="right">
                  <div className="font-bold tabular-nums text-rose-600 whitespace-nowrap">
                    ฿{formatMoney(payment?.afterOutstanding)}
                  </div>
                </Td>
                <Td>
                  <div className="font-bold text-slate-700 whitespace-nowrap">
                    {getPaidByName(payment)}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left", minWidth }) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      style={{ minWidth: minWidth }}
      className={`px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${alignClass}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`px-4 py-4 align-top text-sm ${alignClass}`}>{children}</td>;
}

function LoadingBox({ text }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl py-24 px-4 text-center flex flex-col items-center justify-center mx-auto w-full">
      <RefreshCw className="animate-spin mb-4 text-[#1F3B8B]" size={32} />
      <span className="text-slate-400 font-bold break-words">{text}</span>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl py-24 px-4 text-center flex flex-col items-center justify-center mx-auto w-full">
      <FileText className="mb-4 text-slate-300" size={32} />
      <span className="text-slate-500 font-bold tracking-widest text-lg break-words">{text}</span>
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
    <div className={`bg-white border border-slate-200 border-l-4 ${themes[tone] || themes.slate} p-4 sm:p-5 rounded-xl shadow-sm transition-all hover:shadow-md flex flex-col justify-center min-w-0 overflow-hidden`}>
      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">{label}</p>
      <div className="w-full">
        {/* เอา truncate ออก และใช้ tracking-tighter บีบเลขให้ชิดกันเพื่อให้พอดีกล่อง */}
        <span className="text-lg sm:text-xl lg:text-lg xl:text-xl 2xl:text-2xl font-black text-slate-900 tabular-nums tracking-tighter whitespace-nowrap block">
          {value}
        </span>
      </div>
      <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1 truncate">{sub}</p>
    </div>
  );
}