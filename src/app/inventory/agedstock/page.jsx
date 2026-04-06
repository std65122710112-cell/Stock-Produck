"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Database, Search, MapPin, Clock, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Wallet, Tag, Package, Boxes, ArchiveX, Hourglass, AlertCircle
} from "lucide-react";

export default function AgedStockPage() {
    const [agedStocks, setAgedStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [masterData, setMasterData] = useState({ warehouses: [], categories: [] });

    const [totalCount, setTotalCount] = useState(0);
    const [grandTotalValue, setGrandTotalValue] = useState(0);
    
    // Pagination (Local State for instant UI transition)
    const [page, setPage] = useState(1);
    const limit = 20;

    // Filters
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    
    // 💡 Filter พิเศษสำหรับหน้าสินค้าค้างสต๊อก
    const [daysThreshold, setDaysThreshold] = useState("90");
    const [debouncedDays, setDebouncedDays] = useState("90");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                days: debouncedDays,
                warehouseId: selectedWarehouse,
                categoryId: selectedCategory 
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

    useEffect(() => { fetchData(); }, [selectedWarehouse, selectedCategory, debouncedSearch, debouncedDays]);

    useEffect(() => {
        async function loadMaster() {
            try {
                const [w, c] = await Promise.all([
                    apiFetch("/master/warehouses").catch(() => []),
                    apiFetch("/master/categories").catch(() => [])
                ]);
                setMasterData({ warehouses: w, categories: c });
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
            <div className="max-w-6xl mx-auto space-y-8 pb-10">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4 print:hidden">
                    <div className="w-full pt-18 mb-2 print:hidden">
                        <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between pb-6 gap-6">

                            {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า --- */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-rose-50 flex items-center justify-center shadow-sm shrink-0 border-2 border-rose-100">
                                    <ArchiveX className="w-8 h-8 text-rose-600" strokeWidth={2} />
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <AlertCircle className="w-4 h-4 text-rose-500" strokeWidth={2.5} />
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-600">
                                            Dead Stock Monitoring
                                        </p>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                        รายงานสินค้าค้างสต๊อก
                                    </h1>
                                    <div className="flex items-center gap-2 pt-1 opacity-90">
                                        <Package className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                            พบรายการค้างสต๊อกทั้งหมด: <span className="text-rose-600 font-black">{filteredData.length.toLocaleString()}</span> รายการ
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STATUS SUMMARY BAR (เงินจม) */}
                    <div className="flex items-center gap-4 px-2">
                        <div className="flex items-center gap-3 bg-rose-50/50 px-5 py-3 rounded-2xl border-2 border-rose-100 shadow-sm transition-all hover:shadow-md min-w-[280px]">
                            <div className="p-2 bg-rose-200/50 rounded-xl shadow-inner">
                                <Wallet className="w-5 h-5 text-rose-700" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1">
                                    มูลค่าเงินจมรวม (Dead Stock Value)
                                </span>
                                <span className="text-2xl font-black text-rose-700 font-sans tabular-nums tracking-tight leading-none">
                                    {grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILTER BAR */}
                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[250px] relative px-2">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            className="w-full bg-transparent py-3 pl-12 pr-4 text-base font-bold text-slate-900 outline-none placeholder:text-slate-400"
                            placeholder="ค้นหาด้วยรหัส SKU หรือชื่อสินค้า..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 p-1">
                        {/* 💡 ตัวกรองจำนวนวัน */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 overflow-hidden hover:bg-slate-100 transition-colors">
                            <Hourglass className="w-4 h-4 text-slate-500 mr-2" />
                            <select 
                                className="bg-transparent py-2 text-xs font-black text-slate-700 outline-none cursor-pointer" 
                                value={daysThreshold} 
                                onChange={e => setDaysThreshold(e.target.value)}
                            >
                                <option value="30">ค้างนานกว่า 30 วัน</option>
                                <option value="60">ค้างนานกว่า 60 วัน</option>
                                <option value="90">ค้างนานกว่า 90 วัน</option>
                                <option value="180">ค้างนานกว่า 180 วัน</option>
                                <option value="365">ค้างนานกว่า 1 ปี</option>
                            </select>
                        </div>

                        <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                            <option value="">ทุกหมวดหมู่ (All Categories)</option>
                            {masterData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors" value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
                            <option value="">ทุกคลังสินค้า (All Warehouses)</option>
                            {masterData.warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                        </select>

                        {(search || selectedWarehouse || selectedCategory || daysThreshold !== "90") && (
                            <button onClick={() => { setSearch(""); setSelectedCategory(""); setSelectedWarehouse(""); setDaysThreshold("90"); }} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* DATA TABLE CONTAINER */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-900 font-black text-sm tracking-wide">
                                    <th className="p-6">ข้อมูลสินค้า</th>
                                    <th className="p-6">ตำแหน่งจัดเก็บ</th>
                                    <th className="p-6 text-center">ยอดค้าง</th>
                                    <th className="p-6 text-center">เวลาที่ไม่ได้ขยับ</th>
                                    <th className="p-6 text-right">มูลค่าจม</th>
                                    <th className="p-6 text-center">อัปเดตล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black tracking-wide text-sm mt-2">กำลังวิเคราะห์สินค้าค้างสต๊อก...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <ArchiveX className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-500 font-black tracking-wide text-sm">ยอดเยี่ยม! ไม่พบสินค้าค้างสต๊อกตามเงื่อนไขนี้</p>
                                        </td>
                                    </tr>
                                ) : paginatedData.map((b, i) => (
                                    <tr key={i} className="hover:bg-slate-50/80 group cursor-default transition-colors">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="tabular-nums text-base font-black text-blue-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                                        {b?.product?.sku}
                                                    </span>
                                                    {b?.product?.category?.name && (
                                                        <span className="text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                            {b.product.category.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-bold text-slate-600 text-sm truncate max-w-[280px]">
                                                    {b?.product?.name}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 shadow-sm group-hover:bg-white transition-colors flex-shrink-0">
                                                    <MapPin className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                                        {b?.location?.warehouse?.name || b?.location?.warehouse?.code || '-'}
                                                    </span>
                                                    <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mt-0.5">
                                                        <span>โลเคชั่น: {b?.location?.code || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="text-sm inline-block min-w-[60px] font-black px-3.5 py-1.5 rounded-xl tabular-nums shadow-sm bg-rose-50 text-rose-600 border border-rose-100">
                                                {b?.quantity?.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            {/* 💡 คำนวณวันให้เห็นภาพชัดเจน */}
                                            <span className="text-base font-black text-rose-600">
                                                {calculateDaysInactive(b.updatedAt)} วัน
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className="text-base font-black text-slate-900 font-sans tabular-nums tracking-tighter">
                                                {Number(b.quantity * (b?.product?.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 inline-flex items-center gap-1.5 shadow-sm">
                                                <Clock className="w-3 h-3 text-slate-400" />
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
                <div className="flex flex-col md:flex-row justify-between items-center p-4 md:px-6 md:py-4 bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 print:hidden mt-2">
                    <div className="flex items-center gap-3 bg-emerald-50/80 px-5 py-2.5 rounded-full border border-emerald-100/50">
                        <div className="bg-emerald-500 p-1.5 rounded-full shadow-sm">
                            <Tag className="w-3 h-3 text-white" />
                        </div>
                        <p className="text-xs font-black text-emerald-800 tracking-wider">
                            หน้าที่ <span className="text-emerald-950 text-sm font-mono">{page}</span> จาก <span className="text-emerald-950 text-sm font-mono">{totalPages}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 mt-4 md:mt-0 shadow-inner">
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1 || isLoading}
                            className="p-2.5 rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.max(p - 1, 1))}
                            disabled={page === 1 || isLoading}
                            className="p-2.5 rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="px-6 py-2 text-sm font-black text-blue-800 bg-blue-100 border border-blue-200 rounded-xl min-w-[90px] text-center shadow-sm mx-1 font-mono tracking-widest">
                            {page} <span className="text-blue-400 mx-1">/</span> {totalPages}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                            disabled={page === totalPages || isLoading}
                            className="p-2.5 rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages || isLoading}
                            className="p-2.5 rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </AuthGate>
    );
}