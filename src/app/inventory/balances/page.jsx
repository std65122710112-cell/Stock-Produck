"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Database, Search, MapPin, Clock, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Loader2, Wallet, Tag, Package, Eye, Download
} from "lucide-react";

export default function BalancesPage() {
    const [balances, setBalances] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [masterData, setMasterData] = useState({ warehouses: [], zones: [], categories: [] });

    const [totalCount, setTotalCount] = useState(0);
    const [grandTotalValue, setGrandTotalValue] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const limit = 20;

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(""); // 💡 เพิ่ม State หมวดหมู่
    const [busyId, setBusyId] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: debouncedSearch,
                warehouseId: selectedWarehouse,
                zoneId: selectedZone,
                categoryId: selectedCategory // 💡 ส่งค่าหมวดหมู่ไปกรองที่ Backend
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

    // 💡 เพิ่ม selectedCategory เข้าไปใน Dependency ของ useEffect
    useEffect(() => { fetchData(); }, [page, selectedWarehouse, selectedZone, selectedCategory, debouncedSearch]);

    useEffect(() => {
        const timer = setTimeout(() => { if (page !== 1) setPage(1); setDebouncedSearch(search); }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        async function loadMaster() {
            try {
                // 💡 ดึงข้อมูลหมวดหมู่มาด้วยพร้อมกับคลังและโซน
                const [w, z, c] = await Promise.all([
                    apiFetch("/master/warehouses").catch(() => []),
                    apiFetch("/master/zones").catch(() => []),
                    apiFetch("/master/categories").catch(() => []) // ดึง Categories
                ]);
                setMasterData({ warehouses: w, zones: z, categories: c });
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
            <div className="max-w-6xl mx-auto space-y-8 pb-10">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4 print:hidden">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-wider w-fit">
                            <Database className="w-4 h-4" /> ระบบคลังสินค้า (Inventory Balances)
                        </div>
                        <h1 className="text-5xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                            ยอดคงเหลือสินค้า
                        </h1>
                        <p className="text-slate-600 text-base font-bold flex items-center gap-2">
                            <Package className="w-5 h-5 text-slate-400" />
                            จำนวนรายการในระบบทั้งหมด: {totalCount.toLocaleString()} รายการ
                        </p>
                    </div>

                    {/* STATUS SUMMARY BAR */}
                    <div className="flex items-center gap-4 px-2">
                        {/* ✅ ปรับกล่องเป็นสีเทา (bg-slate-50, border-slate-200) */}
                        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border-2 border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <div className="p-2 bg-slate-200/50 rounded-xl shadow-inner">
                                <Wallet className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                                    มูลค่ารวม (Total Value)
                                </span>

                                {/* ✅ เอา font-mono ออก และใช้ font-sans เพื่อให้เลข 0 ไม่มีขีดตรงกลาง */}
                                <span className="text-2xl font-black text-slate-950 font-sans tabular-nums tracking-tight leading-none">
                                    <span className="text-slate-400 mr-1 text-xl"></span>
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
                        <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}>
                            <option value="">ทุกหมวดหมู่ (All Categories)</option>
                            {masterData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors" value={selectedWarehouse} onChange={e => { setSelectedWarehouse(e.target.value); setSelectedZone(""); setPage(1); }}>
                            <option value="">ทุกคลังสินค้า (All Warehouses)</option>
                            {masterData.warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                        </select>

                        <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" value={selectedZone} disabled={!selectedWarehouse} onChange={e => { setSelectedZone(e.target.value); setPage(1); }}>
                            <option value="">ทุกโซน (All Zones)</option>
                            {masterData.zones.filter(z => String(z.warehouseId) === String(selectedWarehouse)).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                        </select>

                        {(search || selectedWarehouse || selectedZone || selectedCategory) && (
                            <button onClick={() => { setSearch(""); setSelectedCategory(""); setSelectedWarehouse(""); setSelectedZone(""); setPage(1); }} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* DATA TABLE CONTAINER (Glassmorphism Optimized) */}
                <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-900 font-black text-sm tracking-wide">
                                    <th className="p-6">ข้อมูลสินค้า</th>
                                    <th className="p-6">ตำแหน่งจัดเก็บ</th>
                                    <th className="p-6 text-center">ยอดคงเหลือ</th>
                                    <th className="p-6 text-center">บาร์โค้ด</th>
                                    <th className="p-6 text-right">มูลค่ารวม</th>
                                    <th className="p-6 text-center">อัปเดตล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                                <p className="text-slate-400 font-black tracking-wide text-sm mt-2">กำลังโหลดข้อมูลสินค้าคงคลัง...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : balances.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-32 text-center">
                                            <Database className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-500 font-black tracking-wide text-sm">ไม่พบรายการสินค้าที่ตรงกับเงื่อนไข</p>
                                        </td>
                                    </tr>
                                ) : balances.map((b, i) => (
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
                                                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 shadow-sm group-hover:bg-white transition-colors flex-shrink-0">
                                                    <MapPin className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                                        {b?.location?.warehouse?.name || b?.location?.warehouse?.code || '-'}
                                                    </span>
                                                    <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mt-0.5">
                                                        <span className="text-slate-300">|</span>
                                                        <span>โซน: {b?.location?.zone?.code || '-'}</span>
                                                        <span className="text-slate-300">|</span>
                                                        <span>โลเคชั่น: {b?.location?.code || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`text-sm inline-block min-w-[60px] font-black px-3.5 py-1.5 rounded-xl tabular-nums shadow-sm transition-colors ${b.quantity <= 5
                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                : 'bg-slate-50 text-slate-600 border border-slate-200'
                                                }`}>
                                                {b?.quantity?.toLocaleString()}
                                            </span>
                                            <p className="text-[10px] font-black text-slate-500 uppercase mt-1.5 tracking-wider">
                                                {b?.product?.unit?.name || 'PCS'}
                                            </p>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col items-center gap-2">
                                                <button
                                                    onClick={() => handleBarcode(b.product, "view")}
                                                    disabled={busyId === b.product.id}
                                                    className="w-full bg-white text-[#1e3b8a] border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-md hover:bg-[#1e3b8a] hover:text-white hover:border-[#1e3b8a] active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    ดูบาร์โค้ด <ChevronRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleBarcode(b.product, "dl")}
                                                    disabled={busyId === b.product.id}
                                                    className="text-[10px] font-black text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg uppercase flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                                >
                                                    <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            {/* ✅ ถอด font-mono ออก เปลี่ยนเป็น font-sans และ tabular-nums แทน */}
                                            <span className="text-base font-black text-slate-900 font-sans tabular-nums tracking-tighter">
                                                {Number(b?.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">

                                            <div className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 inline-flex items-center gap-1.5 shadow-sm">
                                                <Clock className="w-3 h-3 text-amber-500" />
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

                    {/* ฝั่งซ้าย: ข้อมูลหน้า */}
                    <div className="flex items-center gap-3 bg-emerald-50/80 px-5 py-2.5 rounded-full border border-emerald-100/50">
                        <div className="bg-emerald-500 p-1.5 rounded-full shadow-sm">
                            <Tag className="w-3 h-3 text-white" />
                        </div>
                        <p className="text-xs font-black text-emerald-800 tracking-wider">
                            หน้าที่ <span className="text-emerald-950 text-sm font-mono">{page}</span> จาก <span className="text-emerald-950 text-sm font-mono">{totalPages}</span>
                        </p>
                    </div>

                    {/* ฝั่งขวา: ปุ่มควบคุม (Segmented Control Style) */}
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

                        {/* ตัวเลขบอกหน้าปัจจุบัน */}
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