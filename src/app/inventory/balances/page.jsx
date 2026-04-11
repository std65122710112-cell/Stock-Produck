"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Database, Search, MapPin, Clock, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Loader2, Wallet, Tag, Package, Download, Boxes,
    ChevronDown
} from "lucide-react";

export default function BalancesPage() {
    const [balances, setBalances] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [masterData, setMasterData] = useState({ warehouses: [], zones: [], categories: [], locations: [] });

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
                locationId: selectedLocation
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
    }, [page, selectedWarehouse, selectedZone, selectedLocation, selectedCategory, debouncedSearch]);

    useEffect(() => {
        const timer = setTimeout(() => { if (page !== 1) setPage(1); setDebouncedSearch(search); }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        async function loadMaster() {
            try {
                const [w, z, c, l] = await Promise.all([
                    apiFetch("/master/warehouses").catch(() => []),
                    apiFetch("/master/zones").catch(() => []),
                    apiFetch("/master/categories").catch(() => []),
                    apiFetch("/master/locations").catch(() => [])
                ]);
                setMasterData({ warehouses: w, zones: z, categories: c, locations: l });
            } catch (e) { console.error(e); }
        }
        loadMaster();
    }, []);

    async function handleBarcode(product, action) {
        if (!product?.id) return;
        setBusyId(product.id);
        try {
            const token = getAccessToken();
            const res = await fetch(`${API_BASE}/master/products/${product.id}/barcode.png`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            if (action === "view") window.open(url, "_blank");
            else {
                const a = document.createElement("a"); a.href = url; a.download = `barcode_${product.sku}.png`; a.click();
            }
        } catch (e) { toast.error("เกิดข้อผิดพลาดในการโหลดบาร์โค้ด"); } finally { setBusyId(null); }
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />
            {/* 💡 เปลี่ยนจาก max-w-6xl เป็น w-full max-w-[1600px] เพื่อให้ขยายออกกว้างขึ้น */}
            <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-10">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4 print:hidden pt-8">
                    <div className="w-full">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 px-4 md:px-8">
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                                <Boxes className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Database className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        Inventory Balance
                                    </p>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none mb-2">
                                    ยอดคงเหลือสินค้า
                                </h1>
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <Package className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 tracking-wide">
                                        จำนวนรายการทั้งหมด: <span className="text-emerald-600 font-black">{totalCount.toLocaleString()}</span> รายการ
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center px-4 md:px-8 mt-4 md:mt-0">
                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                    มูลค่ารวมทั้งหมด
                                </span>
                                <span className="text-xl font-black text-slate-900 tabular-nums leading-none">
                                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILTER SECTION */}
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 mx-2 md:mx-0 print:hidden">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 w-full relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                                placeholder="ค้นหาด้วยรหัส SKU หรือชื่อสินค้า..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl font-bold text-sm transition-colors border border-rose-100 shrink-0"
                            >
                                <X className="w-4 h-4" />
                                <span>ล้างตัวกรอง</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* หมวดหมู่ */}
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors"
                                value={selectedCategory}
                                onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}
                            >
                                <option value="">🏷️ หมวดหมู่ทั้งหมด</option>
                                {masterData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* คลังสินค้า */}
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors"
                                value={selectedWarehouse}
                                onChange={e => {
                                    setSelectedWarehouse(e.target.value);
                                    setSelectedZone("");
                                    setSelectedLocation("");
                                    setPage(1);
                                }}
                            >
                                <option value="">🏢 คลังทั้งหมด</option>
                                {masterData.warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* โซน */}
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                value={selectedZone}
                                disabled={!selectedWarehouse}
                                onChange={e => {
                                    setSelectedZone(e.target.value);
                                    setSelectedLocation("");
                                    setPage(1);
                                }}
                            >
                                <option value="">📍 โซนทั้งหมด</option>
                                {masterData.zones
                                    .filter(z => String(z.warehouseId) === String(selectedWarehouse))
                                    .map(z => (
                                        <option key={z.id} value={z.id}>
                                            {z.name ? `${z.code} - ${z.name}` : z.code}
                                        </option>
                                    ))
                                }
                            </select>
                            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${!selectedWarehouse ? 'text-slate-300' : 'text-slate-400'}`} />
                        </div>

                        {/* ตำแหน่งจัดเก็บ */}
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                value={selectedLocation}
                                disabled={!selectedWarehouse && !selectedZone}
                                onChange={e => { setSelectedLocation(e.target.value); setPage(1); }}
                            >
                                <option value="">📌 ตำแหน่งทั้งหมด</option>
                                {masterData.locations
                                    .filter(loc => {
                                        if (selectedZone) return String(loc.zoneId) === String(selectedZone);
                                        if (selectedWarehouse) return String(loc.warehouseId) === String(selectedWarehouse);
                                        return true;
                                    })
                                    .map(loc => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.code} {loc.name ? `(${loc.name})` : ''}
                                        </option>
                                    ))
                                }
                            </select>
                            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${(!selectedWarehouse && !selectedZone) ? 'text-slate-300' : 'text-slate-400'}`} />
                        </div>
                    </div>
                </div>

                {/* DATA TABLE CONTAINER */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white shadow-[0_10px_40px_-15px_rgba(15,23,42,0.08)] backdrop-blur-sm mx-2 md:mx-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-800 font-black text-sm tracking-wide">
                                    <th className="py-4 px-4 pl-6 w-1/4">ข้อมูลสินค้า</th>
                                    <th className="py-4 px-4 w-1/4">ตำแหน่งจัดเก็บ</th>
                                    <th className="py-4 px-4 text-center">ยอดคงเหลือ</th>
                                    <th className="py-4 px-4 text-center">บาร์โค้ด</th>
                                    <th className="py-4 px-4 text-right">มูลค่ารวม</th>
                                    <th className="py-4 px-4 text-center pr-6">อัปเดตล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-500 font-bold text-sm mt-2">กำลังดึงข้อมูล...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : balances.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <Database className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-500 font-bold text-sm">ไม่พบรายการสินค้าที่ตรงกับเงื่อนไข</p>
                                        </td>
                                    </tr>
                                ) : balances.map((b, i) => (
                                    <tr key={i} className="hover:bg-slate-50/80 group transition-colors">
                                        <td className="py-4 px-4 pl-6 align-top">
                                            <div className="flex flex-col">
                                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                                    <span className="tabular-nums font-black text-blue-700 uppercase tracking-tight text-sm">
                                                        {b?.product?.sku}
                                                    </span>
                                                    {b?.product?.category?.name && (
                                                        <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase">
                                                            {b.product.category.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-semibold text-slate-700 text-sm line-clamp-2 leading-relaxed">
                                                    {b?.product?.name}
                                                </p>
                                            </div>
                                        </td>
                                        
                                        <td className="py-4 px-4 align-top">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 flex-shrink-0 mt-0.5">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-black text-slate-800 tracking-wide mb-1.5 leading-tight">
                                                        {b?.location?.warehouse?.name ? `${b.location.warehouse.name} (${b.location.warehouse.code})` : b?.location?.warehouse?.code || '-'}
                                                    </span>
                                                    <div className="text-[11.5px] font-semibold text-slate-600 flex flex-col gap-1.5">
                                                        <div className="flex items-start gap-2">
                                                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-bold uppercase tracking-wider text-[9px] shrink-0 mt-0.5">Zone</span>
                                                            <span className="leading-tight">
                                                                {b?.location?.zone?.name ? `${b.location.zone.name} (${b.location.zone.code})` : b?.location?.zone?.code || '-'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-bold uppercase tracking-wider text-[9px] shrink-0 mt-0.5">Loc</span>
                                                            <span className="leading-tight">
                                                                {b?.location?.name ? `${b.location.name} (${b.location.code})` : b?.location?.code || '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 text-center align-top">
                                            <div className="flex flex-col items-center justify-center h-full pt-1">
                                                <span className={`text-sm inline-block min-w-[50px] font-black px-3 py-1 rounded-lg tabular-nums ${b.quantity <= 5
                                                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {b?.quantity?.toLocaleString()}
                                                </span>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                                    {b?.product?.unit?.name || 'PCS'}
                                                </p>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 align-top">
                                            <div className="flex flex-col items-center gap-2 pt-0.5">
                                                <button
                                                    onClick={() => handleBarcode(b.product, "view")}
                                                    disabled={busyId === b.product.id}
                                                    className="w-[90px] bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                                >
                                                    ดูบาร์โค้ด <ChevronRight className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleBarcode(b.product, "dl")}
                                                    disabled={busyId === b.product.id}
                                                    className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 py-1 flex items-center gap-1 transition-colors disabled:opacity-50"
                                                >
                                                    <Download className="w-3 h-3" /> โหลดบาร์โค้ด
                                                </button>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 text-right align-top">
                                            <div className="pt-1.5">
                                                <span className="text-base font-black text-slate-800 tabular-nums">
                                                    {Number(b?.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 text-center pr-6 align-top">
                                            <div className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5 pt-2">
                                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                {new Date(b.updatedAt).toLocaleDateString('th-TH')}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* BOTTOM PAGINATION NOTE */}
                <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-white rounded-3xl border border-slate-200 shadow-sm print:hidden mx-2 md:mx-0">
                    <p className="text-xs font-black text-slate-500 tracking-wide mb-3 sm:mb-0">
                        กำลังแสดงหน้า <span className="text-blue-600 font-mono text-sm mx-1">{page}</span> จากทั้งหมด <span className="text-blue-600 font-mono text-sm mx-1">{totalPages}</span> หน้า
                    </p>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1 || isLoading}
                            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronsLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.max(p - 1, 1))}
                            disabled={page === 1 || isLoading}
                            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="px-4 py-1.5 text-sm font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-lg min-w-[70px] text-center font-mono">
                            {page} / {totalPages}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                            disabled={page === totalPages || isLoading}
                            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages || isLoading}
                            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronsRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

            </div>
        </AuthGate>
    );
}