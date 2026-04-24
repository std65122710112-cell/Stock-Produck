"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Search,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Boxes,
  LayoutGrid,
  TrendingUp,
  Tag,
  CalendarDays,
  Warehouse,
  Package,
  Layers3,
} from "lucide-react";

const PAGE_LIMIT = 20;
const GROUP_LIMIT = 500;

function buildWarehouseSku(productSku, warehouseCode) {
  const sku = String(productSku || "").trim();
  const wh = String(warehouseCode || "").trim().toUpperCase();

  if (!sku) return "-";
  if (!wh) return sku;

  const parts = sku.split("-").filter(Boolean);

  if (parts.length < 2) {
    return `${sku}-${wh}`;
  }

  const runningNo = parts[parts.length - 1];
  const skuUpper = sku.toUpperCase();

  // กัน SKU เก่าที่มีรหัสคลังอยู่แล้ว เช่น JT-WH-003-0008
  // warehouseCode = WH-003
  // ถ้าลงท้ายด้วย -WH-003-0008 แล้ว ไม่ต้องเติมซ้ำ
  if (skuUpper.endsWith(`-${wh}-${runningNo}`)) {
    return sku;
  }

  const prefix = parts.slice(0, parts.length - 1).join("-");
  return `${prefix}-${wh}-${runningNo}`;
}

function getDisplaySku(b) {
  return (
    b?.warehouseSku ||
    b?.product?.displaySku ||
    buildWarehouseSku(b?.product?.sku, b?.location?.warehouse?.code)
  );
}

function getBaseSku(b) {
  return b?.baseSku || b?.product?.baseSku || b?.product?.sku || "-";
}

export default function BalancesPage() {
  const [balances, setBalances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [masterData, setMasterData] = useState({
    warehouses: [],
    zones: [],
    categories: [],
    locations: [],
  });

  const [totalCount, setTotalCount] = useState(0);
  const [grandTotalValue, setGrandTotalValue] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [busyId, setBusyId] = useState(null);

  // LOT = แยกตามล็อต, PRICE = รวมตามสินค้า + คลัง + ราคา
  const [viewMode, setViewMode] = useState("LOT");

  const fetchData = async () => {
    setIsLoading(true);

    try {
      const effectiveLimit = viewMode === "PRICE" ? GROUP_LIMIT : PAGE_LIMIT;
      const effectivePage = viewMode === "PRICE" ? 1 : page;

      const params = new URLSearchParams({
        page: effectivePage.toString(),
        limit: effectiveLimit.toString(),
        search: debouncedSearch,
        categoryId: selectedCategory,
        warehouseId: selectedWarehouse,
        zoneId: selectedZone,
        locationId: selectedLocation,
      });

      const res = await apiFetch(`/inventory/balances?${params.toString()}`);

      if (res.success) {
        setBalances(Array.isArray(res.data) ? res.data : []);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
        setGrandTotalValue(res.grandTotalValue || 0);
      } else {
        setBalances([]);
        setTotalCount(0);
        setTotalPages(1);
        setGrandTotalValue(0);
      }
    } catch (err) {
      toast.error("ดึงข้อมูลล้มเหลว");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    page,
    selectedWarehouse,
    selectedZone,
    selectedLocation,
    selectedCategory,
    debouncedSearch,
    viewMode,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [viewMode]);

  useEffect(() => {
    async function loadMaster() {
      try {
        const [w, z, c, l] = await Promise.all([
          apiFetch("/master/warehouses").catch(() => []),
          apiFetch("/master/zones").catch(() => []),
          apiFetch("/master/categories").catch(() => []),
          apiFetch("/master/locations").catch(() => []),
        ]);

        setMasterData({
          warehouses: Array.isArray(w) ? w : w?.data || [],
          zones: Array.isArray(z) ? z : z?.data || [],
          categories: Array.isArray(c) ? c : c?.data || [],
          locations: Array.isArray(l) ? l : l?.data || [],
        });
      } catch (e) {
        console.error(e);
      }
    }

    loadMaster();
  }, []);

  async function handleBarcode(product, action, displaySku) {
    if (!product?.id) return;

    setBusyId(product.id);

    try {
      const token = getAccessToken();

      const res = await fetch(
        `${API_BASE}/master/products/${product.id}/barcode.png`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        throw new Error("โหลดบาร์โค้ดไม่สำเร็จ");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (action === "view") {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `barcode_${displaySku || product.sku || product.id}.png`;
        a.click();
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการโหลดบาร์โค้ด");
    } finally {
      setBusyId(null);
    }
  }

  const groupedByProductWarehouseAndPrice = useMemo(() => {
    const map = new Map();

    for (const b of balances) {
      const productId = b?.product?.id || b?.productId || getBaseSku(b);
      const warehouseCode =
        b?.warehouseCode || b?.location?.warehouse?.code || "-";
      const warehouseName = b?.location?.warehouse?.name || "-";
      const unitCost = Number(b?.unitCost || 0);

      // รวมตามสินค้า + คลัง + ราคา
      const key = `${productId}|${warehouseCode}|${unitCost}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          productId,
          product: b?.product,
          displaySku: getDisplaySku(b),
          baseSku: getBaseSku(b),
          productName: b?.product?.name || "-",
          unitName: b?.product?.unit?.name || "Unit",
          categoryName: b?.product?.category?.name || "ทั่วไป",
          warehouseCode,
          warehouseName,
          unitCost,
          quantity: 0,
          totalValue: 0,
          lotNumbers: new Set(),
          locations: new Set(),
          zones: new Set(),
          updatedAt: b?.updatedAt,
        });
      }

      const row = map.get(key);
      const qty = Number(b?.quantity || 0);

      row.quantity += qty;
      row.totalValue += Number(b?.totalValue || qty * unitCost);

      const lotNumber = b?.lot?.lotNumber || b?.lotNumber;
      if (lotNumber) row.lotNumbers.add(lotNumber);

      const locCode = b?.location?.code;
      const locName = b?.location?.name;
      if (locCode || locName) {
        row.locations.add(`${locCode || "-"}${locName ? ` (${locName})` : ""}`);
      }

      const zoneCode = b?.location?.zone?.code;
      if (zoneCode) row.zones.add(zoneCode);

      if (b?.updatedAt && new Date(b.updatedAt) > new Date(row.updatedAt || 0)) {
        row.updatedAt = b.updatedAt;
      }
    }

    return Array.from(map.values()).map((row) => ({
      ...row,
      lotNumbers: Array.from(row.lotNumbers),
      locations: Array.from(row.locations),
      zones: Array.from(row.zones),
      lotCount: row.lotNumbers.size,
      locationCount: row.locations.size,
    }));
  }, [balances]);

  const summary = useMemo(() => {
    const totalQty = balances.reduce(
      (sum, b) => sum + Number(b.quantity || 0),
      0
    );

    const lotManagedRows = balances.filter((b) => !!b?.lot?.lotNumber).length;

    const expiringSoonCount = balances.filter((b) => {
      if (!b?.lot?.expDate) return false;

      const today = new Date();
      const exp = new Date(b.lot.expDate);
      const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

      return diffDays >= 0 && diffDays <= 30;
    }).length;

    return { totalQty, lotManagedRows, expiringSoonCount };
  }, [balances]);

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("th-TH");
  };

  const formatDateTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("th-TH");
  };

  const getExpiryBadge = (expDate) => {
    if (!expDate) {
      return (
        <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
          ไม่ระบุ
        </span>
      );
    }

    const today = new Date();
    const exp = new Date(expDate);
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
          หมดอายุแล้ว
        </span>
      );
    }

    if (diffDays <= 30) {
      return (
        <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
          ใกล้หมดอายุ
        </span>
      );
    }

    return (
      <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
        ปกติ
      </span>
    );
  };

  return (
    <AuthGate>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
              <Boxes className="w-6 h-6 text-[#1F3B8B]" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                ยอดคงเหลือสินค้า
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Inventory Stock Balance & Ledger
              </p>
            </div>
          </div>

          <div className="flex flex-row items-center gap-4 w-full md:w-auto">
            <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl flex flex-col items-end min-w-[240px] shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                มูลค่ารวมทั้งหมด
              </span>
              <span className="text-2xl font-bold text-[#1F3B8B] tabular-nums">
                ฿
                {grandTotalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <SummaryCard
            title="รายการสินค้าทั้งหมด"
            count={totalCount}
            unit="รายการ"
            color="slate"
            icon={<LayoutGrid className="w-5 h-5 text-slate-600" />}
          />

          <SummaryCard
            title="ยอดสต๊อกรวม"
            count={summary.totalQty}
            unit="หน่วย"
            color="emerald"
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          />

          <SummaryCard
            title="รายการที่มีล็อต"
            count={summary.lotManagedRows}
            unit="แถว"
            color="blue"
            icon={<Layers3 className="w-5 h-5 text-blue-600" />}
          />

          <SummaryCard
            title="ใกล้หมดอายุใน 30 วัน"
            count={summary.expiringSoonCount}
            unit="รายการ"
            color="amber"
            icon={<Clock className="w-5 h-5 text-amber-600" />}
          />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 print:hidden">
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" />

              <input
                className="w-full bg-white border border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/5 rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
                placeholder="ค้นหา SKU, SKU ตามคลัง, ชื่อสินค้า หรือเลขล็อต..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("LOT")}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${
                  viewMode === "LOT"
                    ? "bg-[#1F3B8B] text-white border-[#1F3B8B] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                แยกตามล็อต
              </button>

              <button
                type="button"
                onClick={() => setViewMode("PRICE")}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${
                  viewMode === "PRICE"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                รวมตามสินค้า + คลัง + ราคา
              </button>
            </div>

            {(search ||
              selectedWarehouse ||
              selectedZone ||
              selectedLocation ||
              selectedCategory) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("");
                  setSelectedWarehouse("");
                  setSelectedZone("");
                  setSelectedLocation("");
                  setPage(1);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:text-rose-600 text-sm font-bold transition-colors"
              >
                <X className="w-4 h-4" />
                ล้างตัวกรอง
              </button>
            )}
          </div>

          {viewMode === "PRICE" && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-800 font-bold leading-relaxed">
              มุมมองนี้รวมยอดตามสินค้าเดียวกัน คลังเดียวกัน และราคาทุนต่อหน่วยเดียวกัน
              เช่น สินค้า JT-WH-003-0008 ราคา 8,000 จากหลายล็อต จะถูกรวมเป็นยอดเดียว
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilterSelect
              value={selectedCategory}
              onChange={(v) => {
                setSelectedCategory(v);
                setPage(1);
              }}
              options={masterData.categories}
              placeholder="ทุกหมวดหมู่"
            />

            <FilterSelect
              value={selectedWarehouse}
              onChange={(v) => {
                setSelectedWarehouse(v);
                setSelectedZone("");
                setSelectedLocation("");
                setPage(1);
              }}
              options={masterData.warehouses}
              placeholder="ทุกคลังสินค้า"
            />

            <FilterSelect
              value={selectedZone}
              onChange={(v) => {
                setSelectedZone(v);
                setSelectedLocation("");
                setPage(1);
              }}
              options={masterData.zones.filter(
                (z) => String(z.warehouseId) === String(selectedWarehouse)
              )}
              placeholder="ทุกโซน"
              disabled={!selectedWarehouse}
            />

            <FilterSelect
              value={selectedLocation}
              onChange={(v) => {
                setSelectedLocation(v);
                setPage(1);
              }}
              options={masterData.locations.filter((loc) => {
                if (selectedZone)
                  return String(loc.zoneId) === String(selectedZone);

                if (selectedWarehouse)
                  return String(loc.warehouseId) === String(selectedWarehouse);

                return true;
              })}
              placeholder="ทุกตำแหน่ง"
              disabled={!selectedWarehouse && !selectedZone}
              labelField={(opt) =>
                `${opt.code} ${opt.name ? `(${opt.name})` : ""}`
              }
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1700px] w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    สินค้า
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {viewMode === "PRICE"
                      ? "ล็อตที่รวม"
                      : "ล็อต / วันหมดอายุ"}
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    ตำแหน่งจัดเก็บ
                  </th>
                  <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    คงเหลือ
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    ต้นทุน/หน่วย
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    มูลค่ารวม
                  </th>
                  <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    บาร์โค้ด
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    อัปเดตล่าสุด
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" />
                    </td>
                  </tr>
                ) : viewMode === "LOT" && balances.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="py-20 text-center text-slate-400 font-medium italic"
                    >
                      ไม่พบข้อมูลรายการสินค้า
                    </td>
                  </tr>
                ) : viewMode === "PRICE" &&
                  groupedByProductWarehouseAndPrice.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="py-20 text-center text-slate-400 font-medium italic"
                    >
                      ไม่พบข้อมูลรายการสินค้า
                    </td>
                  </tr>
                ) : viewMode === "PRICE" ? (
                  groupedByProductWarehouseAndPrice.map((g, i) => (
                    <tr
                      key={g.id || i}
                      className="hover:bg-emerald-50/30 transition-colors group"
                    >
                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] font-black text-emerald-700 uppercase tracking-tight">
                            {g.displaySku}
                          </span>

                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                            Base SKU: {g.baseSku}
                          </span>

                          <span className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-emerald-700 mt-1">
                            {g.productName}
                          </span>

                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              <Package className="w-3 h-3" />
                              {g.unitName}
                            </span>

                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              <Tag className="w-3 h-3" />
                              {g.categoryName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-col gap-1.5 text-sm">
                          <div className="font-bold text-slate-800">
                            รวมจากล็อต:{" "}
                            <span className="text-emerald-700">
                              {g.lotCount} ล็อต
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 max-w-[420px] leading-relaxed">
                            {g.lotNumbers.length > 0
                              ? g.lotNumbers.join(", ")
                              : "-"}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-col gap-1 text-[12px] text-slate-600">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Warehouse className="w-3.5 h-3.5 text-emerald-700" />
                            {g.warehouseName}
                          </span>

                          <span>
                            รหัสคลัง: <strong>{g.warehouseCode}</strong>
                          </span>

                          <span>
                            รวมตำแหน่ง:{" "}
                            <strong>{g.locationCount || 0} ตำแหน่ง</strong>
                          </span>

                          <span className="text-slate-400 max-w-[300px]">
                            {g.locations.length > 0
                              ? g.locations.join(", ")
                              : "-"}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center align-top">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold px-2.5 py-1 rounded-md tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {Number(g.quantity || 0).toLocaleString()}
                          </span>

                          <span className="text-[10px] text-slate-400 block mt-1 font-bold uppercase tracking-tight">
                            {g.unitName}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right align-top font-bold text-slate-700 tabular-nums text-sm">
                        ฿
                        {Number(g.unitCost || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="py-4 px-6 text-right align-top font-bold text-slate-800 tabular-nums text-sm">
                        ฿
                        {Number(g.totalValue || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="py-4 px-6 text-center align-top">
                        <div className="flex flex-col items-center gap-1.5">
                          {busyId === g?.product?.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleBarcode(g.product, "view", g.displaySku)
                                }
                                className="text-[11px] font-bold text-[#1F3B8B] hover:underline"
                              >
                                เปิดดู
                              </button>

                              <button
                                onClick={() =>
                                  handleBarcode(g.product, "dl", g.displaySku)
                                }
                                className="text-[10px] text-slate-400 font-bold hover:text-slate-600"
                              >
                                ดาวน์โหลด
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right align-top text-xs text-slate-500 font-medium">
                        {formatDateTime(g.updatedAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  balances.map((b, i) => {
                    const displaySku = getDisplaySku(b);
                    const baseSku = getBaseSku(b);

                    return (
                      <tr
                        key={b.id || i}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-[12px] font-black text-[#1F3B8B] uppercase tracking-tight">
                              {displaySku}
                            </span>

                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              Base SKU: {baseSku}
                            </span>

                            <span className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[#1F3B8B] mt-1">
                              {b?.product?.name || "-"}
                            </span>

                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                <Package className="w-3 h-3" />
                                {b?.product?.unit?.name || "Unit"}
                              </span>

                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                <Tag className="w-3 h-3" />
                                {b?.product?.category?.name || "ทั่วไป"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col gap-1.5 text-sm">
                            <div className="font-bold text-slate-800">
                              หมายเลขล็อต:{" "}
                              <span className="text-[#1F3B8B]">
                                {b?.lot?.lotNumber ||
                                  b?.lotNumber ||
                                  "ไม่มีหมายเลขล็อต"}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              MFG: {formatDate(b?.lot?.mfgDate || b?.mfgDate)}
                            </div>

                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              EXP: {formatDate(b?.lot?.expDate || b?.expDate)}
                            </div>

                            <div className="pt-1">
                              {getExpiryBadge(b?.lot?.expDate || b?.expDate)}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col gap-1 text-[12px] text-slate-600">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Warehouse className="w-3.5 h-3.5 text-[#1F3B8B]" />
                              {b?.location?.warehouse?.name || "-"}
                            </span>

                            <span>
                              รหัสคลัง:{" "}
                              <strong>
                                {b?.warehouseCode ||
                                  b?.location?.warehouse?.code ||
                                  "-"}
                              </strong>
                            </span>

                            <span>
                              โซน:{" "}
                              <strong>{b?.location?.zone?.code || "-"}</strong>
                            </span>

                            <span>
                              ล็อก: <strong>{b?.location?.code || "-"}</strong>
                            </span>

                            <span className="text-slate-400">
                              {b?.location?.name || ""}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-center align-top">
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-sm font-bold px-2.5 py-1 rounded-md tabular-nums ${
                                Number(b.quantity || 0) <= 5
                                  ? "bg-rose-50 text-rose-600 border border-rose-100"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {Number(b?.quantity || 0).toLocaleString()}
                            </span>

                            <span className="text-[10px] text-slate-400 block mt-1 font-bold uppercase tracking-tight">
                              {b?.product?.unit?.name || "Unit"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right align-top font-bold text-slate-700 tabular-nums text-sm">
                          ฿
                          {Number(b?.unitCost || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        <td className="py-4 px-6 text-right align-top font-bold text-slate-800 tabular-nums text-sm">
                          ฿
                          {Number(b?.totalValue || 0).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </td>

                        <td className="py-4 px-6 text-center align-top">
                          <div className="flex flex-col items-center gap-1.5">
                            {busyId === b?.product?.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    handleBarcode(
                                      b.product,
                                      "view",
                                      displaySku
                                    )
                                  }
                                  className="text-[11px] font-bold text-[#1F3B8B] hover:underline"
                                >
                                  เปิดดู
                                </button>

                                <button
                                  onClick={() =>
                                    handleBarcode(b.product, "dl", displaySku)
                                  }
                                  className="text-[10px] text-slate-400 font-bold hover:text-slate-600"
                                >
                                  ดาวน์โหลด
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right align-top text-xs text-slate-500 font-medium">
                          {formatDateTime(b.updatedAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isLoading && totalPages > 1 && viewMode === "LOT" && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 print:hidden">
            <p className="text-xs font-medium text-slate-500">
              หน้า {page} จาก {totalPages} | รวม {totalCount.toLocaleString()}{" "}
              รายการ
            </p>

            <div className="flex items-center gap-2">
              <PaginationButton
                onClick={() => setPage(1)}
                disabled={page === 1}
                icon={<ChevronsLeft className="w-4 h-4" />}
              />

              <PaginationButton
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                icon={<ChevronLeft className="w-4 h-4" />}
              />

              <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm">
                {page} / {totalPages}
              </div>

              <PaginationButton
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                icon={<ChevronRight className="w-4 h-4" />}
              />

              <PaginationButton
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                icon={<ChevronsRight className="w-4 h-4" />}
              />
            </div>
          </div>
        )}

        {!isLoading && viewMode === "PRICE" && (
          <div className="flex justify-between items-center px-2 print:hidden">
            <p className="text-xs font-medium text-slate-500">
              มุมมองรวมตามสินค้า + คลัง + ราคา แสดง{" "}
              {groupedByProductWarehouseAndPrice.length.toLocaleString()} กลุ่ม
              จากรายการคงเหลือที่โหลดมา
            </p>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

function SummaryCard({ title, count, unit, color, icon }) {
  const themes = {
    slate: "border-l-slate-400 bg-slate-50/50",
    emerald: "border-l-emerald-500 bg-emerald-50/30",
    blue: "border-l-blue-500 bg-blue-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
  };

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${
        themes[color] || themes.slate
      } p-5 rounded-xl flex items-center gap-4 shadow-sm transition-all hover:shadow-md`}
    >
      <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100">
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          {title}
        </p>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            {Number(count || 0).toLocaleString()}
          </span>

          {unit && (
            <span className="text-xs font-bold text-slate-400 uppercase">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  labelField,
}) {
  return (
    <select
      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/5 disabled:bg-slate-50 transition-all cursor-pointer"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>

      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {labelField ? labelField(opt) : opt.name || opt.code}
        </option>
      ))}
    </select>
  );
}

function PaginationButton({ onClick, disabled, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm"
    >
      {icon}
    </button>
  );
}