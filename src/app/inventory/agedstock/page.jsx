"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    Search, MapPin, Clock, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Wallet, Package, ArchiveX, Hourglass, AlertCircle, ChevronDown,
    ArrowLeft, History, LayoutGrid, BarChart3
} from "lucide-react";

export default function AgedStockPage() {
    const router = useRouter();
    const [agedStocks, setAgedStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [masterData, setMasterData] = useState({ warehouses: [], categories: [], zones: [], locations: [] });

    const [totalCount, setTotalCount] = useState(0);
    const [grandTotalValue, setGrandTotalValue] = useState(0);

    const [page, setPage] = useState(1);
    const limit = 20;

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");

    const [daysThreshold, setDaysThreshold] = useState("90");
    const [debouncedDays, setDebouncedDays] = useState("90");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                days: debouncedDays,
                categoryId: selectedCategory,
                warehouseId: selectedWarehouse,
                zoneId: selectedZone,
                locationId: selectedLocation
            });
            const res = await apiFetch(`/inventory/aged-stock?${params.toString()}`);
            if (res.success) {
                setAgedStocks(res.data || []);
                setTotalCount(res.totalItems || 0);
                setGrandTotalValue(res.totalValue || 0);
                setPage(1);
            }
        } catch (err) {
            toast.error("ดึงข้อมูลสินค้าค้างสต๊อกล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setDebouncedDays(daysThreshold);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, daysThreshold]);

    useEffect(() => {
        fetchData();
    }, [selectedWarehouse, selectedZone, selectedLocation, selectedCategory, debouncedSearch, debouncedDays]);

    useEffect(() => {
        async function loadMaster() {
            try {
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

    const calculateDaysInactive = (updatedAt) => {
        const diffTime = Math.abs(new Date() - new Date(updatedAt));
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="w-full max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 print:hidden">
                    <div>
                        <button 
                            onClick={() => router.back()} 
                            className="flex items-center gap-2 text-slate-500 hover:text-[#1F3B8B] font-bold text-sm transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 
                            ย้อนกลับ
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100 shadow-sm shrink-0">
                                <ArchiveX className="w-6 h-6 text-rose-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                    รายงานสินค้าค้างสต๊อก
                                </h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-400" />
                                    การตรวจสอบพัสดุที่ไม่มีการเคลื่อนไหว (Dead Stock Monitoring)
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl flex flex-col items-end min-w-60 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                มูลค่าเงินจมรวม (Total Value)
                            </span>
                            <span className="text-2xl font-bold text-rose-700 tabular-nums">
                                ฿{grandTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- SUMMARY CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard 
                        title="รายการค้างสต๊อกทั้งหมด" 
                        count={filteredData.length} 
                        unit="รายการ"
                        color="slate" 
                        icon={<LayoutGrid className="w-5 h-5 text-slate-600" />} 
                    />
                    <SummaryCard 
                        title="เกณฑ์วันที่ตรวจสอบ" 
                        count={parseInt(daysThreshold)} 
                        unit="วันขึ้นไป"
                        color="rose" 
                        icon={<Hourglass className="w-5 h-5 text-rose-600" />} 
                    />
                    <SummaryCard 
                        title="ยอดพัสดุค้างรวม" 
                        count={filteredData.reduce((sum, item) => sum + (item.quantity || 0), 0)} 
                        unit="หน่วย"
                        color="amber" 
                        icon={<BarChart3 className="w-5 h-5 text-amber-600" />} 
                    />
                </div>

                {/* --- FILTER SECTION --- */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 print:hidden">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1F3B8B] transition-colors" />
                            <input
                                className="w-full bg-white border border-slate-200 focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/5 rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400"
                                placeholder="ค้นหาด้วยรหัส SKU หรือชื่อสินค้า..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {(search || selectedWarehouse || selectedZone || selectedLocation || selectedCategory || daysThreshold !== "90") && (
                            <button
                                onClick={() => {
                                    setSearch(""); setSelectedCategory(""); setSelectedWarehouse("");
                                    setSelectedZone(""); setSelectedLocation(""); setDaysThreshold("90"); setPage(1);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:text-rose-600 text-sm font-bold transition-colors"
                            >
                                <X className="w-4 h-4" /> ล้างตัวกรอง
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-rose-50/50 border border-rose-200 text-rose-700 font-bold py-2 px-4 pr-8 rounded-lg text-sm outline-none focus:border-rose-500 transition-all cursor-pointer"
                                value={daysThreshold}
                                onChange={e => setDaysThreshold(e.target.value)}
                            >
                                <option value="30">ค้าง {'>'} 30 วัน</option>
                                <option value="60">ค้าง {'>'} 60 วัน</option>
                                <option value="90">ค้าง {'>'} 90 วัน</option>
                                <option value="180">ค้าง {'>'} 180 วัน</option>
                                <option value="365">ค้าง {'>'} 1 ปี</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400 pointer-events-none" />
                        </div>

                        <FilterSelect 
                            value={selectedCategory} onChange={v => {setSelectedCategory(v); setPage(1);}}
                            options={masterData.categories} placeholder="ทุกหมวดหมู่" 
                        />
                        <FilterSelect 
                            value={selectedWarehouse} onChange={v => {setSelectedWarehouse(v); setSelectedZone(""); setSelectedLocation(""); setPage(1);}}
                            options={masterData.warehouses} placeholder="ทุกคลังสินค้า" 
                        />
                        <FilterSelect 
                            value={selectedZone} onChange={v => {setSelectedZone(v); setSelectedLocation(""); setPage(1);}}
                            options={masterData.zones.filter(z => String(z.warehouseId) === String(selectedWarehouse))} 
                            placeholder="ทุกโซน" disabled={!selectedWarehouse}
                        />
                        <FilterSelect 
                            value={selectedLocation} onChange={v => {setSelectedLocation(v); setPage(1);}}
                            options={masterData.locations.filter(loc => {
                                if (selectedZone) return String(loc.zoneId) === String(selectedZone);
                                if (selectedWarehouse) return String(loc.warehouseId) === String(selectedWarehouse);
                                return true;
                            })}
                            placeholder="ทุกตำแหน่ง" disabled={!selectedWarehouse && !selectedZone}
                            labelField={(opt) => `${opt.code} ${opt.name ? `(${opt.name})` : ''}`}
                        />
                    </div>
                </div>

                {/* --- DATA TABLE SECTION --- */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <th className="py-4 px-6">ข้อมูลสินค้า / SKU</th>
                                    <th className="py-4 px-6">ตำแหน่งจัดเก็บ</th>
                                    <th className="py-4 px-6 text-center">คงเหลือค้าง</th>
                                    <th className="py-4 px-6 text-center">ระยะเวลาที่ไม่เคลื่อนไหว</th>
                                    <th className="py-4 px-6 text-right">มูลค่าจมรวม</th>
                                    <th className="py-4 px-6 text-right">อัปเดตล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {isLoading ? (
                                    <TableSkeleton />
                                ) : paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <ArchiveX className="w-12 h-12 text-slate-200" />
                                                <p className="text-slate-400 font-medium">ไม่พบรายการสินค้าค้างสต๊อกตามเงื่อนไขนี้</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedData.map((b, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mb-0.5">{b?.product?.sku}</span>
                                                <span className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-[#1F3B8B]">{b?.product?.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">
                                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-[#1F3B8B]" /> {b?.location?.warehouse?.name || '-'}
                                                </span>
                                                <span className="pl-4 text-slate-500">Z: {b?.location?.zone?.code || '-'} | L: {b?.location?.code || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="text-sm font-bold tabular-nums bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md border border-rose-100">
                                                {b?.quantity?.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-100 rounded-lg shadow-sm text-sm font-bold text-rose-600">
                                                <Clock className="w-3.5 h-3.5" />
                                                {calculateDaysInactive(b.updatedAt)} วัน
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-800 tabular-nums text-sm">
                                            ฿{Number(b.quantity * (b?.product?.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex flex-col items-end text-slate-500">
                                                <span className="text-xs font-bold tabular-nums">{new Date(b.updatedAt).toLocaleDateString('th-TH')}</span>
                                                <span className="text-[10px] opacity-70 flex items-center gap-1">
                                                    <History className="w-3 h-3" /> {new Date(b.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- PAGINATION --- */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 print:hidden">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            หน้า {page} จาก {totalPages} | พบทั้งหมด {totalCount.toLocaleString()} รายการ
                        </p>
                        <div className="flex items-center gap-2">
                            <PaginationButton onClick={() => setPage(1)} disabled={page === 1} icon={<ChevronsLeft className="w-4 h-4" />} />
                            <PaginationButton onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} icon={<ChevronLeft className="w-4 h-4" />} />
                            
                            <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm font-mono">
                                {page} / {totalPages}
                            </div>

                            <PaginationButton onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} icon={<ChevronRight className="w-4 h-4" />} />
                            <PaginationButton onClick={() => setPage(totalPages)} disabled={page === totalPages} icon={<ChevronsRight className="w-4 h-4" />} />
                        </div>
                    </div>
                )}
            </div>
        </AuthGate>
    );
}

// --- SHARED COMPONENTS ---

function SummaryCard({ title, count, unit, color, icon }) {
    const themes = {
        slate: "border-l-slate-400 bg-slate-50/50",
        rose: "border-l-rose-500 bg-rose-50/30",
        amber: "border-l-amber-500 bg-amber-50/30",
    };
    return (
        <div className={`bg-white border border-slate-200 border-l-4 ${themes[color] || themes.slate} p-5 rounded-xl flex items-center gap-4 shadow-sm transition-all hover:shadow-md`}>
            <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100">{icon}</div>
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
        <div className="relative">
            <select
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#1F3B8B] focus:ring-4 focus:ring-[#1F3B8B]/5 disabled:bg-slate-50 disabled:text-slate-400 transition-all cursor-pointer"
                value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt.id} value={opt.id}>{labelField ? labelField(opt) : (opt.name || opt.code)}</option>)}
            </select>
            <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${disabled ? 'text-slate-300' : 'text-slate-400'}`} />
        </div>
    );
}

function PaginationButton({ onClick, disabled, icon }) {
    return (
        <button onClick={onClick} disabled={disabled} className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm">{icon}</button>
    );
}

function TableSkeleton() {
    return [...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
            <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-48" /></td>
            <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-32" /></td>
            <td className="py-4 px-6 text-center"><div className="h-6 bg-slate-100 rounded w-12 mx-auto" /></td>
            <td className="py-4 px-6 text-center"><div className="h-7 bg-slate-100 rounded w-24 mx-auto" /></td>
            <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-100 rounded w-20 ml-auto" /></td>
            <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-100 rounded w-24 ml-auto" /></td>
        </tr>
    ));
}