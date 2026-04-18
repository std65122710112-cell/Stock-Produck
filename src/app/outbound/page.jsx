"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Truck,
  ClipboardCheck,
  Database,
  ArrowLeft,
  Package,
  MapPin,
  User,
  Hash,
  CheckCircle2,
  Trash2,
  Layers,
  ShieldCheck,
  UserCheck,
  Clock,
  X,
  LayoutDashboard,
  Building2,
  MessageSquare,
  Info,
  AlertTriangle,
  ArrowUpRight,
  MapPinned,
  FileText,
  Plus,
  Calendar,
  Loader2,
} from "lucide-react";

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

  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "primary",
  });

  useEffect(() => {
    if (modal.isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [modal.isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [srRes, balRes] = await Promise.all([
        apiFetch("/outbound/requisitions").catch(() => []),
        apiFetch("/inventory/balances").catch(() => []),
      ]);
      const filtered = (Array.isArray(srRes) ? srRes : []).filter(
        (r) => r.status === "APPROVED" || r.status === "COMPLETED",
      );
      setAllSRs(filtered);
      setStockBalances(Array.isArray(balRes) ? balRes : balRes?.data || []);
    } catch (e) {
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectSR = (sr) => {
    if (sr.status === "COMPLETED") return;
    setSelectedSR(sr);
    setDoNo(
      `DO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    );
    const mappedItems = (sr.items || []).map((it) => ({
      id: Date.now() + Math.random(),
      originalId: it.id,
      productId: it.productId,
      productName: it.product?.name,
      sku: it.product?.sku,
      requiredQty: Number(it.quantity),
      quantity: Number(it.quantity),
      locationId: "",
      remark: it.remark,
    }));
    setItems(mappedItems);
    setRemarks("");
    setViewMode("FORM");
  };

  const getAvailableLocations = (productId) =>
    stockBalances.filter((b) => b.productId === productId && b.quantity > 0);

  const getAvailableStock = (productId, locationId) => {
    const balance = stockBalances.find(
      (b) => b.productId === productId && b.locationId === locationId,
    );
    return balance ? balance.quantity : 0;
  };

  const updateItem = (id, field, value) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    );

  const handleSplitItem = (itemToSplit) => {
    const currentTotalPicked = items
      .filter((it) => it.originalId === itemToSplit.originalId)
      .reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    const remaining = itemToSplit.requiredQty - currentTotalPicked;

    const newItem = {
      ...itemToSplit,
      id: Date.now() + Math.random(),
      locationId: "",
      quantity: remaining > 0 ? remaining : 0,
    };

    const index = items.findIndex((it) => it.id === itemToSplit.id);
    const newItems = [...items];
    newItems.splice(index + 1, 0, newItem);
    setItems(newItems);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setModal({
        isOpen: true,
        title: "ยืนยันการลบรายการ",
        message:
          "คุณต้องการลบพัสดุนี้ออกจากรายการนำจ่ายใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
        type: "danger",
        onConfirm: () => {
          setItems(items.filter((it) => it.id !== id));
          setModal({ ...modal, isOpen: false });
          toast.success("ลบรายการสำเร็จ");
        },
      });
    } else {
      toast.error("ต้องมีอย่างน้อย 1 รายการ");
    }
  };

  const checkIsOverRequired = (originalId, requiredQty) => {
    const sumInputQty = items
      .filter((it) => it.originalId === originalId)
      .reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    return sumInputQty > requiredQty;
  };

  const canSubmit = useMemo(() => {
    return (
      doNo.trim() !== "" &&
      items.every((it) => {
        return (
          it.locationId !== "" &&
          it.quantity > 0 &&
          it.quantity <= getAvailableStock(it.productId, it.locationId) &&
          !checkIsOverRequired(it.originalId, it.requiredQty)
        );
      }) &&
      !isSubmitting
    );
  }, [doNo, items, isSubmitting, stockBalances]);

  const executeSubmit = async () => {
    setModal({ ...modal, isOpen: false });
    setIsSubmitting(true);
    const tid = toast.loading("กำลังบันทึกข้อมูล...");
    try {
      await apiFetch("/outbound/delivery-orders", {
        method: "POST",
        body: JSON.stringify({
          doNo: doNo.trim(),
          srId: selectedSR.id,
          reference: selectedSR.srNumber,
          remarks: remarks.trim(),
          items: items.map((it) => ({
            productId: it.productId,
            locationId: it.locationId,
            quantity: Number(it.quantity),
          })),
        }),
      });
      toast.success("จ่ายสินค้าและตัดสต๊อกสำเร็จ", { id: tid });
      setViewMode("LIST");
      loadData();
    } catch (err) {
      toast.error(err.message, { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setModal({
      isOpen: true,
      title: "ยืนยันการจ่ายพัสดุ",
      message:
        "ยอดคงเหลือในคลังจะถูกตัดออกทันที และไม่สามารถแก้ไขข้อมูลได้หลังจากนี้ ยืนยันดำเนินการหรือไม่?",
      type: "primary",
      onConfirm: executeSubmit,
    });
  };

  return (
    <AuthGate>
      <Toaster position="top-right" />

      {/* --- CUSTOM FIXED MODAL --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setModal({ ...modal, isOpen: false })}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner border ${modal.type === "danger" ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-emerald-100 text-emerald-600 border-emerald-200"}`}
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
                onClick={() => setModal({ ...modal, isOpen: false })}
                className="flex-1 px-4 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-widest transition-colors shadow-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={modal.onConfirm}
                className={`flex-1 px-4 py-3.5 rounded-lg font-bold text-sm uppercase tracking-widest text-white shadow-sm transition-colors ${modal.type === "danger"
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

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
        {/* HEADER SECTION */}
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
                  <Truck className="w-7 h-7 text-[#1F3B8B]" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                    {viewMode === "LIST" ? "คิวเบิกและประวัติการนำจ่าย" : "บันทึกการเบิกพัสดุ"}
                  </h1>
                  <p className="text-base text-slate-500 mt-1.5 font-medium flex items-center gap-2">
                    <MapPinned className="w-4 h-4" /> Inventory Outbound Management • ระบบบริหารจัดการนำจ่ายสินค้าและตรวจสอบตำแหน่งจัดเก็บ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- LIST VIEW --- */}
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
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เลขที่ใบเบิก</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ขอเบิก / แผนก</th>
                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้อนุมัติ</th>
                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>
                          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">กำลังโหลดข้อมูลระบบ...</p>
                        </div>
                      </td>
                    </tr>
                  ) : allSRs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-20 text-center text-slate-400 font-medium italic">
                        <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        ไม่มีรายการใบเบิกในขณะนี้
                      </td>
                    </tr>
                  ) : (
                    allSRs.map((sr) => (
                      <tr key={sr.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6">
                          <span className={`text-sm font-bold tracking-tight uppercase ${sr.status === "COMPLETED" ? "text-slate-400" : "text-[#1e3b8a]"}`}>
                            {sr.srNumber}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold uppercase ${sr.status === "COMPLETED" ? "text-slate-400" : "text-slate-800"}`}>
                              {sr.user?.firstName} {sr.user?.lastName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                              {sr.department?.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-xs font-bold text-slate-700 uppercase">
                            {sr.approver?.firstName || "System"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 w-fit ${sr.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                              {sr.status === "COMPLETED" ? <><CheckCircle2 className="w-3.5 h-3.5" /> เบิกจ่ายแล้ว</> : <><Clock className="w-3.5 h-3.5" /> รอการนำจ่าย</>}
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
                              onClick={() => handleSelectSR(sr)}
                              className="bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 inline-flex items-center justify-center ml-auto"
                            >
                              จัดของ & จ่ายออก
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

        {/* --- FORM MODE --- */}
        {viewMode === "FORM" && selectedSR && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500"
          >
            {/* 1. Header Document */}
            <div className="p-8 md:p-10 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">เลขที่ใบนำจ่าย (Delivery Order):</span>
                <h2 className="text-3xl md:text-4xl font-black text-emerald-600 tabular-nums whitespace-nowrap">
                  {doNo}
                </h2>
              </div>
              <div className="flex flex-col items-start md:items-end justify-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1.5">อ้างอิงใบเบิก (SR Ref.):</span>
                <p className="text-lg md:text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                  {selectedSR.srNumber}
                </p>
              </div>
            </div>

            {/* 2. SR Details */}
            <div className="p-8 md:p-10 border-b border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest">
                  ข้อมูลพื้นฐานจากใบเบิกต้นทาง 
                </h2>
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-400" /> วันที่ขอเบิก: {new Date(selectedSR.createdAt).toLocaleDateString("th-TH")}
                </span>
              </div>

              {/* ข้อมูล 4 คอลัมน์ (ย้ายเลขอ้างอิงขึ้นมาเป็นหัวข้อหลัก) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-10">
                <div className="flex flex-col justify-center space-y-2">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">ผู้ขอเบิกพัสดุ</span>
                  <span className="text-lg md:text-xl font-bold text-slate-900">{selectedSR.user?.firstName} {selectedSR.user?.lastName}</span>
                </div>

                <div className="flex flex-col justify-center space-y-2">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">ผู้อนุมัติเบิก</span>
                  <span className="text-lg md:text-xl font-bold text-slate-900">{selectedSR.approver?.firstName} {selectedSR.approver?.lastName}</span>
                </div>

                <div className="flex flex-col justify-center space-y-2">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">แผนกที่เบิก</span>
                  <span className="text-lg md:text-xl font-bold text-slate-900">{selectedSR.department?.name || "ส่วนกลาง (General)"}</span>
                </div>

                <div className="flex flex-col justify-center space-y-2">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">เลขอ้างอิงโครงการ</span>
                  {selectedSR.referenceNo ? (
                    <span className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-wider">
                      REF: {selectedSR.referenceNo}
                    </span>
                  ) : (
                    <span className="text-lg md:text-xl font-bold text-slate-400 italic">-</span>
                  )}
                </div>
              </div>

              {/* วัตถุประสงค์และหมายเหตุ (เรียบง่าย ไม่เป็นกล่องหนา) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">วัตถุประสงค์ / โครงการ</span>
                  <p className="text-base text-slate-800 font-semibold leading-relaxed p-6 bg-slate-50 rounded-xl border border-slate-100 italic">
                    "{selectedSR.purpose || "ไม่ได้ระบุวัตถุประสงค์"}"
                  </p>
                </div>

                <div className="space-y-4">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">หมายเหตุจากผู้เบิก (SR Note)</span>
                  <p className="text-base text-slate-800 font-semibold leading-relaxed p-6 bg-slate-50 rounded-xl border border-slate-100 italic">
                    "{selectedSR.remarks || "ไม่มีหมายเหตุเพิ่มเติม"}"
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Items Table */}
            <div className="px-8 md:px-10 py-8 md:py-10 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-6">
                รายการพัสดุที่ต้องจัดเตรียมและนำจ่าย
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-100 border-b border-slate-200 text-sm font-bold uppercase text-slate-600">
                    <tr>
                      <th className="p-5 text-left">รายการพัสดุ / SKU</th>
                      <th className="p-5 text-center w-32">ยอดเบิกรวม</th>
                      <th className="p-5 text-left w-[35%]">
                        หยิบจากคลัง/โซน (Location) <span className="text-rose-500">*</span>
                      </th>
                      <th className="p-5 text-center w-48 whitespace-nowrap">
                        จำนวนที่จ่าย <span className="text-rose-500">*</span>
                      </th>
                      <th className="p-5 text-center w-32">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const locs = getAvailableLocations(item.productId);
                      const stock = getAvailableStock(item.productId, item.locationId);
                      const isOverStock = item.quantity > stock;
                      const currentTotalPicked = items
                        .filter((it) => it.originalId === item.originalId)
                        .reduce((sum, it) => sum + Number(it.quantity || 0), 0);
                      const isOverRequired = currentTotalPicked > item.requiredQty;
                      const isFullyPicked = currentTotalPicked === item.requiredQty;
                      const isFirstOfGroup = items.findIndex((it) => it.originalId === item.originalId) === idx;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5">
                            {isFirstOfGroup ? (
                              <div className="flex flex-col">
                                <p className="font-bold text-slate-900 text-lg">{item.productName}</p>
                                <p className="text-sm text-blue-600 font-bold uppercase mt-1">SKU: {item.sku}</p>
                                {item.remark && (
                                  <p className="text-[11px] text-amber-600 font-bold mt-2 flex items-center gap-1.5 italic">
                                    <Info className="w-3.5 h-3.5" /> หมายเหตุ: {item.remark}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pl-6 text-slate-400">
                                <div className="w-4 h-4 border-l-2 border-b-2 border-slate-300 rounded-bl-lg mb-1"></div>
                                <span className="text-xs font-bold uppercase italic tracking-wider">แบ่งเบิกเพิ่ม</span>
                              </div>
                            )}
                          </td>
                          <td className="p-5 text-center">
                            {isFirstOfGroup ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-slate-900 text-xl tabular-nums">
                                  {item.requiredQty}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 border tabular-nums uppercase ${isFullyPicked ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isOverRequired ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-amber-50 text-amber-600 border-amber-200"
                                  }`}>
                                  รวม: {currentTotalPicked}/{item.requiredQty}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">-</span>
                            )}
                          </td>
                          <td className="p-5">
                            <select
                              required
                              value={item.locationId}
                              onChange={(e) => updateItem(item.id, "locationId", e.target.value)}
                              className={`w-full border rounded-lg p-3.5 text-sm font-bold outline-none transition-all cursor-pointer ${item.locationId ? 'border-slate-300 text-slate-900 focus:border-[#1F3B8B]' : 'border-slate-200 text-slate-500 focus:border-[#1F3B8B]'
                                }`}
                            >
                              <option value="">-- เลือกตำแหน่งเพื่อหยิบสินค้า --</option>
                              {locs.map((l) => (
                                <option key={l.locationId} value={l.locationId}>
                                  {l.location.warehouse?.name} | จุดเก็บ: {l.location.name || l.location.code} (สต๊อก: {l.quantity})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity === 0 ? "" : item.quantity}
                              onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                              className={`w-28 mx-auto block border rounded-lg py-2.5 text-center tabular-nums font-bold text-lg outline-none transition-all ${isOverStock || isOverRequired
                                  ? "border-rose-400 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-100"
                                  : "border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                                }`}
                            />
                          </td>
                          <td className="p-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isFirstOfGroup && (
                                <button
                                  type="button"
                                  onClick={() => handleSplitItem(item)}
                                  title="แยกเบิกจากคลังอื่น"
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

            {/* 4. Execution Area / Action */}
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
                    <p className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-1">สถานะความพร้อมข้อมูล</p>
                    {canSubmit ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-lg uppercase tracking-wider">
                        <CheckCircle2 className="w-5 h-5" /> พร้อมตัดสต๊อก
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600 font-bold text-sm uppercase tracking-wider">
                        <Clock className="w-4 h-4" /> กรุณาระบุข้อมูลให้ครบ
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
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