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

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen animate-in fade-in duration-500">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => router.push("/accounting/supplier-statement")}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#1F3B8B] uppercase tracking-widest transition-colors w-fit outline-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> ย้อนกลับ
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                <Building2 className="w-6 h-6 text-[#1F3B8B]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {supplier.name || "Supplier Statement"}
                </h1>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-slate-500 font-bold mt-1.5">
                  <span>รหัส: <span className="text-slate-700">{supplier.code || "-"}</span></span>
                  <span className="text-slate-300">|</span>
                  <span>เลขภาษี: <span className="text-slate-700">{supplier.taxId || "-"}</span></span>
                  <span className="text-slate-300">|</span>
                  <span>เครดิต: <span className="text-slate-700">{supplier.creditDays ?? 0} วัน</span></span>
                  <span className="text-slate-300 hidden sm:inline">|</span>
                  <span className="w-full sm:w-auto">โทร: <span className="text-slate-700">{supplier.phone || "-"}</span></span>
                  <span className="text-slate-300 hidden sm:inline">|</span>
                  <span className="w-full sm:w-auto">อีเมล: <span className="text-slate-700">{supplier.email || "-"}</span></span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadStatement}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[#1F3B8B] border border-transparent text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-blue-900 shadow-sm active:scale-95 disabled:opacity-50 w-full md:w-auto outline-none focus:ring-2 focus:ring-[#1F3B8B] focus:ring-offset-1"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            โหลดข้อมูลใหม่
          </button>
        </div>

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            label="จำนวนใบแจ้งหนี้"
            value={`${summary.invoiceCount || 0}`}
            sub={`รอจ่าย ${summary.pendingInvoiceCount || 0} ใบ`}
            tone="slate"
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

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col">
          
          {/* Filters & Tabs */}
          <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <FilterInput
                label="จากวันที่เอกสาร"
                type="date"
                value={filters.from}
                onChange={(value) => setFilters((prev) => ({ ...prev, from: value }))}
              />
              <FilterInput
                label="ถึงวันที่เอกสาร"
                type="date"
                value={filters.to}
                onChange={(value) => setFilters((prev) => ({ ...prev, to: value }))}
              />
              <div className="lg:col-span-2 flex items-end">
                <label className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-700 cursor-pointer h-[42px] select-none hover:text-[#1F3B8B] transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.onlyOutstanding}
                    onChange={(e) => setFilters((prev) => ({ ...prev, onlyOutstanding: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#1F3B8B] focus:ring-[#1F3B8B]/20"
                  />
                  แสดงเฉพาะใบแจ้งหนี้ที่ยังมียอดคงค้าง
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
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

          {/* List Content */}
          <div className="bg-white p-6 md:p-8">
            {loading ? (
              <div className="py-24 text-center flex flex-col items-center justify-center w-full">
                <RefreshCw className="animate-spin mb-4 text-[#1F3B8B]" size={32} />
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">กำลังโหลดรายละเอียด Statement</span>
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
          </div>

        </div>

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

// --- SUB-COMPONENTS ---

function InvoiceList({ invoices, openAttachmentPreview, openPaymentVoucherPdf, printingPaymentId }) {
  if (!invoices.length) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center w-full">
        <ReceiptText className="mb-4 text-slate-300" size={32} />
        <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">ไม่พบใบแจ้งหนี้ของซัพพลายเออร์นี้</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {invoices.map((invoice) => (
        <div key={invoice.id} className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group w-full">
          
          {/* 1. Header Bar: แยกเลขที่ใบแจ้งหนี้และสถานะมาไว้แถบด้านบนให้ดูเป็นทางการ */}
          <div className="px-5 md:px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-black text-[#1F3B8B] text-[14px] uppercase tracking-wide">
                {invoice.invoiceNo || "-"}
              </h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider shadow-sm ${getInvoiceStatusClass(invoice.status)}`}>
                {invoice.statusLabel || "-"}
              </span>
            </div>
            
            {invoice.attachmentUrl && (
              <button
                type="button"
                onClick={() => openAttachmentPreview(invoice.attachmentUrl, `ไฟล์แนบใบแจ้งหนี้: ${invoice.invoiceNo || ""}`)}
                className="inline-flex items-center gap-1.5 bg-white text-[#1F3B8B] px-4 py-2 rounded-lg text-[11px] font-bold border border-slate-300 hover:bg-[#1F3B8B] hover:text-white hover:border-[#1F3B8B] transition-all shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <Paperclip size={14} />
                เปิดไฟล์แนบ
              </button>
            )}
          </div>

          {/* 2. Body Content: รายละเอียด และ ยอดเงิน */}
          <div className="p-5 md:p-6 flex flex-col lg:flex-row gap-6 xl:gap-8 w-full">
            
            {/* ข้อมูลฝั่งซ้าย - จัดเป็น 3 คอลัมน์เพื่อความโปร่งสบาย */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
  {/* ใบกำกับภาษี */}
  <div className="flex flex-col">
    <span className="text-[12px] font-bold text-slate-700 mb-1">ใบกำกับภาษี</span> 
    <span className="text-[13px] font-bold text-slate-900 truncate" title={invoice.taxInvoiceNo || "N/A"}>
      {invoice.taxInvoiceNo || "N/A"}
    </span>
  </div>

  {/* วันที่เอกสาร */}
  <div className="flex flex-col">
    <span className="text-[12px] font-bold text-slate-700 mb-1">วันที่เอกสาร</span> 
    <span className="text-[13px] font-bold text-slate-900">
      {formatDateTH(invoice.issueDate)}
    </span>
  </div>

  {/* ครบกำหนด */}
  <div className="flex flex-col">
    <span className="text-[12px] font-bold text-slate-700 mb-1">ครบกำหนด</span> 
    <span className="text-[13px] font-bold text-rose-600">
      {formatDateTH(invoice.dueDate)}
    </span>
  </div>

  {/* PO Number */}
  <div className="flex flex-col">
    <span className="text-[12px] font-bold text-slate-700 mb-1">PO Number</span> 
    <span className="text-[13px] font-bold text-slate-900 truncate" title={invoice.purchaseOrder?.poNumber || "-"}>
      {invoice.purchaseOrder?.poNumber || "-"}
    </span>
  </div>

  {/* GR Receipt */}
  <div className="flex flex-col">
    <span className="text-[12px] font-bold text-slate-700 mb-1">GR Receipt</span> 
    <span className="text-[13px] font-bold text-slate-900 truncate" title={invoice.goodsReceipt?.receiptNo || "-"}>
      {invoice.goodsReceipt?.receiptNo || "-"}
    </span>
  </div>
</div>
            </div>

            {/* การ์ดสรุปยอดฝั่งขวา - บังคับขนาดสูงสุดไว้ */}
            <div className="w-full lg:w-[340px] xl:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6 xl:pl-8">
              <div className="grid grid-cols-3 gap-3 h-full items-start">
                <MiniStat label="ยอดสุทธิ" value={`฿${formatMoney(invoice.grandTotal)}`} tone="blue" />
                <MiniStat label="จ่ายแล้ว" value={`฿${formatMoney(invoice.paidAmount)}`} tone="emerald" />
                <MiniStat label="คงค้าง" value={`฿${formatMoney(invoice.outstandingAmount)}`} tone="rose" />
              </div>
            </div>

          </div>

          {/* 3. Footer: ประวัติการจ่ายเงิน */}
          <div className="border-t border-slate-200 bg-slate-50/50 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} className="text-slate-500" />
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                ประวัติการจ่ายเงิน
              </div>
            </div>

            {invoice.payments?.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 shadow-sm">
                ยังไม่มีประวัติการจ่ายเงิน
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentCard({ payment, openAttachmentPreview, openPaymentVoucherPdf, printingPaymentId }) {
  const isVoided = payment.status === "VOIDED";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-[#1F3B8B]/30 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-black text-[13px] text-slate-900 group-hover:text-[#1F3B8B] transition-colors">{payment.pvNo || "-"}</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[12px] font-bold text-slate-800">
              {formatDateTH(payment.paymentDate)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-normal">
              | {getPaymentMethodLabel(payment.paymentMethod)}
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-0.5 truncate">
            <span className="text-[12px] font-bold text-slate-800 shrink-0">
              เลขที่อ้างอิง:
            </span>
            <span className="text-[10px] font-bold text-slate-600 truncate">
              {payment.referenceNo || "-"}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className={`font-black text-[13px] tabular-nums ${isVoided ? "text-rose-500 line-through" : "text-emerald-600"}`}>
            ฿{formatMoney(payment.amountPaid)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
        {!isVoided && (
            <button
              type="button"
              onClick={() => openPaymentVoucherPdf(payment)}
              disabled={printingPaymentId === payment.id || Boolean(printingPaymentId)}
              className="inline-flex items-center justify-center flex-1 gap-2 bg-[#dbeafe] text-blue-900 px-4 py-2.5 rounded-lg text-[13px] font-bold transition-colors duration-300 ease-in-out hover:bg-[#1e40af] hover:text-white disabled:opacity-50 outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {printingPaymentId === payment.id ? (
                <RefreshCw size={14} className="animate-spin text-inherit" />
              ) : (
                <Printer size={14} className="text-inherit" />
              )}
              <span className="text-inherit">
                {printingPaymentId === payment.id ? "กำลังสร้าง..." : "พิมพ์ PV"}
              </span>
            </button>
         )}

        {payment.attachmentUrl && (
          <button
            type="button"
            onClick={() => openAttachmentPreview(payment.attachmentUrl, payment.attachmentName || `หลักฐานการจ่ายเงิน: ${payment.pvNo || ""}`)}
            className="inline-flex items-center justify-center flex-1 gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <Paperclip size={12} />
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
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <ListChecks className="mb-4 text-slate-300" size={32} />
        <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">ไม่พบรายการเคลื่อนไหว</span>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-x-auto w-full relative">
      <table className="w-full min-w-[1000px] border-collapse text-left">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-wider whitespace-nowrap">
            <th className="px-6 py-4 text-left">วันที่</th>
            <th className="px-6 py-4 text-center w-24">ประเภท</th>
            <th className="px-6 py-4 text-left min-w-[180px]">เลขที่เอกสาร</th>
            <th className="px-6 py-4 text-left min-w-[200px]">คำอธิบาย</th>
            <th className="px-6 py-4 text-right">เดบิต / ตั้งหนี้</th>
            <th className="px-6 py-4 text-right">เครดิต / ชำระ</th>
            <th className="px-6 py-4 text-right">ยอดคงเหลือ</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => {
            const isInvoice = row.type === "INVOICE";
            return (
              <tr key={`${row.type}-${row.documentNo}-${index}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-5 align-top">
                  <span className="font-bold text-slate-700 text-[13px] tabular-nums whitespace-nowrap">
                    {formatDateTH(row.date)}
                  </span>
                </td>
                <td className="px-6 py-5 align-top text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm whitespace-nowrap ${isInvoice ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                    {isInvoice ? <FileSpreadsheet size={12} /> : <CreditCard size={12} />}
                    {isInvoice ? "ตั้งหนี้" : "ชำระเงิน"}
                  </span>
                </td>
                <td className="px-6 py-5 align-top">
                  <div className="font-black text-slate-900 text-[13px] whitespace-nowrap">
                    {row.documentNo || "-"}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter truncate max-w-[150px]">
                    เลขที่อ้างอิง: {row.referenceNo || "-"}
                  </div>
                </td>
                <td className="px-6 py-5 align-top">
                  <span className="font-bold text-slate-600 text-[13px]">
                    {row.description || "-"}
                  </span>
                </td>
                <td className="px-6 py-5 align-top text-right">
                  <span className="font-black text-[#1F3B8B] text-[13px] tabular-nums whitespace-nowrap">
                    {row.debit ? `฿${formatMoney(row.debit)}` : "-"}
                  </span>
                </td>
                <td className="px-6 py-5 align-top text-right">
                  <span className="font-black text-emerald-600 text-[13px] tabular-nums whitespace-nowrap">
                    {row.credit ? `฿${formatMoney(row.credit)}` : "-"}
                  </span>
                </td>
                <td className="px-6 py-5 align-top text-right">
                  <span className="font-black text-slate-900 text-[13px] tabular-nums whitespace-nowrap">
                    ฿{formatMoney(row.runningBalance)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttachmentPreviewModal({ previewModal, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#1F3B8B]/10 flex items-center justify-center shrink-0 border border-[#1F3B8B]/20">
              {isImageAttachment(previewModal.url) ? (
                <ImageIcon className="text-[#1F3B8B]" size={20} />
              ) : (
                <FileText className="text-[#1F3B8B]" size={20} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-black uppercase tracking-wider text-slate-900">ไฟล์แนบเอกสาร</h3>
              <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-widest mt-0.5">
                {previewModal.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all flex items-center justify-center shadow-sm outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 bg-slate-100/50 overflow-auto flex-1 flex justify-center items-center">
          {isImageAttachment(previewModal.url) ? (
            <img
              src={getPublicFileHref(previewModal.url)}
              alt={previewModal.name || "ไฟล์แนบ"}
              className="max-w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 bg-white shadow-sm"
              onError={() => toast.error("เปิดรูปไม่สำเร็จ")}
            />
          ) : isPdfAttachment(previewModal.url) ? (
            <iframe
              src={getPublicFileHref(previewModal.url)}
              title="ไฟล์แนบ"
              className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white shadow-sm"
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center w-full max-w-md shadow-sm">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-slate-400" />
              </div>
              <div className="text-[13px] font-black text-slate-700">
                ไม่สามารถแสดงตัวอย่างไฟล์ชนิดนี้ได้
              </div>
              <a
                href={getPublicFileHref(previewModal.url)}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 bg-[#1F3B8B] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-blue-900 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-[#1F3B8B] focus:ring-offset-1"
              >
                <ExternalLink size={14} />
                เปิดไฟล์ในแท็บใหม่
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- REFACTORED CARD & STAT COMPONENTS WITH AUTO-RESIZE ---

function SummaryCard({ label, value, sub, tone = "slate" }) {
  const themes = {
    slate: "border-l-slate-400 bg-slate-50/50",
    blue: "border-l-[#1F3B8B] bg-[#1F3B8B]/5",
    emerald: "border-l-emerald-500 bg-emerald-50/30",
    rose: "border-l-rose-500 bg-rose-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
  };

  return (
    <div style={{ containerType: "inline-size" }} className={`bg-white border border-slate-200 border-l-4 ${themes[tone] || themes.slate} p-5 rounded-xl shadow-sm transition-all hover:shadow-md flex flex-col justify-center min-w-0`}>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">
        {label}
      </p>
      <div style={{ fontSize: "clamp(1.25rem, 10cqw, 1.875rem)" }} className="font-black text-slate-900 tabular-nums tracking-tighter whitespace-nowrap">
        {value}
      </div>
      <p className="text-xs font-bold text-slate-400 mt-1.5 truncate">
        {sub}
      </p>
    </div>
  );
}

function MiniStat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900 bg-white border-slate-200",
    blue: "text-[#1F3B8B] bg-[#1F3B8B]/5 border-[#1F3B8B]/20",
    emerald: "text-emerald-600 bg-emerald-50/50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50/50 border-rose-100",
  };

  return (
    <div style={{ containerType: "inline-size" }} className={`p-3.5 rounded-xl border flex flex-col justify-center min-w-0 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
        {label}
      </p>
      <div style={{ fontSize: "clamp(12px, 12cqw, 15px)" }} className="font-black tabular-nums tracking-tighter whitespace-nowrap">
        {value}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2.5 rounded-lg text-[13px] font-bold tracking-wide transition-all flex items-center gap-2 border outline-none active:scale-95 focus:ring-2 focus:ring-[#1F3B8B]/20 ${
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
        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-[13px] font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all"
      />
    </div>
  );
}