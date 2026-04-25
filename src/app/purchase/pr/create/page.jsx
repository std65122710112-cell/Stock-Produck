"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { createPortal } from "react-dom";

import {
  Plus,
  Trash2,
  ShieldCheck,
  X,
  CheckCircle2,
  Search,
  ArrowLeft,
  FilePlus2,
} from "lucide-react";

// --- คอมโพเนนต์ช่องค้นหาสินค้า (Searchable Select) ---
const SearchableProductSelect = ({ options, value, onChange, error }) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const selected = options.find((o) => o.id === value);
    setSearch(selected ? `[${selected.sku}] ${selected.name}` : "");
  }, [value, options]);

  const filtered = options.filter(
    (o) =>
      (o.sku?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (o.name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all pr-10 ${
            error
              ? "border-rose-300 bg-rose-50 text-rose-800 placeholder-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
          }`}
          placeholder="พิมพ์ค้นหา รหัส (SKU) หรือ ชื่อสินค้า..."
          required={!value}
        />
        <div
          className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${
            error ? "text-rose-400" : "text-slate-400"
          }`}
        >
          <Search className="w-4 h-4" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg custom-scrollbar">
          {filtered.length > 0 ? (
            filtered.map((o) => (
              <div
                key={o.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.id);
                  setIsOpen(false);
                }}
                className="p-3 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-100 last:border-0 transition-colors"
              >
                <span className="text-[10px] font-bold text-[#1F3B8B] tracking-wider mb-0.5">
                  [{o.sku}]
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {o.name}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-sm font-bold text-slate-400">
              ไม่พบสินค้าที่ค้นหา
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function CreatePurchaseRequisitionPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // --- Master Data States ---
  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // --- PR Form States ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [requiredDate, setRequiredDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [remarks, setRemarks] = useState("");

  const [items, setItems] = useState([
    { productId: "", quantity: 1, estimatedPrice: "", remark: "" },
  ]);

  const [errors, setErrors] = useState({});
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);

  // --- Modals States ---
  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [productSuccessModal, setProductSuccessModal] = useState(false);

  // --- Quick Product Creation States ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    categoryId: "",
    unitId: "",
  });

  useEffect(() => {
    setIsMounted(true);

    async function loadAllMasterData() {
      try {
        const [pRes, dRes, cRes, uRes, sRes] = await Promise.all([
          apiFetch("/master/products").catch(() => []),
          apiFetch("/master/departments").catch(() => []),
          apiFetch("/master/categories").catch(() => []),
          apiFetch("/master/units").catch(() => []),
          apiFetch("/master/suppliers").catch(() => []),
        ]);

        setProducts(Array.isArray(pRes) ? pRes : []);
        setDepartments(Array.isArray(dRes) ? dRes : []);
        setCategories(Array.isArray(cRes) ? cRes : []);
        setUnits(Array.isArray(uRes) ? uRes : []);
        setSuppliers(Array.isArray(sRes) ? sRes : []);
      } catch {
        toast.error("ไม่สามารถโหลดฐานข้อมูลได้");
      }
    }

    loadAllMasterData();
  }, []);

  useEffect(() => {
    if (
      confirmSubmitModal ||
      isProductModalOpen ||
      successModal ||
      productSuccessModal
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [
    confirmSubmitModal,
    isProductModalOpen,
    successModal,
    productSuccessModal,
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { productId: "", quantity: 1, estimatedPrice: "", remark: "" },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];

    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    if (field === "productId") {
      newItems[index].estimatedPrice = "";
    }

    setItems(newItems);

    if (errors.items?.[index]?.[field]) {
      const newItemsErrors = [...(errors.items || [])];
      newItemsErrors[index] = { ...newItemsErrors[index], [field]: null };
      setErrors({ ...errors, items: newItemsErrors });
    }
  };

  const openNewProductModal = (index) => {
    setActiveRowIndex(index);
    setNewProduct({
      name: "",
      categoryId: "",
      unitId: "",
    });
    setHasSubmittedForm(false);
    setIsProductModalOpen(true);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!newProduct.name || !newProduct.categoryId || !newProduct.unitId) {
      setHasSubmittedForm(true);
      return;
    }

    setIsCreatingProduct(true);

    try {
      const payload = {
        name: newProduct.name.trim(),
        categoryId: newProduct.categoryId,
        unitId: newProduct.unitId,
        isLotManaged: false,
        expirationDate: null,
        lotNumber: null,
      };

      const res = await apiFetch("/master/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdProduct = res.data || res;

      setProducts((prev) => [...prev, createdProduct]);

      if (activeRowIndex !== null) {
        setItems((prevItems) => {
          const updatedItems = [...prevItems];
          updatedItems[activeRowIndex].productId = createdProduct.id;
          updatedItems[activeRowIndex].estimatedPrice = "";
          return updatedItems;
        });
      }

      setProductSuccessModal(true);
    } catch (error) {
      toast.error(error.message || "สร้างสินค้าไม่สำเร็จ");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const triggerSubmitPR = (e) => {
    e.preventDefault();

    let newErrors = {};
    let isValid = true;

    if (!purpose.trim()) {
      newErrors.purpose = "ระบุวัตถุประสงค์";
      isValid = false;
    }

    if (!departmentId) {
      newErrors.departmentId = "เลือกแผนก";
      isValid = false;
    }

    if (!requiredDate) {
      newErrors.requiredDate = "เลือกวันที่ต้องการใช้งาน";
      isValid = false;
    }

    const itemErrors = items.map((item) => {
      const iErr = {};

      if (!item.productId) {
        iErr.productId = "เลือกพัสดุ";
        isValid = false;
      }

      if (!item.quantity || Number(item.quantity) <= 0) {
        iErr.quantity = "ระบุจำนวน";
        isValid = false;
      }

      if (
        item.estimatedPrice === "" ||
        item.estimatedPrice === null ||
        Number(item.estimatedPrice) <= 0
      ) {
        iErr.estimatedPrice = "กรุณาระบุราคาซื้อรอบนี้";
        isValid = false;
      }

      return iErr;
    });

    if (!isValid) {
      setErrors({ ...newErrors, items: itemErrors });
      toast.error("กรุณาตรวจสอบข้อมูล");
      return;
    }

    setConfirmSubmitModal(true);
  };

  const executeSubmitPR = async () => {
    setConfirmSubmitModal(false);
    setIsSubmitting(true);

    try {
      const validItems = items.filter(
        (it) => it.productId && Number(it.quantity) > 0
      );

      const payload = {
        purpose: purpose.trim(),
        departmentId,
        supplierId: supplierId || null,
        priority,
        requiredDate: requiredDate || null,
        referenceNo: referenceNo.trim() || null,
        deliveryLocation: deliveryLocation.trim() || null,
        remarks: remarks.trim() || null,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          estimatedPrice: Number(it.estimatedPrice) || 0,
          remark: it.remark?.trim() || null,
        })),
      };

      await apiFetch("/api/purchase/pr", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessModal(true);
    } catch (error) {
      toast.error(`ส่งข้อมูลไม่สำเร็จ: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  const totalEstAmount = useMemo(
    () =>
      items.reduce(
        (sum, it) =>
          sum + Number(it.quantity || 0) * Number(it.estimatedPrice || 0),
        0
      ),
    [items]
  );

  const ConfirmSubmitPortal = () => {
    if (!isMounted || !confirmSubmitModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
          <div className="p-5 flex items-center justify-between border-b border-slate-200 bg-slate-50">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">
              ยืนยันการส่งใบขอซื้อ
            </h3>
            <button
              type="button"
              onClick={() => setConfirmSubmitModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-white rounded-md transition-colors border border-slate-200 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-center shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                มูลค่าประเมินรวมทั้งสิ้น
              </p>
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                ฿
                {totalEstAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmSubmitModal(false)}
                className="py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeSubmitPR}
                disabled={isSubmitting}
                className="py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> ยืนยันข้อมูล
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

  const SuccessPortal = () => {
    if (!isMounted || !successModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center max-w-sm w-full border border-emerald-100 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-5">
            <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            สร้างใบขอซื้อสำเร็จ!
          </h3>
          <p className="text-sm font-bold text-slate-500 text-center mb-6">
            ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว
          </p>

          <button
            type="button"
            onClick={() => router.push("/purchase/pr")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold uppercase tracking-widest shadow-sm transition-colors active:scale-95"
          >
            ตกลง
          </button>
        </div>
      </div>,
      document.body
    );
  };

  const ProductSuccessPortal = () => {
    if (!isMounted || !productSuccessModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center max-w-sm w-full border border-emerald-100 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-5">
            <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            สร้างรหัสสินค้าสำเร็จ!
          </h3>
          <p className="text-sm font-bold text-slate-500 text-center mb-6">
            ระบบได้เพิ่มรายการลงในฐานข้อมูลแล้ว
          </p>

          <button
            type="button"
            onClick={() => {
              setProductSuccessModal(false);
              setIsProductModalOpen(false);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold uppercase tracking-widest shadow-sm transition-colors active:scale-95"
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
      <ConfirmSubmitPortal />
      <SuccessPortal />
      <ProductSuccessPortal />

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
                <FilePlus2 className="w-6 h-6 text-[#1F3B8B]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  สร้างใบขอซื้อ (PR)
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  ระบบบันทึกคำขออนุมัติจัดซื้อพัสดุ
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={triggerSubmitPR} className="space-y-6" noValidate>
          {/* SECTION 1: MASTER INFO (3 Column Grid) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100">
                ข้อมูลพื้นฐาน
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    วัตถุประสงค์การจัดซื้อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      if (errors.purpose) {
                        setErrors({ ...errors, purpose: null });
                      }
                    }}
                    className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${
                      errors.purpose
                        ? "border-rose-300 bg-rose-50 text-rose-900 placeholder-rose-300 focus:ring-2 focus:ring-rose-100"
                        : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                    }`}
                    placeholder="เช่น ขอซื้อคอมพิวเตอร์โครงการ..."
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    วันที่ต้องการใช้งาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => {
                      setRequiredDate(e.target.value);
                      if (errors.requiredDate) {
                        setErrors({ ...errors, requiredDate: null });
                      }
                    }}
                    className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${
                      errors.requiredDate
                        ? "border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-100"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    แผนกที่ร้องขอ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      if (errors.departmentId) {
                        setErrors({ ...errors, departmentId: null });
                      }
                    }}
                    className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${
                      errors.departmentId
                        ? "border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-100"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                    }`}
                    required
                  >
                    <option value="">-- เลือกแผนก --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    ระดับความเร่งด่วน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm font-bold outline-none text-slate-900 transition-all hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                  >
                    <option value="NORMAL">ปกติ</option>
                    <option value="HIGH">ด่วน</option>
                    <option value="URGENT">ด่วนมาก</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    แนะนำคู่ค้า
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm font-bold outline-none text-slate-900 transition-all hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                  >
                    <option value="">-- ไม่ระบุ (คัดเลือกภายหลัง) --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    เลขอ้างอิงงาน / โครงการ
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm font-bold outline-none text-slate-900 transition-all hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                    placeholder="เช่น PROJ-2026-001"
                  />
                </div>

                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    สถานที่ส่งมอบ / จุดใช้งาน
                  </label>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm font-bold outline-none text-slate-900 transition-all hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                    placeholder="เช่น อาคาร A ชั้น 2"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm font-bold outline-none text-slate-900 transition-all hover:bg-slate-50 focus:bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 min-h-[80px]"
                    placeholder="ระบุเหตุผลความจำเป็น รายละเอียดเพิ่มเติม หรือข้อกำหนดเฉพาะ"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ITEM LIST */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  รายละเอียดรายการพัสดุ (Items)
                </h2>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> เพิ่มรายการ
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => {
                  return (
                    <div
                      key={index}
                      className="p-5 bg-white border border-slate-200 rounded-xl hover:border-[#1F3B8B]/40 transition-all shadow-sm"
                    >
                      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-end">
                        <div className="flex-1 w-full space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                              สินค้า / SKU <span className="text-rose-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => openNewProductModal(index)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors uppercase tracking-wider"
                            >
                              <Plus className="w-3.5 h-3.5" /> สร้างรหัสใหม่
                            </button>
                          </div>
                          <SearchableProductSelect
                            options={products}
                            value={item.productId}
                            onChange={(val) => handleItemChange(index, "productId", val)}
                            error={errors.items?.[index]?.productId}
                          />
                        </div>

                        <div className="flex gap-4 w-full xl:w-auto">
                          <div className="w-full xl:w-28 space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center block">
                              จำนวน <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              className={`w-full border rounded-xl p-3 text-center font-bold text-sm outline-none transition-all ${
                                errors.items?.[index]?.quantity
                                  ? "border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-100"
                                  : "border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                              }`}
                            />
                          </div>

                          <div className="w-full xl:w-48 space-y-1.5 relative">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right block">
                              ราคาประเมินต่อหน่วย <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.estimatedPrice}
                                onChange={(e) => handleItemChange(index, "estimatedPrice", e.target.value)}
                                className={`w-full border rounded-xl p-3 text-right font-bold text-sm outline-none transition-all ${
                                  errors.items?.[index]?.estimatedPrice
                                    ? "border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-100"
                                    : "border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                                }`}
                                placeholder="ราคาซื้อรอบนี้"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                ฿
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 w-full xl:w-auto space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                            หมายเหตุ / สเปกเพิ่มเติม
                          </label>
                          <input
                            type="text"
                            value={item.remark || ""}
                            onChange={(e) => handleItemChange(index, "remark", e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm font-bold outline-none transition-all text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                            placeholder="รุ่นที่ต้องการ/สเปก/ทดแทนของเดิม"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-3 bg-white text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 transition-colors shadow-sm mb-[2px]"
                          disabled={items.length === 1}
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="p-6 md:p-8 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-200">
              <div className="flex items-center gap-4 w-full md:w-auto text-center md:text-left">
                <div className="w-full">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    มูลค่าประเมินรวมทั้งสิ้น
                  </p>
                  <p className="text-emerald-600 text-3xl md:text-4xl font-bold tabular-nums tracking-tight">
                    ฿
                    {totalEstAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                <ShieldCheck className="w-5 h-5" /> ยืนยันและส่งใบขอซื้อ
              </button>
            </div>
          </div>
        </form>

        {/* QUICK PRODUCT MODAL */}
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                    สร้างฐานข้อมูลสินค้าด่วน
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-widest">
                    เพิ่มรหัสสินค้าใหม่ โดยไม่ต้องระบุล็อตหรือวันหมดอายุ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 bg-white border border-slate-200 rounded-md shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="p-6 md:p-8 space-y-6" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      หมวดหมู่ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newProduct.categoryId}
                      onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                      className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${
                        hasSubmittedForm && !newProduct.categoryId
                          ? "border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-100"
                          : "border-slate-200 bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 hover:bg-slate-50"
                      }`}
                    >
                      <option value="">-- เลือกหมวดหมู่ --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {hasSubmittedForm && !newProduct.categoryId && (
                      <span className="text-[10px] font-bold text-rose-500 mt-1.5 block">
                        กรุณาเลือกหมวดหมู่
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      รหัส SKU
                    </label>
                    <input
                      type="text"
                      value="สร้างอัตโนมัติ"
                      className="w-full border border-slate-200 bg-slate-50 text-slate-400 rounded-xl p-3 text-center text-sm font-bold cursor-not-allowed"
                      readOnly
                    />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      สร้าง SKU อัตโนมัติจากหมวดหมู่ตาม backend
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    ชื่อพัสดุ / สินค้า <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="ระบุชื่อพัสดุ..."
                    className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${
                      hasSubmittedForm && !newProduct.name
                        ? "border-rose-300 bg-rose-50 text-rose-900 placeholder-rose-300 focus:ring-2 focus:ring-rose-100"
                        : "border-slate-200 bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 hover:bg-slate-50"
                    }`}
                  />
                  {hasSubmittedForm && !newProduct.name && (
                    <span className="text-[10px] font-bold text-rose-500 mt-1.5 block">
                      กรุณาระบุชื่อพัสดุ / สินค้า
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    หน่วยนับ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newProduct.unitId}
                    onChange={(e) => setNewProduct({ ...newProduct, unitId: e.target.value })}
                    className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${
                      hasSubmittedForm && !newProduct.unitId
                        ? "border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-100"
                        : "border-slate-200 bg-white focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 hover:bg-slate-50"
                    }`}
                  >
                    <option value="">-- เลือกหน่วยนับ --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  {hasSubmittedForm && !newProduct.unitId && (
                    <span className="text-[10px] font-bold text-rose-500 mt-1.5 block">
                      กรุณาเลือกหน่วยนับ
                    </span>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[11px] text-blue-700 font-bold leading-relaxed uppercase tracking-wider text-center">
                  ระบบจะยังไม่สร้างล็อตในขั้นตอนนี้ การแยกรอบซื้อและราคาทุนจะถูกจัดการตอนรับเข้า (GR)
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProduct}
                    className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingProduct ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> ยืนยันการสร้าง
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}