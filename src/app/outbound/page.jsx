"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Truck,
  ClipboardCheck,
  ArrowLeft,
  Trash2,
  ShieldCheck,
  Clock,
  LayoutDashboard,
  Info,
  AlertTriangle,
  MapPinned,
  Plus,
  Calendar,
  Loader2,
  CheckCircle2,
  MapPin,
  FileText,
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
        className: "bg-rose-50 text-rose-600 border-rose-200",
      };

    case "HIGH":
      return {
        text: "ด่วน",
        className: "bg-amber-50 text-amber-600 border-amber-200",
      };

    default:
      return {
        text: "ปกติ",
        className: "bg-slate-50 text-slate-600 border-slate-200",
      };
  }
};

function generateDoNo() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DO-${d}-${rand}`;
}

function normalizeApiList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.rows)) return res.rows;
  return [];
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildBackendFileUrl(pdfUrl) {
  const raw = String(pdfUrl || "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  ).replace(/\/+$/, "");

  const backendRoot = apiBase.replace(/\/api$/, "");

  if (raw.startsWith("/api/")) {
    return `${backendRoot}${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${backendRoot}${raw}`;
  }

  return `${backendRoot}/${raw}`;
}

export default function ProfessionalOutboundPage() {
  const [viewMode, setViewMode] = useState("LIST");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [allSRs, setAllSRs] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);
  const [selectedSR, setSelectedSR] = useState(null);

  const [doNo, setDoNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState([]);

  const [successModal, setSuccessModal] = useState(false);
  const [generatedDoPdfUrl, setGeneratedDoPdfUrl] = useState("");
  const [createdDoNo, setCreatedDoNo] = useState("");
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);

  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "primary",
  });

  useEffect(() => {
    if (modal.isOpen || successModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [modal.isOpen, successModal]);

  const closeModal = () => {
    setModal({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
      type: "primary",
    });
  };

  const loadData = async () => {
    setIsLoading(true);

    try {
      const [srRes, balRes] = await Promise.all([
        apiFetch("/outbound/requisitions").catch(() => []),
        apiFetch("/inventory/balances?limit=500").catch(() => []),
      ]);

      const srList = normalizeApiList(srRes);
      const balanceList = normalizeApiList(balRes);

      const filtered = srList.filter(
        (r) => r.status === "APPROVED" || r.status === "COMPLETED"
      );

      setAllSRs(filtered);
      setStockBalances(balanceList);
    } catch (e) {
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const makeBalanceKey = (balance) => {
    return `${balance.productId || balance?.product?.id}|${
      balance.locationId
    }|${balance.lotId}`;
  };

  const getAvailableLots = (productId) => {
    const rows = stockBalances.filter(
      (b) =>
        (b.productId === productId || b?.product?.id === productId) &&
        b.locationId &&
        b.lotId &&
        Number(b.quantity || 0) > 0
    );

    return rows
      .map((b) => {
        const unitCost =
          Number(b.unitCost || 0) ||
          Number(b?.lot?.unitCost || 0) ||
          Number(b?.product?.unitCost || 0) ||
          0;

        return {
          key: makeBalanceKey(b),
          productId: b.productId || b?.product?.id,
          locationId: b.locationId,
          lotId: b.lotId,
          lotNumber: b?.lot?.lotNumber || b?.lotNumber || "-",
          expDate: b?.lot?.expDate || null,
          quantity: Number(b.quantity || 0),
          unitCost,
          location: b.location,
        };
      })
      .sort((a, b) => {
        const aExp = a.expDate ? new Date(a.expDate).getTime() : 9999999999999;
        const bExp = b.expDate ? new Date(b.expDate).getTime() : 9999999999999;

        if (aExp !== bExp) return aExp - bExp;

        return String(a.lotNumber || "").localeCompare(
          String(b.lotNumber || "")
        );
      });
  };

  const getAvailableStock = (productId, locationId, lotId) => {
    if (!productId || !locationId || !lotId) return 0;

    return stockBalances
      .filter(
        (b) =>
          (b.productId === productId || b?.product?.id === productId) &&
          b.locationId === locationId &&
          b.lotId === lotId
      )
      .reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  };

  const handleSelectSR = (sr) => {
    if (sr.status === "COMPLETED") return;

    setSelectedSR(sr);
    setDoNo(generateDoNo());

    const mappedItems = (sr.items || []).map((it) => ({
      id: `${Date.now()}-${Math.random()}`,
      originalId: it.id,
      productId: it.productId,
      productName: it.product?.name,
      sku: it.product?.sku,
      unitName: it.product?.unit?.name || it.product?.unitName || "หน่วย",
      requiredQty: Number(it.quantity || 0),
      quantity: Number(it.quantity || 0),

      selectedBalanceKey: "",
      locationId: "",
      lotId: "",
      lotNumber: "",
      expDate: null,

      remark: it.remark || "",
    }));

    setItems(mappedItems);
    setRemarks("");
    setGeneratedDoPdfUrl("");
    setCreatedDoNo("");
    setViewMode("FORM");
    window.scrollTo(0, 0);
  };

  const getPickedQtyByOriginalId = (originalId) => {
    return items
      .filter((it) => it.originalId === originalId)
      .reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  };

  const getUniqueOriginalItems = () => {
    const map = new Map();

    for (const item of items) {
      if (!map.has(item.originalId)) {
        map.set(item.originalId, item);
      }
    }

    return Array.from(map.values());
  };

  const isAllPickedExactly = () => {
    return getUniqueOriginalItems().every((item) => {
      return (
        getPickedQtyByOriginalId(item.originalId) ===
        Number(item.requiredQty || 0)
      );
    });
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;

        const next = { ...it, [field]: value };

        if (field === "quantity") {
          const n = Number(value);
          next.quantity = Number.isNaN(n) ? 0 : n;
        }

        if (field === "selectedBalanceKey") {
          const selectedBalance = stockBalances.find(
            (b) => makeBalanceKey(b) === value
          );

          if (selectedBalance) {
            next.selectedBalanceKey = value;
            next.locationId = selectedBalance.locationId;
            next.lotId = selectedBalance.lotId;
            next.lotNumber =
              selectedBalance?.lot?.lotNumber ||
              selectedBalance?.lotNumber ||
              "";
            next.expDate = selectedBalance?.lot?.expDate || null;
          } else {
            next.selectedBalanceKey = "";
            next.locationId = "";
            next.lotId = "";
            next.lotNumber = "";
            next.expDate = null;
          }
        }

        return next;
      })
    );
  };

  const handleSplitItem = (itemToSplit) => {
    const currentTotalPicked = getPickedQtyByOriginalId(itemToSplit.originalId);
    const remaining = Number(itemToSplit.requiredQty) - currentTotalPicked;

    const newItem = {
      ...itemToSplit,
      id: `${Date.now()}-${Math.random()}`,
      selectedBalanceKey: "",
      locationId: "",
      lotId: "",
      lotNumber: "",
      expDate: null,
      quantity: remaining > 0 ? remaining : 0,
    };

    const index = items.findIndex((it) => it.id === itemToSplit.id);
    const newItems = [...items];
    newItems.splice(index + 1, 0, newItem);
    setItems(newItems);
  };

  const removeItem = (id) => {
    if (items.length <= 1) {
      toast.error("ต้องมีอย่างน้อย 1 รายการ");
      return;
    }

    setModal({
      isOpen: true,
      title: "ยืนยันการลบรายการ",
      message:
        "คุณต้องการลบพัสดุนี้ออกจากรายการนำจ่ายใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
      type: "danger",
      onConfirm: () => {
        setItems((prev) => prev.filter((it) => it.id !== id));
        closeModal();
        toast.success("ลบรายการสำเร็จ");
      },
    });
  };

  const checkIsOverRequired = (originalId, requiredQty) => {
    const sumInputQty = getPickedQtyByOriginalId(originalId);
    return sumInputQty > Number(requiredQty || 0);
  };

  const canSubmit = useMemo(() => {
    return (
      doNo.trim() !== "" &&
      items.length > 0 &&
      items.every((it) => {
        const lotStock = getAvailableStock(
          it.productId,
          it.locationId,
          it.lotId
        );

        return (
          it.selectedBalanceKey !== "" &&
          it.locationId !== "" &&
          it.lotId !== "" &&
          Number(it.quantity) > 0 &&
          Number(it.quantity) <= lotStock &&
          !checkIsOverRequired(it.originalId, it.requiredQty)
        );
      }) &&
      isAllPickedExactly() &&
      !isSubmitting
    );
  }, [doNo, items, isSubmitting, stockBalances]);

  const handleOpenDoPdf = async () => {
    if (!generatedDoPdfUrl) {
      toast.error("ไม่พบลิงก์ PDF ใบจ่ายสินค้า");
      return;
    }

    setIsOpeningPdf(true);

    try {
      const url = buildBackendFileUrl(generatedDoPdfUrl);
      const token =
        typeof getAccessToken === "function" ? getAccessToken() : null;

      const response = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        let msg = "เปิด PDF ใบจ่ายสินค้าไม่สำเร็จ";

        try {
          const err = await response.json();
          msg = err?.message || msg;
        } catch {}

        throw new Error(msg);
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);

      window.open(fileUrl, "_blank");

      setTimeout(() => {
        window.URL.revokeObjectURL(fileUrl);
      }, 60000);
    } catch (error) {
      toast.error(error.message || "เปิด PDF ใบจ่ายสินค้าไม่สำเร็จ");
    } finally {
      setIsOpeningPdf(false);
    }
  };

  const executeSubmit = async () => {
    closeModal();
    setIsSubmitting(true);

    const tid = toast.loading("กำลังบันทึกข้อมูล...");

    try {
      const currentDoNo = doNo.trim();

      const response = await apiFetch("/outbound/delivery-orders", {
        method: "POST",
        body: JSON.stringify({
          doNo: currentDoNo,
          srId: selectedSR.id,
          reference: selectedSR.srNumber,
          remarks: remarks.trim() || null,
          items: items.map((it) => ({
            productId: it.productId,
            locationId: it.locationId,
            lotId: it.lotId,
            quantity: Number(it.quantity),
          })),
        }),
      });

      const returnedPdfUrl =
        response?.pdfUrl ||
        response?.data?.pdfUrl ||
        response?.data?.pdfPath ||
        response?.pdfPath ||
        `/outbound/delivery-orders/document/${encodeURIComponent(
          currentDoNo
        )}.pdf`;

      setGeneratedDoPdfUrl(returnedPdfUrl);
      setCreatedDoNo(currentDoNo);

      toast.success("จ่ายสินค้า ตัดสต๊อก และบันทึก PDF สำเร็จ", {
        id: tid,
      });

      setViewMode("LIST");
      setSelectedSR(null);
      setItems([]);
      setRemarks("");
      setDoNo("");

      await loadData();

      setSuccessModal(true);
    } catch (err) {
      toast.error(err.message || "ตัดสต๊อกไม่สำเร็จ", { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!canSubmit) {
      toast.error(
        "กรุณาเลือกล๊อตสินค้า ตำแหน่งจัดเก็บ และจำนวนจ่ายให้ครบตามยอดอนุมัติ ก่อนตัดสต๊อก"
      );
      return;
    }

    setModal({
      isOpen: true,
      title: "ยืนยันการจ่ายพัสดุ",
      message:
        "ยอดคงเหลือในล๊อตที่เลือกจะถูกตัดออกทันที และไม่สามารถแก้ไขข้อมูลได้หลังจากนี้ ยืนยันดำเนินการหรือไม่?",
      type: "primary",
      onConfirm: executeSubmit,
    });
  };

  const selectedPriority = getPriorityLabel(selectedSR?.priority);

  return (
    <AuthGate>
      <Toaster position="top-right" />

      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeModal}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner border ${
                modal.type === "danger"
                  ? "bg-rose-100 text-rose-600 border-rose-200"
                  : "bg-emerald-100 text-emerald-600 border-emerald-200"
              }`}
            >
              {modal.type === "danger" ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </div>

            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wider">
                {modal.title}
              </h3>

              <p className="text-sm font-bold text-slate-500">
                {modal.message}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-widest transition-colors shadow-sm"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={modal.onConfirm}
                className={`flex-1 px-4 py-3.5 rounded-lg font-bold text-sm uppercase tracking-widest text-white shadow-sm transition-colors ${
                  modal.type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-emerald-100 animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-emerald-100 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wider">
                บันทึกใบจ่ายสำเร็จ
              </h3>

              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                ระบบได้ตัดสต๊อกตามล๊อตที่เลือกและสร้างเอกสารใบจ่ายสินค้า
                <br />
                เลขที่{" "}
                <span className="text-[#1F3B8B] font-black">
                  {createdDoNo || "-"}
                </span>
              </p>
            </div>

            {generatedDoPdfUrl ? (
              <button
                type="button"
                onClick={handleOpenDoPdf}
                disabled={isOpeningPdf}
                className="w-full py-4 mb-3 bg-[#1F3B8B] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#172e6d] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isOpeningPdf ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                เปิด PDF ใบจ่ายสินค้า
              </button>
            ) : (
              <div className="w-full mb-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs font-bold text-amber-700 leading-relaxed text-center">
                บันทึกใบจ่ายสำเร็จ แต่ยังไม่ได้รับลิงก์ PDF จาก backend
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSuccessModal(false);
                setGeneratedDoPdfUrl("");
                setCreatedDoNo("");
              }}
              className="w-full py-4 rounded-xl font-black text-base text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg transition-all active:scale-95"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full">
            {viewMode === "FORM" && (
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className="flex items-center gap-2 w-fit text-base font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
              </button>
            )}

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                  <Truck className="w-7 h-7 text-[#1F3B8B]" />
                </div>

                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                    {viewMode === "LIST"
                      ? "คิวเบิกและประวัติการนำจ่าย"
                      : "บันทึกการเบิกพัสดุ"}
                  </h1>

                  <p className="text-base text-slate-500 mt-1.5 font-medium flex items-center gap-2">
                    <MapPinned className="w-4 h-4" />
                    Inventory Outbound Management •
                    ระบบบริหารจัดการนำจ่ายสินค้าและตรวจสอบล๊อตสินค้า
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {viewMode === "LIST" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm bg-indigo-50 text-indigo-600 border-indigo-100">
                  <LayoutDashboard className="w-5 h-5" />
                </div>

                <h2 className="text-lg font-bold text-slate-800 tracking-wide uppercase">
                  รายการใบเบิกพัสดุที่ผ่านการอนุมัติ (Approved SR)
                </h2>
              </div>

              <div className="bg-sky-50 text-sky-700 border border-sky-200 text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-wider">
                {allSRs.length} รายการในระบบ
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      เลขที่ใบเบิก
                    </th>

                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      ผู้ขอเบิก / แผนก
                    </th>

                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                      วันที่ต้องการใช้
                    </th>

                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                      ความเร่งด่วน
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
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>

                          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                            กำลังโหลดข้อมูลระบบ...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : allSRs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-20 text-center text-slate-400 font-medium italic"
                      >
                        <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        ไม่มีรายการใบเบิกในขณะนี้
                      </td>
                    </tr>
                  ) : (
                    allSRs.map((sr) => {
                      const p = getPriorityLabel(sr.priority);

                      return (
                        <tr
                          key={sr.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="py-4 px-6">
                            <span
                              className={`text-sm font-bold tracking-tight uppercase ${
                                sr.status === "COMPLETED"
                                  ? "text-slate-400"
                                  : "text-[#1e3b8a]"
                              }`}
                            >
                              {sr.srNumber}
                            </span>

                            {sr.referenceNo && (
                              <p className="text-[10px] font-bold text-slate-400 mt-1">
                                REF: {sr.referenceNo}
                              </p>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span
                                className={`text-sm font-bold uppercase ${
                                  sr.status === "COMPLETED"
                                    ? "text-slate-400"
                                    : "text-slate-800"
                                }`}
                              >
                                {sr.user?.firstName} {sr.user?.lastName}
                              </span>

                              <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                {sr.department?.name}
                              </span>

                              {sr.deliveryLocation && (
                                <span className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {sr.deliveryLocation}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center text-xs font-bold text-slate-600">
                            {formatThaiDate(sr.requiredDate)}
                          </td>

                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-flex px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${p.className}`}
                            >
                              {p.text}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-center">
                            <div className="flex justify-center">
                              <span
                                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 w-fit ${
                                  sr.status === "COMPLETED"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : "bg-amber-50 text-amber-600 border-amber-100"
                                }`}
                              >
                                {sr.status === "COMPLETED" ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    เบิกจ่ายแล้ว
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5" />
                                    รอการนำจ่าย
                                  </>
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right">
                            {sr.status === "COMPLETED" ? (
                              <span className="text-xs font-bold text-slate-400 uppercase italic pr-4">
                                จ่ายออกสำเร็จ ✓
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectSR(sr)}
                                className="bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 inline-flex items-center justify-center ml-auto"
                              >
                                จัดของ & จ่ายออก
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === "FORM" && selectedSR && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500"
          >
            <div className="p-8 md:p-10 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  เลขที่ใบนำจ่าย (Delivery Order):
                </span>

                <h2 className="text-3xl md:text-4xl font-black text-emerald-600 tabular-nums whitespace-nowrap">
                  {doNo}
                </h2>
              </div>

              <div className="flex flex-col items-start md:items-end justify-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  อ้างอิงใบเบิก (SR Ref.):
                </span>

                <p className="text-lg md:text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                  {selectedSR.srNumber}
                </p>
              </div>
            </div>

            <div className="p-8 md:p-10 border-b border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest">
                  ข้อมูลพื้นฐานจากใบเบิกต้นทาง
                </h2>

                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  วันที่ขอเบิก: {formatThaiDate(selectedSR.createdAt)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 md:gap-10 mb-10">
                <InfoBox
                  label="ผู้ขอเบิกพัสดุ"
                  value={`${selectedSR.user?.firstName || ""} ${
                    selectedSR.user?.lastName || ""
                  }`}
                />

                <InfoBox
                  label="ผู้อนุมัติเบิก"
                  value={`${selectedSR.approver?.firstName || "System"} ${
                    selectedSR.approver?.lastName || ""
                  }`}
                />

                <InfoBox
                  label="แผนกที่เบิก"
                  value={selectedSR.department?.name || "ส่วนกลาง"}
                />

                <InfoBox
                  label="เลขอ้างอิงโครงการ"
                  value={selectedSR.referenceNo || "-"}
                />

                <InfoBox
                  label="วันที่ต้องการใช้งาน"
                  value={formatThaiDate(selectedSR.requiredDate)}
                />

                <div className="flex flex-col justify-center space-y-2">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    ความเร่งด่วน
                  </span>

                  <span
                    className={`w-fit px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${selectedPriority.className}`}
                  >
                    {selectedPriority.text}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    วัตถุประสงค์ / โครงการ
                  </span>

                  <p className="text-base text-slate-800 font-semibold leading-relaxed p-6 bg-slate-50 rounded-xl border border-slate-100 italic">
                    "{selectedSR.purpose || "ไม่ได้ระบุวัตถุประสงค์"}"
                  </p>
                </div>

                <div className="space-y-4">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    จุดส่งมอบ / จุดใช้งาน
                  </span>

                  <p className="text-base text-slate-800 font-semibold leading-relaxed p-6 bg-slate-50 rounded-xl border border-slate-100">
                    {selectedSR.deliveryLocation || "ไม่ได้ระบุ"}
                  </p>
                </div>

                <div className="space-y-4">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    หมายเหตุจากผู้เบิก (SR Note)
                  </span>

                  <p className="text-base text-slate-800 font-semibold leading-relaxed p-6 bg-slate-50 rounded-xl border border-slate-100 italic">
                    "{selectedSR.remarks || "ไม่มีหมายเหตุเพิ่มเติม"}"
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 md:px-10 py-8 md:py-10 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-6">
                รายการพัสดุที่ต้องจัดเตรียมและนำจ่าย
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="bg-slate-100 border-b border-slate-200 text-sm font-bold uppercase text-slate-600">
                    <tr>
                      <th className="p-5 text-left">รายการพัสดุ / SKU</th>

                      <th className="p-5 text-center w-32">ยอดเบิกรวม</th>

                      <th className="p-5 text-left w-[42%]">
                        เลือกล๊อต / คลัง / ตำแหน่งจัดเก็บ{" "}
                        <span className="text-rose-500">*</span>
                      </th>

                      <th className="p-5 text-center w-48 whitespace-nowrap">
                        จำนวนที่จ่าย <span className="text-rose-500">*</span>
                      </th>

                      <th className="p-5 text-center w-32">จัดการ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const lots = getAvailableLots(item.productId);
                      const stock = getAvailableStock(
                        item.productId,
                        item.locationId,
                        item.lotId
                      );

                      const isOverStock =
                        item.selectedBalanceKey &&
                        Number(item.quantity) > Number(stock || 0);

                      const currentTotalPicked = getPickedQtyByOriginalId(
                        item.originalId
                      );

                      const isOverRequired =
                        currentTotalPicked > item.requiredQty;

                      const isFullyPicked =
                        currentTotalPicked === item.requiredQty;

                      const isFirstOfGroup =
                        items.findIndex(
                          (it) => it.originalId === item.originalId
                        ) === idx;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-5">
                            {isFirstOfGroup ? (
                              <div className="flex flex-col">
                                <p className="font-bold text-slate-900 text-lg">
                                  {item.productName}
                                </p>

                                <p className="text-sm text-blue-600 font-bold uppercase mt-1">
                                  SKU: {item.sku}
                                </p>

                                <p className="text-[11px] text-slate-400 font-bold mt-1">
                                  หน่วยนับ: {item.unitName}
                                </p>

                                {item.remark && (
                                  <p className="text-[11px] text-amber-600 font-bold mt-2 flex items-center gap-1.5 italic">
                                    <Info className="w-3.5 h-3.5" />
                                    หมายเหตุ: {item.remark}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pl-6 text-slate-400">
                                <div className="w-4 h-4 border-l-2 border-b-2 border-slate-300 rounded-bl-lg mb-1"></div>

                                <span className="text-xs font-bold uppercase italic tracking-wider">
                                  แบ่งเบิกเพิ่ม
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-5 text-center">
                            {isFirstOfGroup ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-slate-900 text-xl tabular-nums">
                                  {item.requiredQty}
                                </span>

                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 border tabular-nums uppercase ${
                                    isFullyPicked
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                      : isOverRequired
                                        ? "bg-rose-50 text-rose-600 border-rose-200"
                                        : "bg-amber-50 text-amber-600 border-amber-200"
                                  }`}
                                >
                                  รวม: {currentTotalPicked}/{item.requiredQty}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">
                                -
                              </span>
                            )}
                          </td>

                          <td className="p-5">
                            <select
                              required
                              value={item.selectedBalanceKey}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "selectedBalanceKey",
                                  e.target.value
                                )
                              }
                              className={`w-full border rounded-lg p-3.5 text-sm font-bold outline-none transition-all cursor-pointer ${
                                item.selectedBalanceKey
                                  ? "border-slate-300 text-slate-900 focus:border-[#1F3B8B]"
                                  : "border-slate-200 text-slate-500 focus:border-[#1F3B8B]"
                              }`}
                            >
                              <option value="">
                                -- เลือกล๊อตสินค้าเพื่อจ่ายออก --
                              </option>

                              {lots.map((l) => (
                                <option key={l.key} value={l.key}>
                                  LOT: {l.lotNumber} | คลัง:{" "}
                                  {l.location?.warehouse?.name ||
                                    l.location?.warehouse?.code ||
                                    "-"}{" "}
                                  | จุดเก็บ:{" "}
                                  {l.location?.name || l.location?.code || "-"}{" "}
                                  | คงเหลือ:{" "}
                                  {Number(l.quantity || 0).toLocaleString()}{" "}
                                  {item.unitName}
                                  {l.expDate
                                    ? ` | EXP: ${formatThaiDate(l.expDate)}`
                                    : ""}
                                  {l.unitCost
                                    ? ` | ต้นทุน: ฿${formatCurrency(
                                        l.unitCost
                                      )}`
                                    : ""}
                                </option>
                              ))}
                            </select>

                            {item.selectedBalanceKey && (
                              <div className="mt-2 space-y-1">
                                <p className="text-[11px] font-bold text-slate-500">
                                  ล๊อตที่เลือก:{" "}
                                  <span className="text-[#1F3B8B]">
                                    {item.lotNumber || "-"}
                                  </span>
                                </p>

                                <p className="text-[11px] font-bold text-slate-400">
                                  คงเหลือในล๊อตนี้:{" "}
                                  {Number(stock || 0).toLocaleString()}{" "}
                                  {item.unitName}
                                </p>
                              </div>
                            )}
                          </td>

                          <td className="p-5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity === 0 ? "" : item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className={`w-28 mx-auto block border rounded-lg py-2.5 text-center tabular-nums font-bold text-lg outline-none transition-all ${
                                isOverStock || isOverRequired
                                  ? "border-rose-400 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-100"
                                  : "border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                              }`}
                            />

                            {isOverStock && (
                              <p className="text-[11px] text-rose-500 font-bold mt-2">
                                เกินคงเหลือในล๊อตนี้
                              </p>
                            )}

                            {isOverRequired && (
                              <p className="text-[11px] text-rose-500 font-bold mt-2">
                                เกินยอดอนุมัติ
                              </p>
                            )}
                          </td>

                          <td className="p-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isFirstOfGroup && (
                                <button
                                  type="button"
                                  onClick={() => handleSplitItem(item)}
                                  title="แยกเบิกจากล๊อตอื่น"
                                  className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm"
                                >
                                  <Plus className="w-5 h-5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                title="ลบรายการนี้"
                                disabled={items.length === 1}
                                className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm disabled:opacity-50"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-8 md:p-10 bg-slate-50 flex flex-col gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    หมายเหตุการนำจ่าย (Remarks)
                  </label>

                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows="3"
                    className="w-full border rounded-lg bg-white p-4 text-base font-medium text-slate-700 outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 transition-all resize-none shadow-sm placeholder:text-slate-400"
                    placeholder="ระบุสภาพสินค้าหรือข้อความฝากถึงผู้รับ..."
                  />
                </div>

                <div className="flex flex-col justify-center items-center lg:items-end gap-4">
                  <div className="flex flex-col items-center lg:items-end w-full">
                    <p className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-1">
                      สถานะความพร้อมข้อมูล
                    </p>

                    {canSubmit ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-lg uppercase tracking-wider">
                        <CheckCircle2 className="w-5 h-5" />
                        พร้อมตัดสต๊อก
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600 font-bold text-sm uppercase tracking-wider">
                        <Clock className="w-4 h-4" />
                        กรุณาเลือกล๊อตสินค้าและจำนวนจ่ายให้ครบตามยอดอนุมัติ
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="w-full lg:w-auto min-w-[240px] bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-bold text-sm uppercase tracking-widest shadow-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        ยืนยันการนำจ่าย
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

function InfoBox({ label, value }) {
  return (
    <div className="flex flex-col justify-center space-y-2">
      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
        {label}
      </span>

      <span className="text-lg md:text-xl font-bold text-slate-900 line-clamp-2">
        {value || "-"}
      </span>
    </div>
  );
}