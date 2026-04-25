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
  Wallet,
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
  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  if (!url || /^\s*(javascript|vbscript|data):/i.test(url)) return "#";
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
  if (!path || /^\s*(javascript|vbscript|data):/i.test(path)) return "#";
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  const [successPopup, setSuccessPopup] = useState({
    isOpen: false,
    message: "",
  });

  const loadPaymentHistory = useCallback(async () => {
    setLoading(true);
    setCurrentPage(1);
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
        }
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

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, currentPage, itemsPerPage]);

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
        } catch { }
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

      setSuccessPopup({ isOpen: true, message: "ยกเลิกการจ่ายเงินสำเร็จ" });
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

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
              <History className="w-6 h-6 text-[#1F3B8B]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                ประวัติการจ่ายเงิน
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                <Wallet size={16} className="text-blue-500" />
                แสดงรายการจ่ายเงิน รอบการแบ่งจ่าย หลักฐาน และใบสำคัญจ่าย
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadPaymentHistory}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-slate-50 shadow-sm active:scale-95 disabled:opacity-50 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-[#1F3B8B]"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            โหลดข้อมูลใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            label="รายการทั้งหมด"
            value={`${summary.totalCount || 0}`}
            sub="จำนวนรายการจ่ายเงินทั้งหมด"
            tone="slate"
            suffix="รายการ"
          />
          <SummaryCard
            label="รายการปกติ"
            value={`${summary.activeCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.activeAmount)}`}
            tone="emerald"
            suffix="รายการ"
          />
          <SummaryCard
            label="รายการที่ยกเลิก"
            value={`${summary.voidedCount || 0}`}
            sub={`ยอดรวม ฿${formatMoney(summary.voidedAmount)}`}
            tone="rose"
            suffix="รายการ"
          />
          <SummaryCard
            label="ยอดจ่ายสุทธิ"
            value={`฿${formatMoney(summary.activeAmount)}`}
            sub="ไม่นับรายการที่ยกเลิก"
            tone="blue"
            suffix=""
          />
        </div>

        <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col animate-in fade-in duration-500">
          <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6">
              <div className="w-full lg:flex-1 group">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                  ค้นหาข้อมูล (Search)
                </label>
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors"
                  />
                  <input
                    value={filters.keyword}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        keyword: e.target.value,
                      }))
                    }
                    placeholder="ค้นหาเลขที่ใบสำคัญจ่าย / ใบแจ้งหนี้ / ซัพพลายเออร์ / เลขอ้างอิง..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full lg:w-auto">
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

                <div className="col-span-1 sm:col-span-2 md:col-span-1 flex flex-col space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
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
                    className="w-full lg:w-[200px] bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm cursor-pointer transition-all"
                  >
                    <option value="ALL">ทั้งหมด</option>
                    <option value="ACTIVE">รายการปกติ</option>
                    <option value="VOIDED">รายการยกเลิก</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full relative overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr className="text-[11px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">
                  <Th width="130px">ใบสำคัญจ่าย</Th>
                  <Th width="160px">ใบแจ้งหนี้</Th>
                  <Th width="200px">ซัพพลายเออร์</Th>
                  <Th width="140px">วิธีจ่าย / หลักฐาน</Th>
                  <Th width="180px">ประเภทการจ่าย</Th>
                  <Th width="120px">ผู้บันทึก</Th>
                  <Th align="right" width="130px">จำนวนเงิน</Th>
                  <Th align="center" width="110px">สถานะ</Th>
                  <Th align="center" width="130px">จัดการ</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedPayments.map((payment) => {
                  const isVoided = payment.status === "VOIDED";
                  const roundInfo = getRoundInfo(payment);

                  return (
                    <tr
                      key={payment.id}
                      className={`transition-colors group border-b border-slate-100 last:border-0 ${isVoided ? "bg-rose-50/20" : "hover:bg-slate-50/80"
                        }`}
                    >
                      <Td>
                        <div className="font-black text-[#1F3B8B] uppercase text-[12px] tracking-wide">
                          {payment.pvNo}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase whitespace-nowrap">
                          {formatDateTH(payment.paymentDate)}
                        </div>
                        {payment.remarks && (
                          <div className="text-[9px] font-bold text-slate-400 mt-0.5 line-clamp-1" title={payment.remarks}>
                            หมายเหตุ: {payment.remarks}
                          </div>
                        )}
                      </Td>

                      <Td>
                        <div className="font-bold text-slate-900 text-[12px] whitespace-nowrap">
                          {payment.invoice?.invoiceNo || "-"}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">
                        ใบกำกับภาษี: {payment.invoice?.taxInvoiceNo || "N/A"}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">
                          {payment.invoice?.purchaseOrder?.poNumber || "-"}
                        </div>
                      </Td>

                      <Td>
                        <div className="max-w-[180px]">
                          <div className="font-black text-slate-900 text-[12px] truncate" title={payment.invoice?.supplier?.name}>
                            {payment.invoice?.supplier?.name || "-"}
                          </div>
                          <div className="text-[10px] font-black text-[#1F3B8B] mt-1 tracking-widest uppercase">
                            ID: {payment.invoice?.supplier?.code || "-"}
                          </div>
                        </div>
                      </Td>

                      <Td>
                        <div className="font-bold text-slate-800 text-[12px]">
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5 truncate" title={payment.referenceNo}>
                         เลขที่อ้างอิง: {payment.referenceNo || "-"}
                        </div>
                        {payment.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => openPreviewModal(payment)}
                            className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors outline-none"
                          >
                            <Paperclip size={10} strokeWidth={2.5} />
                            เปิดหลักฐาน
                          </button>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100">
                            ไม่มีหลักฐาน
                          </div>
                        )}
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className={`w-fit inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase border shadow-sm ${getRoundBadgeClass(roundInfo.paymentType)}`}>
                            {roundInfo.roundLabel}
                          </span>
                          {roundInfo.beforeOutstanding !== null && (
                            <div className="text-[10px] font-bold text-slate-500 mt-1 whitespace-nowrap">
                              ก่อน: ฿{formatMoney(roundInfo.beforeOutstanding)}
                            </div>
                          )}
                          {roundInfo.afterOutstanding !== null && (
                            <div className="text-[10px] font-black text-rose-600 whitespace-nowrap">
                              หลัง: ฿{formatMoney(roundInfo.afterOutstanding)}
                            </div>
                          )}
                        </div>
                      </Td>

                      <Td>
                        <div className="font-bold text-slate-700 text-[12px] truncate">
                          {getPaidByName(payment.paidBy)}
                        </div>
                      </Td>

                      <Td align="right">
                        <div className={`font-black tabular-nums text-[13px] tracking-tighter ${isVoided ? "text-rose-400 line-through opacity-60" : "text-emerald-700"}`}>
                          ฿{formatMoney(payment.amountPaid)}
                        </div>
                      </Td>

                      <Td align="center">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge status={payment.status || "ACTIVE"} />
                          {isVoided && payment.voidReason && (
                            <div className="text-[9px] font-bold text-rose-500 mt-1 line-clamp-1 w-[90px] text-center" title={payment.voidReason}>
                              {payment.voidReason}
                            </div>
                          )}
                        </div>
                      </Td>

                      <Td align="center">
                        <div className="flex flex-col items-center justify-center gap-2 min-w-[80px]">
                         
                          <button
                            type="button"
                            onClick={() => openPaymentVoucherPdf(payment)}
                            disabled={printingPaymentId === payment.id || Boolean(printingPaymentId)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[#1F3B8B] bg-white border border-slate-200 hover:bg-[#1F3B8B] hover:text-white transition-all shadow-sm outline-none disabled:opacity-50 text-[11px] font-bold tracking-widest"
                            title="พิมพ์ใบสำคัญจ่าย"
                          >
                          
                            พิมพ์
                          </button>

                        
                          {!isVoided ? (
                            <AuthGate requiredPermissions={["AP_PAYMENT_VOID"]}>
                              <button
                                type="button"
                                onClick={() => openVoidModal(payment)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-500 bg-white border border-slate-200 hover:bg-rose-500 hover:text-white transition-all shadow-sm outline-none text-[11px] font-bold tracking-widest"
                                title="ยกเลิกรายการ"
                              >
                                
                                ยกเลิก
                              </button>
                            </AuthGate>
                          ) : (
                            <div
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 bg-slate-50 border border-slate-100 text-[11px] font-bold tracking-widest opacity-60 cursor-not-allowed"
                              title="ยกเลิกแล้ว"
                            >
                              
                              ยกเลิกแล้ว
                            </div>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}

                {paginatedPayments.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-32 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                        <Search className="text-slate-300" size={32} />
                      </div>
                      <div className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">
                        ไม่พบประวัติการจ่ายเงิน
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredPayments.length)} จากทั้งหมด {filteredPayments.length} รายการ
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all outline-none"
                >
                  ก่อนหน้า
                </button>

                <div className="flex items-center gap-1.5 px-3">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = currentPage === pageNum;

                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-[11px] font-black transition-all outline-none border ${isActive
                            ? "bg-[#1F3B8B] text-white border-[#1F3B8B] shadow-md shadow-blue-500/20"
                            : "bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-[#1F3B8B]"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="text-slate-400 text-xs tracking-widest px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all outline-none"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modals & Success Popup (Keep Logic Original) */}
        {previewModal.isOpen && previewModal.payment && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    {isImageAttachment(previewModal.payment.attachmentUrl) ? (
                      <ImageIcon className="text-emerald-400" size={20} />
                    ) : (
                      <FileText className="text-emerald-400" size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-widest uppercase">
                      หลักฐานการจ่ายเงิน
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                      {previewModal.payment.pvNo}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center outline-none"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 bg-slate-50 max-h-[calc(92vh-88px)] overflow-auto flex justify-center">
                {isImageAttachment(previewModal.payment.attachmentUrl) ? (
                  <img
                    src={getPublicFileHref(previewModal.payment.attachmentUrl)}
                    alt="หลักฐาน"
                    className="max-w-full h-auto rounded-xl border border-slate-200 bg-white shadow-sm"
                    onError={() => toast.error("โหลดภาพไม่สำเร็จ")}
                  />
                ) : isPdfAttachment(previewModal.payment.attachmentUrl) ? (
                  <iframe
                    src={getPublicFileHref(previewModal.payment.attachmentUrl)}
                    title="PDF"
                    className="w-full h-[75vh] rounded-xl border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <FileText size={48} className="mx-auto text-slate-400" />
                    <div className="mt-4 text-sm font-black text-slate-700">ไม่สามารถแสดงตัวอย่างไฟล์ได้</div>
                    <a
                      href={getPublicFileHref(previewModal.payment.attachmentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center gap-2 bg-[#1F3B8B] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all"
                    >
                      <ExternalLink size={14} /> เปิดไฟล์ในหน้าต่างใหม่
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {voidModal.isOpen && voidModal.payment && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 shadow-sm">
                    <AlertTriangle className="text-rose-500" size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                      ยกเลิกรายการจ่ายเงิน
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">โปรดระบุเหตุผลเพื่อบันทึกประวัติ</p>
                  </div>
                </div>
                <button type="button" onClick={closeVoidModal} disabled={voiding} className="text-slate-400 hover:text-slate-600 transition-colors outline-none"><X size={24} /></button>
              </div>

              <div className="p-8 space-y-6 bg-slate-50/50">
                <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-1">ยกเลิกใบสำคัญจ่ายเลขที่</div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">{voidModal.payment.pvNo}</div>
                  <div className="text-sm font-bold text-slate-500 mt-2">ยอดเงิน: <span className="text-rose-600 font-black">฿{formatMoney(voidModal.payment.amountPaid)}</span></div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1">เหตุผลในการยกเลิก</label>
                  <textarea
                    rows={3}
                    value={voidModal.reason}
                    onChange={(e) => setVoidModal(p => ({ ...p, reason: e.target.value }))}
                    placeholder="ระบุเหตุผล..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all resize-none shadow-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeVoidModal} disabled={voiding} className="flex-1 py-3.5 rounded-xl font-bold text-xs uppercase text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-all tracking-widest disabled:opacity-50 outline-none">ปิด</button>
                  <button type="button" onClick={handleVoidPayment} disabled={voiding} className="flex-[2] bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50 outline-none">
                    {voiding ? <RefreshCw className="animate-spin" size={16} /> : <RotateCcw size={16} />} ยืนยันยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {successPopup.isOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100 text-emerald-500">
                <CheckCircle2 size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">สำเร็จ!</h3>
              <p className="text-sm font-bold text-slate-500 mb-8">{successPopup.message}</p>
              <button
                type="button"
                onClick={() => setSuccessPopup({ isOpen: false, message: "" })}
                className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md active:scale-95"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

function SummaryCard({ label, value, sub, tone = "slate", suffix = "รายการ" }) {
  const themes = {
    slate: "border-l-slate-400 bg-slate-50/50",
    blue: "border-l-[#1F3B8B] bg-[#1F3B8B]/5",
    emerald: "border-l-emerald-500 bg-emerald-50/30",
    rose: "border-l-rose-500 bg-rose-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
  };
  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${themes[tone] || themes.slate} p-5 rounded-xl shadow-sm transition-all hover:shadow-md flex flex-col justify-center min-w-0 overflow-hidden`}>
      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 truncate">{label}</p>

      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-lg sm:text-xl lg:text-lg xl:text-2xl 2xl:text-3xl font-black text-slate-900 tabular-nums tracking-tighter whitespace-nowrap">
          {value}
        </span>
        {suffix && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">{suffix}</span>}
      </div>

      <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 pt-2 border-t border-slate-100 truncate">{sub}</p>
    </div>
  );
}

function FilterInput({ label, type = "text", value, onChange }) {
  return (
    <div className="flex flex-col items-start w-full space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/20 shadow-sm transition-all"
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const isVoided = status === "VOIDED";
  const label = isVoided ? "ยกเลิกแล้ว" : "ปกติ";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black border uppercase tracking-wider whitespace-nowrap ${isVoided
        ? "bg-rose-50 text-rose-700 border-rose-100"
        : "bg-emerald-50 text-emerald-700 border-emerald-100"
        }`}
    >
      {isVoided ? <Ban size={11} strokeWidth={2.5} /> : <CheckCircle2 size={11} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function Th({ children, align = "left", width }) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      style={{ width: width }}
      className={`px-4 py-4 text-[11px] font-black tracking-widest uppercase text-slate-500 ${alignClass}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`px-4 py-5 align-top ${alignClass}`}>{children}</td>;
}