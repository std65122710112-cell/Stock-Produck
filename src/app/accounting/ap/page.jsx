"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Wallet,
  Plus,
  Clock,
  X,
  Save,
  RefreshCw,
  FileText,
  CheckCircle2,
  Pencil,
  Trash2,
  Paperclip,
  UploadCloud,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";

const todayInput = () => new Date().toISOString().split("T")[0];

const createDefaultFormData = () => ({
  invoiceNo: "",
  taxInvoiceNo: "",
  supplierId: "",
  poId: "",
  grId: "",

  issueDate: todayInput(),
  receiveDate: todayInput(),
  dueDate: new Date(new Date().setDate(new Date().getDate() + 30))
    .toISOString()
    .split("T")[0],

  subTotal: 0,
  vatRate: 7,
  vatAmount: 0,
  whtRate: 0,
  whtType: "",
  whtAmount: 0,
  grandTotal: 0,

  attachmentUrl: "",
  remarks: "",
  items: [],
});

const toDateInput = (value) => {
  if (!value) return todayInput();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayInput();

  return date.toISOString().split("T")[0];
};

const getAttachmentHref = (url) => {
  if (!url) return "";
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

const isImageAttachment = (url = "") => {
  return /\.(jpg|jpeg|png|webp)$/i.test(url);
};

const isPdfAttachment = (url = "") => {
  return /\.pdf$/i.test(url);
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getPaymentAmounts = (invoice) => {
  const paidAmount = Number(invoice?.paidAmount || 0);

  const outstandingAmount =
    invoice?.outstandingAmount !== undefined
      ? Number(invoice.outstandingAmount || 0)
      : Math.max(Number(invoice?.grandTotal || 0) - paidAmount, 0);

  return {
    paidAmount,
    outstandingAmount,
  };
};

const getInvoiceStatusInfo = (invoice) => {
  const { paidAmount, outstandingAmount } = getPaymentAmounts(invoice);
  const status = invoice?.status || "PENDING";

  if (status === "PAID" || outstandingAmount <= 0) {
    return {
      label: "ชำระแล้ว",
      className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };
  }

  if (status === "PARTIAL_PAID" || paidAmount > 0) {
    return {
      label: "ชำระบางส่วน",
      className: "bg-blue-50 text-blue-700 border-blue-100",
    };
  }

  const isOverdue = invoice?.dueDate && new Date(invoice.dueDate) < new Date();

  if (isOverdue) {
    return {
      label: "เกินกำหนดชำระ",
      className: "bg-rose-50 text-rose-700 border-rose-100",
    };
  }

  return {
    label: "รอชำระ",
    className: "bg-amber-50 text-amber-700 border-amber-100",
  };
};

export default function AccountsPayablePage() {

  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, invoice: null });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [successPopup, setSuccessPopup] = useState({ isOpen: false, message: "" });

  const [loading, setLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const [grSearch, setGrSearch] = useState("");
  const [showGrDropdown, setShowGrDropdown] = useState(false);
  const [selectedGrInfo, setSelectedGrInfo] = useState({
    grNo: "",
    poNo: "",
    supplierName: "",
  });

  const [formData, setFormData] = useState(createDefaultFormData());

  const [attachmentPreview, setAttachmentPreview] = useState({
    isOpen: false,
    url: "",
    name: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [invData, supData, grData] = await Promise.all([
        apiFetch("/ap/invoices/pending"),
        apiFetch("/master/suppliers"),
        apiFetch("/ap/receipts/available"),
      ]);

      setInvoices(Array.isArray(invData) ? invData : invData?.data || []);
      setSuppliers(Array.isArray(supData) ? supData : supData?.data || []);
      setGoodsReceipts(Array.isArray(grData) ? grData : grData?.data || []);
    } catch (err) {
      console.error("Load AP Data Error:", err);
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const computeFinalAmounts = (subTotal, vatRate, whtRate) => {
    const sub = Number(subTotal) || 0;
    const vRate = Number(vatRate) || 0;
    const wRate = Number(whtRate) || 0;

    const vat = Number((sub * (vRate / 100)).toFixed(2));
    const wht = Number((sub * (wRate / 100)).toFixed(2));
    const grand = Number((sub + vat - wht).toFixed(2));

    return {
      vatAmount: vat,
      whtAmount: wht,
      grandTotal: grand,
    };
  };

  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[().,]/g, "");

  const getGRInfo = (gr) => {
    const grNo = gr?.receiptNo || gr?.id?.slice(0, 8).toUpperCase() || "";
    const poNo = gr?.purchaseOrder?.poNumber || gr?.poNumber || "ทั่วไป";
    const supplierName =
      gr?.purchaseOrder?.supplier?.name ||
      gr?.purchaseOrder?.vendorName ||
      gr?.supplierName ||
      "";

    return { grNo, poNo, supplierName };
  };

  const resolveSupplierIdFromGR = (grDetail, supplierRows) => {
    const supplierList = Array.isArray(supplierRows) ? supplierRows : [];

    const idCandidates = [
      grDetail?.supplier?.id,
      grDetail?.supplierId,
      grDetail?.purchaseOrder?.supplier?.id,
      grDetail?.purchaseOrder?.supplierId,
      grDetail?.purchaseOrder?.requisition?.supplier?.id,
      grDetail?.purchaseOrder?.requisition?.supplierId,
    ].filter(Boolean);

    for (const id of idCandidates) {
      const found = supplierList.find((s) => String(s.id) === String(id));
      if (found) return found.id;
    }

    const vendorName =
      grDetail?.purchaseOrder?.supplier?.name ||
      grDetail?.purchaseOrder?.vendorName ||
      grDetail?.supplierName ||
      "";

    const normalizedVendor = normalizeText(vendorName);
    if (!normalizedVendor) return "";

    const exactMatches = supplierList.filter(
      (s) =>
        normalizeText(s.name) === normalizedVendor ||
        normalizeText(s.code) === normalizedVendor
    );

    if (exactMatches.length === 1) return exactMatches[0].id;

    const softMatches = supplierList.filter((s) => {
      const supplierName = normalizeText(s.name);
      const supplierCode = normalizeText(s.code);

      if (!supplierName && !supplierCode) return false;

      return (
        supplierName.includes(normalizedVendor) ||
        normalizedVendor.includes(supplierName) ||
        supplierCode.includes(normalizedVendor) ||
        normalizedVendor.includes(supplierCode)
      );
    });

    if (softMatches.length === 1) return softMatches[0].id;

    return "";
  };

  const filteredGoodsReceipts = useMemo(() => {
    const keyword = grSearch.trim().toLowerCase();

    if (!keyword) return goodsReceipts;

    return goodsReceipts.filter((gr) => {
      const text = [
        gr.receiptNo,
        gr.id,
        gr.purchaseOrder?.poNumber,
        gr.poNumber,
        gr.purchaseOrder?.supplier?.name,
        gr.purchaseOrder?.vendorName,
        gr.supplierName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [goodsReceipts, grSearch]);

  const clearGRSelection = () => {
    setGrSearch("");
    setShowGrDropdown(false);
    setSelectedGrInfo({ grNo: "", poNo: "", supplierName: "" });

    setFormData((prev) => ({
      ...prev,
      grId: "",
      poId: "",
      supplierId: "",
      items: [],
      subTotal: 0,
      vatAmount: 0,
      whtAmount: 0,
      grandTotal: 0,
    }));
  };

  const handleGRSearchChange = (value) => {
    setGrSearch(value);
    setShowGrDropdown(true);

    if (!value.trim()) {
      clearGRSelection();
      return;
    }

    if (formData.grId) {
      setFormData((prev) => ({
        ...prev,
        grId: "",
        poId: "",
        supplierId: "",
        items: [],
        subTotal: 0,
        vatAmount: 0,
        whtAmount: 0,
        grandTotal: 0,
      }));
      setSelectedGrInfo({ grNo: "", poNo: "", supplierName: "" });
    }
  };

  const handleGRSelection = async (grId, grInfoFromList = null) => {
    if (!grId) {
      clearGRSelection();
      return;
    }

    setLoading(true);

    try {
      let grDetail = null;

      try {
        const res = await apiFetch(`/inventory/receipt/${grId}`, {
          method: "GET",
        });
        grDetail = res?.data || res;
      } catch (historyEndpointError) {
        console.warn("Fallback to /inbound/receipts/:id", historyEndpointError);

        const fallbackRes = await apiFetch(`/inbound/receipts/${grId}`, {
          method: "GET",
        });
        grDetail = fallbackRes?.data || fallbackRes;
      }

      if (!grDetail || !Array.isArray(grDetail.items)) {
        toast.error("ไม่พบรายการสินค้าในใบรับของนี้");
        return;
      }

      const mappedItems = grDetail.items.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice =
          Number(item.unitCost) || Number(item.product?.unitCost) || 0;

        return {
          productId: item.productId,
          sku: item.product?.sku || "N/A",
          name: item.product?.name || "Unknown",
          quantity,
          unitPrice,
          amount: quantity * unitPrice,
        };
      });

      const newSubTotal = mappedItems.reduce((sum, i) => sum + i.amount, 0);

      const totals = computeFinalAmounts(
        newSubTotal,
        formData.vatRate,
        formData.whtRate
      );

      const poId =
        grDetail.purchaseOrderId ||
        grDetail.poId ||
        grDetail.purchaseOrder?.id ||
        "";

      const autoSupplierId = resolveSupplierIdFromGR(grDetail, suppliers);
      const grInfo = grInfoFromList || getGRInfo(grDetail);

      setFormData((prev) => ({
        ...prev,
        grId,
        poId,
        supplierId: autoSupplierId || "",
        items: mappedItems,
        subTotal: newSubTotal,
        ...totals,
      }));

      setSelectedGrInfo(grInfo);
      setGrSearch(grInfo.grNo);
      setShowGrDropdown(false);

      if (autoSupplierId) {
        const supplierName =
          suppliers.find((s) => String(s.id) === String(autoSupplierId))
            ?.name ||
          grInfo.supplierName ||
          "ซัพพลายเออร์";

        toast.success(`ดึงซัพพลายเออร์อัตโนมัติ: ${supplierName}`);
      } else if (grInfo.supplierName) {
        toast.error(
          `พบชื่อผู้ขายจาก PO: ${grInfo.supplierName} แต่ยังจับคู่กับทะเบียน Supplier ไม่ได้`
        );
      } else {
        toast.success("ดึงข้อมูลใบรับของสำเร็จ แต่ไม่พบข้อมูลซัพพลายเออร์");
      }
    } catch (err) {
      console.error("Fetch GR Error:", err);
      toast.error(err.message || "ดึงข้อมูลใบรับของล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  const handleWHTChange = (rate) => {
    const rateNum = Number(rate);

    const whtTypeMap = {
      0: "ไม่มีหัก ณ ที่จ่าย",
      1: "ค่าขนส่ง (1%)",
      3: "ค่าบริการ/จ้างทำของ (3%)",
      5: "ค่าเช่า (5%)",
    };

    const totals = computeFinalAmounts(
      formData.subTotal,
      formData.vatRate,
      rateNum
    );

    setFormData((prev) => ({
      ...prev,
      whtRate: rateNum,
      whtType: whtTypeMap[rateNum] || "",
      ...totals,
    }));
  };

  const openAttachmentPreview = (
    url,
    name = "ไฟล์แนบใบแจ้งหนี้ / ใบกำกับภาษี"
  ) => {
    if (!url) {
      toast.error("ไม่พบไฟล์แนบ");
      return;
    }

    setAttachmentPreview({
      isOpen: true,
      url,
      name,
    });
  };

  const closeAttachmentPreview = () => {
    setAttachmentPreview({
      isOpen: false,
      url: "",
      name: "",
    });
  };

  const handleAttachmentUpload = async (file) => {
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("รองรับเฉพาะไฟล์ PDF, JPG, PNG, WEBP");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ต้องมีขนาดไม่เกิน 10MB");
      return;
    }

    const uploadForm = new FormData();
    uploadForm.append("attachment", file);

    setUploadingAttachment(true);

    try {
      const res = await apiFetch("/ap/attachments", {
        method: "POST",
        body: uploadForm,
      });

      const attachmentUrl =
        res?.attachmentUrl || res?.data?.attachmentUrl || res?.url || "";

      if (!attachmentUrl) {
        throw new Error("ไม่พบ URL ของไฟล์ที่อัปโหลด");
      }

      setFormData((prev) => ({
        ...prev,
        attachmentUrl,
      }));

      toast.success("อัปโหลดไฟล์แนบสำเร็จ");
    } catch (err) {
      console.error("Upload Attachment Error:", err);
      toast.error(err.message || "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const resetFormState = () => {
    setEditingInvoiceId(null);
    setFormData(createDefaultFormData());
    setGrSearch("");
    setShowGrDropdown(false);
    setSelectedGrInfo({ grNo: "", poNo: "", supplierName: "" });
  };

  const openCreateForm = () => {
    resetFormState();
    setShowForm(true);
  };

  const closeCreateForm = () => {
    setShowForm(false);
    resetFormState();
  };

  const openEditForm = (invoice) => {
    const gr = invoice.goodsReceipt || null;
    const po = invoice.purchaseOrder || gr?.purchaseOrder || null;

    const grInfo = {
      grNo: gr?.receiptNo || "",
      poNo: po?.poNumber || "ทั่วไป",
      supplierName:
        invoice.supplier?.name || po?.supplier?.name || po?.vendorName || "",
    };

    const mappedItems = (invoice.items || []).map((item) => ({
      productId: item.productId,
      sku: item.product?.sku || "N/A",
      name: item.product?.name || "Unknown",
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      amount: Number(item.amount) || 0,
    }));

    setEditingInvoiceId(invoice.id);
    setSelectedGrInfo(grInfo);
    setGrSearch(grInfo.grNo);

    setFormData({
      invoiceNo: invoice.invoiceNo || "",
      taxInvoiceNo: invoice.taxInvoiceNo || "",
      supplierId: invoice.supplierId || "",
      poId: invoice.poId || po?.id || "",
      grId: invoice.grId || gr?.id || "",

      issueDate: toDateInput(invoice.issueDate),
      receiveDate: toDateInput(invoice.receiveDate),
      dueDate: toDateInput(invoice.dueDate),

      subTotal: Number(invoice.subTotal) || 0,
      vatRate: Number(invoice.vatRate) || 7,
      vatAmount: Number(invoice.vatAmount) || 0,
      whtRate: Number(invoice.whtRate) || 0,
      whtType: invoice.whtType || "",
      whtAmount: Number(invoice.whtAmount) || 0,
      grandTotal: Number(invoice.grandTotal) || 0,

      attachmentUrl: invoice.attachmentUrl || "",
      remarks: invoice.remarks || "",
      items: mappedItems,
    });

    setShowForm(true);
    setShowGrDropdown(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- เริ่มต้นชุดฟังก์ชันใหม่ ---
  const handlePreSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.invoiceNo) newErrors.invoiceNo = "กรุณาระบุเลขที่ใบแจ้งหนี้";
    if (!formData.supplierId) newErrors.supplierId = "กรุณาเลือกซัพพลายเออร์";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrors({});
    setConfirmSubmit(true);
  };

  const executeSubmit = async () => {
    setConfirmSubmit(false);
    setLoading(true);

    try {
      const url = editingInvoiceId
        ? `/ap/invoices/${editingInvoiceId}`
        : "/ap/invoices";
      const method = editingInvoiceId ? "PUT" : "POST";

      await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      setSuccessPopup({
        isOpen: true,
        message: editingInvoiceId ? "อัปเดตข้อมูลใบแจ้งหนี้สำเร็จ" : "บันทึกรายการตั้งหนี้สำเร็จ"
      });

      setShowForm(false);
      resetFormState();
      loadData();
    } catch (err) {
      toast.error(err.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (invoice) => {
    setConfirmDelete({ isOpen: true, invoice });
  };

  const executeDelete = async () => {
    if (!confirmDelete.invoice) return;
    const targetId = confirmDelete.invoice.id;
    setConfirmDelete({ isOpen: false, invoice: null });
    setLoading(true);

    try {
      await apiFetch(`/ap/invoices/${targetId}`, {
        method: "DELETE",
      });

      setSuccessPopup({ isOpen: true, message: "ลบใบแจ้งหนี้สำเร็จ" });
      loadData();
    } catch (err) {
      toast.error(err.message || "ลบใบแจ้งหนี้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = () => {
    setConfirmCancel(true);
  };

  const executeCancel = () => {
    setConfirmCancel(false);
    closeCreateForm();
  };
  // --- สิ้นสุดชุดฟังก์ชันใหม่ ---

  return (
    <AuthGate requiredPermissions={["AP_READ"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 py-8 space-y-8 min-h-screen">
        {/* --- ส่วนหัวหน้าจอ (Header Section) ฉบับปรับปรุงธีม Premium --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 md:pb-8 gap-6 print:hidden">
          <div className="flex items-center gap-4">
            {/* กล่องไอคอนสไตล์ Professional */}
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
              <Wallet className="w-6 h-6 md:w-7 md:h-7 text-[#1F3B8B]" />
            </div>

            {/* กลุ่มข้อความหัวเรื่อง */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight uppercase">
                ทะเบียนใบตั้งหนี้
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                ระบบตั้งหนี้และคำนวณภาษีหัก ณ ที่จ่ายระดับองค์กร
              </p>
            </div>
          </div>

          {/* ปุ่มดำเนินการ (แสดงเมื่อไม่ได้อยู่ในโหมดฟอร์ม) */}
          {!showForm && (
            <button
              onClick={openCreateForm}
              className="w-full md:w-auto bg-[#1F3B8B] text-white px-6 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 outline-none focus:ring-2 focus:ring-[#1F3B8B]/50"
            >
              <Plus size={18} /> สร้างใบตั้งหนี้ใหม่
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white border-2 border-slate-300 rounded-xl shadow-lg overflow-visible animate-in fade-in zoom-in-95 duration-300">
            {/* Header Form */}
            <div className="bg-slate-50/50 p-6 text-slate-900 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm">
                  <FileText className="text-[#1F3B8B] w-6 h-6" />
                </div>

                <div>
                  <span className="font-black text-base uppercase tracking-widest block text-slate-900">
                    {editingInvoiceId ? "แบบฟอร์มแก้ไขใบแจ้งหนี้" : "แบบฟอร์มบันทึกใบแจ้งหนี้"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">
                    ตรวจสอบความถูกต้อง 3-Way Matching
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all outline-none border border-transparent hover:border-rose-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePreSubmit} className="p-6 md:p-8 space-y-8 bg-white rounded-b-xl">
              {/* ส่วนกรอกข้อมูลหลัก */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* คอลัมน์ที่ 1: ข้อมูลเอกสาร */}
                <div className="space-y-5">
                  <h3 className="text-[11px] font-bold text-[#1F3B8B] uppercase tracking-[0.15em] flex items-center gap-2 border-b border-slate-200 pb-3">
                    <div className="w-1 h-3 bg-[#1F3B8B] rounded-full"></div>
                    1. ข้อมูลเอกสาร
                  </h3>

                  <InputGroup
                    label="เลขที่ใบแจ้งหนี้ (Invoice No.)"
                    value={formData.invoiceNo}
                    onChange={(e) => {
                      setFormData({ ...formData, invoiceNo: e.target.value });
                      if(errors.invoiceNo) setErrors({...errors, invoiceNo: null});
                    }}
                    placeholder="ระบุเลขที่ใบแจ้งหนี้..."
                    error={errors.invoiceNo}
                  />

                  <InputGroup
                    label="เลขที่ใบกำกับภาษี (Tax Invoice)"
                    value={formData.taxInvoiceNo}
                    onChange={(e) => setFormData({ ...formData, taxInvoiceNo: e.target.value })}
                    placeholder="ระบุเพื่อทำรายงานภาษีซื้อ..."
                  />

                  <InputGroup
                    type="date"
                    label="วันที่รับเอกสารจริง"
                    value={formData.receiveDate}
                    onChange={(e) => setFormData({ ...formData, receiveDate: e.target.value })}
                  />

                  {/* ส่วนอัปโหลดไฟล์ */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      ไฟล์แนบใบแจ้งหนี้ / ใบกำกับภาษี
                    </label>

                    <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-5 hover:bg-white hover:border-[#1F3B8B]/60 transition-all group">
                      <label className="flex flex-col items-center justify-center gap-3 cursor-pointer text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform shadow-sm">
                          {uploadingAttachment ? (
                            <RefreshCw className="animate-spin text-[#1F3B8B]" size={20} />
                          ) : (
                            <UploadCloud className="text-[#1F3B8B]" size={20} />
                          )}
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-slate-700 uppercase">
                            {uploadingAttachment ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดไฟล์"}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-1">
                            PDF, JPG, PNG, WEBP (สูงสุด 10MB)
                          </div>
                        </div>

                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          disabled={uploadingAttachment}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleAttachmentUpload(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {formData.attachmentUrl && (
                      <div className="flex items-center justify-between gap-3 bg-blue-50/50 border border-blue-100 rounded-lg px-4 py-2.5 mt-2 shadow-sm">
                        <button
                          type="button"
                          onClick={() => openAttachmentPreview(formData.attachmentUrl, "ไฟล์แนบใบแจ้งหนี้")}
                          className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-2 truncate"
                        >
                          <Paperclip size={14} />
                          เปิดดูไฟล์ที่อัปโหลดแล้ว
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, attachmentUrl: "" }))}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* อ้างอิงใบรับของ */}
                  <div className="space-y-2 relative z-[100]">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      อ้างอิงใบรับของ / ใบสั่งซื้อ
                    </label>

                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="relative">
                        <input
                          type="text"
                          value={grSearch}
                          onChange={(e) => handleGRSearchChange(e.target.value)}
                          onFocus={() => setShowGrDropdown(true)}
                          onBlur={() => { setTimeout(() => setShowGrDropdown(false), 180); }}
                          placeholder="ค้นหาเลขที่ใบรับของ (GR)..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#1F3B8B] shadow-sm transition-all placeholder:text-slate-400"
                        />

                        {formData.grId && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={clearGRSelection}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={selectedGrInfo.poNo || ""}
                        readOnly
                        placeholder="เลขที่ใบสั่งซื้อ (อ้างอิงอัตโนมัติ)"
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-[#1F3B8B] cursor-default placeholder:text-slate-400 shadow-inner"
                      />
                    </div>

                    {showGrDropdown && (
                      <div className="absolute left-0 right-0 top-full z-[999] mt-2 w-full bg-white border-2 border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {filteredGoodsReceipts.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs font-bold text-slate-500">ไม่พบข้อมูลใบรับของ</div>
                        ) : (
                          filteredGoodsReceipts.map((gr) => {
                            const info = getGRInfo(gr);
                            return (
                              <button
                                key={gr.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleGRSelection(gr.id, info)}
                                className="w-full text-left px-5 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                              >
                                <div className="text-sm font-bold text-slate-900">{info.grNo}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">PO: {info.poNo} | {info.supplierName}</div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* คอลัมน์ที่ 2: คู่ค้าและเครดิต */}
                <div className="space-y-5">
                  <h3 className="text-[11px] font-bold text-[#1F3B8B] uppercase tracking-[0.15em] flex items-center gap-2 border-b border-slate-200 pb-3">
                    <div className="w-1 h-3 bg-[#1F3B8B] rounded-full"></div>
                    2. คู่ค้าและเครดิต
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      ซัพพลายเออร์ (Supplier)
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#1F3B8B] shadow-sm cursor-pointer"
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    >
                      <option value="">-- เลือกซัพพลายเออร์ --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                    {errors.supplierId && <div className="text-[11px] font-bold text-rose-500 ml-1 mt-1">{errors.supplierId}</div>}
                  </div>

                  <InputGroup
                    type="date"
                    label="วันที่ในเอกสาร (Issue Date)"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  />

                  <InputGroup
                    type="date"
                    label="วันครบกำหนดชำระ (Due Date)"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                {/* คอลัมน์ที่ 3: สรุปภาษีและยอดเงิน */}
                <div className="space-y-5 bg-slate-50 p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.15em] mb-4 border-b border-slate-200 pb-3">
                    3. สรุปภาษีและยอดสุทธิ
                  </h3>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#1F3B8B] uppercase tracking-widest">
                        หัก ณ ที่จ่าย (WHT Rate)
                      </label>
                      <select
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#1F3B8B] shadow-sm cursor-pointer"
                        value={formData.whtRate}
                        onChange={(e) => handleWHTChange(e.target.value)}
                      >
                        <option value="0">0% - ไม่มีหัก ณ ที่จ่าย</option>
                        <option value="1">1% - ค่าขนส่ง</option>
                        <option value="3">3% - ค่าบริการ/รับเหมา</option>
                        <option value="5">5% - ค่าเช่า</option>
                      </select>
                    </div>

                    <div className="pt-5 border-t border-slate-200 space-y-3.5">
                      <SummaryRow label="ยอดรวม (Sub Total):" value={formData.subTotal} />
                      <SummaryRow label={`ภาษีมูลค่าเพิ่ม (VAT ${formData.vatRate}%):`} value={formData.vatAmount} />

                      <div className="flex justify-between text-[11px] font-bold text-rose-500 uppercase tracking-widest">
                        <span>หัก ณ ที่จ่าย ({formData.whtRate}%):</span>
                        <span className="tabular-nums font-black">- ฿{formatMoney(formData.whtAmount)}</span>
                      </div>

                      <div className="flex justify-between items-center text-xl font-black text-[#1F3B8B] pt-5 border-t-2 border-slate-200 mt-3">
                        <span className="text-xs uppercase tracking-widest">ยอดจ่ายสุทธิ:</span>
                        <span className="tabular-nums">฿{formatMoney(formData.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ส่วนตารางรายการสินค้า */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-[11px] font-bold text-[#1F3B8B] uppercase tracking-[0.15em] flex items-center gap-2">
                  <div className="w-1 h-3 bg-[#1F3B8B] rounded-full"></div>
                  4. รายละเอียดรายการ (Line Items)
                </h3>

                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-600 font-bold uppercase tracking-widest text-xs">
                        <th className="px-6 py-4 text-left">รายละเอียดสินค้า (Product)</th>
                        <th className="px-6 py-4 text-center w-28">จำนวน</th>
                        <th className="px-6 py-4 text-right">ราคาต่อหน่วย</th>
                        <th className="px-6 py-4 text-right">รวมเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-bold">
                            กรุณาเลือกใบรับของ (GR) เพื่อดึงข้อมูลรายการพัสดุ
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 text-base">{item.name}</div>
                              <div className="text-[11px] text-[#1F3B8B] font-bold uppercase tracking-wide mt-1">SKU: {item.sku}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 bg-slate-100 rounded-md font-bold text-[#1F3B8B] tabular-nums">
                                {Number(item.quantity || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-slate-700 tabular-nums">
                              ฿{formatMoney(item.unitPrice)}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-900 tabular-nums text-base">
                              ฿{formatMoney(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* หมายเหตุเพิ่มเติม */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  หมายเหตุภายในฝ่ายบัญชี
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={2}
                  placeholder="ระบุข้อความเพิ่มเติม (ถ้ามี)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#1F3B8B] outline-none transition-all placeholder:text-slate-400 shadow-sm resize-none"
                />
              </div>

              {/* ปุ่มดำเนินการ */}
              <div className="flex justify-end gap-4 pt-8 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="px-8 py-3 rounded-xl font-bold text-sm uppercase text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors tracking-widest outline-none"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={loading || uploadingAttachment}
                  className="px-10 py-3 bg-[#1F3B8B] text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-md hover:bg-blue-900 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 outline-none focus:ring-2 focus:ring-[#1F3B8B]/50"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {editingInvoiceId ? "อัปเดตข้อมูลใบแจ้งหนี้" : "บันทึกรายการตั้งหนี้"}
                </button>
              </div>
            </form>
          </div>
        )}
        {/* --- ตารางใบตั้งหนี้ (ฉบับปรับปรุงธีม Premium) --- */}
        <div className="bg-white rounded-xl border-2 border-slate-300 shadow-xl overflow-hidden flex flex-col animate-in fade-in duration-500">
          <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2 shadow-sm bg-amber-50 text-amber-600 border-amber-200 shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-widest uppercase">
                  รายการใบตั้งหนี้เจ้าหนี้
                </h2>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                  Accounts Payable List
                </div>
              </div>
            </div>

            <div className="bg-white text-slate-600 border border-slate-300 text-[11px] px-4 py-2 rounded-lg font-bold uppercase tracking-widest shadow-sm">
              จำนวนรายการทั้งหมด: <span className="text-[#1F3B8B] font-black">{invoices.length}</span> บิล
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr className="text-[11px] font-bold uppercase text-slate-500 tracking-widest whitespace-nowrap">
                  <th className="py-4 px-6">กำหนดชำระ</th>
                  <th className="py-4 px-6">ข้อมูลเอกสาร</th>
                  <th className="py-4 px-6">ซัพพลายเออร์</th>
                  <th className="py-4 px-6 text-right">ยอดสุทธิ</th>
                  <th className="py-4 px-6 text-right">จ่ายแล้ว</th>
                  <th className="py-4 px-6 text-right">คงเหลือ</th>
                  <th className="py-4 px-6 text-center">สถานะ</th>
                  <th className="py-4 px-6 text-center">จัดการ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-20 text-center text-slate-500 font-bold">
                      ยังไม่มีรายการใบตั้งหนี้ในระบบ
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const { paidAmount, outstandingAmount } = getPaymentAmounts(inv);
                    const isPaid = inv.status === "PAID" || Number(outstandingAmount || 0) <= 0;
                    const canModify = inv.status === "PENDING" && Number(paidAmount || 0) <= 0;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 align-top">
                          <div className="font-bold text-sm text-slate-900 whitespace-nowrap tabular-nums">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("th-TH") : "-"}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="font-black text-[#1F3B8B] tracking-wide whitespace-nowrap text-sm mb-1">
                            เลขที่ใบแจ้งหนี้: {inv.invoiceNo}
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">
                              ใบกำกับภาษี: <span className="text-slate-700">{inv.taxInvoiceNo || "N/A"}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">
                              รับเอกสาร: <span className="text-slate-700">{inv.receiveDate ? new Date(inv.receiveDate).toLocaleDateString("th-TH") : "N/A"}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">
                              PO: <span className="text-slate-700">{inv.purchaseOrder?.poNumber || "-"}</span> | GR: <span className="text-slate-700">{inv.goodsReceipt?.receiptNo || "-"}</span>
                            </div>
                          </div>

                          {inv.attachmentUrl && (
                            <button
                              type="button"
                              onClick={() => openAttachmentPreview(inv.attachmentUrl, `ใบแจ้งหนี้: ${inv.invoiceNo}`)}
                              className="text-[10px] text-blue-700 font-black hover:underline inline-flex items-center gap-1.5 mt-3 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 transition-colors"
                            >
                              <Paperclip size={11} />
                              เปิดไฟล์แนบ
                              <ExternalLink size={10} />
                            </button>
                          )}

                          {inv.remarks && (
                            <div className="text-[10px] text-slate-500 font-bold mt-3 max-w-[240px] truncate bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              Note: {inv.remarks}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="font-bold text-slate-800 text-sm max-w-[260px] truncate">
                            {inv.supplier?.name || "-"}
                          </div>
                          <div className="text-[10px] font-bold text-[#1F3B8B] uppercase tracking-widest mt-1">
                            รหัสคู่ค้า: {inv.supplier?.code || "-"}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right align-top font-black text-slate-900 tabular-nums text-sm">
                          ฿{formatMoney(inv.grandTotal)}
                        </td>

                        <td className="px-6 py-4 text-right align-top font-bold text-emerald-600 tabular-nums text-sm">
                          ฿{formatMoney(paidAmount)}
                        </td>

                        <td className="px-6 py-4 text-right align-top font-black tabular-nums text-sm">
                          <span className={isPaid ? "text-emerald-700" : "text-rose-600"}>
                            ฿{formatMoney(outstandingAmount)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center align-top">
                          <InvoiceStatusBadge invoice={inv} />
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className="flex justify-center gap-2">
                            {canModify ? (
                              <>
                                <div className="flex justify-center gap-2">
                                  {/* ปุ่มแก้ไข - ธีมน้ำเงินซอฟต์ */}
                                  <button
                                    type="button"
                                    onClick={() => openEditForm(inv)}
                                    className="p-2.5 bg-blue-50 text-[#1F3B8B] border border-blue-100 rounded-xl hover:bg-[#1F3B8B] hover:text-white transition-all duration-200 shadow-sm outline-none"
                                    title="แก้ไข"
                                  >
                                    <Pencil size={16} />
                                  </button>

                                  {/* ปุ่มลบ - ธีมแดงซอฟต์ */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRequest(inv)}
                                    className="p-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-600 hover:text-white transition-all duration-200 shadow-sm outline-none"
                                    title="ลบ"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                {isPaid ? "ชำระสำเร็จ" : "ประวัติการจ่าย"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- ATTACHMENT PREVIEW MODAL (ฉบับปรับปรุงธีม Premium) --- */}
        {attachmentPreview.isOpen && attachmentPreview.url && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    {isImageAttachment(attachmentPreview.url) ? (
                      <ImageIcon className="text-blue-400" size={20} />
                    ) : (
                      <FileText className="text-blue-400" size={20} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold tracking-wide uppercase">
                      ไฟล์แนบใบแจ้งหนี้ / ใบกำกับภาษี
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400 truncate">
                      {attachmentPreview.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAttachmentPreview}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center outline-none"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 bg-slate-100 p-6 overflow-auto">
                {isImageAttachment(attachmentPreview.url) ? (
                  <div className="w-full flex justify-center">
                    <img
                      src={getAttachmentHref(attachmentPreview.url)}
                      alt={attachmentPreview.name}
                      className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md bg-white border border-slate-200"
                    />
                  </div>
                ) : isPdfAttachment(attachmentPreview.url) ? (
                  <iframe
                    src={getAttachmentHref(attachmentPreview.url)}
                    className="w-full h-[75vh] rounded-lg border border-slate-300 shadow-inner bg-white"
                  />
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
                    <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                    <div className="text-base font-bold text-slate-700">
                      ไม่สามารถแสดงตัวอย่างไฟล์ชนิดนี้ได้
                    </div>
                    <div className="text-sm text-slate-400 mt-1">กรุณาดาวน์โหลดเพื่อเปิดดูด้วยโปรแกรมในเครื่องของคุณ</div>
                    <a
                      href={getAttachmentHref(attachmentPreview.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex items-center gap-2 bg-[#1F3B8B] text-white px-6 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md"
                    >
                      <ExternalLink size={14} />
                      เปิดไฟล์ในหน้าต่างใหม่
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* ========================================================= */}
        {/* ให้ก๊อปปี้ตั้งแต่ตรงนี้ เอาไปวางต่อท้าย Attachment Preview เลยครับ */}
        {/* ========================================================= */}
        
        {/* 1. Popup ยืนยันการบันทึก / อัปเดต */}
        {confirmSubmit && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-100">
                <Save className="text-[#1F3B8B] w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {editingInvoiceId ? "ยืนยันการอัปเดตข้อมูล?" : "ยืนยันการบันทึกตั้งหนี้?"}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                โปรดตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setConfirmSubmit(false)}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={executeSubmit}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-[#1F3B8B] text-white hover:bg-blue-900 transition-colors shadow-md"
                >
                  ยืนยันดำเนินการ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Popup ยืนยันการลบ */}
        {confirmDelete.isOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-rose-100">
                <Trash2 className="text-rose-600 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบเอกสาร</h3>
              <p className="text-sm text-slate-500 mb-6">
                ต้องการลบใบแจ้งหนี้ <span className="font-bold text-slate-900">{confirmDelete.invoice?.invoiceNo}</span> ใช่หรือไม่?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setConfirmDelete({ isOpen: false, invoice: null })}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md"
                >
                  ยืนยันการลบ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Popup ยืนยันการยกเลิกฟอร์ม */}
        {confirmCancel && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-100">
                <X className="text-amber-500 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">ละทิ้งการเปลี่ยนแปลง?</h3>
              <p className="text-sm text-slate-500 mb-6">
                ข้อมูลที่คุณกรอกไว้จะไม่ถูกบันทึก ยกเลิกใช่หรือไม่?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  เขียนต่อ
                </button>
                <button
                  type="button"
                  onClick={executeCancel}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-md"
                >
                  ยืนยันละทิ้ง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Popup ดำเนินการสำเร็จ */}
        {successPopup.isOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
                <CheckCircle2 className="text-emerald-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">สำเร็จ!</h3>
              <p className="text-sm text-slate-500 mb-6">
                {successPopup.message}
              </p>
              <button
                type="button"
                onClick={() => setSuccessPopup({ isOpen: false, message: "" })}
                className="w-full py-2.5 rounded-lg font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-md outline-none"
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

function InvoiceStatusBadge({ invoice }) {
  const statusInfo = getInvoiceStatusInfo(invoice);

  return (
    <span
      className={`inline-flex items-center justify-center px-3 py-1 rounded-full border text-[10px] font-black whitespace-nowrap ${statusInfo.className}`}
    >
      {statusInfo.label}
    </span>
  );
}

// แทนที่ฟังก์ชัน InputGroup เดิมด้วยโค้ดนี้
function InputGroup({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error, // เพิ่ม prop error เข้ามา
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e);
          // (Optional) เคลียร์ error ทันทีเมื่อผู้ใช้เริ่มพิมพ์
        }}
        // เอาคำว่า required={required} ออกไป เพื่อปิด Popup บังคับกรอกของระบบ
        className={`w-full border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none transition-all shadow-sm placeholder:text-slate-300 ${error
          ? "border-rose-500 bg-rose-50 focus:border-rose-600 focus:bg-white"
          : "border-slate-200 bg-slate-50 focus:border-[#1F3B8B] focus:bg-white"
          }`}
        placeholder={placeholder}
      />
      {/* ส่วนแสดงข้อความ Error สีแดง */}
      {error && <div className="text-[11px] font-bold text-rose-500 ml-1 mt-1">{error}</div>}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs text-slate-500 uppercase tracking-tighter">
      <span>{label}</span>
      <span>฿{formatMoney(value)}</span>
    </div>
  );
}