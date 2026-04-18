"use client";

import React, { useState, useEffect } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  Upload,
  PenTool,
  FileText,
  Clock,
  XCircle,
  FileCheck,
  UserCheck,
  BadgeCheck,
  Truck,
  User,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";

export default function ApprovePRPage() {
  const [viewMode, setViewMode] = useState("LIST");
  const [filterTab, setFilterTab] = useState("PENDING");
  const [isLoading, setIsLoading] = useState(false);

  const [prList, setPrList] = useState([]);
  const [selectedPRData, setSelectedPRData] = useState(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [signatureImage, setSignatureImage] = useState(null);

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveSuccessModalOpen, setIsApproveSuccessModalOpen] = useState(false); // 💡 เพิ่ม State ป็อปอัพอนุมัติสำเร็จ

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await apiFetch(`/api/purchase/pr?status=${filterTab}`);
        setPrList(data || []);
      } catch (error) {
        toast.error("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [filterTab, viewMode]);

  const handleSelectPRFromList = async (pr) => {
    setIsLoading(true);
    try {
      const prDetail = await apiFetch(`/api/purchase/pr/${pr.id}`);
      if (prDetail) {
        setSelectedPRData(prDetail);
        setApprovalComment("");
        setSignatureImage(null);
        setViewMode("FORM");
      }
    } catch (error) {
      toast.error("ไม่สามารถดึงข้อมูลรายละเอียดได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setSignatureImage(reader.result);
    reader.readAsDataURL(file);
  };

  const getBackendBaseUrl = () =>
    process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000";

  const postJsonWithAuth = async (path, payload) => {
    const token = typeof getAccessToken === "function" ? getAccessToken() : null;
    if (!token) {
      throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
    }

    const backendUrl = getBackendBaseUrl();
    const response = await fetch(`${backendUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      throw new Error(data?.message || `เกิดข้อผิดพลาด (${response.status})`);
    }

    return data;
  };

  const handleApproveAndGeneratePDF = async (e) => {
    if (e) e.preventDefault();
    setIsApproveModalOpen(false);

    if (!signatureImage) {
        return toast.error("กรุณาลงนามกำกับเอกสารก่อนทำการอนุมัติ");
    }

    if (!selectedPRData?.id) {
        return toast.error("ไม่พบข้อมูล PR ที่เลือก");
    }

    setIsLoading(true);
    try {
        toast.loading("กำลังประมวลผล สร้างเอกสารอนุมัติ PR (PDF)...", { id: "pr-approve" });

        const token = typeof getAccessToken === "function" ? getAccessToken() : null;
        if (!token) throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่อีกครั้ง");

        const backendUrl =
            process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000";

        const response = await fetch(
            `${backendUrl}/api/purchase/pr/${selectedPRData.id}/approve-pdf`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: "APPROVED",
                    comments: approvalComment || "",
                    signatureBase64: signatureImage,
                }),
            }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result?.message || `เกิดข้อผิดพลาด (${response.status})`);
        }

        toast.success("อนุมัติและสร้างเอกสาร PDF สำเร็จ!", { id: "pr-approve" });

        if (result?.pdfUrl) {
            await handleViewPDF(result.pdfUrl);
        }

        // 💡 เรียกใช้ป็อปอัพแจ้งเตือนว่าสำเร็จ แทนการตั้งเวลาสลับหน้าอัตโนมัติ
        setIsApproveSuccessModalOpen(true);

    } catch (error) {
        toast.error(error.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", { id: "pr-approve" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleReject = async (e) => {
    if (e) e.preventDefault();
    setIsRejectModalOpen(false);

    if (!approvalComment.trim()) {
        return toast.error("กรุณาระบุเหตุผลในการไม่อนุมัติในช่องหมายเหตุ");
    }

    if (!selectedPRData?.id) {
        return toast.error("ไม่พบข้อมูล PR ที่เลือก");
    }

    setIsLoading(true);
    try {
        const token = typeof getAccessToken === "function" ? getAccessToken() : null;
        if (!token) throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่อีกครั้ง");

        const backendUrl =
            process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000";

        const response = await fetch(
            `${backendUrl}/api/purchase/pr/${selectedPRData.id}/approve`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: "REJECTED",
                    comments: approvalComment.trim(),
                }),
            }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result?.message || `เกิดข้อผิดพลาด (${response.status})`);
        }

        toast.success("ปฏิเสธคำขอเรียบร้อยแล้ว");
        setViewMode("LIST");
        setFilterTab("PENDING");
    } catch (error) {
        toast.error(error.message || "ไม่สามารถปฏิเสธคำขอได้");
    } finally {
        setIsLoading(false);
    }
  };

  const handleViewPDF = async (pdfPath) => {
    if (!pdfPath) {
        return toast.error("ไม่พบไฟล์เอกสาร PDF สำหรับรายการนี้");
    }

    setIsLoading(true);
    toast.loading("กำลังเปิดเอกสาร...", { id: "pdf-load" });

    try {
        const backendUrl =
            process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000";

        const token = typeof getAccessToken === "function" ? getAccessToken() : null;
        if (!token) throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่อีกครั้ง");

        const rawPath = String(pdfPath).trim();
        let url = "";

        if (rawPath.includes("/api/purchase/pr/document/")) {
            url = rawPath.startsWith("http") ? rawPath : `${backendUrl}${rawPath}`;
        } else {
            const filename = rawPath.split(/[/\\\\]/).pop();

            if (!filename) {
                throw new Error("ไม่สามารถระบุชื่อไฟล์เอกสารได้");
            }

            url = `${backendUrl}/api/purchase/pr/document/${encodeURIComponent(filename)}`;
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            let msg = "คุณไม่มีสิทธิ์เข้าถึง หรือเอกสารสูญหาย";
            try {
                const err = await response.json();
                msg = err?.message || msg;
            } catch {}
            throw new Error(msg);
        }

        const blob = await response.blob();
        const fileURL = window.URL.createObjectURL(blob);
        window.open(fileURL, "_blank");
        toast.success("เปิดเอกสารสำเร็จ", { id: "pdf-load" });

        setTimeout(() => {
            window.URL.revokeObjectURL(fileURL);
        }, 60000);
    } catch (error) {
        toast.error(error.message || "เปิดเอกสารไม่สำเร็จ", { id: "pdf-load" });
    } finally {
        setIsLoading(false);
    }
  };

  const totalAmount =
    selectedPRData?.items?.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.estimatedPrice),
      0
    ) || 0;

  // ป้องกันการ Scroll เมื่อเปิด Popups
  useEffect(() => {
    if (isApproveModalOpen || isRejectModalOpen || isApproveSuccessModalOpen) {
        document.body.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isApproveModalOpen, isRejectModalOpen, isApproveSuccessModalOpen]);

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full">
            {viewMode === "FORM" && (
              <button
                onClick={() => setViewMode("LIST")}
                className="flex items-center gap-2 w-fit text-base font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
              </button>
            )}

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                  <FileCheck className="w-7 h-7 text-[#1F3B8B]" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                    {viewMode === "LIST" ? "อนุมัติใบขอซื้อ (PR)" : "พิจารณาอนุมัติเอกสาร"}
                  </h1>
                  <p className="text-base text-slate-500 mt-1.5 font-medium flex items-center gap-2">
                    <UserCheck className="w-4 h-4" /> Executive Purchase Requisition Approval • ระบบตรวจสอบและอนุมัติการจัดซื้อสำหรับผู้บริหาร
                  </p>
                </div>
              </div>

              {viewMode === "LIST" && (
                <div className="flex bg-slate-100 p-1.5 rounded-xl w-full xl:w-auto">
                  <button
                    onClick={() => setFilterTab("PENDING")}
                    className={`flex-1 xl:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                      filterTab === "PENDING"
                        ? "bg-white text-amber-600 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Clock className="w-4 h-4" /> รอพิจารณาอนุมัติ
                  </button>
                  <button
                    onClick={() => setFilterTab("APPROVED")}
                    className={`flex-1 xl:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                      filterTab === "APPROVED"
                        ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> ประวัติการอนุมัติแล้ว
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- LIST VIEW --- */}
        {viewMode === "LIST" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm ${filterTab === "PENDING" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                  {filterTab === "PENDING" ? <AlertCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <h2 className="text-lg font-bold text-slate-800 tracking-wide uppercase">
                  {filterTab === "PENDING" ? "รายการคำขอที่รอการดำเนินการ" : "รายการเอกสารที่ผ่านการอนุมัติแล้ว"}
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่ส่งคำขอ</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เลขที่ใบขอซื้อ (PR)</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ขอซื้อ / แผนก</th>
                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">กำลังโหลดข้อมูล...</p>
                        </div>
                      </td>
                    </tr>
                  ) : prList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-20 text-center text-slate-400 font-medium italic">
                        <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        ไม่มีข้อมูลในหมวดหมู่นี้
                      </td>
                    </tr>
                  ) : (
                    prList.map((pr) => (
                      <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-sm font-bold text-slate-500 tabular-nums">
                          {new Date(pr.createdAt).toLocaleDateString("th-TH")}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#1e3b8a] uppercase tracking-tight mb-0.5">
                              {pr.prNumber}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 truncate max-w-[250px] italic">
                              "{pr.purpose}"
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">
                              {pr.user?.firstName} {pr.user?.lastName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                              {pr.department?.name || "General"}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${
                              pr.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : pr.status === "REJECTED"
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : "bg-amber-50 text-amber-600 border-amber-200"
                            }`}
                          >
                            {pr.status === "PENDING"
                              ? "รออนุมัติ"
                              : pr.status === "APPROVED"
                              ? "อนุมัติแล้ว"
                              : "ปฏิเสธ"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {filterTab === "PENDING" ? (
                            <button
                              onClick={() => handleSelectPRFromList(pr)}
                              className="bg-white text-[#1F3B8B] border border-slate-200 hover:bg-[#1F3B8B] hover:text-white hover:border-[#1F3B8B] px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 inline-flex items-center justify-center ml-auto"
                            >
                              ตรวจสอบและอนุมัติ
                            </button>
                          ) : (
                            <button
                              onClick={() => handleViewPDF(pr.pdfPath)}
                              disabled={!pr.pdfPath}
                              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm ml-auto ${
                                pr.pdfPath
                                  ? "bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white active:scale-95"
                                  : "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
                              }`}
                            >
                              <FileText className="w-4 h-4" /> {pr.pdfPath ? "ดูเอกสาร PDF" : "ไม่มีเอกสาร"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- FORM VIEW --- */}
        {viewMode === "FORM" && selectedPRData && (
          <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Form */}
            <div className="p-8 md:p-10 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">เอกสารใบขออนุมัติจัดซื้อ (PR):</span>
                <h2 className="text-3xl md:text-4xl font-black text-[#1F3B8B] tabular-nums whitespace-nowrap">
                  {selectedPRData.prNumber}
                </h2>
              </div>
              <div className="flex flex-col items-start md:items-end justify-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1.5">วันที่ส่งคำขอ:</span>
                <p className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> {new Date(selectedPRData.createdAt).toLocaleDateString("th-TH")}
                </p>
              </div>
            </div>

            {/* ข้อมูลพื้นฐาน */}
            <div className="p-8 md:p-10 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              <div className="flex flex-col justify-center space-y-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">ผู้ขอซื้อ (Requester)</span>
                <span className="text-lg md:text-xl font-bold text-slate-900">{selectedPRData.user?.firstName} {selectedPRData.user?.lastName}</span>
              </div>
              
              <div className="flex flex-col justify-center space-y-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">แผนก (Cost Center)</span>
                <span className="text-lg md:text-xl font-bold text-slate-900">{selectedPRData.department?.name || "ไม่ระบุแผนก"}</span>
              </div>

              <div className="flex flex-col justify-center space-y-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">แนะนำคู่ค้า (Suggested Vendor)</span>
                {selectedPRData.supplier ? (
                  <span className="text-lg md:text-xl font-bold text-slate-900 truncate" title={selectedPRData.supplier.name}>{selectedPRData.supplier.name}</span>
                ) : (
                  <span className="text-lg md:text-xl font-bold text-slate-400 italic">ไม่ได้ระบุ (ให้จัดซื้อดำเนินการหาคู่ค้าเอง)</span>
                )}
              </div>
            </div>

            <div className="p-8 md:p-10 border-b border-slate-200">
              <div className="space-y-4">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">วัตถุประสงค์โครงการ (Purpose)</span>
                <p className="text-lg text-slate-800 font-semibold leading-relaxed p-6 bg-slate-50 rounded-xl border border-slate-100 italic">
                  "{selectedPRData.purpose || "-"}"
                </p>
              </div>
            </div>

            {/* รายการพัสดุ */}
            <div className="px-8 md:px-10 py-8 md:py-10 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-6">
                  รายการพัสดุ
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-sm font-bold uppercase text-slate-600">
                      <th className="p-5 text-left">รายการพัสดุ / SKU</th>
                      <th className="p-5 text-center w-32">จำนวน</th>
                      <th className="p-5 text-right">ราคาประเมิน/หน่วย</th>
                      <th className="p-5 text-right">รวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPRData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5">
                          <p className="font-bold text-slate-900 text-lg">{item.product?.name || "ไม่ทราบชื่อสินค้า"}</p>
                          <p className="text-sm text-blue-600 font-bold uppercase mt-1">SKU: {item.product?.sku || "N/A"}</p>
                        </td>
                        <td className="p-5 text-center">
                          <span className="px-4 py-1.5 bg-slate-100 rounded-md font-bold text-[#1F3B8B] text-lg">{item.quantity}</span>
                        </td>
                        <td className="p-5 text-right tabular-nums font-semibold text-slate-700 text-lg">
                          ฿{Number(item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-5 text-right tabular-nums font-bold text-slate-900 text-lg">
                          ฿{(item.quantity * item.estimatedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#1F3B8B]/5">
                    <tr>
                      <td colSpan="3" className="p-6 text-right text-sm font-bold uppercase tracking-widest text-slate-600">
                        มูลค่าประเมินรวมทั้งสิ้น (Total Amount)
                      </td>
                      <td className="p-6 text-right font-black text-2xl md:text-3xl text-[#1e3b8a] tabular-nums">
                        ฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ส่วนพิจารณาและลายเซ็น */}
            <div className="p-8 md:p-10 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    ความเห็น/หมายเหตุเพิ่มเติม (ผู้อนุมัติ)
                  </label>
                  <textarea
                    className="w-full bg-white border border-slate-200 rounded-xl p-5 text-base font-medium text-slate-700 outline-none focus:border-[#1F3B8B] min-h-[180px] transition-all shadow-sm placeholder:text-slate-300"
                    placeholder="ระบุข้อความถึงฝ่ายจัดซื้อ หรือเหตุผลที่ไม่อนุมัติ..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    ลายเซ็นผู้อนุมัติ (Signature) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative h-[180px]">
                    {signatureImage ? (
                      <div className="w-full h-full border-2 border-dashed border-emerald-400 rounded-xl bg-white p-4 flex items-center justify-center relative overflow-hidden group shadow-sm">
                        <img
                          src={signatureImage}
                          alt="Signature"
                          className="max-h-full object-contain mix-blend-multiply"
                        />
                        <button
                          type="button"
                          onClick={() => setSignatureImage(null)}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-rose-500 hover:bg-rose-600 text-white text-[11px] px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition-all shadow-md"
                        >
                          ลบทิ้ง
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-full border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center cursor-pointer hover:border-[#1F3B8B] hover:bg-[#1F3B8B]/5 transition-all group shadow-sm">
                        <Upload className="w-8 h-8 text-slate-300 group-hover:text-[#1F3B8B] mb-3 transition-colors" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-[#1F3B8B]">
                          อัปโหลดลายเซ็น
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-end gap-4 pt-10 mt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={isLoading}
                  className="px-8 bg-white border border-rose-200 hover:bg-rose-50 text-rose-500 py-3.5 rounded-lg font-bold text-sm uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                >
                  ไม่อนุมัติ (REJECT)
                </button>
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(true)}
                  disabled={isLoading || !signatureImage}
                  className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-lg font-bold text-sm uppercase tracking-widest shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> ยืนยันการอนุมัติพัสดุ
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Modal ยืนยันก่อนกดอนุมัติ */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full shadow-inner border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wider">ยืนยันการอนุมัติ</h3>
                <p className="text-sm font-bold text-slate-500">
                  คุณต้องการอนุมัติคำขอจัดซื้อนี้และสร้างเอกสาร PDF ใช่หรือไม่?<br/>
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="flex-1 px-4 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-widest transition-colors shadow-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApproveAndGeneratePDF}
                className="flex-1 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm uppercase tracking-widest transition-colors shadow-sm"
              >
                ยืนยันอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal อนุมัติสำเร็จ! */}
      {isApproveSuccessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center max-w-sm w-full border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-wider">อนุมัติเสร็จสิ้น!</h3>
            <div className="text-sm font-bold text-slate-500 text-center mb-8 space-y-1">
              <p>ระบบได้ทำการบันทึกการอนุมัติเรียบร้อยแล้ว</p>
              <p>และสร้างเอกสาร PDF อ้างอิงเข้าระบบสำเร็จ</p>
            </div>
            <button
              onClick={() => {
                setIsApproveSuccessModalOpen(false);
                setViewMode("LIST");
                setFilterTab("APPROVED");
              }}
              className="w-full px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm uppercase tracking-widest transition-colors shadow-sm active:scale-95"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal ปฏิเสธคำขอ */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              <div className="p-4 bg-rose-100 text-rose-600 rounded-full shadow-inner border border-rose-200">
                <XCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wider">ปฏิเสธคำขอ</h3>
                <p className="text-sm font-bold text-slate-500">
                  คุณแน่ใจหรือไม่ที่จะปฏิเสธใบคำขอนี้?<br/>
                  กรุณาตรวจสอบให้แน่ใจว่าคุณได้กรอกเหตุผลในช่องหมายเหตุแล้ว
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 px-4 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-widest transition-colors shadow-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm uppercase tracking-widest transition-colors shadow-sm"
              >
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  );
}