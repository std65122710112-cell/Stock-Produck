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

  const handleDeleteInvoice = async (invoice) => {
    const ok = window.confirm(
      `ต้องการลบใบแจ้งหนี้เลขที่ ${invoice.invoiceNo} ใช่หรือไม่?`
    );

    if (!ok) return;

    setLoading(true);

    try {
      await apiFetch(`/ap/invoices/${invoice.id}`, {
        method: "DELETE",
      });

      toast.success("ลบใบแจ้งหนี้สำเร็จ");
      loadData();
    } catch (err) {
      toast.error(err.message || "ลบใบแจ้งหนี้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.invoiceNo) return toast.error("กรุณาระบุเลขที่ใบแจ้งหนี้");
    if (!formData.supplierId) return toast.error("กรุณาเลือกซัพพลายเออร์");

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

      toast.success(
        editingInvoiceId ? "แก้ไขใบแจ้งหนี้สำเร็จ" : "บันทึกการตั้งหนี้สำเร็จ"
      );

      setShowForm(false);
      resetFormState();
      loadData();
    } catch (err) {
      toast.error(err.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGate requiredPermissions={["AP_READ"]}>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 py-8 space-y-8 min-h-screen">
        <div className="flex justify-between items-end border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
              <Wallet className="text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">
                AP & Tax Management
              </h1>

              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                ระบบตั้งหนี้และคำนวณภาษีหัก ณ ที่จ่ายระดับองค์กร
              </p>
            </div>
          </div>

          {!showForm && (
            <button
              onClick={openCreateForm}
              className="bg-[#1F3B8B] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus size={16} /> สร้างใบตั้งหนี้ใหม่
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FileText className="text-blue-400 w-5 h-5" />
                </div>

                <div>
                  <span className="font-black text-sm uppercase tracking-widest block">
                    {editingInvoiceId
                      ? "Edit Invoice Form"
                      : "Invoice Entry Form"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    3-Way Matching Verification
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                className="bg-white/5 hover:bg-rose-500/20 hover:text-rose-500 p-2 rounded-full transition-colors"
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-4 h-[2px] bg-blue-600"></div>
                    1. ข้อมูลเอกสาร
                  </h3>

                  <InputGroup
                    label="เลขที่ใบแจ้งหนี้ (Invoice No.)"
                    value={formData.invoiceNo}
                    onChange={(e) =>
                      setFormData({ ...formData, invoiceNo: e.target.value })
                    }
                    required
                    placeholder="INV-2026-XXXX"
                  />

                  <InputGroup
                    label="เลขที่ใบกำกับภาษี (Tax Invoice)"
                    value={formData.taxInvoiceNo}
                    onChange={(e) =>
                      setFormData({ ...formData, taxInvoiceNo: e.target.value })
                    }
                    placeholder="ระบุเพื่อทำรายงานภาษีซื้อ"
                  />

                  <InputGroup
                    type="date"
                    label="วันที่รับเอกสารจริง"
                    value={formData.receiveDate}
                    onChange={(e) =>
                      setFormData({ ...formData, receiveDate: e.target.value })
                    }
                  />

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">
                      ไฟล์แนบใบแจ้งหนี้ / ใบกำกับภาษี
                    </label>

                    <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50 p-4 hover:bg-white transition-all">
                      <label className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                          {uploadingAttachment ? (
                            <RefreshCw
                              className="animate-spin text-blue-600"
                              size={18}
                            />
                          ) : (
                            <UploadCloud className="text-blue-600" size={18} />
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-black text-slate-700 uppercase">
                            {uploadingAttachment
                              ? "กำลังอัปโหลด..."
                              : "คลิกเพื่ออัปโหลดไฟล์"}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-1">
                            PDF, JPG, PNG, WEBP ขนาดไม่เกิน 10MB
                          </div>
                        </div>

                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
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
                      <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            openAttachmentPreview(
                              formData.attachmentUrl,
                              "ไฟล์แนบใบแจ้งหนี้ / ใบกำกับภาษี"
                            )
                          }
                          className="text-xs font-black text-blue-700 hover:underline flex items-center gap-2 truncate"
                        >
                          <Paperclip size={14} />
                          เปิดไฟล์แนบที่อัปโหลดแล้ว
                          <ExternalLink size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              attachmentUrl: "",
                            }))
                          }
                          className="text-[10px] font-black text-rose-600 hover:text-rose-800 uppercase"
                        >
                          ลบออกจากฟอร์ม
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 relative z-[100]">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      อ้างอิงใบรับของ / ใบสั่งซื้อ
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={grSearch}
                          onChange={(e) => handleGRSearchChange(e.target.value)}
                          onFocus={() => setShowGrDropdown(true)}
                          onBlur={() => {
                            setTimeout(() => setShowGrDropdown(false), 180);
                          }}
                          placeholder="ค้นหาเลข GR"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-300"
                        />

                        {formData.grId && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={clearGRSelection}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={selectedGrInfo.poNo || ""}
                        readOnly
                        placeholder="PO จะแสดงอัตโนมัติ"
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-700 outline-none cursor-default placeholder:text-slate-300"
                      />
                    </div>

                    {selectedGrInfo.supplierName && (
                      <div className="text-[10px] font-bold text-slate-400 ml-1">
                        Supplier: {selectedGrInfo.supplierName}
                      </div>
                    )}

                    {showGrDropdown && (
                      <div
                        className="absolute left-0 right-0 top-full z-[9999] mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl"
                        style={{
                          maxHeight: "320px",
                          overflowY: "auto",
                          overscrollBehavior: "contain",
                        }}
                      >
                        {filteredGoodsReceipts.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs font-bold text-slate-400">
                            ไม่พบใบรับของที่ตรงกับคำค้นหา
                          </div>
                        ) : (
                          filteredGoodsReceipts.map((gr) => {
                            const info = getGRInfo(gr);

                            return (
                              <button
                                key={gr.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleGRSelection(gr.id, info)}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 ${
                                  formData.grId === gr.id
                                    ? "bg-blue-50"
                                    : "bg-white"
                                }`}
                              >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                  <div>
                                    <div className="text-sm font-black text-slate-900">
                                      {info.grNo}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400">
                                      GR Reference
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[12px] font-black text-blue-600">
                                      {info.poNo}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400">
                                      PO Reference
                                    </div>
                                  </div>

                                  <div className="text-[10px] font-bold text-slate-500 md:text-right">
                                    {info.supplierName ||
                                      "ไม่พบชื่อซัพพลายเออร์"}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-4 h-[2px] bg-blue-600"></div>
                    2. คู่ค้าและเครดิต
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      ซัพพลายเออร์
                    </label>

                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
                      value={formData.supplierId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplierId: e.target.value,
                        })
                      }
                    >
                      <option value="">-- เลือกซัพพลายเออร์ --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <InputGroup
                    type="date"
                    label="วันที่ในเอกสาร"
                    value={formData.issueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, issueDate: e.target.value })
                    }
                  />

                  <InputGroup
                    type="date"
                    label="วันครบกำหนดชำระ"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4">
                    3. สรุปภาษีและยอดสุทธิ
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        หัก ณ ที่จ่าย (Withholding Tax)
                      </label>

                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-blue-600"
                        value={formData.whtRate}
                        onChange={(e) => handleWHTChange(e.target.value)}
                      >
                        <option value="0">0% - ไม่มีหัก ณ ที่จ่าย</option>
                        <option value="1">1% - ค่าขนส่ง</option>
                        <option value="3">3% - ค่าบริการ/รับเหมา</option>
                        <option value="5">5% - ค่าเช่า</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-slate-200 space-y-3 font-bold">
                      <SummaryRow
                        label="Sub Total:"
                        value={formData.subTotal}
                      />
                      <SummaryRow
                        label={`VAT (${formData.vatRate}%):`}
                        value={formData.vatAmount}
                      />

                      <div className="flex justify-between text-xs text-rose-500 uppercase tracking-tighter">
                        <span>WHT ({formData.whtRate}%):</span>
                        <span>- ฿{formatMoney(formData.whtAmount)}</span>
                      </div>

                      <div className="flex justify-between text-xl font-black text-[#1F3B8B] pt-2 border-t border-slate-900/10">
                        <span className="uppercase italic">Net Pay:</span>
                        <span>฿{formatMoney(formData.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ตารางรายการ */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-4 h-[2px] bg-blue-600"></div>
                  4. รายละเอียดรายการ (Invoice Line Items)
                </h3>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-900 text-white">
                      <tr className="font-black uppercase tracking-widest">
                        <th className="px-6 py-4 text-left">Product Detail</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4 text-right">Unit Price</th>
                        <th className="px-6 py-4 text-right">Total Amount</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {formData.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic"
                          >
                            เลือกใบ GR เพื่อแสดงรายการโดยอัตโนมัติ
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((item, idx) => (
                          <tr key={`${item.productId}-${idx}`}>
                            <td className="px-6 py-4">
                              <div className="font-black text-slate-900">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-blue-600 font-bold">
                                SKU: {item.sku}
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center font-black text-slate-700">
                              {Number(item.quantity || 0).toLocaleString()}
                            </td>

                            <td className="px-6 py-4 text-right font-bold">
                              ฿{formatMoney(item.unitPrice)}
                            </td>

                            <td className="px-6 py-4 text-right font-black text-blue-800">
                              ฿{formatMoney(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">
                  หมายเหตุภายในฝ่ายบัญชี
                </label>

                <textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  rows={3}
                  placeholder="เช่น เอกสารรอตรวจสอบ, รอใบกำกับภาษีตัวจริง, นัดจ่ายรอบสิ้นเดือน"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 shadow-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="px-8 py-3 rounded-xl font-bold text-xs uppercase text-slate-500 hover:bg-slate-100 transition-all tracking-widest"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || uploadingAttachment}
                  className="px-12 py-3 bg-[#1F3B8B] text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-900 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {editingInvoiceId ? "Update Invoice" : "Post to Ledger"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ตารางใบตั้งหนี้ */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50/50 flex justify-between items-center border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-amber-500" />
              <h3 className="text-xs font-black text-slate-700 tracking-widest">
                รายการใบตั้งหนี้เจ้าหนี้
              </h3>
            </div>

            <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black tracking-tighter border border-blue-100">
              จำนวนรายการทั้งหมด: {invoices.length} บิล
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 tracking-[0.2em] bg-slate-50/30">
                  <th className="px-6 py-5 text-left">กำหนดชำระ</th>
                  <th className="px-6 py-5 text-left">ข้อมูลเอกสาร</th>
                  <th className="px-6 py-5 text-left">ซัพพลายเออร์</th>
                  <th className="px-6 py-5 text-right">ยอดสุทธิ</th>
                  <th className="px-6 py-5 text-right">จ่ายแล้ว</th>
                  <th className="px-6 py-5 text-right">คงเหลือ</th>
                  <th className="px-6 py-5 text-center">สถานะ</th>
                  <th className="px-6 py-5 text-center">จัดการ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const { paidAmount, outstandingAmount } =
                    getPaymentAmounts(inv);

                  const isPaid =
                    inv.status === "PAID" ||
                    Number(outstandingAmount || 0) <= 0;

                  const canModify =
                    inv.status === "PENDING" && Number(paidAmount || 0) <= 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 align-top">
                        <div className="font-black text-sm text-slate-900 whitespace-nowrap">
                          {inv.dueDate
                            ? new Date(inv.dueDate).toLocaleDateString("th-TH")
                            : "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="font-black text-blue-700 tracking-tighter whitespace-nowrap">
                          เลขที่ใบแจ้งหนี้: {inv.invoiceNo}
                        </div>

                        <div className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                          ใบกำกับภาษี: {inv.taxInvoiceNo || "N/A"}
                        </div>

                        <div className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                          รับเอกสาร:{" "}
                          {inv.receiveDate
                            ? new Date(inv.receiveDate).toLocaleDateString(
                                "th-TH"
                              )
                            : "N/A"}
                        </div>

                        <div className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                          PO: {inv.purchaseOrder?.poNumber || "-"} | GR:{" "}
                          {inv.goodsReceipt?.receiptNo || "-"}
                        </div>

                        {inv.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              openAttachmentPreview(
                                inv.attachmentUrl,
                                `ไฟล์แนบใบแจ้งหนี้: ${inv.invoiceNo || ""}`
                              )
                            }
                            className="text-[10px] text-blue-600 font-black hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <Paperclip size={11} />
                            เปิดไฟล์แนบ
                            <ExternalLink size={10} />
                          </button>
                        )}

                        {inv.remarks && (
                          <div className="text-[10px] text-slate-500 font-bold mt-1 max-w-[260px] truncate">
                            หมายเหตุ: {inv.remarks}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-slate-700 max-w-[260px] truncate">
                          {inv.supplier?.name || "-"}
                        </div>
                        <div className="text-[9px] font-black text-slate-400">
                          รหัสคู่ค้า: {inv.supplier?.code || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right align-top font-black text-slate-900 whitespace-nowrap">
                        ฿{formatMoney(inv.grandTotal)}
                      </td>

                      <td className="px-6 py-4 text-right align-top font-bold text-emerald-700 whitespace-nowrap">
                        ฿{formatMoney(paidAmount)}
                      </td>

                      <td className="px-6 py-4 text-right align-top font-black whitespace-nowrap">
                        <span
                          className={
                            isPaid ? "text-emerald-700" : "text-rose-600"
                          }
                        >
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
                              <button
                                type="button"
                                onClick={() => openEditForm(inv)}
                                className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                              >
                                <Pencil size={13} /> แก้ไข
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteInvoice(inv)}
                                className="bg-rose-50 text-rose-700 px-4 py-2.5 rounded-xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2"
                              >
                                <Trash2 size={13} /> ลบ
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-black text-slate-400">
                              {isPaid ? "ชำระแล้ว" : "มีประวัติการจ่าย"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {invoices.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-slate-400 font-bold tracking-widest italic"
                    >
                      ยังไม่มีรายการใบตั้งหนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {attachmentPreview.isOpen && attachmentPreview.url && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    {isImageAttachment(attachmentPreview.url) ? (
                      <ImageIcon className="text-blue-400" size={22} />
                    ) : (
                      <FileText className="text-blue-400" size={22} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-black tracking-widest">
                      ไฟล์แนบใบแจ้งหนี้ / ใบกำกับภาษี
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 truncate">
                      {attachmentPreview.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAttachmentPreview}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 bg-slate-50 max-h-[calc(92vh-88px)] overflow-auto">
                {isImageAttachment(attachmentPreview.url) ? (
                  <div className="w-full flex justify-center">
                    <img
                      src={getAttachmentHref(attachmentPreview.url)}
                      alt={attachmentPreview.name || "ไฟล์แนบใบแจ้งหนี้"}
                      className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-slate-200 bg-white shadow-sm"
                      onError={() => {
                        toast.error(
                          "เปิดรูปไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า static uploads ของ backend"
                        );
                      }}
                    />
                  </div>
                ) : isPdfAttachment(attachmentPreview.url) ? (
                  <iframe
                    src={getAttachmentHref(attachmentPreview.url)}
                    title="ไฟล์แนบใบแจ้งหนี้ / ใบกำกับภาษี"
                    className="w-full h-[75vh] rounded-2xl border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <FileText size={42} className="mx-auto text-slate-400" />
                    <div className="mt-4 text-sm font-black text-slate-700">
                      ไม่สามารถแสดงตัวอย่างไฟล์ชนิดนี้ได้
                    </div>
                    <a
                      href={getAttachmentHref(attachmentPreview.url)}
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

function InputGroup({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 shadow-sm"
        placeholder={placeholder}
      />
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