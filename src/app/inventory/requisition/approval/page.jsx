"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
  CheckCircle2,
  ShieldCheck,
  Package,
  ArrowLeft,
  ChevronRight,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  X,
  Calendar,
  Wallet,
  MapPin,
  Clock,
  Loader2,
} from "lucide-react";

const formatThaiDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getPriorityLabel = (priority) => {
  switch (priority) {
    case "URGENT":
      return {
        text: "ด่วนมาก",
        className: "bg-rose-50 text-rose-600 border-rose-100",
      };
    case "HIGH":
      return {
        text: "ด่วน",
        className: "bg-amber-50 text-amber-600 border-amber-100",
      };
    default:
      return {
        text: "ปกติ",
        className: "bg-slate-50 text-slate-600 border-slate-200",
      };
  }
};

const getProductUnitCost = (item) => {
  return (
    Number(item?.unitCost) ||
    Number(item?.estimatedPrice) ||
    Number(item?.product?.unitCost) ||
    Number(item?.product?.price) ||
    0
  );
};

export default function RequisitionApprovalPage() {
  const [requisitions, setRequisitions] = useState([]);
  const [selectedSR, setSelectedSR] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState("LIST");
  const [isMounted, setIsMounted] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    actionStatus: null,
    id: null,
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    loadPendingSRs();
  }, []);

  useEffect(() => {
    if (confirmModal.isOpen || showSuccessModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [confirmModal.isOpen, showSuccessModal]);

  const loadPendingSRs = async () => {
    setIsLoading(true);

    try {
      const res = await apiFetch("/outbound/requisitions/pending");
      setRequisitions(Array.isArray(res) ? res : res?.data || []);
    } catch (error) {
      toast.error("ระบบไม่สามารถดึงข้อมูลรายการค้างอนุมัติได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSR = (sr) => {
    setSelectedSR(sr);
    setViewMode("DETAIL");
    window.scrollTo(0, 0);
  };

  const executeAction = async () => {
    const { id, actionStatus } = confirmModal;
    const actionText = actionStatus === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ";

    setIsActionLoading(true);
    const toastId = toast.loading(`กำลังส่งคำสั่ง${actionText}เข้าสู่ระบบ...`);

    try {
      await apiFetch(`/outbound/requisitions/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: actionStatus,
          processedAt: new Date().toISOString(),
        }),
      });

      toast.dismiss(toastId);
      setConfirmModal({ isOpen: false, actionStatus: null, id: null });
      setShowSuccessModal(true);
      loadPendingSRs();
    } catch (error) {
      toast.error(error.message || "เกิดข้อผิดพลาดด้านความปลอดภัย", {
        id: toastId,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const calculateGrandTotal = () => {
    if (!selectedSR || !selectedSR.items) return 0;

    return selectedSR.items.reduce((sum, item) => {
      const cost = getProductUnitCost(item);
      const qty = Number(item.quantity) || 0;
      return sum + cost * qty;
    }, 0);
  };

  const grandTotalValue = calculateGrandTotal();

  const ConfirmModalPortal = () => {
    if (!isMounted || !confirmModal.isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
          <div
            className={`p-5 flex items-center justify-between border-b border-slate-200 ${
              confirmModal.actionStatus === "APPROVED"
                ? "bg-emerald-50"
                : "bg-rose-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  confirmModal.actionStatus === "APPROVED"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                {confirmModal.actionStatus === "APPROVED" ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div>
                <h3
                  className={`text-base font-bold tracking-tight ${
                    confirmModal.actionStatus === "APPROVED"
                      ? "text-emerald-950"
                      : "text-rose-950"
                  }`}
                >
                  ยืนยันการ{confirmModal.actionStatus === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ"}รายการ
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-60">
                  {selectedSR?.srNumber}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  isOpen: false,
                  actionStatus: null,
                  id: null,
                })
              }
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-white rounded-md transition-colors border border-slate-200 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center gap-4 mb-6">
              <p className="text-sm font-bold text-slate-800 text-center leading-relaxed max-w-[280px] mx-auto">
                คุณแน่ใจหรือไม่ที่ต้องการ
                <br />
                <span
                  className={
                    confirmModal.actionStatus === "APPROVED"
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }
                >
                  {confirmModal.actionStatus === "APPROVED"
                    ? "อนุมัติพัสดุ"
                    : "ปฏิเสธและยกเลิก"}
                </span>{" "}
                ใบเบิกรายการนี้?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 w-full shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 text-center leading-relaxed">
                  การดำเนินการนี้จะถูกบันทึกลงในระบบ
                  <br />
                  เพื่อการตรวจสอบ (Audit Log) ทันที
                </p>
              </div>
            </div>

            {confirmModal.actionStatus === "APPROVED" && (
              <div className="mb-6 bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">
                  อนุมัติมูลค่าเบิกจ่าย
                </p>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                  ฿{grandTotalValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    actionStatus: null,
                    id: null,
                  })
                }
                className="py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={isActionLoading}
                onClick={executeAction}
                className={`py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 ${
                  confirmModal.actionStatus === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "ยืนยันดำเนินการ"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const SuccessModalPortal = () => {
    if (!isMounted || !showSuccessModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-emerald-100 p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={2.5} />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
            ทำรายการสำเร็จ!
          </h3>

          <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
            ระบบได้บันทึกข้อมูลการพิจารณา
            <br />
            ลงในฐานข้อมูลเรียบร้อยแล้ว
          </p>

          <button
            type="button"
            onClick={() => {
              setShowSuccessModal(false);
              setViewMode("LIST");
              setSelectedSR(null);
            }}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95"
          >
            กลับสู่หน้ารายการ
          </button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <ConfirmModalPortal />
      <SuccessModalPortal />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-6 print:hidden">
          <div className="flex flex-col gap-4">
            {viewMode === "DETAIL" && (
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors w-fit"
              >
                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
              </button>
            )}

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                <ClipboardCheck className="w-6 h-6 text-[#1F3B8B]" />
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {viewMode === "LIST" ? "คิวงานรออนุมัติ" : "รายละเอียดใบเบิก"}
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  Inventory Outbound Management & Approval
                </p>
              </div>
            </div>
          </div>
        </div>

        {viewMode === "LIST" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1F3B8B]" />
                รายการรอดำเนินการ (Pending Requests)
              </h2>

              <div className="hidden sm:block bg-slate-50 text-slate-500 border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider shadow-sm">
                <span className="text-[#1F3B8B] mr-1">
                  {requisitions.length}
                </span>
                รายการในระบบ
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="py-24 text-center flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                  <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">
                    กำลังซิงโครไนซ์ข้อมูล...
                  </p>
                </div>
              ) : requisitions.length === 0 ? (
                <div className="py-24 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-bold text-sm tracking-wide">
                    ไม่มีรายการใบเบิกค้างอนุมัติในขณะนี้
                  </p>
                </div>
              ) : (
                <table className="min-w-full text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-widest whitespace-nowrap">
                      <th className="py-4 px-6">เลขที่ใบเบิก (SR)</th>
                      <th className="py-4 px-6">ผู้ขอเบิก / แผนก</th>
                      <th className="py-4 px-6">วัตถุประสงค์</th>
                      <th className="py-4 px-6 text-center">วันที่ต้องการใช้</th>
                      <th className="py-4 px-6 text-center">ความเร่งด่วน</th>
                      <th className="py-4 px-6 text-center">ดำเนินการ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {requisitions.map((req) => {
                      const priority = getPriorityLabel(req.priority);

                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="p-5 whitespace-nowrap">
                            <span className="tabular-nums font-bold text-[#1F3B8B] text-sm tracking-tight transition-colors group-hover:text-blue-700">
                              {req.srNumber}
                            </span>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                              ส่งคำขอ: {formatThaiDate(req.createdAt)}
                            </p>
                          </td>

                          <td className="p-5">
                            <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">
                              {req.user?.firstName} {req.user?.lastName}
                            </p>
                            <span className="text-[10px] font-bold text-slate-500 border border-slate-200 px-2 py-1 rounded-md bg-white uppercase tracking-wide inline-flex mt-1.5">
                              {req.department?.name || "---"}
                            </span>
                          </td>

                          <td className="p-5 max-w-[320px]">
                            <p className="text-sm font-bold text-slate-700 line-clamp-2">
                              {req.purpose || "-"}
                            </p>
                            {req.deliveryLocation && (
                              <p className="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1 uppercase tracking-wider">
                                <MapPin className="w-3 h-3" />
                                {req.deliveryLocation}
                              </p>
                            )}
                          </td>

                          <td className="p-5 text-center text-sm font-bold text-slate-700 tabular-nums">
                            {formatThaiDate(req.requiredDate)}
                          </td>

                          <td className="p-5 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${priority.className}`}
                            >
                              {priority.text}
                            </span>
                          </td>

                          <td className="p-5 text-center">
                            <button
                              type="button"
                              onClick={() => handleSelectSR(req)}
                              className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#1F3B8B] hover:text-white bg-white border border-[#1F3B8B]/30 hover:border-[#1F3B8B] hover:bg-[#1F3B8B] px-4 py-2 rounded-lg transition-all uppercase tracking-widest shadow-sm active:scale-95"
                            >
                              ตรวจสอบข้อมูล <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {viewMode === "DETAIL" && selectedSR && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header Detail Info */}
              <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    เลขที่อ้างอิงใบเบิก (SR Number)
                  </span>
                  <h2 className="text-2xl font-bold text-[#1F3B8B] tabular-nums tracking-tight">
                    {selectedSR.srNumber}
                  </h2>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    วันที่ส่งคำขอเบิก
                  </p>
                  <p className="text-sm font-bold text-slate-900 flex items-center justify-end gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatThaiDate(selectedSR.createdAt)}
                  </p>
                </div>
              </div>

              {/* General Detail Grid */}
              <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 border-b border-slate-200">
                <DetailInfoItem
                  label="ผู้ขอเบิกพัสดุ"
                  value={`${selectedSR.user?.firstName || ""} ${selectedSR.user?.lastName || ""}`}
                  subValue={selectedSR.department?.name || "ส่วนกลาง"}
                />
                <DetailInfoItem
                  label="เลขอ้างอิงโครงการ"
                  value={selectedSR.referenceNo || "ไม่มีระบุ"}
                />
                <DetailInfoItem
                  label="วันที่ต้องการใช้งาน"
                  value={formatThaiDate(selectedSR.requiredDate)}
                />
                <DetailInfoItem
                  label="ความเร่งด่วน"
                  value={getPriorityLabel(selectedSR.priority).text}
                />
                <DetailInfoItem
                  label="สถานที่ส่งมอบ / จุดใช้งาน"
                  value={selectedSR.deliveryLocation || "ไม่ได้ระบุ"}
                />
                <DetailInfoItem
                  label="สถานะปัจจุบัน"
                  value="รอการพิจารณาอนุมัติ"
                />
              </div>

              {/* Purpose & Remarks */}
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    วัตถุประสงค์การใช้งาน
                  </p>
                  <p className="text-sm text-slate-900 font-bold leading-relaxed p-4 bg-white rounded-xl border border-slate-200">
                    {selectedSR.purpose || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    หมายเหตุ (Remarks)
                  </p>
                  <p className="text-sm text-slate-900 font-bold leading-relaxed p-4 bg-white rounded-xl border border-slate-200">
                    {selectedSR.remarks || "--- ไม่มีการระบุข้อมูลเพิ่มเติม ---"}
                  </p>
                </div>
              </div>

              {/* Item Details Card */}
              <div className="px-6 md:px-8 pb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#1F3B8B]" />
                  รายการพัสดุและมูลค่าเบิกจ่าย ทั้งหมด {selectedSR.items?.length || 0} รายการ
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-widest whitespace-nowrap">
                        <th className="p-4 text-center w-16">ลำดับ</th>
                        <th className="p-4 text-left">รายละเอียดพัสดุ (Product Name / SKU)</th>
                        <th className="p-4 text-right">ราคา/หน่วย</th>
                        <th className="p-4 text-center w-32">จำนวนเบิก</th>
                        <th className="p-4 text-right">รวมมูลค่า (Est.)</th>
                        <th className="p-4 text-left">หมายเหตุ</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(selectedSR.items || []).map((item, idx) => {
                        const unitCost = getProductUnitCost(item);
                        const rowTotal = unitCost * Number(item.quantity || 0);

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-center text-slate-500 font-bold tabular-nums text-sm">
                              {idx + 1}
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-900 text-sm">
                                {item.product?.name || "-"}
                              </p>
                              <p className="text-[10px] text-[#1F3B8B] font-bold uppercase mt-1 tracking-wider">
                                SKU: {item.product?.sku || "-"}
                              </p>
                            </td>
                            <td className="p-4 text-right tabular-nums font-bold text-slate-700 text-sm">
                              ฿{unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center">
                              <span className="px-3 py-1 bg-white rounded-md font-bold text-sm text-[#1F3B8B] border border-slate-200 tabular-nums">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="p-4 text-right tabular-nums font-bold text-slate-900 text-sm">
                              ฿{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-sm text-slate-600 font-medium">
                              {item.remark || <span className="text-slate-400 font-bold">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot className="bg-[#1F3B8B]/5 border-t border-slate-200">
                      <tr>
                        <td colSpan="4" className="p-5 text-right text-[11px] font-bold uppercase text-slate-600 tracking-widest">
                          มูลค่าประเมินรวมทั้งสิ้น (Grand Total)
                        </td>
                        <td className="p-5 text-right text-lg font-bold text-emerald-600 tabular-nums tracking-tight">
                          ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-slate-50 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-200">
                <div className="flex flex-col text-center md:text-left w-full md:w-auto">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center justify-center md:justify-start gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#1F3B8B]" />
                    สรุปมูลค่าการเบิกจ่ายรวม
                  </span>
                  <span className="text-2xl md:text-3xl font-bold text-emerald-600 tabular-nums tracking-tight">
                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        actionStatus: "REJECTED",
                        id: selectedSR.id,
                      })
                    }
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm disabled:opacity-50"
                  >
                    ไม่อนุมัติ (Reject)
                  </button>

                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        actionStatus: "APPROVED",
                        id: selectedSR.id,
                      })
                    }
                    className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ยืนยันการอนุมัติพัสดุ
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

function DetailInfoItem({ label, value, subValue }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        {label}
      </span>
      <span className="text-sm font-bold text-slate-900 line-clamp-2">
        {value || "-"}
      </span>
      {subValue && (
        <span className="text-[10px] font-bold text-[#1F3B8B] uppercase mt-1">
          {subValue}
        </span>
      )}
    </div>
  );
}