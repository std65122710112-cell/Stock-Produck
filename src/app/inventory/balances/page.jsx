"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Database,
  Search,
  MapPin,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Package,
  Boxes,
  LayoutGrid,
  TrendingUp,
} from "lucide-react";

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
  const limit = 20;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [busyId, setBusyId] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        categoryId: selectedCategory,
        warehouseId: selectedWarehouse,
        zoneId: selectedZone,
        locationId: selectedLocation,
      });
      const res = await apiFetch(`/inventory/balances?${params.toString()}`);
      if (res.success) {
        setBalances(res.data);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
        setGrandTotalValue(res.grandTotalValue || 0);
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
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function loadMaster() {
      try {
        const [w, z, c, l] = await Promise.all([
          apiFetch("/master/warehouses").catch(() => []),
          apiFetch("/master/zones").catch(() => []),
          apiFetch("/master/categories").catch(() => []),
          apiFetch("/master/locations").catch(() => []),
        ]);
        setMasterData({ warehouses: w, zones: z, categories: c, locations: l });
      } catch (e) {
        console.error(e);
      }
    }
    loadMaster();
  }, []);

  async function handleBarcode(product, action) {
    if (!product?.id) return;
    setBusyId(product.id);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${API_BASE}/master/products/${product.id}/barcode.png`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (action === "view") window.open(url, "_blank");
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `barcode_${product.sku}.png`;
        a.click();
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการโหลดบาร์โค้ด");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <div className="w-full max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* HEADER SECTION - ปรับให้มี Icon และความกว้างที่เหมาะสม */}
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
            <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl flex flex-col items-end min-w-55 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                มูลค่ารวมทั้งหมด (Grand Total)
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

        {/* SUMMARY CARDS - เพิ่มภาพรวมจำนวนรายการ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SummaryCard 
            title="รายการสินค้าทั้งหมด" 
            count={totalCount} 
            unit="รายการ"
            color="slate" 
            icon={<LayoutGrid className="w-5 h-5 text-slate-600" />} 
          />
          <SummaryCard 
            title="ยอดสต๊อกรวม" 
            count={balances.reduce((sum, b) => sum + (b.quantity || 0), 0)} 
            unit="หน่วย"
            color="emerald" 
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} 
          />
        </div>

        {/* FILTER SECTION - ปรับดีไซน์ให้เหมือนหน้าสินค้าใกล้หมด */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 print:hidden">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" />
              <input
                className="w-full bg-white border border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/5 rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
                placeholder="ค้นหา SKU หรือชื่อสินค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {(search || selectedWarehouse || selectedZone || selectedLocation || selectedCategory) && (
              <button
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilterSelect 
              value={selectedCategory} 
              onChange={(v) => { setSelectedCategory(v); setPage(1); }}
              options={masterData.categories}
              placeholder="ทุกหมวดหมู่"
            />
            <FilterSelect 
              value={selectedWarehouse} 
              onChange={(v) => { setSelectedWarehouse(v); setSelectedZone(""); setSelectedLocation(""); setPage(1); }}
              options={masterData.warehouses}
              placeholder="ทุกคลังสินค้า"
            />
            <FilterSelect 
              value={selectedZone} 
              onChange={(v) => { setSelectedZone(v); setSelectedLocation(""); setPage(1); }}
              options={masterData.zones.filter(z => String(z.warehouseId) === String(selectedWarehouse))}
              placeholder="ทุกโซน"
              disabled={!selectedWarehouse}
            />
            <FilterSelect 
              value={selectedLocation} 
              onChange={(v) => { setSelectedLocation(v); setPage(1); }}
              options={masterData.locations.filter(loc => {
                if (selectedZone) return String(loc.zoneId) === String(selectedZone);
                if (selectedWarehouse) return String(loc.warehouseId) === String(selectedWarehouse);
                return true;
              })}
              placeholder="ทุกตำแหน่ง"
              disabled={!selectedWarehouse && !selectedZone}
              labelField={(opt) => `${opt.code} ${opt.name ? `(${opt.name})` : ""}`}
            />
          </div>
        </div>

        {/* DATA TABLE - คุมโทนเหมือนหน้าอื่นๆ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">รายละเอียดสินค้า</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ตำแหน่งจัดเก็บ</th>
                  <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">คงเหลือ</th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">มูลค่ารวม</th>
                  <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">บาร์โค้ด</th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">อัปเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" /></td>
                  </tr>
                ) : balances.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-slate-400 font-medium italic">ไม่พบข้อมูลรายการสินค้า</td>
                  </tr>
                ) : (
                  balances.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mb-0.5">
                            {b?.product?.sku}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-[#1F3B8B]">
                            {b?.product?.name}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                            {b?.product?.category?.name || "ทั่วไป"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#1F3B8B]" /> {b?.location?.warehouse?.name || "-"}
                          </span>
                          <span className="pl-4">โซน: {b?.location?.zone?.code || "-"} | ล็อก: {b?.location?.code || "-"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-md tabular-nums ${
                            b.quantity <= 5 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {b?.quantity?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-bold uppercase tracking-tight">
                            {b?.product?.unit?.name || "Unit"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-800 tabular-nums text-sm">
                        {Number(b?.totalValue || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {busyId === b?.product?.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                          ) : (
                            <>
                              <button
                                onClick={() => handleBarcode(b.product, "view")}
                                className="text-[11px] font-bold text-[#1F3B8B] hover:underline"
                              >
                                เปิดดู
                              </button>
                              <button
                                onClick={() => handleBarcode(b.product, "dl")}
                                className="text-[10px] text-slate-400 font-bold hover:text-slate-600"
                              >
                                ดาวน์โหลด
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-xs text-slate-500 font-medium">
                        {new Date(b.updatedAt).toLocaleDateString("th-TH")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION - ปรับให้เหมือนหน้าสินค้าใกล้หมด */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 print:hidden">
            <p className="text-xs font-medium text-slate-500">
              หน้า {page} จาก {totalPages} | รวม {totalCount.toLocaleString()} รายการ
            </p>
            <div className="flex items-center gap-2">
              <PaginationButton onClick={() => setPage(1)} disabled={page === 1} icon={<ChevronsLeft className="w-4 h-4" />} />
              <PaginationButton onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} icon={<ChevronLeft className="w-4 h-4" />} />
              
              <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm">
                {page} / {totalPages}
              </div>

              <PaginationButton onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} icon={<ChevronRight className="w-4 h-4" />} />
              <PaginationButton onClick={() => setPage(totalPages)} disabled={page === totalPages} icon={<ChevronsRight className="w-4 h-4" />} />
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

// --- SUB-COMPONENTS ---

function SummaryCard({ title, count, unit, color, icon }) {
  const themes = {
    slate: "border-l-slate-400 bg-slate-50/50",
    emerald: "border-l-emerald-500 bg-emerald-50/30",
  };
  
  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${themes[color] || themes.slate} p-5 rounded-xl flex items-center gap-4 shadow-sm transition-all hover:shadow-md`}>
      <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">{count.toLocaleString()}</span>
          {unit && <span className="text-xs font-bold text-slate-400 uppercase">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder, disabled, labelField }) {
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
          {labelField ? labelField(opt) : (opt.name || opt.code)}
        </option>
      ))}
    </select>
  );
}

function PaginationButton({ onClick, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm"
    >
      {icon}
    </button>
  );
}