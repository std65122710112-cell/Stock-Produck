"use client";

import React, { useEffect, useState, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
  MapPin,
  ArrowUpRight,
  ArrowDownLeft,
  Database,
  Search,
  Activity,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  History,
  LayoutGrid,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  RefreshCcw,
  Warehouse,
  Package,
  Tag,
  Layers3,
  MinusCircle,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

const ITEMS_PER_PAGE = 30;

function normalizeApiList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.rows)) return res.rows;
  return [];
}

function formatDate(date) {
  if (!date) return "-";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date) {
  if (!date) return "-";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getRawQty(movement) {
  return Number(movement?.quantity || 0);
}

function getDisplayQty(movement) {
  const rawQty = getRawQty(movement);
  const absQty = Math.abs(rawQty);
  const type = String(movement?.type || "").toUpperCase();

  if (type === "OUT") return -absQty;
  if (type === "IN") return absQty;

  // TRANSFER ส่วนใหญ่เป็นบันทึกการย้าย ไม่ควรบังคับเป็นลบ/บวกถ้า backend ส่งมาแล้ว
  if (type === "TRANSFER") return rawQty;

  // ADJUST ให้เคารพเครื่องหมายจาก backend เพราะอาจเป็นปรับเพิ่มหรือปรับลด
  if (type === "ADJUST") return rawQty;

  return rawQty;
}

function getQtyClass(movement) {
  const qty = getDisplayQty(movement);
  const type = String(movement?.type || "").toUpperCase();

  if (type === "OUT") return "text-rose-600";
  if (type === "IN") return "text-emerald-600";
  if (type === "TRANSFER") return "text-indigo-600";

  if (qty < 0) return "text-rose-600";
  if (qty > 0) return "text-emerald-600";

  return "text-slate-500";
}

function formatSignedQty(movement) {
  const qty = getDisplayQty(movement);
  const absQty = Math.abs(qty).toLocaleString();

  if (qty > 0) return `+${absQty}`;
  if (qty < 0) return `-${absQty}`;

  return "0";
}

function getWarehouseName(movement) {
  return (
    movement?.location?.warehouse?.name ||
    movement?.warehouse?.name ||
    movement?.warehouseName ||
    "ไม่ระบุคลัง"
  );
}

function getWarehouseCode(movement) {
  return (
    movement?.location?.warehouse?.code ||
    movement?.warehouse?.code ||
    movement?.warehouseCode ||
    "-"
  );
}

function getZoneName(movement) {
  return (
    movement?.location?.zone?.name ||
    movement?.zone?.name ||
    movement?.zoneName ||
    "-"
  );
}

function getZoneCode(movement) {
  return (
    movement?.location?.zone?.code ||
    movement?.zone?.code ||
    movement?.zoneCode ||
    "-"
  );
}

function getLocationName(movement) {
  return movement?.location?.name || movement?.locationName || "-";
}

function getLocationCode(movement) {
  return movement?.location?.code || movement?.locationCode || "-";
}

function getLotNumber(movement) {
  return (
    movement?.lot?.lotNumber ||
    movement?.stockLot?.lotNumber ||
    movement?.lotNumber ||
    "-"
  );
}

function getProductSku(movement) {
  return movement?.product?.sku || movement?.sku || "-";
}

function getProductName(movement) {
  return movement?.product?.name || movement?.productName || "-";
}

function getUnitName(movement) {
  return (
    movement?.product?.unit?.name ||
    movement?.product?.unitName ||
    movement?.unitName ||
    "Unit"
  );
}

function getUserName(movement) {
  const firstName = movement?.user?.firstName || movement?.createdByUser?.firstName || "";
  const lastName = movement?.user?.lastName || movement?.createdByUser?.lastName || "";

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "System";
}

function getReferenceText(movement) {
  const refType = movement?.referenceType || "-";
  const refId = movement?.referenceNo || movement?.referenceCode || movement?.referenceId || "";

  if (!refId) return refType;

  return `${refType}: ${refId}`;
}

export default function GlobalMovementHistoryPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterDate]);

  async function loadHistory() {
    setLoading(true);

    try {
      const res = await apiFetch("/inventory/movements");
      setMovements(normalizeApiList(res));
    } catch (e) {
      console.error("Load History Error:", e);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredMovements = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return movements.filter((m) => {
      const searchableText = [
        getProductName(m),
        getProductSku(m),
        getWarehouseName(m),
        getWarehouseCode(m),
        getZoneName(m),
        getZoneCode(m),
        getLocationName(m),
        getLocationCode(m),
        getLotNumber(m),
        getUserName(m),
        getReferenceText(m),
      ]
        .join(" ")
        .toLowerCase();

      const matchSearch = !keyword || searchableText.includes(keyword);

      const movementType = String(m.type || "").toUpperCase();
      const matchType = filterType === "ALL" || movementType === filterType;

      let matchDate = true;

      if (filterDate) {
        const created = new Date(m.createdAt);
        if (Number.isNaN(created.getTime())) {
          matchDate = false;
        } else {
          const itemDate = created.toISOString().split("T")[0];
          matchDate = itemDate === filterDate;
        }
      }

      return matchSearch && matchType && matchDate;
    });
  }, [movements, debouncedSearch, filterType, filterDate]);

  const stats = useMemo(() => {
    const inbound = filteredMovements
      .filter((m) => String(m.type || "").toUpperCase() === "IN")
      .reduce((sum, m) => sum + Math.abs(getRawQty(m)), 0);

    const outbound = filteredMovements
      .filter((m) => String(m.type || "").toUpperCase() === "OUT")
      .reduce((sum, m) => sum + Math.abs(getRawQty(m)), 0);

    const transfer = filteredMovements.filter(
      (m) => String(m.type || "").toUpperCase() === "TRANSFER"
    ).length;

    const adjust = filteredMovements.filter(
      (m) => String(m.type || "").toUpperCase() === "ADJUST"
    ).length;

    return {
      total: filteredMovements.length,
      inbound,
      outbound,
      transfer,
      adjust,
    };
  }, [filteredMovements]);

  const totalPages = Math.ceil(filteredMovements.length / ITEMS_PER_PAGE) || 1;

  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMovements.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMovements, currentPage]);

  if (loading) return <SystemLoader />;

  return (
    <AuthGate>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
              <Activity className="w-6 h-6 text-[#1F3B8B]" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                ประวัติการเคลื่อนไหวรวม
              </h1>

              <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                บันทึกการตรวจสอบรายการเคลื่อนไหวพัสดุทุกประเภท (Audit Trail)
              </p>
            </div>
          </div>

          <div className="flex flex-row items-center gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={loadHistory}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-widest shadow-sm"
            >
              <RefreshCcw className="w-4 h-4" />
              รีเฟรช
            </button>

            <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl flex flex-col items-end min-w-[180px] shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                หน้าปัจจุบัน
              </span>

              <span className="text-2xl font-bold text-[#1F3B8B] tabular-nums">
                {currentPage}
                <span className="text-slate-300 text-sm mx-1">/</span>
                {totalPages || 1}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <SummaryCard
            title="จำนวนรายการทั้งหมด"
            count={stats.total}
            unit="รายการ"
            color="slate"
            icon={<LayoutGrid className="w-5 h-5 text-slate-600" />}
          />

          <SummaryCard
            title="รวมจำนวนรับเข้า"
            count={stats.inbound}
            unit="หน่วย"
            color="emerald"
            icon={<ArrowDownCircle className="w-5 h-5 text-emerald-600" />}
          />

          <SummaryCard
            title="รวมจำนวนจ่ายออก"
            count={stats.outbound}
            unit="หน่วย"
            color="rose"
            icon={<ArrowUpCircle className="w-5 h-5 text-rose-600" />}
          />

          <SummaryCard
            title="โอนย้าย / ปรับยอด"
            count={stats.transfer + stats.adjust}
            unit="รายการ"
            color="blue"
            icon={<Layers3 className="w-5 h-5 text-blue-600" />}
          />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 print:hidden">
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
            <div className="flex-1 relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors"
                size={18}
              />

              <input
                type="text"
                placeholder="ค้นหาด้วย SKU, ชื่อพัสดุ, คลัง, โซน, ตำแหน่ง, เลขล็อต หรือชื่อเจ้าหน้าที่..."
                className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/5 font-bold text-sm transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative min-w-[220px]">
                <Filter
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#1F3B8B] font-bold text-sm text-slate-700 cursor-pointer shadow-sm"
                >
                  <option value="ALL">ทุกกิจกรรม (All Actions)</option>
                  <option value="IN">รับสินค้าเข้า (IN)</option>
                  <option value="OUT">จ่ายพัสดุออก (OUT)</option>
                  <option value="TRANSFER">โอนย้าย (TRANSFER)</option>
                  <option value="ADJUST">ปรับยอด (ADJUST)</option>
                </select>
              </div>

              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#1F3B8B] font-bold text-sm text-slate-700 cursor-pointer shadow-sm"
              />
            </div>

            {(searchTerm || filterType !== "ALL" || filterDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setDebouncedSearch("");
                  setFilterType("ALL");
                  setFilterDate("");
                  setCurrentPage(1);
                }}
                className="px-6 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-bold text-xs uppercase tracking-widest border border-rose-100 transition-colors"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 font-bold leading-relaxed">
            หมายเหตุ: ระบบจะแสดงรายการรับเข้าเป็นเครื่องหมายบวก และรายการจ่ายออก
            (OUT) เป็นเครื่องหมายลบเสมอ เพื่อให้ตรวจสอบทิศทางสต๊อกได้ถูกต้อง
            แม้ข้อมูลจาก backend จะส่งจำนวน OUT มาเป็นค่าบวกก็ตาม
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1700px] w-full border-collapse text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 w-16 text-center">ลำดับ</th>
                  <th className="py-4 px-6">วันที่ / เวลา</th>
                  <th className="py-4 px-6">รายละเอียดพัสดุ</th>
                  <th className="py-4 px-6">กิจกรรม</th>
                  <th className="py-4 px-6">คลัง / โซน / ตำแหน่ง</th>
                  <th className="py-4 px-6">ล็อต / อ้างอิง</th>
                  <th className="py-4 px-6 text-center">จำนวน</th>
                  <th className="py-4 px-6 text-right">ผู้ทำรายการ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedMovements.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <History className="w-12 h-12 text-slate-200" />
                        <p className="text-slate-400 font-medium text-sm">
                          ไม่พบข้อมูลประวัติการเคลื่อนไหว
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMovements.map((m, index) => {
                    const rowNumber =
                      (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                    const displayQty = getDisplayQty(m);
                    const qtyClass = getQtyClass(m);
                    const type = String(m.type || "").toUpperCase();

                    return (
                      <tr
                        key={m.id || `${rowNumber}-${m.createdAt}`}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="py-4 px-6 text-center align-top">
                          <span className="text-[11px] font-bold text-slate-300 tabular-nums">
                            {rowNumber}
                          </span>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col text-slate-600 text-xs">
                            <span className="font-bold tabular-nums">
                              {formatDate(m.createdAt)}
                            </span>

                            <span className="opacity-70 font-medium">
                              {formatTime(m.createdAt)} น.
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-[#1F3B8B] border border-indigo-100 group-hover:bg-white transition-colors shadow-sm shrink-0">
                              <Boxes size={18} />
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">
                                SKU: {getProductSku(m)}
                              </span>

                              <span
                                className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[#1F3B8B] uppercase"
                                title={getProductName(m)}
                              >
                                {getProductName(m)}
                              </span>

                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                  <Package className="w-3 h-3" />
                                  {getUnitName(m)}
                                </span>

                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                  <Tag className="w-3 h-3" />
                                  {m.product?.category?.name || "ทั่วไป"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <MovementBadge type={type} displayQty={displayQty} />
                        </td>

                        <td className="py-4 px-6 align-top">
                          <LocationInfo movement={m} />
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col gap-1 text-[11px] text-slate-600">
                            <span className="font-bold text-slate-800">
                              LOT:{" "}
                              <span className="text-[#1F3B8B]">
                                {getLotNumber(m)}
                              </span>
                            </span>

                            <span className="text-slate-400">
                              {getReferenceText(m)}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-center align-top">
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-lg font-black tabular-nums ${qtyClass}`}
                            >
                              {formatSignedQty(m)}
                            </span>

                            <span className="text-[10px] text-slate-400 block mt-1 font-bold uppercase">
                              {getUnitName(m)}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right align-top">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-slate-700 uppercase">
                                {getUserName(m)}
                              </span>

                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                                Verified
                              </span>
                            </div>

                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 border border-white shadow-sm">
                              {getUserName(m)?.[0] || "S"}
                            </div>
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

        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 print:hidden">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredMovements.length)}{" "}
              จากทั้งหมด {filteredMovements.length.toLocaleString()} รายการ
            </p>

            <div className="flex items-center gap-2">
              <PaginationButton
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                icon={<ChevronsLeft className="w-4 h-4" />}
              />

              <PaginationButton
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon={<ChevronLeft className="w-4 h-4" />}
              />

              <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm font-mono">
                {currentPage} / {totalPages}
              </div>

              <PaginationButton
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                icon={<ChevronRight className="w-4 h-4" />}
              />

              <PaginationButton
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                icon={<ChevronsRight className="w-4 h-4" />}
              />
            </div>
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
    rose: "border-l-rose-500 bg-rose-50/30",
    blue: "border-l-blue-500 bg-blue-50/30",
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

function MovementBadge({ type, displayQty }) {
  const isNegative = Number(displayQty || 0) < 0;

  const configs = {
    IN: {
      label: "รับเข้า (IN)",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <ArrowDownLeft size={12} />,
    },
    OUT: {
      label: "จ่ายออก (OUT)",
      color: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <ArrowUpRight size={12} />,
    },
    TRANSFER: {
      label: "โอนย้าย (TF)",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: <History size={12} />,
    },
    ADJUST: {
      label: isNegative ? "ปรับยอดลด (ADJ)" : "ปรับยอดเพิ่ม (ADJ)",
      color: isNegative
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-slate-50 text-slate-700 border-slate-200",
      icon: isNegative ? <MinusCircle size={12} /> : <Activity size={12} />,
    },
  };

  const config = configs[type] || {
    label: type || "-",
    color: "bg-slate-50 text-slate-500 border-slate-200",
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-black uppercase ${config.color} shadow-sm`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function LocationInfo({ movement }) {
  return (
    <div className="flex flex-col gap-1 text-[11px] font-medium text-slate-600 min-w-[260px]">
      <span className="font-bold text-slate-800 flex items-center gap-1">
        <Warehouse className="w-3.5 h-3.5 text-[#1F3B8B]" />
        {getWarehouseName(movement)}
      </span>

      <span className="pl-5">
        รหัสคลัง: <strong>{getWarehouseCode(movement)}</strong>
      </span>

      <span className="pl-5">
        โซน:{" "}
        <strong>
          {getZoneCode(movement)}
          {getZoneName(movement) !== "-" ? ` (${getZoneName(movement)})` : ""}
        </strong>
      </span>

      <span className="pl-5 flex items-center gap-1">
        <MapPin className="w-3 h-3 text-slate-400" />
        ตำแหน่ง:{" "}
        <strong>
          {getLocationCode(movement)}
          {getLocationName(movement) !== "-"
            ? ` (${getLocationName(movement)})`
            : ""}
        </strong>
      </span>
    </div>
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

function SystemLoader() {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 gap-6">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1F3B8B] rounded-full animate-spin"></div>

      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">
        Accessing Global Activity Registry...
      </p>
    </div>
  );
}