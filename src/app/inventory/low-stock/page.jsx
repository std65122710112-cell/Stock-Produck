"use client";

import React, { useState, useEffect, useMemo } from "react";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Archive,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Boxes,
  LayoutGrid,
  AlertCircle,
  MapPin,
  Warehouse,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

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

function normalizeApiList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.rows)) return res.rows;
  return [];
}

function getLocationRows(item) {
  if (Array.isArray(item?.locations) && item.locations.length > 0) {
    return item.locations.map((loc) => ({
      warehouseName:
        loc.warehouseName ||
        loc.warehouse?.name ||
        loc.warehouseCode ||
        loc.warehouse?.code ||
        "-",
      warehouseCode:
        loc.warehouseCode ||
        loc.warehouse?.code ||
        "-",
      zoneName:
        loc.zoneName ||
        loc.zone?.name ||
        loc.zoneCode ||
        loc.zone?.code ||
        "-",
      zoneCode:
        loc.zoneCode ||
        loc.zone?.code ||
        "-",
      locationName:
        loc.locationName ||
        loc.location?.name ||
        loc.locationCode ||
        loc.location?.code ||
        "-",
      locationCode:
        loc.locationCode ||
        loc.location?.code ||
        "-",
      quantity: Number(loc.quantity || 0),
      isDefault: Boolean(loc.isDefault),
    }));
  }

  if (Array.isArray(item?.stockBalances) && item.stockBalances.length > 0) {
    return item.stockBalances.map((b) => ({
      warehouseName:
        b.location?.warehouse?.name ||
        b.warehouseName ||
        b.warehouseCode ||
        "-",
      warehouseCode:
        b.location?.warehouse?.code ||
        b.warehouseCode ||
        "-",
      zoneName:
        b.location?.zone?.name ||
        b.zoneName ||
        b.zoneCode ||
        "-",
      zoneCode:
        b.location?.zone?.code ||
        b.zoneCode ||
        "-",
      locationName:
        b.location?.name ||
        b.locationName ||
        b.locationCode ||
        "-",
      locationCode:
        b.location?.code ||
        b.locationCode ||
        "-",
      quantity: Number(b.quantity || 0),
      isDefault: false,
    }));
  }

  if (
    item?.location ||
    item?.warehouse ||
    item?.warehouseName ||
    item?.warehouseCode ||
    item?.zoneName ||
    item?.zoneCode ||
    item?.locationName ||
    item?.locationCode
  ) {
    return [
      {
        warehouseName:
          item.warehouseName ||
          item.warehouse?.name ||
          item.location?.warehouse?.name ||
          item.warehouseCode ||
          item.location?.warehouse?.code ||
          "-",
        warehouseCode:
          item.warehouseCode ||
          item.warehouse?.code ||
          item.location?.warehouse?.code ||
          "-",
        zoneName:
          item.zoneName ||
          item.zone?.name ||
          item.location?.zone?.name ||
          item.zoneCode ||
          item.location?.zone?.code ||
          "-",
        zoneCode:
          item.zoneCode ||
          item.zone?.code ||
          item.location?.zone?.code ||
          "-",
        locationName:
          item.locationName ||
          item.location?.name ||
          item.locationCode ||
          item.location?.code ||
          "-",
        locationCode:
          item.locationCode ||
          item.location?.code ||
          "-",
        quantity: Number(item.currentStock || item.quantity || 0),
        isDefault: false,
      },
    ];
  }

  return [];
}

function LocationCell({ item }) {
  const rows = getLocationRows(item);
  const visibleRows = rows.slice(0, 3);
  const moreCount = rows.length - visibleRows.length;

  if (rows.length === 0) {
    return (
      <div className="text-xs font-bold text-slate-400 italic">
        ไม่พบตำแหน่งจัดเก็บ
      </div>
    );
  }

  return (
    <div className="space-y-2 min-w-[260px]">
      {visibleRows.map((loc, index) => (
        <div
          key={`${loc.warehouseCode}-${loc.zoneCode}-${loc.locationCode}-${index}`}
          className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800">
            <Warehouse className="w-3.5 h-3.5 text-[#1F3B8B]" />
            <span>
              คลัง: {loc.warehouseName}
              {loc.warehouseCode && loc.warehouseCode !== "-"
                ? ` (${loc.warehouseCode})`
                : ""}
            </span>
          </div>

          <div className="pl-5 mt-1 text-[11px] font-bold text-slate-500 leading-relaxed">
            <div>
              โซน: {loc.zoneName}
              {loc.zoneCode && loc.zoneCode !== "-"
                ? ` (${loc.zoneCode})`
                : ""}
            </div>

            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              ตำแหน่ง: {loc.locationName}
              {loc.locationCode && loc.locationCode !== "-"
                ? ` (${loc.locationCode})`
                : ""}
            </div>

            {loc.quantity > 0 && (
              <div className="text-[10px] text-emerald-600 font-black mt-0.5">
                คงเหลือที่ตำแหน่งนี้: {loc.quantity.toLocaleString()}
              </div>
            )}

            {loc.isDefault && (
              <div className="text-[10px] text-amber-600 font-black mt-0.5">
                ตำแหน่งตามแผน / ตำแหน่งตั้งต้น
              </div>
            )}
          </div>
        </div>
      ))}

      {moreCount > 0 && (
        <div className="text-[10px] font-black text-slate-400 pl-1">
          + อีก {moreCount} ตำแหน่ง
        </div>
      )}
    </div>
  );
}

export default function LowStockAlertPage() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/inventory/low-stock-alerts");
        setAlerts(normalizeApiList(res));
      } catch (e) {
        console.error("API Error:", e);
        setAlerts([]);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  const filteredData = useMemo(() => {
    return alerts
      .filter((item) => {
        const keyword = searchTerm.trim().toLowerCase();

        const locationText = getLocationRows(item)
          .map(
            (loc) =>
              `${loc.warehouseName} ${loc.warehouseCode} ${loc.zoneName} ${loc.zoneCode} ${loc.locationName} ${loc.locationCode}`,
          )
          .join(" ")
          .toLowerCase();

        const matchSearch =
          !keyword ||
          String(item.name || "").toLowerCase().includes(keyword) ||
          String(item.sku || "").toLowerCase().includes(keyword) ||
          locationText.includes(keyword);

        const currentStock = Number(item.currentStock || 0);
        const isCritical = currentStock === 0;

        const matchRisk =
          riskFilter === "ALL" ||
          (riskFilter === "CRITICAL" && isCritical) ||
          (riskFilter === "WARNING" && !isCritical);

        return matchSearch && matchRisk;
      })
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [alerts, searchTerm, riskFilter]);

  const stats = useMemo(() => {
    const critical = alerts.filter(
      (a) => Number(a.currentStock || 0) === 0,
    ).length;

    return {
      total: alerts.length,
      critical,
      warning: alerts.length - critical,
    };
  }, [alerts]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, riskFilter]);

  if (isLoading) return <SystemLoader />;

  return (
    <AuthGate>
      <Toaster position="top-right" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100 shadow-sm shrink-0">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                รายการพัสดุใกล้หมด
              </h1>

              <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                <Archive className="w-4 h-4 text-slate-400" />
                ระบบแจ้งเตือนสินค้าที่ต่ำกว่าเกณฑ์ควบคุม พร้อมตำแหน่งจัดเก็บ
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white px-6 py-4 rounded-xl flex items-center gap-8 shadow-md">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                หน้าปัจจุบัน
              </span>

              <span className="text-2xl font-bold tabular-nums text-[#1F3B8B] bg-white px-3 rounded-lg border border-slate-700">
                {page}{" "}
                <span className="text-slate-300 text-sm">
                  / {totalPages || 1}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard
            title="แจ้งเตือนรวมทั้งหมด"
            count={stats.total}
            unit="รายการ"
            color="slate"
            icon={<LayoutGrid className="text-slate-600" size={20} />}
          />

          <SummaryCard
            title="สินค้าหมด (Out of Stock)"
            count={stats.critical}
            unit="รายการ"
            color="rose"
            icon={<AlertTriangle className="text-rose-600" size={20} />}
          />

          <SummaryCard
            title="ใกล้หมด (Low Stock)"
            count={stats.warning}
            unit="รายการ"
            color="orange"
            icon={<AlertCircle className="text-orange-600" size={20} />}
          />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors"
                size={18}
              />

              <input
                type="text"
                placeholder="ค้นหาด้วย SKU, ชื่อสินค้า, คลัง, โซน หรือตำแหน่งจัดเก็บ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1F3B8B] focus:bg-white focus:ring-4 focus:ring-[#1F3B8B]/5 font-bold text-sm transition-all"
              />
            </div>

            <div className="w-full md:w-64 relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#1F3B8B] font-bold text-sm text-slate-700 cursor-pointer shadow-sm"
              >
                <option value="ALL">ระดับความเสี่ยงทั้งหมด</option>
                <option value="CRITICAL">วิกฤต (ยอดคงเหลือ 0)</option>
                <option value="WARNING">เฝ้าระวัง (ต่ำกว่าเกณฑ์)</option>
              </select>
            </div>

            {(searchTerm || riskFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setRiskFilter("ALL");
                }}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors shrink-0"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full border-collapse text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-4 px-8">พัสดุและรหัสสินค้า</th>
                  <th className="py-4 px-6">คลัง / โซน / ตำแหน่งจัดเก็บ</th>
                  <th className="py-4 px-6 text-center">คงเหลือปัจจุบัน</th>
                  <th className="py-4 px-6 text-center">เกณฑ์ขั้นต่ำ (Min)</th>
                  <th className="py-4 px-6">ระดับความเสี่ยง</th>
                  <th className="py-4 px-8 text-right">อัปเดตล่าสุด</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-200" />
                        <p className="text-slate-400 font-medium text-sm italic">
                          ไม่มีรายการแจ้งเตือนพัสดุใกล้หมดในขณะนี้
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const currentStock = Number(item.currentStock || 0);
                    const threshold = Number(item.threshold || 0);
                    const isCritical = currentStock === 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-indigo-50 rounded-lg text-[#1F3B8B] border border-indigo-100 group-hover:bg-white transition-colors shadow-sm shrink-0">
                              <Boxes size={18} />
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mb-0.5">
                                SKU: {item.sku || "-"}
                              </span>

                              <span
                                className="text-sm font-semibold text-slate-800 line-clamp-2 uppercase"
                                title={item.name}
                              >
                                {item.name || "-"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-5 px-6 align-top">
                          <LocationCell item={item} />
                        </td>

                        <td className="py-5 px-6 text-center">
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-lg font-black tabular-nums ${
                                isCritical
                                  ? "text-rose-600 animate-pulse"
                                  : "text-orange-500"
                              }`}
                            >
                              {currentStock.toLocaleString()}
                            </span>

                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                              {item.unit || item.unitName || "Unit"}
                            </span>
                          </div>
                        </td>

                        <td className="py-5 px-6 text-center">
                          <div className="flex flex-col items-center text-slate-600">
                            <span className="text-sm font-bold tabular-nums">
                              {threshold.toLocaleString()}
                            </span>

                            <span className="text-[9px] text-slate-400 font-black uppercase italic tracking-tighter">
                              Safety Limit
                            </span>
                          </div>
                        </td>

                        <td className="py-5 px-6">
                          <StatusBadge isCritical={isCritical} />
                        </td>

                        <td className="py-5 px-8 text-right">
                          <div className="flex flex-col items-end gap-0.5 text-slate-500">
                            <span className="text-xs font-bold tabular-nums">
                              {formatDate(item.updatedAt)}
                            </span>

                            <span className="text-[10px] font-medium opacity-70 italic">
                              {formatTime(item.updatedAt)} น.
                            </span>
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

        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 print:hidden">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              แสดง {(page - 1) * itemsPerPage + 1} -{" "}
              {Math.min(page * itemsPerPage, filteredData.length)} จากทั้งหมด{" "}
              {filteredData.length.toLocaleString()} รายการ
            </p>

            <div className="flex items-center gap-2">
              <PaginationBtn
                onClick={() => setPage(1)}
                disabled={page === 1}
                icon={<ChevronsLeft size={16} />}
              />

              <PaginationBtn
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                icon={<ChevronLeft size={16} />}
              />

              <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm font-mono">
                {page} / {totalPages}
              </div>

              <PaginationBtn
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                icon={<ChevronRight size={16} />}
              />

              <PaginationBtn
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                icon={<ChevronsRight size={16} />}
              />
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

function SummaryCard({ title, count, unit, color, icon }) {
  const colors = {
    slate: "border-l-slate-400 bg-slate-50/50",
    rose: "border-l-rose-500 bg-rose-50/30",
    orange: "border-l-orange-500 bg-orange-50/30",
  };

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${colors[color]} p-5 rounded-xl flex items-center gap-4 shadow-sm transition-all hover:shadow-md`}
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

          <span className="text-xs font-bold text-slate-400 uppercase">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ isCritical }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-black uppercase shadow-sm ${
        isCritical
          ? "bg-rose-50 text-rose-700 border-rose-100"
          : "bg-orange-50 text-orange-700 border-orange-100"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isCritical ? "bg-rose-500 animate-pulse" : "bg-orange-500"
        }`}
      />

      {isCritical ? "สินค้าหมดคลัง" : "ควรสั่งซื้อเพิ่ม"}
    </span>
  );
}

function PaginationBtn({ onClick, disabled, icon }) {
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

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] animate-pulse">
        Scanning Inventory Safety Levels...
      </p>
    </div>
  );
}