"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { createPortal } from "react-dom";
import { getAccessToken } from "@/lib/auth";
import {
  ArrowLeft,
  Database,
  FileText,
  CheckCircle2,
  Package,
  ClipboardCheck,
  Clock,
  ShieldCheck,
  FileCheck,
  PackagePlus,
  Loader2,
  AlertCircle,
} from "lucide-react";

function createDefaultItem() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    productId: "",
    warehouseId: "",
    zoneId: "",
    locationId: "",
    quantity: 1,
    unitCost: 0,
    orderedQuantity: 0,
    receivedQuantity: 0,
    remainingQuantity: 0,
    sku: "",
    name: "",
    isLotManaged: true,
    lotId: "",
    lotNumber: generateLotNumber(),
    mfgDate: "",
    expDate: "",
  };
}

function generateReceiptNo() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `GR-${date}-${rand}`;
}

function generateLotNumber() {
  const d = new Date();

  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `LOT-${yy}${mm}${dd}-${rand}`;
}

export default function CreateGoodsReceiptPage() {
  const [viewMode, setViewMode] = useState("LIST");
  const [filterTab, setFilterTab] = useState("PENDING");
  const [isMounted, setIsMounted] = useState(false);

  const [pendingPOs, setPendingPOs] = useState([]);
  const [completedGRs, setCompletedGRs] = useState([]);

  const [warehouses, setWarehouses] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);

  const [receiptNo, setReceiptNo] = useState(generateReceiptNo());
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [selectedPO, setSelectedPO] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState([createDefaultItem()]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);

  const loadInitialData = async () => {
    try {
      const [w, z, l, poList, grList] = await Promise.all([
        apiFetch("/master/warehouses").catch(() => []),
        apiFetch("/master/zones").catch(() => []),
        apiFetch("/master/locations").catch(() => []),
        apiFetch("/inventory/pos").catch(() => []),
        apiFetch("/inventory/receipt").catch(() => []),
      ]);

      setWarehouses(Array.isArray(w) ? w : w?.data || []);
      setZones(Array.isArray(z) ? z : z?.data || []);
      setLocations(Array.isArray(l) ? l : l?.data || []);

      const validIncomingPOs = (
        Array.isArray(poList) ? poList : poList?.data || []
      ).filter(
        (po) =>
          po.pdfPath &&
          po.pdfPath !== "PENDING" &&
          ["ORDERED", "SHIPPED", "PARTIAL", "URGENT"].includes(po.status)
      );

      setPendingPOs(validIncomingPOs);
      setCompletedGRs(Array.isArray(grList) ? grList : grList?.data || []);
    } catch (error) {
      toast.error("โหลดข้อมูลระบบไม่สำเร็จ");
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadInitialData();
  }, []);

  useEffect(() => {
    if (successModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [successModal]);

  const cleanupPdfUrl = () => {
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  };

  const handleSelectPO = async (po) => {
    setPurchaseOrderId(po.id);
    setIsSubmitting(true);
    cleanupPdfUrl();

    try {
      const poData = await apiFetch(`/inventory/pos/${po.id}`);
      setSelectedPO(poData);

      const poItems = Array.isArray(poData?.items) ? poData.items : [];

      const matchedItems = poItems
        .filter(
          (pi) => Number(pi.receivedQuantity) < Number(pi.orderedQuantity)
        )
        .map((pi) => {
          const product = pi.product || {};
          const remainingQty =
            Number(pi.orderedQuantity) - Number(pi.receivedQuantity);

          const unitCost = Number(pi.unitPrice) || 0;

          return {
            id: pi.id || `${Date.now()}-${Math.random()}`,
            productId: pi.productId || "",
            warehouseId: "",
            zoneId: "",
            locationId: "",
            quantity: remainingQty,
            remainingQuantity: remainingQty,
            unitCost,
            sku: product.sku || "",
            name: product.name || "",
            orderedQuantity: Number(pi.orderedQuantity) || 0,
            receivedQuantity: Number(pi.receivedQuantity) || 0,

            // ✅ ให้รับเข้าทุกครั้งแบบมีล็อต เพื่อแยกราคาซื้อแต่ละรอบ
            isLotManaged: true,
            lotId: "",
            lotNumber: generateLotNumber(),
            mfgDate: "",
            expDate: "",
          };
        });

      setItems(matchedItems.length > 0 ? matchedItems : [createDefaultItem()]);

      if (po.pdfPath) {
        const rawPath = String(po.pdfPath).trim();
        const backendUrl =
          process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
          "http://localhost:4000";

        let url = "";

        if (rawPath.includes("/api/purchase/po/document/")) {
          url = rawPath.startsWith("http")
            ? rawPath
            : `${backendUrl}${rawPath}`;
        } else {
          const filename = rawPath.split(/[/\\\\]/).pop();
          if (filename) {
            url = `${backendUrl}/api/purchase/po/document/${encodeURIComponent(
              filename
            )}`;
          }
        }

        if (url) {
          const token =
            typeof getAccessToken === "function" ? getAccessToken() : null;

          fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) =>
              res.ok
                ? res.blob()
                : Promise.reject(new Error("โหลด PDF ไม่สำเร็จ"))
            )
            .then((blob) => setPdfBlobUrl(window.URL.createObjectURL(blob)))
            .catch(() => console.error("Error loading inline PDF"));
        }
      }

      setHasSubmittedForm(false);
      setViewMode("FORM");
      toast.success(`กำลังตรวจรับสินค้า PO: ${po.poNumber}`);
    } catch (error) {
      toast.error("ไม่สามารถดึงข้อมูลรายการสินค้าได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPDF = async (pdfPath, type = "PO") => {
    if (!pdfPath) return toast.error("ไม่พบข้อมูลไฟล์เอกสาร");

    const toastId = toast.loading(`กำลังเปิดเอกสาร ${type}...`);

    try {
      const rawPath = String(pdfPath).trim();
      const backendUrl = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      ).replace("/api", "");

      let url = "";

      if (
        rawPath.includes("/api/purchase/po/document/") ||
        rawPath.includes("/inventory/receipt/document/")
      ) {
        url = rawPath.startsWith("http") ? rawPath : `${backendUrl}${rawPath}`;
      } else {
        const filename = rawPath.split(/[/\\\\]/).pop();

        if (!filename) {
          throw new Error("ไม่สามารถระบุชื่อไฟล์เอกสารได้");
        }

        if (type === "PO") {
          url = `${backendUrl}/api/purchase/po/document/${encodeURIComponent(
            filename
          )}`;
        } else {
          url = `${backendUrl}/inventory/receipt/document/${encodeURIComponent(
            filename
          )}`;
        }
      }

      const token =
        typeof getAccessToken === "function" ? getAccessToken() : null;

      if (!token) throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่อีกครั้ง");

      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        let msg = "เข้าถึงเอกสารไม่ได้ (อาจยังไม่มีไฟล์บนเซิร์ฟเวอร์)";
        try {
          const err = await response.json();
          msg = err?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, "_blank");
      toast.success("เปิดเอกสารสำเร็จ", { id: toastId });

      setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
    } catch (error) {
      toast.error(error.message || "เปิดเอกสารไม่สำเร็จ", { id: toastId });
    }
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        if (field === "warehouseId") {
          updated.zoneId = "";
          updated.locationId = "";
        }

        if (field === "zoneId") {
          updated.locationId = "";
        }

        if (field === "quantity") {
          const val = parseInt(value, 10) || 0;

          if (val > Number(item.remainingQuantity)) {
            toast.error(`รับเกินจำนวนค้างรับ (${item.remainingQuantity})`);
            updated.quantity = Number(item.remainingQuantity);
          } else {
            updated.quantity = val < 0 ? 0 : val;
          }
        }

        return updated;
      })
    );
  };

  const getAvailableZones = (whId) =>
    zones.filter((z) => String(z.warehouseId) === String(whId));

  const getAvailableLocations = (item) =>
    locations.filter((loc) => {
      if (item.zoneId) return String(loc.zoneId) === String(item.zoneId);
      if (item.warehouseId)
        return String(loc.warehouseId) === String(item.warehouseId);
      return false;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmittedForm(true);

    const receivingItems = items.filter((it) => Number(it.quantity) > 0);

    if (receivingItems.length === 0) {
      return toast.error("กรุณาระบุจำนวนสินค้าที่ต้องการรับอย่างน้อย 1 รายการ");
    }

    let isInvalid = false;
    let isLotInvalid = false;

    for (const it of receivingItems) {
      if (!it.warehouseId || !it.locationId) {
        isInvalid = true;
      }

      // ✅ บังคับเลขล็อตเท่านั้น ไม่บังคับ EXP
      if (it.isLotManaged && !String(it.lotNumber || "").trim()) {
        isLotInvalid = true;
      }
    }

    if (isInvalid) {
      return toast.error("กรุณาระบุคลังสินค้าและตำแหน่งจัดเก็บให้ครบถ้วน");
    }

    if (isLotInvalid) {
      return toast.error("กรุณาระบุเลขล็อตให้ครบถ้วน");
    }

    setIsSubmitting(true);

    try {
      toast.loading("กำลังอัปเดตสต๊อกและสร้างใบ GR...", {
        id: "gr-submit",
      });

      const payload = {
        receiptNo,
        purchaseOrderId,
        remarks: remarks.trim(),
        items: receivingItems.map((it) => ({
          productId: it.productId,
          locationId: it.locationId,
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost) || 0,
          lotId: it.lotId || null,
          lotNumber: it.isLotManaged ? String(it.lotNumber || "").trim() : null,
          mfgDate: it.isLotManaged && it.mfgDate ? it.mfgDate : null,

          // ✅ สำคัญ: ถ้าไม่กรอก EXP ให้ส่ง null ไม่ใช่ ""
          expDate: it.isLotManaged && it.expDate ? it.expDate : null,
        })),
      };

      const response = await apiFetch("/inventory/receipt", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("บันทึกรับสินค้าเข้าคลังสำเร็จ!", { id: "gr-submit" });

      if (response && response.pdfUrl) {
        setGeneratedPdfUrl(response.pdfUrl);
      }

      setSuccessModal(true);
    } catch (error) {
      toast.error(error.message || "บันทึกรับสินค้าไม่สำเร็จ", {
        id: "gr-submit",
      });
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    cleanupPdfUrl();
    setViewMode("LIST");
  };

  const totalQty = useMemo(
    () => items.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0),
    [items]
  );

  const SuccessPortal = () => {
    if (!isMounted || !successModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center max-w-sm w-full border border-slate-200 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wider">
            บันทึกรับสินค้าสำเร็จ!
          </h3>

          <p className="text-sm font-bold text-slate-500 text-center mb-8">
            ระบบได้อัปเดตสต๊อกสินค้าเรียบร้อยแล้ว
            <br />
            คลิกตกลงเพื่อเปิดใบ GR และกลับสู่หน้าหลัก
          </p>

          <button
            onClick={() => {
              setSuccessModal(false);

              if (generatedPdfUrl) {
                handleViewPDF(generatedPdfUrl, "GR");
              }

              setReceiptNo(generateReceiptNo());
              loadInitialData();
              setViewMode("LIST");
              setFilterTab("COMPLETED");
              setIsSubmitting(false);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-lg font-bold text-sm uppercase tracking-widest shadow-sm transition-colors active:scale-95"
          >
            ตกลง
          </button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <SuccessPortal />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full">
            {viewMode === "FORM" && (
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 w-fit text-base font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
              </button>
            )}

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                  <PackagePlus className="w-7 h-7 text-[#1F3B8B]" />
                </div>

                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                    {viewMode === "LIST"
                      ? "การตรวจรับสินค้าเข้าคลัง"
                      : "บันทึกใบรับสินค้า (GR)"}
                  </h1>

                  <p className="text-base text-slate-500 mt-1.5 font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Inbound Supply Chain Process •
                    ระบบตรวจรับสินค้าเข้าคลังและอัปเดตสต๊อก
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
                    <Clock className="w-4 h-4" />
                    รอรับเข้าคลัง ({pendingPOs.length})
                  </button>

                  <button
                    onClick={() => setFilterTab("COMPLETED")}
                    className={`flex-1 xl:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                      filterTab === "COMPLETED"
                        ? "bg-white text-[#1F3B8B] shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    ประวัติรับของ (GR) ({completedGRs.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LIST VIEW */}
        {viewMode === "LIST" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm ${
                    filterTab === "PENDING"
                      ? "bg-amber-50 text-amber-600 border-amber-100"
                      : "bg-indigo-50 text-indigo-600 border-indigo-100"
                  }`}
                >
                  {filterTab === "PENDING" ? (
                    <Package className="w-5 h-5" />
                  ) : (
                    <FileCheck className="w-5 h-5" />
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-800 tracking-wide uppercase">
                  {filterTab === "PENDING"
                    ? "รายการใบสั่งซื้อที่รอการส่งมอบ"
                    : "รายการตรวจรับสินค้าที่ดำเนินการเสร็จสิ้น"}
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      เอกสารอ้างอิง (PO/GR)
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {filterTab === "PENDING"
                        ? "ผู้จัดจำหน่าย (Vendor)"
                        : "ผู้รับสินค้า / หมายเหตุ"}
                    </th>
                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                      ดำเนินการ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white/50">
                  {filterTab === "PENDING" ? (
                    pendingPOs.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="py-20 text-center text-slate-400 font-medium italic"
                        >
                          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                          ไม่มีใบสั่งซื้อรอรับของ
                        </td>
                      </tr>
                    ) : (
                      pendingPOs.map((po) => (
                        <tr
                          key={po.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="py-4 px-6 text-sm font-bold text-slate-500 tabular-nums">
                            {new Date(po.createdAt).toLocaleDateString("th-TH")}
                          </td>

                          <td className="py-4 px-6">
                            <span className="text-sm font-bold text-[#1e3b8a] uppercase tracking-tight">
                              {po.poNumber}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 uppercase">
                                {po.vendorName}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                Logistic Inbound
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center">
                            <span
                              className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center justify-center gap-1.5 w-fit mx-auto ${
                                po.status === "PARTIAL"
                                  ? "bg-orange-50 text-orange-600 border-orange-100"
                                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
                              }`}
                            >
                              {po.status === "PARTIAL"
                                ? "รับแล้วบางส่วน"
                                : "รอรับของ"}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => handleViewPDF(po.pdfPath, "PO")}
                                className="bg-white border border-slate-200 text-[#1F3B8B] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                              >
                                <FileText className="w-4 h-4" />
                                ดู PO
                              </button>

                              <button
                                onClick={() => handleSelectPO(po)}
                                className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 shadow-sm flex items-center gap-2 transition-all active:scale-95"
                              >
                                <ClipboardCheck className="w-4 h-4" />
                                เริ่มตรวจรับ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : completedGRs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-20 text-center text-slate-400 font-medium italic"
                      >
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        ยังไม่มีประวัติการรับสินค้า
                      </td>
                    </tr>
                  ) : (
                    completedGRs.map((gr) => (
                      <tr
                        key={gr.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-4 px-6 text-sm font-bold text-slate-500 tabular-nums">
                          {new Date(gr.createdAt).toLocaleDateString("th-TH")}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-emerald-600 uppercase tracking-tight">
                              {gr.receiptNo}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                              PO: {gr.purchaseOrder?.poNumber || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 uppercase">
                              {gr.user?.firstName} {gr.user?.lastName}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[250px] italic mt-0.5">
                              "{gr.remarks || "ตรวจรับครบถ้วน"}"
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-center">
                          <span className="px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center justify-center gap-1.5 w-fit mx-auto bg-emerald-50 text-emerald-600 border-emerald-100">
                            สำเร็จ
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleViewPDF(gr.pdfPath, "GR")}
                            disabled={!gr.pdfPath}
                            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
                              gr.pdfPath
                                ? "bg-white text-[#1F3B8B] border border-slate-200 hover:border-[#1F3B8B] hover:bg-[#1F3B8B] hover:text-white active:scale-95"
                                : "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            ดูใบ GR
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FORM VIEW */}
        {viewMode === "FORM" && (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500"
          >
            <div className="p-8 md:p-10 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  เลขที่ใบรับสินค้า (GR Number):
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-[#1F3B8B] tabular-nums whitespace-nowrap">
                  {receiptNo}
                </h2>
              </div>

              <div className="flex flex-col items-start md:items-end justify-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  อ้างอิงใบสั่งซื้อ (PO Number):
                </span>
                <p className="text-lg md:text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                  {selectedPO?.poNumber}
                </p>
                <p className="text-sm font-bold text-emerald-600 uppercase mt-0.5">
                  {selectedPO?.vendorName}
                </p>
              </div>
            </div>

            <div className="px-8 md:px-10 py-10 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-6">
                รายการพัสดุและตำแหน่งจัดเก็บ (Items & Storage)
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1350px]">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr className="text-sm font-bold text-slate-600 uppercase tracking-widest">
                      <th className="p-5 text-left">พัสดุ / SKU</th>
                      <th className="p-5 text-left w-[28%]">
                        ล็อต / วันผลิต / วันหมดอายุ
                      </th>
                      <th className="p-5 text-left w-[22%]">
                        คลัง / โซน <span className="text-rose-500">*</span>
                      </th>
                      <th className="p-5 text-left w-[22%]">
                        ตำแหน่ง (Location){" "}
                        <span className="text-rose-500">*</span>
                      </th>
                      <th className="p-5 text-center w-28">ค้างรับ</th>
                      <th className="p-5 text-right w-36">ต้นทุน/หน่วย</th>
                      <th className="p-5 text-center w-48 whitespace-nowrap">
                        จำนวนที่รับจริง <span className="text-rose-500">*</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="p-5 align-top">
                          <p className="font-bold text-slate-900 text-lg">
                            {item.name}
                          </p>
                          <p className="text-sm text-blue-600 font-bold uppercase mt-1 tabular-nums">
                            SKU: {item.sku}
                          </p>
                          <span className="inline-flex mt-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border bg-blue-50 text-blue-700 border-blue-200">
                            LOT MANAGED
                          </span>
                        </td>

                        <td className="p-5 align-top">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                เลขล็อต <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={item.lotNumber}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "lotNumber",
                                    e.target.value
                                  )
                                }
                                className={`w-full border rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:border-[#1F3B8B] ${
                                  hasSubmittedForm &&
                                  !String(item.lotNumber || "").trim()
                                    ? "border-rose-400 bg-rose-50 text-rose-900"
                                    : "border-slate-300 bg-white text-slate-800"
                                }`}
                                placeholder="เช่น LOT-260424-1234"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  MFG
                                </label>
                                <input
                                  type="date"
                                  value={item.mfgDate || ""}
                                  onChange={(e) =>
                                    updateItem(item.id, "mfgDate", e.target.value)
                                  }
                                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-[#1F3B8B]"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  EXP
                                </label>
                                <input
                                  type="date"
                                  value={item.expDate || ""}
                                  onChange={(e) =>
                                    updateItem(item.id, "expDate", e.target.value)
                                  }
                                  className="w-full border border-slate-300 bg-white text-slate-800 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-[#1F3B8B]"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                updateItem(
                                  item.id,
                                  "lotNumber",
                                  generateLotNumber()
                                )
                              }
                              className="text-[11px] font-black text-[#1F3B8B] hover:underline w-fit"
                            >
                              สร้างเลขล็อตใหม่อัตโนมัติ
                            </button>
                          </div>
                        </td>

                        <td className="p-5 align-top">
                          <div className="flex flex-col gap-3">
                            <select
                              value={item.warehouseId}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "warehouseId",
                                  e.target.value
                                )
                              }
                              className={`border rounded-lg px-3.5 py-3 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-white transition-all w-full cursor-pointer ${
                                hasSubmittedForm && !item.warehouseId
                                  ? "border-rose-400 bg-rose-50"
                                  : "border-slate-300"
                              }`}
                            >
                              <option value="">-- เลือกคลังสินค้า --</option>
                              {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}
                                </option>
                              ))}
                            </select>

                            <select
                              value={item.zoneId}
                              onChange={(e) =>
                                updateItem(item.id, "zoneId", e.target.value)
                              }
                              disabled={!item.warehouseId}
                              className={`border rounded-lg px-3.5 py-3 text-sm font-bold outline-none transition-all w-full cursor-pointer disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 ${
                                item.zoneId
                                  ? "border-slate-300"
                                  : "border-slate-200 text-slate-500"
                              }`}
                            >
                              <option value="">-- เลือกโซน (ถ้ามี) --</option>
                              {getAvailableZones(item.warehouseId).map((z) => (
                                <option key={z.id} value={z.id}>
                                  {z.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="p-5 align-top">
                          <select
                            value={item.locationId}
                            onChange={(e) =>
                              updateItem(item.id, "locationId", e.target.value)
                            }
                            disabled={!item.warehouseId}
                            className={`w-full border rounded-lg px-3.5 py-3 text-sm font-bold outline-none focus:border-[#1F3B8B] transition-all cursor-pointer disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 ${
                              hasSubmittedForm && !item.locationId
                                ? "border-rose-400 bg-rose-50 text-slate-900"
                                : item.locationId
                                  ? "border-slate-300 text-slate-900"
                                  : "border-slate-200 text-slate-500"
                            }`}
                          >
                            <option value="">-- ระบุจุดเก็บ --</option>
                            {getAvailableLocations(item).map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name || l.code}
                              </option>
                            ))}
                          </select>

                          {hasSubmittedForm && !item.locationId && (
                            <span className="text-[11px] font-bold text-rose-500 mt-1 block">
                              กรุณาเลือกระบุจุดเก็บ
                            </span>
                          )}
                        </td>

                        <td className="p-5 text-center font-bold text-slate-400 text-lg tabular-nums align-top">
                          {item.remainingQuantity}
                        </td>

                        <td className="p-5 text-right font-black text-slate-800 tabular-nums align-top whitespace-nowrap">
                          ฿
                          {Number(item.unitCost || 0).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 }
                          )}
                        </td>

                        <td className="p-5 align-top">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, "quantity", e.target.value)
                            }
                            className={`w-full border-2 rounded-lg py-3 text-center font-bold text-lg outline-none transition-all tabular-nums ${
                              hasSubmittedForm && Number(item.quantity) <= 0
                                ? "border-rose-400 bg-rose-50 text-rose-900"
                                : "border-emerald-500 bg-emerald-50 text-emerald-900 focus:ring-4 focus:ring-emerald-100"
                            }`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-8 md:p-10 bg-slate-50 flex flex-col gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    หมายเหตุการตรวจรับ (Remarks)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows="3"
                    className="w-full border rounded-lg bg-white p-4 text-base font-medium text-slate-700 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 transition-all resize-none placeholder:text-slate-400 shadow-sm"
                    placeholder="ระบุสภาพสินค้าหรือปัญหาที่พบ..."
                  />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-12">
                  <div className="flex flex-col items-center md:items-start w-full">
                    <p className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-1">
                      ยอดรับรวมทั้งสิ้น
                    </p>
                    <p className="text-4xl font-black text-[#1F3B8B] tabular-nums flex items-baseline gap-1.5">
                      {totalQty}
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Units
                      </span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full md:w-auto min-w-[240px] bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-bold text-sm uppercase tracking-widest shadow-sm transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>ยืนยันการรับสินค้า</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </AuthGate>
  );
}