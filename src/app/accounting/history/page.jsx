"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  History,
  RefreshCw,
  Search,
  Building2,
  Ban,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
  ExternalLink,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Printer,
} from "lucide-react";

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
  return new Date(value).toLocaleDateString("th-TH");
};

const getPaidByName = (paidBy) => {
  if (!paidBy) return "-";

  const fullName = `${paidBy.firstName || ""} ${paidBy.lastName || ""}`.trim();

  return fullName || paidBy.username || "-";
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

const isImageAttachment = (url = "") => {
  return /\.(jpg|jpeg|png|webp)$/i.test(url);
};

const isPdfAttachment = (url = "") => {
  return /\.pdf$/i.test(url);
};

const getRoundInfo = (payment) => {
  if (payment?.status === "VOIDED") {
    return {
      paymentType: "VOIDED",
      paymentTypeLabel: "รายการยกเลิก",
      roundLabel: "รายการยกเลิก",
      roundNo: null,
      totalRounds: null,
      beforeOutstanding: null,
      afterOutstanding: null,
    };
  }

  const info = payment?.paymentRoundInfo;

  if (!info) {
    return {
      paymentType: "UNKNOWN",
      paymentTypeLabel: "ไม่ระบุ",
      roundLabel: "ไม่ระบุ",
      roundNo: null,
      totalRounds: null,
      beforeOutstanding: null,
      afterOutstanding: null,
    };
  }

  return {
    paymentType: info.paymentType || "UNKNOWN",
    paymentTypeLabel: info.paymentTypeLabel || "ไม่ระบุ",
    roundLabel: info.roundLabel || "ไม่ระบุ",
    roundNo: info.roundNo ?? null,
    totalRounds: info.totalRounds ?? null,
    beforeOutstanding: info.beforeOutstanding ?? null,
    afterOutstanding: info.afterOutstanding ?? null,
  };
};

const getRoundBadgeClass = (paymentType) => {
  switch (paymentType) {
    case "FULL":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "PARTIAL":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "CLOSING":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "VOIDED":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-slate-50 text-slate-500 border-slate-100";
  }
};

export default function APPaymentHistoryPage() {
  const [loading, setLoading] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [printingPaymentId, setPrintingPaymentId] = useState(null);

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    activeCount: 0,
    voidedCount: 0,
    activeAmount: 0,
    voidedAmount: 0,
  });

  const [filters, setFilters] = useState({
    keyword: "",
    status: "ALL",
    from: firstDayOfMonthInput(),
    to: todayInput(),
  });

  const [voidModal, setVoidModal] = useState({
    isOpen: false,
    payment: null,
    reason: "",
  });

  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    payment: null,
  });

  const loadPaymentHistory = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
      if (filters.status) params.set("status", filters.status);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await apiFetch(`/ap/payments/history?${params.toString()}`);
      const data = res?.data || res || {};

      setPayments(data.payments || []);
      setSummary(
        data.summary || {
          totalCount: 0,
          activeCount: 0,
          voidedCount: 0,
          activeAmount: 0,
          voidedAmount: 0,
        },
      );
    } catch (err) {
      console.error("Load payment history error:", err);
      toast.error(err.message || "โหลดประวัติการจ่ายเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPaymentHistory();
  }, [loadPaymentHistory]);

  const filteredPayments = useMemo(() => payments, [payments]);

  const openVoidModal = (payment) => {
    setVoidModal({
      isOpen: true,
      payment,
      reason: "",
    });
  };

  const closeVoidModal = () => {
    if (voiding) return;

    setVoidModal({
      isOpen: false,
      payment: null,
      reason: "",
    });
  };

  const openPreviewModal = (payment) => {
    if (!payment?.attachmentUrl) {
      toast.error("รายการนี้ไม่มีไฟล์หลักฐานการจ่ายเงิน");
      return;
    }

    setPreviewModal({
      isOpen: true,
      payment,
    });
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      payment: null,
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
        } catch {
          // response ไม่ใช่ JSON
        }

        throw new Error(message);
      }

      const blob = await res.blob();

      if (blob.type && !blob.type.includes("pdf")) {
        throw new Error("ไฟล์ที่ได้รับไม่ใช่ PDF");
      }

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

  const handleVoidPayment = async () => {
    if (!voidModal.payment) return;

    if (!voidModal.reason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการยกเลิกการจ่ายเงิน");
      return;
    }

    setVoiding(true);

    try {
      await apiFetch(`/ap/payments/${voidModal.payment.id}/void`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voidReason: voidModal.reason,
        }),
      });

      toast.success("ยกเลิกการจ่ายเงินสำเร็จ");
      closeVoidModal();
      await loadPaymentHistory();
    } catch (err) {
      console.error("Void payment error:", err);
      toast.error(err.message || "ยกเลิกการจ่ายเงินไม่สำเร็จ");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <AuthGate requiredPermissions={["AP_READ"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-none mx-auto px-0 py-8 space-y-8 min-h-screen">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
              <History className="text-blue-600" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                ประวัติการจ่ายเงิน
              </h1>
              <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                แสดงรายการจ่ายเงิน รอบการแบ่งจ่าย หลักฐาน และใบสำคัญจ่าย
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadPaymentHistory}
            disabled={loading}
            className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs tracking-widest hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 w-fit"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            โหลดข้อมูลใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard
            label="รายการทั้งหมด"
            value={`${summary.totalCount || 0}`}
            sub="จำนวนรายการจ่ายเงินทั้งหมด"
          />
          <SummaryCard
            label="รายการปกติ"
            value={`${summary.activeCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.activeAmount)}`}
            tone="emerald"
          />
          <SummaryCard
            label="รายการที่ยกเลิก"
            value={`${summary.voidedCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.voidedAmount)}`}
            tone="rose"
          />
          <SummaryCard
            label="ยอดจ่ายสุทธิ"
            value={`฿${formatMoney(summary.activeAmount)}`}
            sub="ไม่นับรายการที่ยกเลิก"
            tone="blue"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50/60 border-b border-slate-200 space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-end gap-4">
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
                  placeholder="ค้นหาเลขที่ใบสำคัญจ่าย / ใบแจ้งหนี้ / ซัพพลายเออร์ / เลขอ้างอิง"
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-600 placeholder:text-slate-300"
                />
              </div>

              <FilterInput
                label="จากวันที่"
                type="date"
                value={filters.from}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, from: value }))
                }
              />

              <FilterInput
                label="ถึงวันที่"
                type="date"
                value={filters.to}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, to: value }))
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
                  className="w-full xl:w-[180px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
                >
                  <option value="ALL">ทั้งหมด</option>
                  <option value="ACTIVE">รายการปกติ</option>
                  <option value="VOIDED">รายการยกเลิก</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full table-fixed text-xs">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 tracking-[0.12em] bg-white">
                  <th className="px-3 py-4 text-left w-[10%]">ใบสำคัญจ่าย</th>
                  <th className="px-3 py-4 text-left w-[15%]">ใบแจ้งหนี้</th>
                  <th className="px-3 py-4 text-left w-[12%]">ซัพพลายเออร์</th>
                  <th className="px-3 py-4 text-left w-[10%]">วิธีจ่าย</th>
                  <th className="px-3 py-4 text-left w-[14%]">ประเภทการจ่าย</th>
                  <th className="px-3 py-4 text-left w-[8%]">ผู้บันทึก</th>
                  <th className="px-3 py-4 text-right w-[10%]">จำนวนเงิน</th>
                  <th className="px-3 py-4 text-center w-[8%]">สถานะ</th>
                  <th className="px-3 py-4 text-center w-[13%]">จัดการ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => {
                  const isVoided = payment.status === "VOIDED";
                  const roundInfo = getRoundInfo(payment);

                  return (
                    <tr
                      key={payment.id}
                      className={`transition-all ${
                        isVoided ? "bg-rose-50/30" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-3 py-4 align-top">
                        <div className="font-black text-blue-700 uppercase truncate">
                          {payment.pvNo}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 truncate">
                          {formatDateTH(payment.paymentDate)}
                        </div>
                        {payment.remarks && (
                          <div className="text-[9px] font-bold text-slate-500 mt-1 truncate">
                            หมายเหตุ: {payment.remarks}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 align-top">
                        <div className="font-black text-slate-900 uppercase truncate">
                          {payment.invoice?.invoiceNo || "-"}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 truncate">
                          TAX: {payment.invoice?.taxInvoiceNo || "N/A"}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 truncate">
                          PO: {payment.invoice?.purchaseOrder?.poNumber || "-"}{" "}
                          | GR:{" "}
                          {payment.invoice?.goodsReceipt?.receiptNo || "-"}
                        </div>
                      </td>

                      <td className="px-3 py-4 align-top">
                        <div className="font-bold text-slate-800 flex items-center gap-2 min-w-0">
                          <Building2
                            size={13}
                            className="text-slate-400 shrink-0"
                          />
                          <span className="truncate">
                            {payment.invoice?.supplier?.name || "-"}
                          </span>
                        </div>
                        <div className="text-[9px] font-black text-slate-400 mt-1 truncate">
                          รหัส: {payment.invoice?.supplier?.code || "-"}
                        </div>
                      </td>

                      <td className="px-3 py-4 align-top">
                        <div className="font-black text-slate-800 truncate">
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </div>
                        <div className="text-[9px] font-bold text-blue-600 truncate">
                          Ref: {payment.referenceNo || "-"}
                        </div>

                        {payment.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => openPreviewModal(payment)}
                            title={
                              payment.attachmentName || "เปิดหลักฐานการจ่ายเงิน"
                            }
                            className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700 hover:bg-emerald-100"
                          >
                            <Paperclip size={10} className="shrink-0" />
                            <span className="truncate">เปิดหลักฐาน</span>
                            <ExternalLink size={9} className="shrink-0" />
                          </button>
                        ) : (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-black text-slate-400">
                            <Paperclip size={10} />
                            ไม่มีหลักฐาน
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 align-top">
                        <div
                          className={`inline-flex max-w-full px-2.5 py-1 rounded-full text-[9px] font-black border truncate ${getRoundBadgeClass(
                            roundInfo.paymentType,
                          )}`}
                        >
                          <span className="truncate">
                            {roundInfo.roundLabel}
                          </span>
                        </div>

                        {roundInfo.beforeOutstanding !== null &&
                          roundInfo.beforeOutstanding !== undefined && (
                            <div className="text-[9px] font-bold text-slate-400 mt-2 truncate">
                              ก่อน: ฿{formatMoney(roundInfo.beforeOutstanding)}
                            </div>
                          )}

                        {roundInfo.afterOutstanding !== null &&
                          roundInfo.afterOutstanding !== undefined && (
                            <div className="text-[9px] font-bold text-slate-400 truncate">
                              หลัง: ฿{formatMoney(roundInfo.afterOutstanding)}
                            </div>
                          )}
                      </td>

                      <td className="px-3 py-4 align-top">
                        <div className="font-bold text-slate-700 truncate">
                          {getPaidByName(payment.paidBy)}
                        </div>
                      </td>

                      <td className="px-3 py-4 text-right align-top">
                        <div
                          className={`font-black truncate ${
                            isVoided
                              ? "text-rose-500 line-through"
                              : "text-emerald-700"
                          }`}
                        >
                          ฿{formatMoney(payment.amountPaid)}
                        </div>
                      </td>

                      <td className="px-3 py-4 text-center align-top">
                        <StatusBadge status={payment.status || "ACTIVE"} />

                        {isVoided && payment.voidReason && (
                          <div className="text-[9px] font-bold text-rose-500 mt-2 truncate">
                            {payment.voidReason}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 text-center align-top">
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPaymentVoucherPdf(payment)}
                            disabled={
                              printingPaymentId === payment.id ||
                              Boolean(printingPaymentId)
                            }
                            className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-[9px] font-black hover:bg-blue-600 hover:text-white transition-all inline-flex items-center gap-1 w-fit disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {printingPaymentId === payment.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Printer size={12} />
                            )}
                            {printingPaymentId === payment.id
                              ? "กำลังสร้าง"
                              : "พิมพ์"}
                          </button>

                          {!isVoided ? (
                            <AuthGate requiredPermissions={["AP_PAYMENT_VOID"]}>
                              <button
                                type="button"
                                onClick={() => openVoidModal(payment)}
                                className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl text-[9px] font-black hover:bg-rose-600 hover:text-white transition-all inline-flex items-center gap-1 w-fit"
                              >
                                <Ban size={12} />
                                ยกเลิก
                              </button>
                            </AuthGate>
                          ) : (
                            <span className="text-[9px] font-black text-slate-300">
                              ยกเลิกแล้ว
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-3 py-14 text-center text-slate-400 font-bold tracking-widest italic"
                    >
                      ไม่พบประวัติการจ่ายเงิน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {previewModal.isOpen && previewModal.payment && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    {isImageAttachment(previewModal.payment.attachmentUrl) ? (
                      <ImageIcon className="text-emerald-400" size={22} />
                    ) : (
                      <FileText className="text-emerald-400" size={22} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-black tracking-widest">
                      หลักฐานการจ่ายเงิน
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 truncate">
                      {previewModal.payment.attachmentName ||
                        previewModal.payment.pvNo ||
                        "ไฟล์แนบหลักฐาน"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 bg-slate-50 max-h-[calc(92vh-88px)] overflow-auto">
                {isImageAttachment(previewModal.payment.attachmentUrl) ? (
                  <div className="w-full flex justify-center">
                    <img
                      src={getPublicFileHref(
                        previewModal.payment.attachmentUrl,
                      )}
                      alt={
                        previewModal.payment.attachmentName ||
                        "หลักฐานการจ่ายเงิน"
                      }
                      className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-slate-200 bg-white shadow-sm"
                      onError={() => {
                        toast.error(
                          "เปิดรูปไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า static uploads ของ backend",
                        );
                      }}
                    />
                  </div>
                ) : isPdfAttachment(previewModal.payment.attachmentUrl) ? (
                  <iframe
                    src={getPublicFileHref(previewModal.payment.attachmentUrl)}
                    title="หลักฐานการจ่ายเงิน"
                    className="w-full h-[75vh] rounded-2xl border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <FileText size={42} className="mx-auto text-slate-400" />
                    <div className="mt-4 text-sm font-black text-slate-700">
                      ไม่สามารถแสดงตัวอย่างไฟล์ชนิดนี้ได้
                    </div>
                    <a
                      href={getPublicFileHref(
                        previewModal.payment.attachmentUrl,
                      )}
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
        )}

        {voidModal.isOpen && voidModal.payment && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between rounded-t-[2rem]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <AlertTriangle className="text-rose-400" size={22} />
                  </div>

                  <div>
                    <h3 className="text-sm font-black tracking-widest">
                      ยกเลิกรายการจ่ายเงิน
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                      กลับรายการใบสำคัญจ่าย
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeVoidModal}
                  disabled={voiding}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <div className="text-xs font-bold text-slate-500">
                    ต้องการยกเลิกการจ่ายเงินเลขที่
                  </div>
                  <div className="text-lg font-black text-rose-700 mt-1">
                    {voidModal.payment.pvNo}
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-2">
                    จำนวนเงิน ฿{formatMoney(voidModal.payment.amountPaid)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-[0.1em] ml-1">
                    เหตุผลในการยกเลิก
                  </label>

                  <textarea
                    rows={4}
                    value={voidModal.reason}
                    onChange={(e) =>
                      setVoidModal((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="เช่น บันทึกยอดผิด, เลขสลิปไม่ถูกต้อง, ต้องกลับรายการ"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-rose-600 outline-none transition-all placeholder:text-slate-300 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeVoidModal}
                    disabled={voiding}
                    className="px-6 py-3 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100 transition-all tracking-widest disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="button"
                    onClick={handleVoidPayment}
                    disabled={voiding}
                    className="px-8 py-3 bg-rose-600 text-white rounded-xl font-black text-xs tracking-[0.2em] hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {voiding ? (
                      <RefreshCw className="animate-spin" size={15} />
                    ) : (
                      <RotateCcw size={15} />
                    )}
                    ยืนยันยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

function SummaryCard({ label, value, sub, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 border-slate-200 text-slate-900",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  };

  return (
    <div
      className={`border rounded-3xl p-5 ${toneClass[tone] || toneClass.slate}`}
    >
      <div className="text-[10px] font-black text-slate-400 tracking-[0.2em]">
        {label}
      </div>
      <div className="text-2xl font-black mt-2">{value}</div>
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
        className="w-full xl:w-[180px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const isVoided = status === "VOIDED";

  const label = isVoided ? "ยกเลิกแล้ว" : "ปกติ";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border ${
        isVoided
          ? "bg-rose-50 text-rose-700 border-rose-100"
          : "bg-emerald-50 text-emerald-700 border-emerald-100"
      }`}
    >
      {isVoided ? <Ban size={10} /> : <CheckCircle2 size={10} />}
      {label}
    </span>
  );
}
