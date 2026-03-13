"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Database, Search, MapPin, Clock, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Loader2, Wallet, Tag
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
        } catch (e) { toast.error("Barcode Error"); } finally { setBusyId(null); }
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 min-h-screen bg-[#f8fafc]">

                {/* HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
                            <Database className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1 uppercase italic">Stock Registry</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3 text-emerald-500" /> Total Items: {totalCount.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white border border-slate-200 px-5 py-2.5 rounded-2xl shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <Wallet className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Valuation</p>
                                <p className="text-lg font-black text-slate-900 font-mono leading-none">
                                    ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILTER BAR */}
                <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[200px] relative px-2">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input className="w-full bg-transparent py-3 pl-10 pr-4 text-sm font-bold outline-none placeholder:text-slate-300" placeholder="ระบุ SKU หรือ ชื่อสินค้า..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 p-1">
                        {/* 💡 Dropdown เลือกหมวดหมู่ */}
                        <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black text-slate-600 outline-none cursor-pointer" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}>
                            <option value="">ทุกหมวดหมู่ (All Categories)</option>
                            {masterData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black text-slate-600 outline-none cursor-pointer" value={selectedWarehouse} onChange={e => { setSelectedWarehouse(e.target.value); setSelectedZone(""); setPage(1); }}>
                            <option value="">ทุกคลังสินค้า (All Warehouses)</option>
                            {masterData.warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                        </select>

                        <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black text-slate-600 outline-none disabled:opacity-40 cursor-pointer" value={selectedZone} disabled={!selectedWarehouse} onChange={e => { setSelectedZone(e.target.value); setPage(1); }}>
                            <option value="">ทุกโซน (All Zones)</option>
                            {masterData.zones.filter(z => String(z.warehouseId) === String(selectedWarehouse)).map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
                        </select>

                        {/* 💡 อัปเดตปุ่มเคลียร์เงื่อนไขให้ล้างหมวดหมู่ด้วย */}
                        {(search || selectedWarehouse || selectedZone || selectedCategory) && (
                            <button onClick={() => { setSearch(""); setSelectedCategory(""); setSelectedWarehouse(""); setSelectedZone(""); setPage(1); }} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><X className="w-4 h-4" /></button>
                        )}
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden mb-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Asset Information</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Placement</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Stock</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest w-32">Identity</th>
                                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Net Value</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan="6" className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-slate-200 mx-auto" /></td></tr>
                                ) : balances.length === 0 ? (
                                    <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No matching assets found</td></tr>
                                ) : balances.map((b, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-mono font-black text-indigo-600 text-sm tracking-tighter uppercase leading-none">{b?.product?.sku}</p>
                                                    {/* แสดงชื่อหมวดหมู่เป็น Tag เล็กๆ ด้วยเพื่อให้ดูง่าย */}
                                                    {b?.product?.category?.name && (
                                                        <span className="text-[8px] font-black bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md uppercase tracking-wider">{b.product.category.name}</span>
                                                    )}
                                                </div>
                                                <p className="font-black text-slate-800 text-[11px] uppercase truncate max-w-[280px]">{b?.product?.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex-shrink-0">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                                                        {b?.location?.warehouse?.code || '-'}
                                                    </span>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-0.5">
                                                        <span className="text-slate-200">|</span>
                                                        <span className="text-slate-700">{b?.location?.zone?.code || '-'}</span>
                                                        <span className="text-slate-200">|</span>
                                                        <span className="text-slate-500">{b?.location?.code || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs font-black px-3 py-1 rounded-xl font-mono ${b.quantity <= 5 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-900 text-white'}`}>{b?.quantity?.toLocaleString()}</span>
                                            <p className="text-[8px] font-black text-slate-300 uppercase mt-1">{b?.product?.unit?.name || 'PCS'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <button onClick={() => handleBarcode(b.product, "view")} className="w-full bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1">View</button>
                                                <button onClick={() => handleBarcode(b.product, "dl")} className="text-[8px] font-black text-slate-300 hover:text-emerald-500 uppercase flex items-center gap-1">Save</button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">฿{Number(b?.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                                {new Date(b.updatedAt).toLocaleDateString('th-TH')}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center print:hidden">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span>
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(1)} disabled={page === 1 || isLoading} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-20 shadow-sm"><ChevronsLeft className="w-4 h-4 text-slate-400" /></button>
                            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-20 shadow-sm"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
                            <div className="px-4 text-[10px] font-black text-slate-900 bg-white border border-slate-200 py-2 rounded-xl min-w-[80px] text-center">{page} / {totalPages}</div>
                            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages || isLoading} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-20 shadow-sm"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
                            <button onClick={() => setPage(totalPages)} disabled={page === totalPages || isLoading} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-20 shadow-sm"><ChevronsRight className="w-4 h-4 text-slate-400" /></button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGate>
    );
}