"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
  RefreshCw,
  Database,
  ArrowRightLeft,
  Plus,
  Trash2,
  Truck,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";

export default function TwoStepTransferPage() {
  const [activeTab, setActiveTab] = useState("SHIP");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Master Data ---
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);

  // --- SHIP ---
  const [reason, setReason] = useState("");
  const [shipItems, setShipItems] = useState([
    {
      productId: "",
      sourceBalanceKey: "",
      fromLocationId: "",
      toLocationId: "",
      lotId: null,
      quantity: 1,
    },
  ]);

  // --- RECEIVE ---
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);

  const previewTransferNo = useMemo(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    return `TO-${dateStr}-XXXX`;
  }, []);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (activeTab === "RECEIVE") {
      loadPendingTransfers();
    }
  }, [activeTab]);

  async function loadMasterData() {
    try {
      const [pRes, lRes, bRes] = await Promise.all([
        apiFetch("/master/products").catch(() => []),
        apiFetch("/master/locations").catch(() => []),
        apiFetch("/inventory/balances").catch(() => []),
      ]);

      setProducts(Array.isArray(pRes) ? pRes : pRes?.data || []);
      setLocations(Array.isArray(lRes) ? lRes : lRes?.data || []);
      setStockBalances(Array.isArray(bRes) ? bRes : bRes?.data || []);
    } catch {
      toast.error("ดึงข้อมูลระบบล้มเหลว");
    }
  }

  async function loadPendingTransfers() {
    try {
      const res = await apiFetch("/api/transfer").catch(() => []);
      const data = Array.isArray(res) ? res : res?.data || [];
      setPendingTransfers(data);
      setSelectedTransfer(null);
      setReceiveItems([]);
    } catch {
      toast.error("ดึงข้อมูลรายการรอรับล้มเหลว");
    }
  }

  const formatLocationFull = (loc) => {
    if (!loc) return "ไม่ระบุตำแหน่ง";
    const whPart = loc.warehouse
      ? `[${loc.warehouse.code}] ${loc.warehouse.name}`
      : "ไม่ระบุคลัง";
    const zonePart = loc.zone ? ` | ${loc.zone.name || loc.zone.code}` : "";
    return `${whPart}${zonePart} > ${loc.code}`;
  };

  const formatBalanceOptionLabel = (balance) => {
    const productPart = balance.product?.sku
      ? `[${balance.product.sku}] ${balance.product.name || ""}`
      : balance.product?.name || "Unknown Product";

    const locationPart = formatLocationFull(balance.location);
    const lotPart = balance.lot?.lotNumber ? ` | Lot: ${balance.lot.lotNumber}` : " | No Lot";
    const expPart = balance.lot?.expDate
      ? ` | EXP: ${new Date(balance.lot.expDate).toLocaleDateString("th-TH")}`
      : "";
    const qtyPart = ` | คงเหลือ: ${Number(balance.quantity || 0).toLocaleString()}`;
    const costPart =
      Number(balance.unitCost || 0) > 0
        ? ` | ต้นทุน: ${Number(balance.unitCost).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}`
        : "";

    return `${productPart} | ${locationPart}${lotPart}${expPart}${qtyPart}${costPart}`;
  };

  const getAvailableBalances = (productId) => {
    return stockBalances.filter(
      (b) => b.productId === productId && Number(b.quantity || 0) > 0
    );
  };

  const getSelectedBalance = (item) => {
    if (!item.sourceBalanceKey) return null;
    return stockBalances.find((b) => b.id === item.sourceBalanceKey) || null;
  };

  const updateShipItem = (idx, field, value) => {
    const next = [...shipItems];
    next[idx][field] = value;

    if (field === "productId") {
      next[idx].sourceBalanceKey = "";
      next[idx].fromLocationId = "";
      next[idx].lotId = null;
      next[idx].quantity = 1;
    }

    if (field === "sourceBalanceKey") {
      const balance = stockBalances.find((b) => b.id === value);
      next[idx].fromLocationId = balance?.locationId || "";
      next[idx].lotId = balance?.lotId || null;
      next[idx].quantity = 1;
    }

    setShipItems(next);
  };

  const addShipItem = () => {
    setShipItems([
      ...shipItems,
      {
        productId: "",
        sourceBalanceKey: "",
        fromLocationId: "",
        toLocationId: "",
        lotId: null,
        quantity: 1,
      },
    ]);
  };

  const removeShipItem = (idx) => {
    if (shipItems.length > 1) {
      setShipItems(shipItems.filter((_, i) => i !== idx));
    }
  };

  const canShip = useMemo(() => {
    if (isSubmitting || shipItems.length === 0) return false;

    return shipItems.every((it) => {
      const selectedBalance = stockBalances.find((b) => b.id === it.sourceBalanceKey);
      if (!it.productId || !it.sourceBalanceKey || !it.fromLocationId || !it.toLocationId) {
        return false;
      }
      if (it.fromLocationId === it.toLocationId) return false;
      if (Number(it.quantity) <= 0) return false;
      if (!selectedBalance) return false;
      return Number(it.quantity) <= Number(selectedBalance.quantity || 0);
    });
  }, [shipItems, isSubmitting, stockBalances]);

  async function handleShip() {
    setIsSubmitting(true);
    const tid = toast.loading("กำลังสร้างใบโอนย้าย...");

    try {
      await apiFetch("/api/transfer/ship", {
        method: "POST",
        body: JSON.stringify({
          referenceNo: null,
          remarks: reason.trim() || null,
          items: shipItems.map((it) => ({
            productId: it.productId,
            fromLocationId: it.fromLocationId,
            toLocationId: it.toLocationId,
            quantity: Number(it.quantity),
            lotId: it.lotId || null,
          })),
        }),
      });

      toast.success("ส่งออกสินค้าสำเร็จ ระบบออกเลขที่เอกสารให้อัตโนมัติ", {
        id: tid,
      });

      setReason("");
      setShipItems([
        {
          productId: "",
          sourceBalanceKey: "",
          fromLocationId: "",
          toLocationId: "",
          lotId: null,
          quantity: 1,
        },
      ]);

      await loadMasterData();
    } catch (e) {
      toast.error(e.message || "เกิดข้อผิดพลาดในการส่งออก", { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectTransferToReceive = (transfer) => {
    setSelectedTransfer(transfer);

    const itemsForm = (transfer.items || []).map((it) => ({
      itemId: it.id,
      productName: it.product?.name || "Unknown Product",
      sku: it.product?.sku || "N/A",
      lotNumber: it.lot?.lotNumber || "-",
      targetLocationDetail: formatLocationFull(it.toLocation),
      shippedQty: Number(it.shippedQty || 0),
      receivedQty: Number(it.shippedQty || 0),
    }));

    setReceiveItems(itemsForm);
  };

  const updateReceiveItem = (idx, value) => {
    const next = [...receiveItems];
    next[idx].receivedQty = Number(value);
    setReceiveItems(next);
  };

  const canReceive = useMemo(() => {
    if (!selectedTransfer || isSubmitting || receiveItems.length === 0) return false;

    return receiveItems.every(
      (it) =>
        Number(it.receivedQty) >= 0 &&
        Number(it.receivedQty) <= Number(it.shippedQty)
    );
  }, [selectedTransfer, isSubmitting, receiveItems]);

  async function handleReceive() {
    setIsSubmitting(true);
    const tid = toast.loading("กำลังยืนยันการรับสินค้า...");

    try {
      await apiFetch(`/api/transfer/${selectedTransfer.id}/receive`, {
        method: "PUT",
        body: JSON.stringify({
          items: receiveItems.map((it) => ({
            itemId: it.itemId,
            receivedQty: Number(it.receivedQty),
          })),
        }),
      });

      toast.success("รับสินค้าเข้าคลังปลายทางเรียบร้อยแล้ว", { id: tid });
      setSelectedTransfer(null);
      setReceiveItems([]);
      await loadPendingTransfers();
      await loadMasterData();
    } catch (e) {
      toast.error(e.message || "เกิดข้อผิดพลาดในการรับเข้า", { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthGate>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                  <ArrowRightLeft className="w-6 h-6 text-[#1F3B8B]" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                    โอนย้ายสินค้าระหว่างคลัง
                    <span className="bg-[#1F3B8B] text-white text-[10px] px-2.5 py-1 rounded-md tracking-widest font-bold shadow-sm uppercase mt-1 xl:mt-0">
                      System
                    </span>
                  </h1>
                  <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-1.5">
                    <Database className="w-4 h-4" /> Inventory Movement Control
                    • ระบบบริหารจัดการส่งออกและรับเข้าพัสดุ
                  </p>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-xl w-full xl:w-auto shadow-sm">
                <button
                  onClick={() => {
                    setActiveTab("SHIP");
                    setSelectedTransfer(null);
                  }}
                  className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === "SHIP"
                      ? "bg-white text-[#1F3B8B] shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Truck className="w-4 h-4" /> 1. ส่งของออก (Ship)
                </button>
                <button
                  onClick={() => setActiveTab("RECEIVE")}
                  className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    activeTab === "RECEIVE"
                      ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" /> 2. รับของเข้า (Receive)
                </button>
              </div>
            </div>
          </div>
        </div>

        {activeTab === "SHIP" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-500">
            <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-6">
                1. ข้อมูลบิลโอนย้ายพัสดุ
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    เลขที่เอกสาร (ระบบกำหนดให้อัตโนมัติ)
                  </label>
                  <div className="flex items-center gap-3 w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5 outline-none cursor-not-allowed shadow-sm">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-500 tabular-nums">
                      {previewTransferNo}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    หมายเหตุ / เหตุผลการโอนย้าย
                  </label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 outline-none transition-all placeholder:text-slate-400 resize-none shadow-sm"
                    rows="1"
                    placeholder="ระบุเหตุผลสั้นๆ เช่น ย้ายไปเก็บโซนใหม่..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  2. รายการพัสดุที่ต้องการย้ายตำแหน่ง
                </h2>
                <button
                  onClick={addShipItem}
                  className="bg-white text-[#1F3B8B] border border-slate-200 hover:bg-slate-50 hover:border-[#1F3B8B] px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> เพิ่มรายการ
                </button>
              </div>

              <div className="space-y-6">
                {shipItems.map((it, idx) => {
                  const availableBalances = getAvailableBalances(it.productId);
                  const selectedBalance = getSelectedBalance(it);

                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-6 p-6 bg-slate-50/50 border border-slate-200 rounded-xl items-start hover:border-[#1F3B8B]/30 transition-all shadow-sm"
                    >
                      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 w-full">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                            เลือกสินค้า <span className="text-rose-500">*</span>
                          </label>
                          <select
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold uppercase outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 bg-white text-slate-900 shadow-sm"
                            value={it.productId}
                            onChange={(e) =>
                              updateShipItem(idx, "productId", e.target.value)
                            }
                          >
                            <option value="">-- เลือกสินค้า --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                            ต้นทาง / ล็อต <span className="text-rose-500">*</span>
                          </label>
                          <select
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 bg-white text-slate-900 shadow-sm"
                            value={it.sourceBalanceKey}
                            onChange={(e) =>
                              updateShipItem(idx, "sourceBalanceKey", e.target.value)
                            }
                            disabled={!it.productId}
                          >
                            <option value="">-- เลือกต้นทาง/ล็อต --</option>
                            {availableBalances.map((b) => (
                              <option key={b.id} value={b.id}>
                                {formatBalanceOptionLabel(b)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                            ปลายทาง <span className="text-rose-500">*</span>
                          </label>
                          <select
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 bg-white text-slate-900 shadow-sm"
                            value={it.toLocationId}
                            onChange={(e) =>
                              updateShipItem(idx, "toLocationId", e.target.value)
                            }
                          >
                            <option value="">-- เลือกคลังปลายทาง --</option>
                            {locations.map((l) => (
                              <option key={l.id} value={l.id}>
                                {formatLocationFull(l)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                            จำนวน <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={Number(selectedBalance?.quantity || 0)}
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-center font-bold text-sm outline-none focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10 transition-all text-slate-900 tabular-nums shadow-sm"
                            value={it.quantity}
                            onChange={(e) =>
                              updateShipItem(idx, "quantity", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full mt-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          {selectedBalance ? (
                            <div className="flex flex-wrap items-center gap-4">
                              <span>
                                ต้นทาง:{" "}
                                <span className="text-slate-800">
                                  {formatLocationFull(selectedBalance.location)}
                                </span>
                              </span>
                              <span>
                                ล็อต:{" "}
                                <span className="text-slate-800">
                                  {selectedBalance.lot?.lotNumber || "-"}
                                </span>
                              </span>
                              <span>
                                คงเหลือ:{" "}
                                <span className="text-slate-800 tabular-nums">
                                  {Number(selectedBalance.quantity || 0).toLocaleString()}
                                </span>
                              </span>
                            </div>
                          ) : (
                            <span>กรุณาเลือกต้นทาง/ล็อต</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeShipItem(idx)}
                          className="p-3 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm self-end active:scale-95 disabled:opacity-50"
                          disabled={shipItems.length === 1}
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

            <div className="p-6 md:p-8 bg-slate-50 flex justify-end border-t border-slate-200">
              <button
                onClick={handleShip}
                disabled={!canShip || isSubmitting}
                className="w-full md:w-auto min-w-[240px] bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />{" "}
                {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการส่งออกสินค้า"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "RECEIVE" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {!selectedTransfer ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-base font-bold text-slate-900 tracking-wider uppercase">
                    รายการพัสดุอยู่ระหว่างจัดส่ง (In-Transit)
                  </h2>
                  <div className="bg-sky-50 text-sky-700 border border-sky-200 text-[11px] px-3 py-1.5 rounded-md font-bold uppercase tracking-widest tabular-nums">
                    {pendingTransfers.length} รายการ
                  </div>
                </div>

                {pendingTransfers.length === 0 ? (
                  <div className="text-center py-20 bg-white text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                    ไม่มีรายการค้างรับในขณะนี้
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          <th className="p-5">เลขที่เอกสาร</th>
                          <th className="p-5">ผู้ส่ง</th>
                          <th className="p-5 text-center">จำนวนรายการ</th>
                          <th className="p-5 text-center">วันที่ส่ง</th>
                          <th className="p-5 text-right">ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {pendingTransfers.map((t) => (
                          <tr
                            key={t.id}
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="p-5">
                              <span className="text-sm font-bold text-[#1F3B8B] uppercase tracking-tight group-hover:text-blue-700 tabular-nums">
                                {t.transferNo}
                              </span>
                            </td>
                            <td className="p-5">
                              <span className="text-sm font-bold text-slate-900">
                                {t.issuedUser?.firstName || "System"}{" "}
                                {t.issuedUser?.lastName || ""}
                              </span>
                            </td>
                            <td className="p-5 text-center">
                              <span className="text-sm font-bold text-slate-700 tabular-nums">
                                {t.items?.length || 0} รายการ
                              </span>
                            </td>
                            <td className="p-5 text-center text-sm font-bold text-slate-600 tabular-nums">
                              {t.shippedAt
                                ? new Date(t.shippedAt).toLocaleString("th-TH")
                                : "-"}
                            </td>
                            <td className="p-5 text-right">
                              <button
                                onClick={() => selectTransferToReceive(t)}
                                className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95 inline-flex items-center justify-center gap-2 ml-auto"
                              >
                                <CheckSquare className="w-3.5 h-3.5" /> ตรวจรับสินค้า
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Confirmation Process
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-[#1F3B8B] tabular-nums whitespace-nowrap tracking-tight">
                      {selectedTransfer.transferNo}
                    </h2>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTransfer(null);
                      setReceiveItems([]);
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-[#1F3B8B] underline uppercase tracking-widest transition-colors"
                  >
                    ยกเลิกรายการ
                  </button>
                </div>

                <div className="p-6 md:p-8 border-b border-slate-200">
                  <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-5">
                    รายการพัสดุและตำแหน่งรับเข้า
                  </h2>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          <th className="p-4">พัสดุ / SKU</th>
                          <th className="p-4">ล็อต</th>
                          <th className="p-4 w-[30%]">ตำแหน่งจัดเก็บ</th>
                          <th className="p-4 text-center w-32">ยอดส่งมา</th>
                          <th className="p-4 text-center w-40">
                            ยอดรับจริง <span className="text-rose-500">*</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {receiveItems.map((it, idx) => {
                          const isMissing = Number(it.receivedQty) < Number(it.shippedQty);

                          return (
                            <React.Fragment key={idx}>
                              <tr
                                className={`hover:bg-slate-50/50 transition-colors ${
                                  isMissing ? "bg-rose-50/30" : ""
                                }`}
                              >
                                <td className="p-4">
                                  <p className="font-bold text-slate-900 text-sm">
                                    {it.productName}
                                  </p>
                                  <p className="text-[10px] text-[#1F3B8B] font-bold uppercase mt-1 tabular-nums tracking-wider">
                                    SKU: {it.sku}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-sm font-bold text-slate-700">
                                    {it.lotNumber}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                    {it.targetLocationDetail}
                                  </p>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="text-xl font-black text-slate-400 tabular-nums">
                                    {it.shippedQty}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={it.shippedQty}
                                    className={`w-full max-w-[100px] mx-auto border rounded-xl p-2.5 text-base font-bold text-center outline-none transition-all tabular-nums shadow-sm ${
                                      isMissing
                                        ? "border-rose-400 text-rose-600 bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                                        : "border-slate-200 bg-white text-slate-900 focus:border-[#1F3B8B] focus:ring-2 focus:ring-[#1F3B8B]/10"
                                    }`}
                                    value={it.receivedQty}
                                    onChange={(e) => updateReceiveItem(idx, e.target.value)}
                                  />
                                </td>
                              </tr>

                              {isMissing && (
                                <tr className="bg-rose-50 border-none">
                                  <td colSpan="5" className="px-5 py-3">
                                    <div className="flex items-center gap-2 text-rose-600 text-[10px] font-bold uppercase tracking-widest">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      ตรวจพบสินค้าขาด (สูญหาย{" "}
                                      <span className="tabular-nums">{Number(it.shippedQty) - Number(it.receivedQty)}</span> ชิ้น)
                                      ระบบจะทำบันทึกแจ้งเตือนอัตโนมัติ
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-6 md:p-8 bg-slate-50 flex justify-end border-t border-slate-200">
                  <button
                    onClick={handleReceive}
                    disabled={!canReceive || isSubmitting}
                    className="w-full md:w-auto min-w-[240px] bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />{" "}
                    {isSubmitting ? "กำลังยืนยัน..." : "รับสินค้าและปิดใบโอนย้าย"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGate>
  );
}