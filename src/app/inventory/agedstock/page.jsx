"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Database, Search, MapPin, Clock, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Wallet, Tag, Package, Boxes, ArchiveX, Hourglass, AlertCircle, ChevronDown
} from "lucide-react";

export default function AgedStockPage() {
    const [agedStocks, setAgedStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // 💡 1. เพิ่ม zones และ locations เข้ามาใน Master Data
    const [masterData, setMasterData] = useState({ warehouses: [], categories: [], zones: [], locations: [] });

    const [totalCount, setTotalCount] = useState(0);
    const [grandTotalValue, setGrandTotalValue] = useState(0);

    // Pagination (Local State for instant UI transition)
    const [page, setPage] = useState(1);
    const limit = 20;

    // Filters
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    // 💡 2. เพิ่ม State ตัวกรองสถานที่ให้ครบถ้วน
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");

    // Filter พิเศษสำหรับหน้าสินค้าค้างสต๊อก
    const [daysThreshold, setDaysThreshold] = useState("90");
    const [debouncedDays, setDebouncedDays] = useState("90");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                days: debouncedDays,
                categoryId: selectedCategory,
                warehouseId: selectedWarehouse,
                zoneId: selectedZone,       // 💡 ส่งค่าโซน
                locationId: selectedLocation // 💡 ส่งค่าตำแหน่ง
            });
            const res = await apiFetch(`/inventory/aged-stock?${params.toString()}`);
            if (res.success) {
                setAgedStocks(res.data);
                setTotalCount(res.totalItems);
                setGrandTotalValue(res.totalValue || 0);
                setPage(1); // รีเซ็ตหน้ากลับไป 1 เสมอเมื่อดึงข้อมูลใหม่
            }
        } catch (err) {
            toast.error("ดึงข้อมูลสินค้าค้างสต๊อกล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    // 🛡️ ระบบ Debounce ป้องกันการยิง API รัวๆ (Security/Performance)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setDebouncedDays(daysThreshold);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, daysThreshold]);

    // 💡 3. เพิ่ม selectedZone และ selectedLocation ใน Dependency
    useEffect(() => {
        fetchData();
    }, [selectedWarehouse, selectedZone, selectedLocation, selectedCategory, debouncedSearch, debouncedDays]);

    useEffect(() => {
        async function loadMaster() {
            try {
                // 💡 4. โหลด Master Data ให้ครบทุกระดับ
                const [w, c, z, l] = await Promise.all([
                    apiFetch("/master/warehouses").catch(() => []),
                    apiFetch("/master/categories").catch(() => []),
                    apiFetch("/master/zones").catch(() => []),
                    apiFetch("/master/locations").catch(() => [])
                ]);
                setMasterData({ warehouses: w, categories: c, zones: z, locations: l });
            } catch (e) { console.error(e); }
        }
        loadMaster();
    }, []);

    // 🚀 ระบบค้นหาและแบ่งหน้าฝั่ง Client (ลื่นไหล 100% ไม่ต้องรอโหลดเซิร์ฟเวอร์)
    const filteredData = useMemo(() => {
        if (!debouncedSearch) return agedStocks;
        const lowerSearch = debouncedSearch.toLowerCase();
        return agedStocks.filter(item =>
            item?.product?.sku?.toLowerCase().includes(lowerSearch) ||
            item?.product?.name?.toLowerCase().includes(lowerSearch)
        );
    }, [agedStocks, debouncedSearch]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / limit));
    const paginatedData = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredData.slice(start, start + limit);
    }, [filteredData, page]);

    // ฟังก์ชันคำนวณจำนวนวันที่ไม่ได้ขยับ
    const calculateDaysInactive = (updatedAt) => {
        const diffTime = Math.abs(new Date() - new Date(updatedAt));
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-6 pb-10">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4 print:hidden pt-8">
                    <div className="w-full">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 px-4 md:px-8">
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-rose-50 flex items-center justify-center shadow-sm shrink-0 border border-rose-100">
                                <ArchiveX className="w-8 h-8 text-rose-600" strokeWidth={2} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <AlertCircle className="w-4 h-4 text-rose-500" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-600">
                                        Dead Stock Monitoring
                                    </p>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none mb-2">
                                    รายงานสินค้าค้างสต๊อก
                                </h1>
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <Package className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 tracking-wide">
                                        พบรายการค้างสต๊อกทั้งหมด: <span className="text-rose-600 font-black">{filteredData.length.toLocaleString()}</span> รายการ
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center px-4 md:px-8 mt-4 md:mt-0">
                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm min-w-[250px]">
                            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                    มูลค่าเงินจมรวมทั้งหมด
                                </span>
                                <span className="text-xl font-black text-rose-700 tabular-nums leading-none">
                                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🎨 FILTER SECTION (RE-DESIGNED) */}
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 mx-2 md:mx-0 print:hidden">

                    {/* แถวบน: ค้นหา & ปุ่มล้าง */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 w-full relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                                placeholder="ค้นหาด้วยรหัส SKU หรือชื่อสินค้า..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {(search || selectedWarehouse || selectedZone || selectedLocation || selectedCategory || daysThreshold !== "90") && (
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setSelectedCategory("");
                                    setSelectedWarehouse("");
                                    setSelectedZone("");
                                    setSelectedLocation("");
                                    setDaysThreshold("90");
                                    setPage(1);
                                }}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl font-bold text-sm transition-colors border border-rose-100 shrink-0"
                            >
                                <X className="w-4 h-4" />
                                <span>ล้างตัวกรอง</span>
                            </button>
                        )}
                    </div>

                    {/* แถวล่าง: Dropdowns จัดแบบ Grid 5 คอลัมน์ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

                        {/* 1. จำนวนวันที่ค้าง */}
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Hourglass className="w-4 h-4 text-rose-500" />
                            </div>
                            <select
                                className="w-full appearance-none bg-rose-50/50 border border-rose-200 hover:border-rose-300 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-rose-700 outline-none cursor-pointer transition-colors"
                                value={daysThreshold}
                                onChange={e => setDaysThreshold(e.target.value)}
                            >
                                <option value="30">ค้าง &gt; 30 วัน</option>
                                <option value="60">ค้าง &gt; 60 วัน</option>
                                <option value="90">ค้าง &gt; 90 วัน</option>
                                <option value="180">ค้าง &gt; 180 วัน</option>
                                <option value="365">ค้าง &gt; 1 ปี</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 pointer-events-none" />
                        </div>

                        {/* 2. หมวดหมู่ */}
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors"
                                value={selectedCategory}
                                onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}
                            >
                                <option value="">🏷️ หมวดหมู่ทั้งหมด</option>
                                {masterData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* 3. คลังสินค้า */}
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors"
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

                        {/* 4. โซน */}
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 focus:border-slate-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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

                        {/* 5. ตำแหน่งจัดเก็บ */}
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 focus:border-slate-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                                    <th className="p-5 pl-8">ข้อมูลสินค้า</th>
                                    <th className="p-5">ตำแหน่งจัดเก็บ</th>
                                    <th className="p-5 text-center">ยอดค้าง</th>
                                    <th className="p-5 text-center">เวลาที่ไม่ได้ขยับ</th>
                                    <th className="p-5 text-right">มูลค่าจม</th>
                                    <th className="p-5 text-center pr-8">อัปเดตล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-slate-100 border-t-rose-600 rounded-full animate-spin"></div>
                                                <p className="text-slate-500 font-bold text-sm mt-2">กำลังดึงข้อมูล...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <ArchiveX className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-500 font-bold text-sm">ยอดเยี่ยม! ไม่พบสินค้าค้างสต๊อกตามเงื่อนไขนี้</p>
                                        </td>
                                    </tr>
                                ) : paginatedData.map((b, i) => (
                                    <tr key={i} className="hover:bg-slate-50/80 group transition-colors">
                                        <td className="p-5 pl-8">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="tabular-nums font-black text-blue-700 uppercase tracking-tight">
                                                        {b?.product?.sku}
                                                    </span>
                                                    {b?.product?.category?.name && (
                                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase">
                                                            {b.product.category.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-semibold text-slate-700 text-sm truncate max-w-[280px]">
                                                    {b?.product?.name}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 p-2 rounded-lg text-slate-600 flex-shrink-0">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 tracking-wide">
                                                        {b?.location?.warehouse?.name || b?.location?.warehouse?.code || '-'}
                                                    </span>
                                                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                        <span>Z: {b?.location?.zone?.code || '-'}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <span>L: {b?.location?.code || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className="text-sm inline-block min-w-[50px] font-black px-3 py-1 rounded-lg tabular-nums bg-rose-50 text-rose-600 border border-rose-100">
                                                {b?.quantity?.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className="text-sm font-black text-rose-600 bg-white border border-rose-100 px-3 py-1.5 rounded-lg shadow-sm">
                                                {calculateDaysInactive(b.updatedAt)} วัน
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <span className="text-base font-black text-slate-800 tabular-nums">
                                                {Number(b.quantity * (b?.product?.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-5 text-center pr-8">
                                            <div className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                        กำลังแสดงหน้า <span className="text-rose-600 font-mono text-sm mx-1">{page}</span> จากทั้งหมด <span className="text-rose-600 font-mono text-sm mx-1">{totalPages}</span> หน้า
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