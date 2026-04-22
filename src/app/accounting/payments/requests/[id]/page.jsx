"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Paperclip,
  RefreshCw,
  Upload,
  Wallet,
  X,
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

const normalizeInvoicePayments = (invoice, request) => {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const currentPaidPaymentId =
    request?.paidPaymentId || request?.paidPayment?.id || null;

  const activePayments = payments.filter((payment) => {
    return !payment.status || payment.status === "ACTIVE";
  });

  const sortedPayments = [...activePayments].sort((a, b) => {
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
      isCurrentRequestPayment:
        currentPaidPaymentId && payment.id === currentPaidPaymentId,
    };
  });
};

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const allowedAttachmentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export default function APPaymentApprovedRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params?.id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const [request, setRequest] = useState(null);
  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    paymentDate: todayInput(),
    paymentMethod: "TRANSFER",
    referenceNo: "",
    remarks: "",
  });

  const loadDetail = useCallback(async () => {
    if (!requestId) return;

    setLoading(true);

    try {
      const res = await apiFetch(`/ap/payment-requests/${requestId}`);
      const data = res?.data || res || null;

      setRequest(data);

      if (data) {
        setForm({
          paymentDate: todayInput(),
          paymentMethod: data.paymentMethod || "TRANSFER",
          referenceNo: data.referenceNo || "",
          remarks: data.remarks || "",
        });
      }
    } catch (err) {
      console.error("Load approved request detail error:", err);
      toast.error(err.message || "โหลดรายละเอียดคำขอจ่ายไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const invoice = request?.invoice || {};
  const supplier = invoice.supplier || {};
  const invoiceSummary = request?.invoiceSummary || {};

  const paymentHistory = useMemo(() => {
    return normalizeInvoicePayments(invoice, request);
  }, [invoice, request]);

  const canPay = request?.status === "APPROVED";

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePaymentProofChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!allowedAttachmentTypes.has(selectedFile.type)) {
      toast.error("รองรับเฉพาะไฟล์ PDF, JPG, PNG หรือ WEBP");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_ATTACHMENT_SIZE) {
      toast.error("ไฟล์ต้องมีขนาดไม่เกิน 10MB");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const uploadPaymentProofIfNeeded = async () => {
    if (!file) {
      return {
        attachmentUrl: null,
        attachmentName: null,
      };
    }

    setUploadingProof(true);

    try {
      const uploadForm = new FormData();
      uploadForm.append("attachment", file);

      const res = await apiFetch("/ap/payments/attachments", {
        method: "POST",
        body: uploadForm,
      });

      const data = res?.data || res || {};

      const attachmentUrl = data.attachmentUrl || data?.data?.attachmentUrl;
      const attachmentName =
        data.attachmentName ||
        data.fileName ||
        data?.data?.attachmentName ||
        file.name;

      if (!attachmentUrl) {
        throw new Error("อัปโหลดไฟล์แล้ว แต่ไม่ได้รับ URL ไฟล์กลับมา");
      }

      return {
        attachmentUrl,
        attachmentName,
      };
    } finally {
      setUploadingProof(false);
    }
  };

  const handlePayApprovedRequest = async () => {
    if (!request?.id) {
      toast.error("ไม่พบคำขอจ่ายเงิน");
      return;
    }

    if (!form.paymentDate) {
      toast.error("กรุณาระบุวันที่จ่ายเงิน");
      return;
    }

    setSaving(true);

    const toastId = toast.loading("กำลังบันทึกจ่ายเงิน...");

    try {
      const proof = await uploadPaymentProofIfNeeded();

      await apiFetch(`/ap/payment-requests/${request.id}/pay`, {
        method: "POST",
        body: JSON.stringify({
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          referenceNo: form.referenceNo || null,
          attachmentUrl: proof.attachmentUrl,
          attachmentName: proof.attachmentName,
          remarks: form.remarks || null,
        }),
      });

      toast.success("บันทึกจ่ายเงินจากรายการที่อนุมัติแล้วสำเร็จ", {
        id: toastId,
      });

      setFile(null);
      await loadDetail();
    } catch (err) {
      console.error("Pay approved request error:", err);
      toast.error(err.message || "บันทึกจ่ายเงินไม่สำเร็จ", {
        id: toastId,
      });
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

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                <CreditCard className="text-emerald-600" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  รายละเอียดรายการอนุมัติรอจ่าย
                </h1>

                <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2 mt-1">
                  <Wallet size={14} className="text-emerald-500 shrink-0" />
                  ตรวจรายละเอียดคำขอและบันทึกจ่ายเงินจริง
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
          <LoadingBox text="กำลังโหลดรายละเอียดคำขอจ่าย" />
        ) : !request ? (
          <EmptyBox text="ไม่พบข้อมูลคำขอจ่าย" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard
                label="ยอดอนุมัติให้จ่าย"
                value={`฿${formatMoney(request.amountRequested)}`}
                sub={request.requestNo || "-"}
                tone="emerald"
              />

              <SummaryCard
                label="ยอดใบแจ้งหนี้"
                value={`฿${formatMoney(invoiceSummary.grandTotal)}`}
                sub={invoice.invoiceNo || "-"}
                tone="blue"
              />

              <SummaryCard
                label="จ่ายแล้ว"
                value={`฿${formatMoney(invoiceSummary.paidAmount)}`}
                sub={`${paymentHistory.length} รอบจ่าย`}
                tone="emerald"
              />

              <SummaryCard
                label="คงเหลือ"
                value={`฿${formatMoney(invoiceSummary.outstandingAmount)}`}
                sub="ยอดค้างตามระบบ"
                tone="rose"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <SectionTitle
                    icon={BadgeCheck}
                    title="ข้อมูลคำขอจ่าย"
                    subtitle="รายการที่ได้รับอนุมัติและรอบันทึกจ่าย"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    <InfoBox
                      label="เลขที่คำขอ"
                      value={request.requestNo || "-"}
                      sub={`ผู้ขอ: ${request.requestedByName || "-"}`}
                      tone="emerald"
                    />

                    <InfoBox
                      label="วันที่อนุมัติ"
                      value={formatDateTH(request.approvedAt)}
                      sub={`ผู้อนุมัติ: ${request.approvedByName || "-"}`}
                      tone="blue"
                    />

                    <InfoBox
                      label="วิธีการจ่าย"
                      value={getPaymentMethodLabel(request.paymentMethod)}
                      sub={`Ref: ${request.referenceNo || "-"}`}
                    />

                    <InfoBox
                      label="ใบแจ้งหนี้"
                      value={invoice.invoiceNo || "-"}
                      sub={`Supplier: ${supplier.name || "-"}`}
                    />
                  </div>

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
                    subtitle="แสดงรอบการจ่ายจริงจาก Payment Voucher"
                  />

                  <PaymentHistoryTable payments={paymentHistory} />
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
                      label="ซัพพลายเออร์"
                      value={supplier.name || "-"}
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
                      label="ยอดสุทธิ"
                      value={`฿${formatMoney(invoice.grandTotal)}`}
                      strong
                    />
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <SectionTitle
                    icon={CreditCard}
                    title="บันทึกจ่ายเงิน"
                    subtitle="สร้าง Payment Voucher จากคำขอนี้"
                  />

                  {!canPay ? (
                    <div className="mt-5 bg-slate-50 border border-slate-100 rounded-3xl p-5 text-sm font-bold text-slate-500">
                      รายการนี้ไม่ได้อยู่ในสถานะอนุมัติรอจ่ายแล้ว
                    </div>
                  ) : (
                    <div className="mt-5 space-y-5">
                      <FormInput
                        label="วันที่จ่ายเงิน"
                        type="date"
                        value={form.paymentDate}
                        onChange={(value) => updateForm("paymentDate", value)}
                      />

                      <FormSelect
                        label="วิธีการจ่าย"
                        value={form.paymentMethod}
                        onChange={(value) => updateForm("paymentMethod", value)}
                      />

                      <FormInput
                        label="เลขอ้างอิงการจ่าย"
                        value={form.referenceNo}
                        onChange={(value) => updateForm("referenceNo", value)}
                        placeholder="เช่น เลขสลิป / เลขเช็ค"
                      />

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 tracking-[0.1em] ml-1">
                          หลักฐานการจ่ายเงิน
                        </label>

                        <label className="w-full bg-white border border-dashed border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold outline-none hover:border-emerald-500 cursor-pointer flex items-center gap-2">
                          {uploadingProof ? (
                            <RefreshCw
                              size={16}
                              className="animate-spin text-emerald-600"
                            />
                          ) : (
                            <Upload size={16} className="text-emerald-600" />
                          )}

                          <span className="truncate">
                            {file ? file.name : "เลือกไฟล์ PDF / รูปภาพ"}
                          </span>

                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="hidden"
                            onChange={handlePaymentProofChange}
                            disabled={saving || uploadingProof}
                          />
                        </label>

                        {file && (
                          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Paperclip size={11} />
                            {file.name}
                          </div>
                        )}
                      </div>

                      <FormTextarea
                        label="หมายเหตุ"
                        value={form.remarks}
                        onChange={(value) => updateForm("remarks", value)}
                        placeholder="ระบุรายละเอียดการจ่ายเพิ่มเติม"
                      />

                      <button
                        type="button"
                        onClick={handlePayApprovedRequest}
                        disabled={saving || uploadingProof}
                        className="w-full bg-emerald-600 text-white rounded-xl px-5 py-3 font-black text-xs tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {saving || uploadingProof ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <CreditCard size={15} />
                        )}
                        ยืนยันบันทึกจ่าย
                      </button>
                    </div>
                  )}
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
          เมื่อบันทึกจ่ายสำเร็จ รายการ PV จะแสดงในตารางนี้
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
            <tr
              key={payment.id || payment.pvNo}
              className={
                payment.isCurrentRequestPayment
                  ? "bg-emerald-50/80"
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
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
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
            : "bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-600"
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
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all"
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
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all placeholder:text-slate-300 resize-none"
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
