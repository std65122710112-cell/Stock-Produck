"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import AuthGate from "@/components/AuthGate";
import { 
  CalendarClock, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  RefreshCcw,
  PackageSearch,
  MapPin,
  History
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ExpiryMonitorPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reports/inventory/expiry?status=${filterStatus}`);
      if (res.success) {
        setReportData(res.data || []);
      }
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลวันหมดอายุได้");
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filterStatus]);

  const filteredData = useMemo(() => {
    let filtered = reportData.filter(item => 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [reportData, searchTerm]);

  const getStatusConfig = (status) => {
    switch (status) {
      case "EXPIRED":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          icon: <AlertCircle className="w-4 h-4" />
        };
      case "NEAR_EXPIRY":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: <Clock className="w-4 h-4" />
        };
      default:
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: <CheckCircle2 className="w-4 h-4" />
        };
    }
  };

  return (
    <AuthGate>
      <div className="w-full max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        <Toaster position="top-right" />
        
        {/* --- HEADER --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                    <CalendarClock className="w-6 h-6 text-[#1F3B8B]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายงานตรวจสอบวันหมดอายุ</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Inventory Expiry & Lot Ledger</p>
                </div>
            </div>
            <button onClick={() => router.back()} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
        </div>

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SummaryCard title="ปกติ (Normal)" count={reportData.filter(i => i.status === 'NORMAL').length} color="emerald" icon={<CheckCircle2 />} />
          <SummaryCard title="ใกล้หมดอายุ (Near Expiry)" count={reportData.filter(i => i.status === 'NEAR_EXPIRY').length} color="amber" icon={<Clock />} />
          <SummaryCard title="หมดอายุแล้ว (Expired)" count={reportData.filter(i => i.status === 'EXPIRED').length} color="rose" icon={<AlertCircle />} />
        </div>

        {/* --- TOOLBAR: SEARCH & FILTERS --- */}
        <div className="bg-white p-4 rounded-t-xl border border-slate-200 border-b-0 flex flex-col lg:flex-row justify-between items-center gap-4">
            
            {/* Tabs Filter */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-full lg:w-auto">
              {[
                { id: 'all', label: 'ทุกล็อตสินค้า' },
                { id: 'near', label: 'ใกล้หมดอายุ' },
                { id: 'expired', label: 'หมดอายุแล้ว' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filterStatus === tab.id 
                    ? 'bg-white text-[#1F3B8B] shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text"
                        placeholder="ค้นหาชื่อสินค้า, SKU หรือ เลขล็อต..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 outline-none focus:border-[#1F3B8B] focus:ring-1 focus:ring-[#1F3B8B] transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={fetchReport}
                    className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-all text-slate-600 shadow-sm shrink-0"
                    title="รีเฟรชข้อมูล"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>

        {/* --- DATA TABLE --- */}
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">ข้อมูลพัสดุ / SKU</th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">เลขล็อต (Lot No.)</th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">ตำแหน่งจัดเก็บ & อัปเดต</th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center whitespace-nowrap">ยอดคงเหลือ</th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">วันหมดอายุ</th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">อัปเดตล่าสุด</th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <TableSkeleton />
                ) : filteredData.length > 0 ? (
                  filteredData.map((item) => {
                    const style = getStatusConfig(item.status);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* สินค้า / SKU */}
                        <td className="px-6 py-5 align-top">
                          <div className="font-semibold text-slate-800 text-sm mb-1">{item.productName}</div>
                          <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded w-fit border border-slate-200">{item.sku}</div>
                        </td>
                        
                        {/* เลขล็อต */}
                        <td className="px-6 py-5 align-top">
                          <span className="text-sm font-medium text-slate-700">
                            {item.lotNumber}
                          </span>
                        </td>

                        {/* ตำแหน่งจัดเก็บ */}
                        <td className="px-6 py-5 align-top">
                          {Array.isArray(item.locations) && item.locations.length > 0 ? (
                            <div className="space-y-3">
                              {item.locations.map((loc, idx) => (
                                <div key={idx} className="flex gap-3 items-start">
                                  <MapPin className="w-4 h-4 text-[#1F3B8B] mt-0.5 shrink-0" />
                                  <div className="space-y-1">
                                    <div className="font-semibold text-slate-700 text-sm flex items-center flex-wrap gap-2">
                                      {loc.warehouseName} 
                                      <span className="text-xs text-slate-400 font-normal">({loc.warehouseCode})</span>
                                      {loc.isDefault && <span className="text-orange-500 text-[10px] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 shrink-0">แผนจัดเก็บ</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">ZONE</span>
                                      <span className="text-xs text-slate-600">{loc.zoneName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">LOC</span>
                                      <span className="text-xs text-slate-600">{loc.locationName}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span className="text-sm italic">ยังไม่ได้รับของเข้าคลัง</span>
                            </div>
                          )}
                        </td>

                        {/* ยอดคงเหลือ */}
                        <td className="px-6 py-5 align-top text-center">
                          <div className={`text-lg font-bold ${item.quantity > 0 ? 'text-[#1F3B8B]' : 'text-slate-400'}`}>
                            {item.quantity.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">{item.unitName}</div>
                        </td>

                        {/* วันหมดอายุ */}
                        <td className="px-6 py-5 align-top">
                          <div className="text-sm text-slate-700 font-medium">
                            {item.expirationDate ? new Date(item.expirationDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                        </td>

                        {/* อัปเดตล่าสุด */}
                        <td className="px-6 py-5 align-top">
                           <div className="flex items-start gap-2">
                              <History className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-700">
                                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                </span>
                                <span className="text-xs text-slate-500 mt-0.5">
                                  {item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'} น.
                                </span>
                              </div>
                           </div>
                        </td>

                        {/* สถานะ */}
                        <td className="px-6 py-5 align-top text-right">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold ${style.bg} ${style.text} ${style.border} shadow-sm whitespace-nowrap`}>
                            {style.icon}
                            {item.status === "EXPIRED" ? `เกิน ${Math.abs(item.daysRemaining)} วัน` : `เหลือ ${item.daysRemaining} วัน`}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <PackageSearch className="w-12 h-12 text-slate-300" />
                        <p className="text-slate-500 font-medium text-sm">ไม่พบข้อมูลพัสดุในระบบ</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

// --- Sub-components ---
function SummaryCard({ title, count, color, icon }) {
  const colors = {
    rose: "bg-red-50 border-red-100 text-red-600 icon-bg-red-100 icon-text-red-600",
    amber: "bg-amber-50 border-amber-100 text-amber-700 icon-bg-amber-100 icon-text-amber-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700 icon-bg-emerald-100 icon-text-emerald-600",
  };
  const style = colors[color];
  const bgClass = style.split(' ')[0];
  const borderClass = style.split(' ')[1];
  const textClass = style.split(' ')[2];
  const iconBgClass = style.match(/icon-bg-(\S+)/)[1];
  const iconTextClass = style.match(/icon-text-(\S+)/)[1];

  return (
    <div className={`bg-white border border-slate-200 p-5 rounded-xl flex items-center gap-4 shadow-sm`}>
      <div className={`p-3 bg-${iconBgClass} text-${iconTextClass} rounded-lg`}>
        {React.cloneElement(icon, { className: "w-6 h-6" })}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-0.5">{title}</p>
        <p className={`text-2xl font-bold ${textClass} leading-none`}>
          {count} <span className="text-xs font-medium text-slate-400 ml-0.5">Lots</span>
        </p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return [...Array(5)].map((_, i) => (
    <tr key={i} className="animate-pulse border-b border-slate-100 last:border-0">
      <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-32 mb-2"></div><div className="h-4 bg-slate-100 rounded w-20"></div></td>
      <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
      <td className="px-6 py-5">
        <div className="flex gap-2 mb-2"><div className="w-4 h-4 bg-slate-200 rounded"></div><div className="h-4 bg-slate-200 rounded w-32"></div></div>
        <div className="h-3 bg-slate-100 rounded w-24 ml-6"></div>
      </td>
      <td className="px-6 py-5 text-center"><div className="h-6 bg-slate-200 rounded w-12 mx-auto mb-1"></div><div className="h-3 bg-slate-100 rounded w-8 mx-auto"></div></td>
      <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
      <td className="px-6 py-5"><div className="flex gap-2"><div className="w-4 h-4 bg-slate-200 rounded"></div><div className="h-4 bg-slate-200 rounded w-20"></div></div></td>
      <td className="px-6 py-5 text-right"><div className="h-8 bg-slate-200 rounded w-24 ml-auto"></div></td>
    </tr>
  ));
}