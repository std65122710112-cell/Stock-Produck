"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  ClipboardPenLine,
  ArrowLeft,
  FileText,
  Loader2,
} from "lucide-react";

function generateSRNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SR-${date}-${rand}`;
}

function createDefaultItem() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    productId: "",
    quantity: 1,
    remark: "",
  };
}

function normalizeApiList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.products)) return res.products;
  if (Array.isArray(res?.rows)) return res.rows;
  return [];
}

function mergeProductsFromBalances(products, balances) {
  const map = new Map();

  for (const p of products || []) {
    if (p?.id) {
      map.set(p.id, p);
    }
  }

  for (const b of balances || []) {
    const p = b?.product;
    if (!p?.id) continue;

    const existing = map.get(p.id) || {};

    map.set(p.id, {
      ...p,
      ...existing,

      id: existing.id || p.id,
      sku: existing.sku || p.sku,
      name: existing.name || p.name,

      unit: existing.unit || p.unit,
      unitName: existing.unitName || p.unitName,

      unitCost:
        Number(existing.unitCost || 0) > 0 ? existing.unitCost : p.unitCost,

      price: Number(existing.price || 0) > 0 ? existing.price : p.price,

      standardCost:
        Number(existing.standardCost || 0) > 0
          ? existing.standardCost
          : p.standardCost,

      displaySku:
        existing.displaySku || p.displaySku || b.warehouseSku || b.displaySku,

      warehouseSku: existing.warehouseSku || b.warehouseSku || p.warehouseSku,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    String(a.sku || "").localeCompare(String(b.sku || ""))
  );
}

function isSameProduct(balanceRow, productId, product) {
  if (!balanceRow || !productId) return false;

  return (
    balanceRow.productId === productId ||
    balanceRow?.product?.id === productId ||
    (product?.sku && balanceRow?.product?.sku === product.sku)
  );
}

function buildBackendFileUrl(pdfUrl) {
  const raw = String(pdfUrl || "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  ).replace(/\/+$/, "");

  const backendRoot = apiBase.replace(/\/api$/, "");

  if (raw.startsWith("/api/")) {
    return `${backendRoot}${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${apiBase}${raw}`;
  }

  return `${apiBase}/${raw}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CreateStockRequisitionPage() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);

  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [createdSrNumber, setCreatedSrNumber] = useState("");

  const [errors, setErrors] = useState({});

  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);

  const [formData, setFormData] = useState({
    srNumber: generateSRNumber(),
    purpose: "",
    departmentId: "",
    priority: "NORMAL",
    requiredDate: "",
    referenceNo: "",
    deliveryLocation: "",
    remarks: "",
  });

  const [items, setItems] = useState([createDefaultItem()]);

  useEffect(() => {
    setIsMounted(true);

    async function loadInitialData() {
      try {
        const [pRes, dRes, bRes] = await Promise.all([
          apiFetch("/master/products").catch((err) => {
            console.error("Load products failed:", err);
            toast.error("โหลดรายการสินค้าไม่สำเร็จ");
            return [];
          }),

          apiFetch("/master/departments").catch((err) => {
            console.error("Load departments failed:", err);
            return [];
          }),

          apiFetch("/inventory/balances?limit=500").catch((err) => {
            console.error("Load stock balances failed:", err);
            toast.error("โหลดข้อมูลคงเหลือไม่สำเร็จ อาจทำให้คงเหลือขึ้น 0");
            return [];
          }),
        ]);

        const productList = normalizeApiList(pRes);
        const departmentList = normalizeApiList(dRes);
        const balanceList = normalizeApiList(bRes);

        setProducts(mergeProductsFromBalances(productList, balanceList));
        setDepartments(departmentList);
        setStockBalances(balanceList);
      } catch (error) {
        toast.error("ระบบขัดข้อง: ไม่สามารถโหลดข้อมูลมาสเตอร์ได้");
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    if (confirmSubmitModal || showSuccessModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [confirmSubmitModal, showSuccessModal]);

  const getProduct = (productId) => {
    if (!productId) return null;
    return products.find((p) => p.id === productId) || null;
  };

  const getAvailableStock = (productId) => {
    const product = getProduct(productId);
    if (!productId) return 0;

    return stockBalances
      .filter((b) => isSameProduct(b, productId, product))
      .reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  };

  const getProductPrice = (productId) => {
    const product = getProduct(productId);
    if (!productId || !product) return 0;

    const masterPrice =
      Number(product.unitCost || 0) ||
      Number(product.price || 0) ||
      Number(product.standardCost || 0);

    if (masterPrice > 0) {
      return masterPrice;
    }

    const balanceRows = stockBalances.filter((b) =>
      isSameProduct(b, productId, product)
    );

    const availableCosts = balanceRows
      .map((b) => {
        return (
          Number(b.unitCost || 0) ||
          Number(b?.lot?.unitCost || 0) ||
          Number(b?.product?.unitCost || 0) ||
          Number(b?.product?.price || 0) ||
          0
        );
      })
      .filter((cost) => cost > 0);

    if (availableCosts.length > 0) {
      return Math.min(...availableCosts);
    }

    return 0;
  };

  const getProductUnit = (productId) => {
    const product = getProduct(productId);
    return product?.unit?.name || product?.unitName || "หน่วย";
  };

  const grandTotalValue = items.reduce((sum, item) => {
    return sum + getProductPrice(item.productId) * (Number(item.quantity) || 0);
  }, 0);

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];

    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    setItems(newItems);

    if (errors.items && errors.items[index] && errors.items[index][field]) {
      const newItemsErrors = [...errors.items];

      newItemsErrors[index] = {
        ...newItemsErrors[index],
        [field]: null,
      };

      setErrors({
        ...errors,
        items: newItemsErrors,
      });
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, createDefaultItem()]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleOpenPdf = async () => {
    if (!generatedPdfUrl) {
      toast.error("ไม่พบลิงก์เอกสาร PDF");
      return;
    }

    setIsOpeningPdf(true);

    try {
      const url = buildBackendFileUrl(generatedPdfUrl);
      const token =
        typeof getAccessToken === "function" ? getAccessToken() : null;

      const response = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        let msg = "เปิดเอกสาร PDF ไม่สำเร็จ";

        try {
          const err = await response.json();
          msg = err?.message || msg;
        } catch {}

        throw new Error(msg);
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, "_blank");

      setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
    } catch (error) {
      toast.error(error.message || "เปิดเอกสาร PDF ไม่สำเร็จ");
    } finally {
      setIsOpeningPdf(false);
    }
  };

  const resetFormForNewSR = () => {
    setFormData({
      srNumber: generateSRNumber(),
      purpose: "",
      departmentId: "",
      priority: "NORMAL",
      requiredDate: "",
      referenceNo: "",
      deliveryLocation: "",
      remarks: "",
    });

    setItems([createDefaultItem()]);
    setErrors({});
    setGeneratedPdfUrl(null);
    setCreatedSrNumber("");
  };

  const triggerSubmitSR = (e) => {
    e.preventDefault();

    let newErrors = {};
    let isValid = true;

    const cleanPurpose = formData.purpose.trim();

    if (!cleanPurpose) {
      newErrors.purpose = "กรุณาระบุวัตถุประสงค์การใช้งาน";
      isValid = false;
    }

    if (!formData.departmentId) {
      newErrors.departmentId = "กรุณาเลือกแผนกต้นสังกัด";
      isValid = false;
    }

    if (!formData.requiredDate) {
      newErrors.requiredDate = "กรุณาระบุวันที่ต้องการใช้งาน";
      isValid = false;
    }

    const itemErrors = [];
    let hasItemError = false;

    items.forEach((item) => {
      const iErr = {};

      if (!item.productId) {
        iErr.productId = "กรุณาเลือกพัสดุ";
        hasItemError = true;
      }

      if (!item.quantity || Number(item.quantity) <= 0) {
        iErr.quantity = "ระบุจำนวน";
        hasItemError = true;
      }

      itemErrors.push(iErr);
    });

    if (hasItemError) {
      newErrors.items = itemErrors;
      isValid = false;
    }

    if (!isValid) {
      setErrors(newErrors);
      toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    const validItems = items.filter(
      (it) => it.productId && Number(it.quantity) > 0
    );

    const isOverStock = validItems.some(
      (it) => Number(it.quantity) > getAvailableStock(it.productId)
    );

    if (isOverStock) {
      toast.error(
        "⚠️ มีพัสดุบางรายการระบุจำนวนเกินกว่าสต๊อกที่มีในคลัง กรุณาตรวจสอบก่อนส่ง"
      );
      return;
    }

    setErrors({});
    setConfirmSubmitModal(true);
  };

  const executeSubmitSR = async () => {
    setIsLoading(true);

    const cleanPurpose = formData.purpose.trim();
    const cleanRemarks = formData.remarks.trim();

    const validItems = items.filter(
      (it) => it.productId && Number(it.quantity) > 0
    );

    try {
      const payload = {
        srNumber: formData.srNumber,
        purpose: cleanPurpose,
        departmentId: formData.departmentId || null,
        priority: formData.priority || "NORMAL",
        requiredDate: formData.requiredDate || null,
        referenceNo: formData.referenceNo?.trim() || null,
        deliveryLocation: formData.deliveryLocation?.trim() || null,
        remarks: cleanRemarks || null,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: Math.max(1, Math.abs(Number(it.quantity))),
          remark: it.remark?.trim() || null,
        })),
      };

      const res = await apiFetch("/outbound/requisitions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const returnedPdfUrl =
        res?.pdfUrl ||
        res?.data?.pdfUrl ||
        res?.data?.pdfPath ||
        res?.pdfPath ||
        null;

      setGeneratedPdfUrl(returnedPdfUrl);
      setCreatedSrNumber(formData.srNumber);

      toast.success("ส่งคำขอเบิกพัสดุเรียบร้อยแล้ว");
      setConfirmSubmitModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
      setConfirmSubmitModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const ConfirmSubmitPortal = () => {
    if (!isMounted || !confirmSubmitModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
          <div className="p-5 flex items-center justify-between bg-emerald-50 border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  ยืนยันส่งใบขอเบิก
                </h3>
                <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">
                  Requisition Confirmation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmSubmitModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-white rounded-md transition-colors border border-slate-200 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center gap-4 mb-6">
              <p className="text-sm font-bold text-slate-700 text-center leading-relaxed">
                คุณตรวจสอบความถูกต้องของรายการ
                <br />
                และข้อมูลพัสดุเรียบร้อยแล้วใช่หรือไม่?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 w-full shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 text-center leading-relaxed">
                  เมื่อยืนยัน ระบบจะสร้างเอกสารใบขอเบิก
                  <br />
                  และส่งเข้าสู่คิวเพื่อรอการอนุมัติทันที
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 mb-6 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">
                มูลค่าเบิกจ่ายรวม
              </p>
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                ฿{formatCurrency(grandTotalValue)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setConfirmSubmitModal(false)}
                className="py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={executeSubmitSR}
                className="py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> ยืนยันส่งข้อมูล
                  </>
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
      <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-emerald-100">
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-5 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              ส่งใบขอเบิกสำเร็จ
            </h3>

            <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">
              ระบบได้รับข้อมูลใบขอเบิกเลขที่
              <br />
              <span className="text-[#1F3B8B] font-bold text-base mt-1 block">
                {createdSrNumber || formData.srNumber}
              </span>
              เรียบร้อยแล้ว
            </p>

            {generatedPdfUrl ? (
              <button
                type="button"
                onClick={handleOpenPdf}
                disabled={isOpeningPdf}
                className="w-full py-3 mb-3 bg-[#1F3B8B] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#172e6d] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isOpeningPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                เปิดใบขอเบิก PDF
              </button>
            ) : (
              <div className="w-full mb-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs font-bold text-amber-700 leading-relaxed">
                ระบบบันทึกใบเบิกสำเร็จ แต่ยังไม่ได้รับลิงก์ PDF จาก backend
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/inventory/requisition");
              }}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
            >
              ไปหน้ารายการใบเบิก
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                resetFormForNewSR();
              }}
              className="w-full mt-3 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              สร้างใบเบิกใหม่
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <ConfirmSubmitPortal />
      <SuccessModalPortal />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-6 print:hidden">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors w-fit"
            >
              <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                <ClipboardPenLine className="w-6 h-6 text-[#1F3B8B]" />
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  สร้างใบขอเบิกพัสดุ
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  กรอกรายละเอียดและรายการพัสดุที่ต้องการเบิกใช้งาน (Material Requisition)
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={triggerSubmitSR} className="space-y-6" noValidate>
          {/* General Info Card */}
<div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
  <div className="p-6 md:p-8">
    <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100">
      ข้อมูลและรายละเอียดทั่วไป
    </h2>

    {/* ปรับ Grid ใหม่เป็น 3 คอลัมน์ในจอใหญ่ เพื่อจัดสรรพื้นที่ให้พอดีกับความยาวข้อมูล */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      
      {/* Row 1 */}
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          เลขที่ใบเบิก (ระบบออกให้)
        </label>
        <input
          type="text"
          value={formData.srNumber}
          readOnly
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-500 outline-none tabular-nums"
        />
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          วันที่ต้องการใช้งาน <span className="text-rose-500">*</span>
        </label>
        <input
          required
          type="date"
          name="requiredDate"
          value={formData.requiredDate}
          onChange={handleFormChange}
          className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all text-slate-900 ${
            errors.requiredDate
              ? "border-rose-300 bg-rose-50 focus:ring-4 focus:ring-rose-100"
              : "border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 bg-white hover:bg-slate-50 focus:bg-white"
          }`}
        />
        {errors.requiredDate && (
          <p className="text-xs font-bold text-rose-500 mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {errors.requiredDate}
          </p>
        )}
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          ความเร่งด่วน
        </label>
        <select
          name="priority"
          value={formData.priority}
          onChange={handleFormChange}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 transition-all text-slate-900 bg-white hover:bg-slate-50 focus:bg-white"
        >
          <option value="NORMAL">ปกติ</option>
          <option value="HIGH">ด่วน</option>
          <option value="URGENT">ด่วนมาก</option>
        </select>
      </div>

      {/* Row 2 */}
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          แผนกที่เบิก (Cost Center) <span className="text-rose-500">*</span>
        </label>
        <select
          required
          name="departmentId"
          value={formData.departmentId}
          onChange={handleFormChange}
          className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all text-slate-900 ${
            errors.departmentId
              ? "border-rose-300 bg-rose-50 focus:ring-4 focus:ring-rose-100"
              : "border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 bg-white hover:bg-slate-50 focus:bg-white"
          }`}
        >
          <option value="">-- กรุณาเลือกแผนกต้นสังกัด --</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {errors.departmentId && (
          <p className="text-xs font-bold text-rose-500 mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {errors.departmentId}
          </p>
        )}
      </div>

      {/* วัตถุประสงค์ กินพื้นที่ 2 คอลัมน์ (sm:col-span-2) */}
      <div className="sm:col-span-1 lg:col-span-2">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          วัตถุประสงค์การใช้งาน <span className="text-rose-500">*</span>
        </label>
        <input
          required
          type="text"
          name="purpose"
          value={formData.purpose}
          onChange={handleFormChange}
          className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all text-slate-900 ${
            errors.purpose
              ? "border-rose-300 bg-rose-50 focus:ring-4 focus:ring-rose-100 placeholder-rose-300"
              : "border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 placeholder-slate-400 bg-white hover:bg-slate-50 focus:bg-white"
          }`}
          placeholder="เช่น เพื่อซ่อมบำรุงเซิร์ฟเวอร์หลักของบริษัท..."
        />
        {errors.purpose && (
          <p className="text-xs font-bold text-rose-500 mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {errors.purpose}
          </p>
        )}
      </div>

      {/* Row 3 */}
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          เลขอ้างอิงโครงการ / งาน
        </label>
        <input
          type="text"
          name="referenceNo"
          value={formData.referenceNo}
          onChange={handleFormChange}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 transition-all text-slate-900 bg-white hover:bg-slate-50 focus:bg-white"
          placeholder="Job No. / Project ID"
        />
      </div>

      {/* สถานที่ส่งมอบ กินพื้นที่ 2 คอลัมน์ */}
      <div className="sm:col-span-1 lg:col-span-2">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          สถานที่ส่งมอบ / จุดใช้งาน
        </label>
        <input
          type="text"
          name="deliveryLocation"
          value={formData.deliveryLocation}
          onChange={handleFormChange}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/10 transition-all text-slate-900 bg-white hover:bg-slate-50 focus:bg-white"
          placeholder="เช่น ห้อง IT, หน้างาน..."
        />
      </div>

    </div>
  </div>
</div>

          {/* Item Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 bg-slate-50/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  ระบุรายการพัสดุที่ต้องการเบิก
                </h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 w-full md:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" /> เพิ่มรายการพัสดุ
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-widest whitespace-nowrap">
                      <th className="p-4 text-left">เลือกพัสดุ (Asset SKU)</th>
                      <th className="p-4 text-center">คงเหลือรวม</th>
                      <th className="p-4 text-center">หน่วยนับ</th>
                      <th className="p-4 text-right">ราคา/หน่วย</th>
                      <th className="p-4 text-center w-40">จำนวนเบิก <span className="text-rose-500">*</span></th>
                      <th className="p-4 text-right">มูลค่ารวม</th>
                      <th className="p-4 text-left">หมายเหตุรายชิ้น</th>
                      <th className="p-4 w-16 text-center">ลบ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => {
                      const product = getProduct(item.productId);
                      const totalStock = getAvailableStock(item.productId);
                      const isOver = item.productId && Number(item.quantity) > totalStock;

                      const errProduct = errors.items?.[index]?.productId;
                      const errQuantity = errors.items?.[index]?.quantity;

                      const unitPrice = getProductPrice(item.productId);
                      const rowTotal = unitPrice * (Number(item.quantity) || 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                          <td className="p-4 min-w-[280px] align-top">
                            <select
                              required
                              value={item.productId}
                              onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                              className={`w-full border rounded-lg p-2.5 text-sm font-bold outline-none transition-all text-slate-900 ${
                                errProduct
                                  ? "border-rose-300 bg-rose-50 focus:ring-2 focus:ring-rose-100"
                                  : "border-slate-200 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 bg-white"
                              }`}
                            >
                              <option value="">-- ค้นหา / เลือกรายการ --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  [{p.displaySku || p.warehouseSku || p.sku}] {p.name}
                                </option>
                              ))}
                            </select>
                            {product && (
                              <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wide">
                                {product.name}
                              </p>
                            )}
                            {errProduct && (
                              <p className="text-xs font-bold text-rose-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> {errProduct}
                              </p>
                            )}
                          </td>

                          <td className="p-4 text-center align-top pt-5">
                            <div className={`inline-block px-3 py-1 rounded-md font-bold text-sm tabular-nums border ${
                              totalStock > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}>
                              {totalStock.toLocaleString()}
                            </div>
                          </td>

                          <td className="p-4 text-center align-top pt-5">
                            <span className="text-xs font-bold text-slate-500">
                              {item.productId ? getProductUnit(item.productId) : "-"}
                            </span>
                          </td>

                          <td className="p-4 text-right align-top pt-5">
                            <span className="text-sm font-bold text-slate-700 tabular-nums">
                              {item.productId ? `฿${formatCurrency(unitPrice)}` : "-"}
                            </span>
                          </td>

                          <td className="p-4 align-top">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              className={`w-full border rounded-lg py-2 text-center font-bold text-base tabular-nums outline-none transition-all ${
                                isOver || errQuantity
                                  ? "border-rose-300 bg-rose-50 text-rose-700 focus:ring-2 focus:ring-rose-100"
                                  : "border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                              }`}
                            />
                            {errQuantity && !isOver && (
                              <p className="text-xs font-bold text-rose-500 mt-1.5 text-center flex items-center justify-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> {errQuantity}
                              </p>
                            )}
                            {isOver && (
                              <p className="text-[11px] font-bold text-amber-500 mt-1.5 text-center flex items-center justify-center gap-1 uppercase tracking-wider">
                                <AlertCircle className="w-3.5 h-3.5" /> สต๊อกไม่พอ
                              </p>
                            )}
                          </td>

                          <td className="p-4 text-right align-top pt-5">
                            <span className="text-base font-bold text-slate-900 tabular-nums">
                              {item.productId ? `฿${formatCurrency(rowTotal)}` : "-"}
                            </span>
                          </td>

                          <td className="p-4 min-w-[200px] align-top">
                            <input
                              type="text"
                              value={item.remark}
                              onChange={(e) => handleItemChange(index, "remark", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 transition-all bg-white"
                              placeholder="ระบุสเปกเพิ่มเติม..."
                            />
                          </td>

                          <td className="p-4 text-center align-top pt-4">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                              className="p-2.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-200 hover:border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot className="bg-[#1F3B8B]/5 border-t border-[#1F3B8B]/10">
                    <tr>
                      <td colSpan="5" className="p-5 text-right">
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                          มูลค่าเบิกจ่ายรวมทั้งสิ้น (Grand Total)
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <span className="text-xl font-black text-emerald-600 tabular-nums">
                          ฿{formatCurrency(grandTotalValue)}
                        </span>
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Remarks & Actions Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-4">
                หมายเหตุเพิ่มเติมถึงผู้อนุมัติ
              </h2>

              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleFormChange}
                rows="3"
                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 placeholder-slate-400 transition-all mb-8 hover:bg-slate-50 focus:bg-white"
                placeholder="ระบุรายละเอียดเพิ่มเติม ปัญหา ข้อจำกัด หรือคำชี้แจงประกอบการพิจารณา..."
              />

              <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-slate-100">
                <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100 max-w-xl shadow-sm">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-slate-700 leading-relaxed font-medium">
                    <strong className="text-slate-950 font-bold">ข้อควรระวัง:</strong>{" "}
                    ตรวจสอบความถูกต้องของจำนวนเบิกก่อนส่งยืนยัน หากระบุจำนวนเกินกว่าสต๊อก ระบบจะแจ้งเตือนเพื่อให้แก้ไขก่อนส่งคำขอ ส่วนการเลือกล็อตและตำแหน่งจ่ายจริงจะดำเนินการในขั้นตอนจ่ายสินค้าออกโดยคลัง
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-widest shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" /> ยืนยันการส่งใบขอเบิก
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AuthGate>
  );
}