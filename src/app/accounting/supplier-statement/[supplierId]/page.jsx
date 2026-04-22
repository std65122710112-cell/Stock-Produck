"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  RefreshCw,
  Wallet,
  ReceiptText,
  ListChecks,
  CreditCard,
  Printer,
  Paperclip,
  ExternalLink,
  Image as ImageIcon,
  X,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

const todayInput = () => new Date().toISOString().split("T")[0];

const firstDayOfYearInput = () => {
  const d = new Date();
  d.setMonth(0);
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

const getApiEndpointHref = (path) => {
  if (!path) return "#";
  if (/^https?:\/\//i.test(path)) return path;

  const rawBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  const cleanBase = rawBase.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (cleanBase) return `${cleanBase}${cleanPath}`;
  return cleanPath;
};

const getPublicFileHref = (url) => {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;

  const rawBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  const cleanBase = rawBase.replace(/\/api\/?$/i, "").replace(/\/$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;

  if (cleanBase) return `${cleanBase}${cleanPath}`;
  return cleanPath;
};

const isImageAttachment = (url = "") => /\.(jpg|jpeg|png|webp)$/i.test(url);
const isPdfAttachment = (url = "") => /\.pdf$/i.test(url);

const getPaymentMethodLabel = (method) => {
  const map = {
    TRANSFER: "โอนเงิน",
    CHEQUE: "เช็ค",
    CASH: "เงินสด",
    OTHER: "อื่น ๆ",
  };

  return map[method] || method || "-";
};

const getInvoiceStatusClass = (status) => {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "PARTIAL_PAID":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "PENDING":
    default:
      return "bg-amber-50 text-amber-700 border-amber-100";
  }
};

export default function SupplierStatementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params?.supplierId;

  const [loading, setLoading] = useState(false);
  const [printingPaymentId, setPrintingPaymentId] = useState(null);
  const [activeTab, setActiveTab] = useState("invoices");

  const [statement, setStatement] = useState(null);

  const [filters, setFilters] = useState({
    from: firstDayOfYearInput(),
    to: todayInput(),
    onlyOutstanding: false,
  });

  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    url: "",
    name: "",
  });

  const loadStatement = useCallback(async () => {
    if (!supplierId) return;

    setLoading(true);

    try {
      const query = new URLSearchParams();

      if (filters.from) query.set("from", filters.from);
      if (filters.to) query.set("to", filters.to);
      if (filters.onlyOutstanding) query.set("onlyOutstanding", "true");

      const res = await apiFetch(
        `/ap/reports/supplier-statement/${supplierId}?${query.toString()}`
      );

      setStatement(res?.data || res || null);
    } catch (err) {
      console.error("Load supplier statement detail error:", err);
      toast.error(err.message || "โหลดรายละเอียดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [supplierId, filters.from, filters.to, filters.onlyOutstanding]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const openAttachmentPreview = (url, name = "ไฟล์แนบ") => {
    if (!url) {
      toast.error("ไม่พบไฟล์แนบ");
      return;
    }

    setPreviewModal({
      isOpen: true,
      url,
      name,
    });
  };

  const closeAttachmentPreview = () => {
    setPreviewModal({
      isOpen: false,
      url: "",
      name: "",
    });
  };

  const openPaymentVoucherPdf = async (payment) => {
    if (!payment?.id) {
      toast.error("ไม่พบรหัสรายการจ่ายเงิน");
      return;
    }

    if (printingPaymentId) return;

    const toastId = toast.loading("กำลังสร้างใบสำคัญจ่าย PDF...");
    setPrintingPaymentId(payment.id);

    try {
      const token = getAccessToken();

      if (!token) {
        toast.error("ไม่พบ Token กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่", {
          id: toastId,
        });
        return;
      }

      const pdfUrl = getApiEndpointHref(`/ap/payments/${payment.id}/pdf`);

      const res = await fetch(pdfUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) {
        let message = "เปิดใบสำคัญจ่ายไม่สำเร็จ";

        try {
          const err = await res.json();
          message = err.message || message;
        } catch {}

        throw new Error(message);
      }

      const blob = await res.blob();
      const fileURL = URL.createObjectURL(blob);

      window.open(fileURL, "_blank", "noopener,noreferrer");

      toast.success("สร้างใบสำคัญจ่ายสำเร็จ", {
        id: toastId,
      });

      setTimeout(() => {
        URL.revokeObjectURL(fileURL);
      }, 60000);
    } catch (err) {
      console.error("Open payment voucher PDF error:", err);
      toast.error(err.message || "เปิดใบสำคัญจ่ายไม่สำเร็จ", {
        id: toastId,
      });
    } finally {
      setPrintingPaymentId(null);
    }
  };

  const supplier = statement?.supplier || {};
  const summary = statement?.summary || {};
  const invoices = statement?.invoices || [];
  const ledgerRows = statement?.statementRows || [];

  return (
    <AuthGate requiredPermissions={["AP_READ"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1500px] mx-auto px-4 xl:px-6 py-8 space-y-8 min-h-screen bg-slate-50/50">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/accounting/supplier-statement")}
                className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Building2 className="text-blue-600" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-2xl font-black text-slate-900 truncate">
                      {supplier.name || "Supplier Statement"}
                    </h1>
                    <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">
                      รหัส: {supplier.code || "-"} | เลขภาษี:{" "}
                      {supplier.taxId || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-bold text-slate-500">
                  <div>เครดิต: {supplier.creditDays ?? 0} วัน</div>
                  <div>โทร: {supplier.phone || "-"}</div>
                  <div>อีเมล: {supplier.email || "-"}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadStatement}
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
            label="จำนวนใบแจ้งหนี้"
            value={`${summary.invoiceCount || 0}`}
            sub={`รอจ่าย ${summary.pendingInvoiceCount || 0} ใบ`}
          />
          <SummaryCard
            label="ยอดตั้งหนี้"
            value={`฿${formatMoney(summary.totalInvoiceAmount)}`}
            sub="รวมทุกใบแจ้งหนี้"
            tone="blue"
          />
          <SummaryCard
            label="ยอดจ่ายแล้ว"
            value={`฿${formatMoney(summary.totalPaidAmount)}`}
            sub="รวมรายการชำระเงิน"
            tone="emerald"
          />
          <SummaryCard
            label="ยอดคงค้าง"
            value={`฿${formatMoney(summary.totalOutstandingAmount)}`}
            sub="ยอดที่ยังไม่ได้ชำระ"
            tone="rose"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <FilterInput
              label="จากวันที่เอกสาร"
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
              label="ถึงวันที่เอกสาร"
              type="date"
              value={filters.to}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  to: value,
                }))
              }
            />

            <div className="lg:col-span-2 flex items-end">
              <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600 cursor-pointer h-[46px]">
                <input
                  type="checkbox"
                  checked={filters.onlyOutstanding}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      onlyOutstanding: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-blue-600"
                />
                แสดงเฉพาะใบแจ้งหนี้ที่ยังมียอดคงค้าง
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <TabButton
              active={activeTab === "invoices"}
              onClick={() => setActiveTab("invoices")}
              icon={ReceiptText}
              label="ใบแจ้งหนี้"
            />
            <TabButton
              active={activeTab === "ledger"}
              onClick={() => setActiveTab("ledger")}
              icon={ListChecks}
              label="Statement Ledger"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-[2rem] py-24 text-center text-slate-400 font-bold">
            <RefreshCw className="animate-spin mx-auto mb-3" size={28} />
            กำลังโหลดรายละเอียด Statement
          </div>
        ) : activeTab === "invoices" ? (
          <InvoiceList
            invoices={invoices}
            openAttachmentPreview={openAttachmentPreview}
            openPaymentVoucherPdf={openPaymentVoucherPdf}
            printingPaymentId={printingPaymentId}
          />
        ) : (
          <LedgerList rows={ledgerRows} />
        )}

        {previewModal.isOpen && previewModal.url && (
          <AttachmentPreviewModal
            previewModal={previewModal}
            onClose={closeAttachmentPreview}
          />
        )}
      </div>
    </AuthGate>
  );
}

function InvoiceList({
  invoices,
  openAttachmentPreview,
  openPaymentVoucherPdf,
  printingPaymentId,
}) {
  if (!invoices.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-[2rem] py-20 text-center text-slate-400 font-bold tracking-widest">
        ไม่พบใบแจ้งหนี้ของซัพพลายเออร์นี้
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm"
        >
          <div className="p-5 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-black text-blue-700 text-sm uppercase">
                  {invoice.invoiceNo || "-"}
                </h3>

                <span
                  className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black border ${getInvoiceStatusClass(
                    invoice.status
                  )}`}
                >
                  {invoice.statusLabel || "-"}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-bold text-slate-500">
                <div>ใบกำกับภาษี: {invoice.taxInvoiceNo || "N/A"}</div>
                <div>วันที่เอกสาร: {formatDateTH(invoice.issueDate)}</div>
                <div>ครบกำหนด: {formatDateTH(invoice.dueDate)}</div>
                <div>PO: {invoice.purchaseOrder?.poNumber || "-"}</div>
                <div>GR: {invoice.goodsReceipt?.receiptNo || "-"}</div>
              </div>

              {invoice.attachmentUrl && (
                <button
                  type="button"
                  onClick={() =>
                    openAttachmentPreview(
                      invoice.attachmentUrl,
                      `ไฟล์แนบใบแจ้งหนี้: ${invoice.invoiceNo || ""}`
                    )
                  }
                  className="mt-3 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all"
                >
                  <Paperclip size={12} />
                  เปิดไฟล์แนบ
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 xl:w-[420px]">
              <MiniStat
                label="ยอดสุทธิ"
                value={`฿${formatMoney(invoice.grandTotal)}`}
                tone="blue"
              />
              <MiniStat
                label="จ่ายแล้ว"
                value={`฿${formatMoney(invoice.paidAmount)}`}
                tone="emerald"
              />
              <MiniStat
                label="คงค้าง"
                value={`฿${formatMoney(invoice.outstandingAmount)}`}
                tone="rose"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={15} className="text-slate-500" />
              <div className="text-[10px] font-black text-slate-500 tracking-widest">
                ประวัติการจ่ายเงิน
              </div>
            </div>

            {invoice.payments?.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {invoice.payments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    openAttachmentPreview={openAttachmentPreview}
                    openPaymentVoucherPdf={openPaymentVoucherPdf}
                    printingPaymentId={printingPaymentId}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs font-bold text-slate-400">
                ยังไม่มีประวัติการจ่าย
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentCard({
  payment,
  openAttachmentPreview,
  openPaymentVoucherPdf,
  printingPaymentId,
}) {
  const isVoided = payment.status === "VOIDED";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-black text-slate-900">{payment.pvNo || "-"}</div>
          <div className="text-[10px] font-bold text-slate-400 mt-1">
            {formatDateTH(payment.paymentDate)} |{" "}
            {getPaymentMethodLabel(payment.paymentMethod)}
          </div>
          <div className="text-[10px] font-bold text-blue-600 truncate mt-1">
            Ref: {payment.referenceNo || "-"}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div
            className={`font-black ${
              isVoided ? "text-rose-500 line-through" : "text-emerald-700"
            }`}
          >
            ฿{formatMoney(payment.amountPaid)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {!isVoided && (
          <button
            type="button"
            onClick={() => openPaymentVoucherPdf(payment)}
            disabled={printingPaymentId === payment.id || Boolean(printingPaymentId)}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-[9px] font-black hover:bg-blue-600 hover:text-white transition-all disabled:opacity-60"
          >
            {printingPaymentId === payment.id ? (
              <RefreshCw size={11} className="animate-spin" />
            ) : (
              <Printer size={11} />
            )}
            {printingPaymentId === payment.id ? "กำลังสร้าง" : "พิมพ์ PV"}
          </button>
        )}

        {payment.attachmentUrl && (
          <button
            type="button"
            onClick={() =>
              openAttachmentPreview(
                payment.attachmentUrl,
                payment.attachmentName ||
                  `หลักฐานการจ่ายเงิน: ${payment.pvNo || ""}`
              )
            }
            className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[9px] font-black hover:bg-emerald-600 hover:text-white transition-all"
          >
            <Paperclip size={11} />
            หลักฐาน
          </button>
        )}
      </div>
    </div>
  );
}

function LedgerList({ rows }) {
  if (!rows.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-[2rem] py-20 text-center text-slate-400 font-bold tracking-widest">
        ไม่พบรายการเคลื่อนไหว
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-xs">
          <thead>
            <tr className="text-[9px] font-black text-slate-400 tracking-[0.14em] bg-slate-50">
              <th className="px-4 py-4 text-left">วันที่</th>
              <th className="px-4 py-4 text-left">ประเภท</th>
              <th className="px-4 py-4 text-left">เลขที่เอกสาร</th>
              <th className="px-4 py-4 text-left">คำอธิบาย</th>
              <th className="px-4 py-4 text-right">เดบิต / ตั้งหนี้</th>
              <th className="px-4 py-4 text-right">เครดิต / ชำระ</th>
              <th className="px-4 py-4 text-right">ยอดคงเหลือ</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const isInvoice = row.type === "INVOICE";

              return (
                <tr key={`${row.type}-${row.documentNo}-${index}`}>
                  <td className="px-4 py-4 font-bold text-slate-700">
                    {formatDateTH(row.date)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border ${
                        isInvoice
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100"
                      }`}
                    >
                      {isInvoice ? (
                        <FileSpreadsheet size={11} />
                      ) : (
                        <CreditCard size={11} />
                      )}
                      {isInvoice ? "ตั้งหนี้" : "ชำระเงิน"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-black text-slate-900">
                      {row.documentNo || "-"}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                      Ref: {row.referenceNo || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-600">
                    {row.description || "-"}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-blue-700">
                    {row.debit ? `฿${formatMoney(row.debit)}` : "-"}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-emerald-700">
                    {row.credit ? `฿${formatMoney(row.credit)}` : "-"}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-slate-900">
                    ฿{formatMoney(row.runningBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttachmentPreviewModal({ previewModal, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              {isImageAttachment(previewModal.url) ? (
                <ImageIcon className="text-blue-400" size={22} />
              ) : (
                <FileText className="text-blue-400" size={22} />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-black tracking-widest">ไฟล์แนบ</h3>
              <p className="text-[10px] font-bold text-slate-400 truncate">
                {previewModal.name}
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

        <div className="p-4 bg-slate-50 max-h-[calc(92vh-88px)] overflow-auto">
          {isImageAttachment(previewModal.url) ? (
            <div className="w-full flex justify-center">
              <img
                src={getPublicFileHref(previewModal.url)}
                alt={previewModal.name || "ไฟล์แนบ"}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-slate-200 bg-white shadow-sm"
                onError={() => toast.error("เปิดรูปไม่สำเร็จ")}
              />
            </div>
          ) : isPdfAttachment(previewModal.url) ? (
            <iframe
              src={getPublicFileHref(previewModal.url)}
              title="ไฟล์แนบ"
              className="w-full h-[75vh] rounded-2xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <FileText size={42} className="mx-auto text-slate-400" />
              <div className="mt-4 text-sm font-black text-slate-700">
                ไม่สามารถแสดงตัวอย่างไฟล์ชนิดนี้ได้
              </div>
              <a
                href={getPublicFileHref(previewModal.url)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-black hover:bg-slate-700"
              >
                <ExternalLink size={14} />
                เปิดไฟล์
              </a>
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

function MiniStat({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 border-slate-100 text-slate-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
  };

  return (
    <div
      className={`border rounded-2xl px-3 py-3 ${
        toneClass[tone] || toneClass.slate
      }`}
    >
      <div className="text-[9px] font-black text-slate-400 tracking-widest">
        {label}
      </div>
      <div className="text-xs font-black mt-1 break-words">{value}</div>
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
        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
      />
    </div>
  );
}