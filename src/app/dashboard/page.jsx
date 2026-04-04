"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, LabelList
} from 'recharts';
import {
    Wallet, AlertTriangle, Truck, ShieldCheck, Activity,
    Building2, ChevronRight, Boxes, FileSignature,
    Target, Package, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine,
    Hourglass, Briefcase, Landmark, ListOrdered, ShoppingBag
} from "lucide-react";

const THEME = {
    navy: "#1e3a8a",     // Blue 900
    blue: "#2563eb",     // Blue 600
    sky: "#0ea5e9",      // Sky 500
    success: "#059669",  // Emerald 600
    danger: "#dc2626",   // Red 600
};


const formatCompact = (val) => {
    const value = safeNum(val);
    if (value >= 1000000) return `฿${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `฿${(value / 1000).toFixed(1)}k`;
    return `฿${value.toLocaleString()}`;
};

const PIE_COLORS = [THEME.navy, THEME.blue, THEME.sky, "#8b5cf6", "#14b8a6", "#f59e0b"];
const AGING_COLORS = ["#f59e0b", "#f97316", "#dc2626"];

const safeNum = (val) => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};

export default function FacilityMatrixDashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        balances: [], dailyMovements: [], warehouses: [],
        categories: [], prs: [], srs: [], lowStock: [], pos: []
    });

    useEffect(() => {
        async function fetchMatrixData() {
            setIsLoading(true);
            try {
                const [bal, movSummary, wh, cat, pr, sr, low, po] = await Promise.allSettled([
                    apiFetch("/inventory/balances"),
                    apiFetch("/inventory/dashboard/movements-summary"),
                    apiFetch("/master/warehouses"),
                    apiFetch("/master/categories"),
                    apiFetch("/api/purchase/pr"),
                    apiFetch("/outbound/requisitions"),
                    apiFetch("/inventory/low-stock-alerts"),
                    apiFetch("/inventory/pos")
                ]);

                setData({
                    balances: bal.status === 'fulfilled' ? (Array.isArray(bal.value) ? bal.value : (bal.value?.data || [])) : [],
                    dailyMovements: movSummary.status === 'fulfilled' ? (movSummary.value?.data || []) : [],
                    warehouses: wh.status === 'fulfilled' ? (Array.isArray(wh.value) ? wh.value : []) : [],
                    categories: cat.status === 'fulfilled' ? (Array.isArray(cat.value) ? cat.value : []) : [],
                    prs: pr.status === 'fulfilled' ? (Array.isArray(pr.value) ? pr.value : []) : [],
                    srs: sr.status === 'fulfilled' ? (Array.isArray(sr.value) ? sr.value : []) : [],
                    lowStock: low.status === 'fulfilled' ? (low.value || []) : [],
                    pos: po.status === 'fulfilled' ? (Array.isArray(po.value) ? po.value : (po.value?.data || [])) : []
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchMatrixData();
    }, []);

    const analytics = useMemo(() => {
        const { balances, dailyMovements, warehouses, categories, prs, srs, lowStock, pos } = data;

        const totalValue = balances.reduce((sum, b) => sum + safeNum(b.totalValue), 0);
        const totalQuantity = balances.reduce((sum, b) => sum + safeNum(b.quantity), 0);



        const facilityStats = warehouses.map(wh => {
            const whItems = balances.filter(b => (b.location?.warehouseId || b.location?.warehouse?.id) === wh.id);
            const qty = whItems.reduce((sum, b) => sum + safeNum(b.quantity), 0);
            const val = whItems.reduce((sum, b) => sum + safeNum(b.totalValue), 0);
            return { id: wh.id, name: wh.name, quantity: qty, value: val };
        }).sort((a, b) => b.value - a.value);

        const categoryAllocation = categories.map(cat => {
            const catVal = balances.filter(b => b.product?.categoryId === cat.id)
                .reduce((sum, b) => sum + safeNum(b.totalValue), 0);
            return { name: cat.name, value: catVal };
        }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

        const now = new Date();
        let age3 = 0, age6 = 0, age12 = 0;
        balances.forEach(b => {
            if (safeNum(b.quantity) > 0) {
                const lastActive = new Date(b.updatedAt || b.createdAt);
                const diffDays = (now - lastActive) / (1000 * 60 * 60 * 24);
                if (diffDays >= 365) age12++;
                else if (diffDays >= 180) age6++;
                else if (diffDays >= 90) age3++;
            }
        });
        const agingData = [
            { range: '3-6 เดือน', value: age3, fill: AGING_COLORS[0] },
            { range: '6-12 เดือน', value: age6, fill: AGING_COLORS[1] },
            { range: '> 12 เดือน', value: age12, fill: AGING_COLORS[2] }
        ];

        const deptMap = {};
        srs.filter(sr => sr.status === 'COMPLETED' || sr.status === 'APPROVED').forEach(sr => {
            const deptName = sr.department?.name || sr.requisition?.department?.name || 'ส่วนกลาง (General)';
            let srValue = 0;
            if (Array.isArray(sr.items)) {
                srValue = sr.items.reduce((sum, item) => sum + (safeNum(item.quantity) * (safeNum(item.product?.unitCost) || safeNum(item.product?.price) || 0)), 0);
            }
            if (srValue === 0) srValue = safeNum(sr._count?.items) || 0;
            if (!deptMap[deptName]) deptMap[deptName] = 0;
            deptMap[deptName] += srValue;
        });
        const deptConsumption = Object.keys(deptMap).map(k => ({ name: k, value: deptMap[k] })).sort((a, b) => b.value - a.value).slice(0, 5);

        // 💡 แก้ไขการคำนวณคู่ค้า (Supplier Analytics)
        const supMap = {};
        let calculatedTotalSpend = 0;
        const validPOs = pos.filter(po => po.status !== 'CANCELLED' && po.status !== 'REJECTED');
        const totalPoCount = validPOs.length; // สรุปจำนวนออเดอร์ทั้งหมด

        validPOs.forEach(po => {
            const supName = po.supplier?.name || po.vendorName || 'คู่ค้าทั่วไป';
            let poTotal = 0;
            // คำนวณยอดเงินรวมจากรายการสินค้าในแต่ละ PO
            if (po.items && Array.isArray(po.items)) {
                poTotal = po.items.reduce((sum, item) => sum + (safeNum(item.orderedQuantity) * safeNum(item.unitPrice)), 0);
            }
            // Fallback ถ้าไม่มี items ให้ใช้ยอดรวมจากหัวบิล
            if (poTotal === 0) poTotal = safeNum(po.netAmount) || safeNum(po.totalAmount) || 0;

            if (poTotal > 0) {
                if (!supMap[supName]) supMap[supName] = { value: 0, count: 0 };
                supMap[supName].value += poTotal;
                supMap[supName].count += 1;
                calculatedTotalSpend += poTotal;
            }
        });

        const topSuppliers = Object.keys(supMap).map(k => ({
            name: k,
            value: supMap[k].value,
            count: supMap[k].count,
            percent: calculatedTotalSpend > 0 ? ((supMap[k].value / calculatedTotalSpend) * 100).toFixed(1) : 0
        })).sort((a, b) => b.value - a.value).slice(0, 5);

        return {
            totalValue,
            totalQuantity,
            facilityStats,
            dailyMovements,
            categoryAllocation,
            agingData,
            deptConsumption,
            // 💡 ต้องมี 3 ตัวนี้เพื่อให้ส่วนคู่ค้าไม่ Error
            topSuppliers,
            totalPoCount,
            totalPoSpend: calculatedTotalSpend,
            // ------------------------------------
            pendingPRs: prs.filter(p => p.status === 'PENDING').length,
            pendingSRs: srs.filter(s => s.status === 'PENDING').length,
            lowStockCount: lowStock.length
        };
    }, [data]);

    if (isLoading) return <SystemLoader />;

    return (
        <AuthGate>
            <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-slate-900 selection:bg-blue-100">

                {/* --- HEADER --- */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-slate-200 pb-8 mb-10 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-800">
                            <Target className="w-5 h-5" />
                            <span className="text-xs font-black tracking-[0.3em] uppercase">Enterprise Analytics</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
                            Facility <span className="text-blue-800 italic">Matrix</span> Hub
                        </h1>
                        <p className="text-slate-500 text-sm font-bold tracking-widest flex items-center gap-2">
                            วิเคราะห์ความหนาแน่นและปริมาณการไหลเวียนคลังสินค้า
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                        <div className="bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col items-end flex-1 lg:flex-initial min-w-[200px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Boxes className="w-4 h-4 text-slate-400" /> ปริมาณสินค้ารวม
                            </p>
                            <p className="text-3xl font-black text-slate-800 tabular-nums mt-1">
                                {analytics.totalQuantity.toLocaleString()} <span className="text-base font-bold text-slate-400 uppercase">Units</span>
                            </p>
                        </div>

                        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-8 py-5 rounded-[2rem] shadow-lg shadow-blue-900/20 border border-blue-800 flex flex-col items-end flex-1 lg:flex-initial min-w-[320px] text-white">
                            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-blue-300" /> มูลค่าสินค้าคงคลังสุทธิ
                            </p>
                            <p className="text-4xl font-black tabular-nums leading-none tracking-tighter mt-1">
                                ฿{(analytics.totalValue / 1000000).toFixed(2)}<span className="text-2xl text-blue-300 ml-1">M</span>
                            </p>
                            <p className="text-[9px] font-medium text-blue-300 mt-3 tracking-widest opacity-80 border-t border-blue-800/50 pt-2 w-full text-right">
                                สุทธิ: ฿{analytics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- TIER 1: FACILITY --- */}
                <div className="mb-10">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-blue-700" /> ข้อมูลสรุปรายสถานประกอบการ
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {analytics.facilityStats.map((wh, idx) => (
                            <div key={wh.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-800 text-white rounded-xl"><Building2 size={20} /></div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">คลังลำดับที่ {idx + 1}</p>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-800 truncate mb-4">{wh.name}</h3>
                                    <div className="space-y-3 border-t border-slate-100 pt-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">ปริมาณสินค้า (Qty)</span>
                                            <span className="text-xs font-black text-slate-900 tabular-nums">{wh.quantity.toLocaleString()} ชิ้น</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">มูลค่า (Value)</span>
                                            <span className="text-xs font-black text-blue-700 tabular-nums">฿{(wh.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- TIER 2: GRAPHS --- */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                <Activity className="w-5 h-5 text-blue-700" /> ปริมาณรับเข้าและเบิกจ่ายรายวัน (7 วันล่าสุด)
                            </h2>
                            <div className="flex gap-4">
                                <LegendDot color={THEME.success} label="รับเข้า (IN)" />
                                <LegendDot color={THEME.danger} label="จ่ายออก (OUT)" />
                            </div>
                        </div>
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.dailyMovements} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={THEME.success} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={THEME.success} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={THEME.danger} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={THEME.danger} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <RechartsTooltip content={<DailyMovementTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
                                    <Area type="monotone" dataKey="IN" stroke={THEME.success} strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                                    <Area type="monotone" dataKey="OUT" stroke={THEME.danger} strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-amber-500" /> สัดส่วนมูลค่าสินค้าแต่ละคลัง
                            </h2>
                        </div>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.facilityStats} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} width={80} />
                                    <RechartsTooltip content={<FacilityBarTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                                        {analytics.facilityStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                        <LabelList dataKey="value" position="right" formatter={(val) => `฿${(val / 1000).toFixed(1)}k`} style={{ fontSize: '10px', fontWeight: '900', fill: '#475569' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* --- TIER 3: CATEGORY & ACTIONS --- */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-full md:w-1/2">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-3">
                                <Boxes className="w-5 h-5 text-blue-700" /> สัดส่วนมูลค่าแยกตามหมวดหมู่
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 pb-4 border-b border-slate-100">Category Value Distribution</p>
                            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                {analytics.categoryAllocation.map((cat, idx) => {
                                    const percent = analytics.totalValue > 0 ? ((cat.value / analytics.totalValue) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                                                <p className="text-xs font-bold text-slate-700">{cat.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-blue-800 tabular-nums">฿{Number(cat.value).toLocaleString()}</p>
                                                <p className="text-[9px] font-bold text-slate-400">{percent}%</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 h-[300px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={analytics.categoryAllocation} cx="50%" cy="50%" innerRadius={85} outerRadius={120} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={5}>
                                        {analytics.categoryAllocation.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CategoryDonutTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
                                <p className="text-xl font-black text-blue-900 tabular-nums">฿{(analytics.totalValue / 1000000).toFixed(2)}<span className="text-sm text-blue-500 ml-0.5">M</span></p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-6">
                        <ActionCard title="ใบขอซื้อรออนุมัติ (PR)" value={analytics.pendingPRs} sub="รอพิจารณาสั่งซื้อ" icon={<FileSignature />} href="/purchase/pr" color="blue" />
                        <ActionCard title="ใบเบิกจ่ายรอจัดส่ง (SR)" value={analytics.pendingSRs} sub="รอจัดส่งออกจากคลัง" icon={<Truck />} href="/outbound/delivery/create" color="indigo" />
                        <ActionCard title="สินค้าสั่งซื้อด่วน" value={analytics.lowStockCount} sub="ปริมาณต่ำกว่าเกณฑ์" icon={<AlertTriangle />} href="/inventory/low-stock" color="rose" alert={analytics.lowStockCount > 0} />
                    </div>
                </div>

                {/* --- TIER 4: BI ANALYTICS (อัปเดตส่วนคู่ค้า) --- */}
                <div className="mb-10 border-t border-slate-200 pt-10">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                        <Target className="w-6 h-6 text-blue-800" /> Business Intelligence & Analytics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {/* Dead Stock */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 mb-6 border-b pb-4"><Hourglass className="w-5 h-5 text-amber-500" /> สินค้าค้างสต็อก (Dead Stock)</h3>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.agingData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<AgingTooltip />} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                            {analytics.agingData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            <LabelList dataKey="value" position="top" style={{ fill: '#64748b', fontSize: '10px', fontWeight: 'bold' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Dept Consumption */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 mb-6 border-b pb-4"><Briefcase className="w-5 h-5 text-indigo-600" /> มูลค่าเบิกจ่ายแยกตามแผนก</h3>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.deptConsumption} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} width={90} />
                                        <RechartsTooltip cursor={{ fill: '#f1f5f9' }} content={<DeptTooltip />} />
                                        <Bar dataKey="value" fill={THEME.sky} radius={[0, 6, 6, 0]} barSize={20}>
                                            <LabelList dataKey="value" position="right" formatter={(v) => `฿${(v / 1000).toFixed(1)}k`} style={{ fill: '#475569', fontSize: '10px', fontWeight: 'bold' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 💡 TOP SUPPLIERS (อัปเดตใหม่แสดง กี่รายการ/มูลค่าเท่าไหร่) */}
                        <div className="bg-white rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden group">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-50 rounded-full blur-[100px] opacity-60"></div>

                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="p-1.5 bg-emerald-500 rounded-lg shadow-lg">
                                            <Landmark className="w-3.5 h-3.5 text-white" />
                                        </span>
                                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Top Partners</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">วิเคราะห์ศักยภาพคู่ค้า 5 อันดับแรก</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[18px] font-black text-slate-900">{analytics.totalPoCount.toLocaleString()}</span>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Total Orders</span>
                                </div>
                            </div>

                            <div className="relative h-[240px] w-full mb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={[{ value: 1 }]} cx="50%" cy="50%" innerRadius={88} outerRadius={90} fill="#f1f5f9" stroke="none" isAnimationActive={false} />
                                        <Pie
                                            data={analytics.topSuppliers}
                                            cx="50%" cy="50%"
                                            innerRadius={70} outerRadius={95}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={10}
                                        >
                                            {analytics.topSuppliers.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            content={<SupplierTooltip />}
                                            // 💡 ปักหมุดไว้ที่พิกัด x:0 y:0 (มุมบนซ้ายของกราฟ) เพื่อไม่ให้บังตรงกลาง
                                            position={{ x: 0, y: 0 }}
                                            allowEscapeViewBox={{ x: true, y: true }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className="bg-white/80 backdrop-blur-md w-24 h-24 rounded-full flex flex-col items-center justify-center border border-slate-50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Gross Spend</p>
                                        <p className="text-[18px] font-black text-blue-900 tabular-nums">
                                            {formatCompact(analytics.totalPoSpend)}
                                        </p>
                                        <div className="w-8 h-1 bg-emerald-400 rounded-full mt-1"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 relative z-10">
                                {analytics.topSuppliers.map((sup, idx) => (
                                    <div key={idx} className="group/row">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-3 max-w-[70%]">
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'}`}>{idx + 1}</div>
                                                <p className="text-[11px] font-black text-slate-700 truncate">{sup.name}</p>
                                            </div>
                                            <p className="text-[12px] font-black text-slate-900">{formatCompact(sup.value)}</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-[1.5s]" style={{ width: `${sup.percent}%`, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center opacity-60 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <div className="flex items-center gap-2 text-blue-800"><ShieldCheck className="w-5 h-5" /><span>Data Integrity Verified • TJC Official Hub</span></div>
                    <p>Analytics Framework v8.1</p>
                </div>
            </div>
        </AuthGate>
    );
}

// --- SUBCOMPONENTS & TOOLTIPS ---
function LegendDot({ color, label }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: color }}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
        </div>
    );
}

function ActionCard({ title, value, sub, icon, href, color, alert }) {
    const themes = {
        blue: "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-600 hover:text-white",
        indigo: "text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-600 hover:text-white",
        rose: "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-600 hover:text-white"
    };
    return (
        <Link href={href} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all flex items-center justify-between">
            {alert && <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500 animate-pulse"></div>}
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
                <p className="text-3xl font-black text-slate-900 tabular-nums">{value.toLocaleString()}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{sub}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110 ${themes[color]}`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
        </Link>
    );
}

const DailyMovementTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xl backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 text-slate-800">วันที่ {label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="flex justify-between items-center gap-8 py-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            {p.name === 'IN' ? <ArrowDownToLine className="w-3 h-3 text-emerald-600" /> : <ArrowUpFromLine className="w-3 h-3 text-rose-600" />}
                            {p.name === 'IN' ? 'รับเข้า' : 'เบิกจ่าย'}
                        </span>
                        <span className="text-xs font-black tabular-nums" style={{ color: p.color }}>
                            {p.value.toLocaleString()} ชิ้น
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CategoryDonutTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 min-w-[180px]">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.fill }}></span>
                    {payload[0].payload.name}
                </p>
                <p className="text-sm font-black text-blue-400 tabular-nums">฿{payload[0].value.toLocaleString()}</p>
                <p className="text-[9px] font-medium text-slate-400 uppercase mt-1">Net Category Valuation</p>
            </div>
        );
    }
    return null;
};

const FacilityBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 min-w-[180px]">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 border-b border-white/10 pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].fill }}></span>
                    {data.name}
                </p>
                <div className="space-y-1">
                    <p className="text-sm font-black text-blue-400 tabular-nums">฿{data.value.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        จำนวนเก็บ: <span className="text-white">{data.quantity.toLocaleString()}</span> ชิ้น
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const AgingTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 min-w-[150px]">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">ค้างสต็อกนาน</p>
                <p className="text-sm font-black mb-2 pb-2 border-b border-slate-700">{payload[0].payload.range}</p>
                <p className="text-lg font-black tabular-nums" style={{ color: payload[0].payload.fill }}>{payload[0].value} รายการ</p>
            </div>
        );
    }
    return null;
};

const DeptTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 rounded-xl shadow-2xl border border-slate-200 min-w-[180px]">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 border-b pb-2 text-indigo-700">{payload[0].payload.name}</p>
                <p className="text-xs font-bold text-slate-500">มูลค่าที่เบิกไป:</p>
                <p className="text-base font-black text-sky-600 tabular-nums">฿{payload[0].value.toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

const SupplierTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-emerald-400">ชื่อผู้จัดจำหน่าย</p>
                <p className="text-xs font-black mb-2 pb-2 border-b border-slate-700">{data.name}</p>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400">มูลค่ารวม: <span className="text-blue-400">฿{data.value.toLocaleString()}</span></p>
                    <p className="text-[10px] font-bold text-slate-400">จำนวน: <span className="text-emerald-400">{data.count} รายการ</span></p>
                </div>
            </div>
        );
    }
    return null;
};

function SystemLoader() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#f8fafc] gap-8">
            <div className="w-14 h-14 border-[4px] border-slate-200 border-t-blue-800 rounded-full animate-spin"></div>
            <div className="text-center">
                <p className="text-xs font-black text-blue-900 uppercase tracking-[0.5em] animate-pulse">Establishing Connection</p>
            </div>
        </div>
    );
}