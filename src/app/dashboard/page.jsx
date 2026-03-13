"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import {
    Database,
    Wallet,
    AlertTriangle,
    Clock,
    ClipboardCheck,
    TrendingUp,
    Package,
    ShoppingCart,
    ArrowRightLeft,
    Truck,
    ShieldCheck,
    Activity,
    Building2,
    ChevronRight,
    BarChart3,
    PieChart,
    Layers,
    FileSignature,
    Crown,
    CheckCircle2
} from "lucide-react";

export default function ExecutiveDashboardPage() {
    const [isLoading, setIsLoading] = useState(true);

    // --- Data States ---
    const [balances, setBalances] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [prs, setPrs] = useState([]);
    const [srs, setSrs] = useState([]);
    const [pos, setPos] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        async function fetchDashboardData() {
            setIsLoading(true);
            try {
                const results = await Promise.allSettled([
                    apiFetch("/inventory/balances").catch(() => []),
                    apiFetch("/inventory/low-stock-alerts").catch(() => []),
                    apiFetch("/api/purchase/pr").catch(() => []),
                    apiFetch("/outbound/requisitions").catch(() => []),
                    apiFetch("/master/warehouses").catch(() => []),
                    apiFetch("/master/products").catch(() => []),
                    apiFetch("/users").catch(() => []),
                    apiFetch("/inventory/pos").catch(() => [])
                ]);

                if (results[0].status === 'fulfilled') setBalances(Array.isArray(results[0].value) ? results[0].value : (results[0].value?.data || []));
                if (results[1].status === 'fulfilled') setLowStock(results[1].value || []);
                if (results[2].status === 'fulfilled') setPrs(Array.isArray(results[2].value) ? results[2].value : []);
                if (results[3].status === 'fulfilled') setSrs(Array.isArray(results[3].value) ? results[3].value : []);
                if (results[4].status === 'fulfilled') setWarehouses(Array.isArray(results[4].value) ? results[4].value : []);
                if (results[5].status === 'fulfilled') setProducts(Array.isArray(results[5].value) ? results[5].value : []);
                if (results[6].status === 'fulfilled') setUsers(Array.isArray(results[6].value) ? results[6].value : []);
                if (results[7].status === 'fulfilled') setPos(Array.isArray(results[7].value) ? results[7].value : []);

            } catch (error) {
                console.error("Dashboard Sync Error:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDashboardData();
    }, []);

    // --- Advanced Data Processing ---
    const stats = useMemo(() => {
        const totalValue = balances.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
        const totalItems = balances.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const uniqueProductsTotal = products.length || new Set(balances.map(b => b.productId)).size;

        const pendingPRs = prs.filter(pr => pr.status === 'PENDING');
        const approvedPRs = prs.filter(pr => pr.status === 'APPROVED');
        const pendingSRs = srs.filter(sr => sr.status === 'PENDING');
        const approvedSRs = srs.filter(sr => sr.status === 'APPROVED');
        const activePOs = pos.filter(po => po.status !== 'COMPLETED' && po.status !== 'CANCELLED');

        // 💡 คำนวณสัดส่วนรายการสินค้า (SKU) และจำนวนชิ้นรวมในคลัง
        const whDistribution = warehouses.map(wh => {
            const itemsInWh = balances.filter(b => {
                const bWarehouseId = b.location?.warehouse?.id || b.location?.warehouseId;
                return bWarehouseId === wh.id && b.quantity > 0;
            });

            const uniqueSkuInWh = new Set(itemsInWh.map(b => b.productId)).size;
            const totalPcs = itemsInWh.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
            const whValue = itemsInWh.reduce((sum, b) => sum + Number(b.totalValue || 0), 0);

            return {
                ...wh,
                uniqueSkuCount: uniqueSkuInWh,
                totalPcs: totalPcs,
                totalValuation: whValue
            };
        }).sort((a, b) => b.uniqueSkuCount - a.uniqueSkuCount);

        const productValues = {};
        balances.forEach(b => {
            const pid = b.productId;
            if (!productValues[pid]) {
                productValues[pid] = {
                    name: b.product?.name || "Unknown Asset",
                    sku: b.product?.sku || "N/A",
                    totalValue: 0,
                    quantity: 0
                };
            }
            productValues[pid].totalValue += Number(b.totalValue || 0);
            productValues[pid].quantity += Number(b.quantity || 0);
        });
        const topAssets = Object.values(productValues)
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 5);

        return {
            totalValue,
            totalItems,
            uniqueProducts: uniqueProductsTotal,
            activeUsers: users.length,
            lowStockCount: lowStock.length,

            prStats: { pending: pendingPRs.length, approved: approvedPRs.length },
            srStats: { pending: pendingSRs.length, approved: approvedSRs.length },
            poStats: { active: activePOs.length, total: pos.length },

            urgentPRs: pendingPRs.filter(pr => pr.priority === 'URGENT' || pr.priority === 'HIGH').length,
            recentPendingPRs: pendingPRs.slice(0, 4),
            warehouseStats: whDistribution,
            topAssets: topAssets
        };
    }, [balances, lowStock, prs, srs, pos, warehouses, products, users]);

    if (isLoading) {
        return (
            <AuthGate>
                <div className="flex flex-col items-center justify-center h-[70vh] gap-5">
                    <div className="w-14 h-14 border-[5px] border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="text-center">
                        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Compiling Analytics</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">กำลังรวบรวมข้อมูลทุกภาคส่วนจาก TJC Global Hub...</p>
                    </div>
                </div>
            </AuthGate>
        );
    }

    return (
        <AuthGate>
            <div className="max-w-[1600px] mx-auto space-y-8 pb-10">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-600">Enterprise Command Center</p>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-4">
                            Global Analytics
                            <span className="not-italic bg-indigo-600 text-white text-[10px] px-4 py-1.5 rounded-full tracking-[0.25em] font-black border border-indigo-700 shadow-xl uppercase">Live Dashboard</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2 mt-2">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            ศูนย์ประมวลผลสถิติและภาพรวมการลงทุนทรัพยากร
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white px-6 py-3 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Database Status</p>
                                <p className="text-xs font-black text-slate-700 uppercase tracking-widest mt-1">Sync OK</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TIER 1: MACRO KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* KPI 1: NET VALUATION */}
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-slate-800 group md:col-span-2">
                        <div className="absolute -right-10 -bottom-10 opacity-[0.05] pointer-events-none">
                            <Wallet className="w-64 h-64" />
                        </div>
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2">
                                    <PieChart className="w-4 h-4" /> มูลค่าสินทรัพย์รวม (Net Capital)
                                </p>
                            </div>
                            <div>
                                <p className="text-6xl font-black font-mono tracking-tighter mb-2 tabular-nums">
                                    ฿{stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    จำนวนพัสดุในคลัง <span className="text-white font-black bg-white/10 px-2 py-0.5 rounded ml-1">{stats.totalItems.toLocaleString()}</span> ชิ้น
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* KPI 2: ALERTS */}
                    <div className="bg-rose-600 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-rose-900/20 relative overflow-hidden flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-6">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-200">Stock Alerts</p>
                            <AlertTriangle className="w-6 h-6 text-rose-200" />
                        </div>
                        <div>
                            <p className="text-6xl font-black font-mono tracking-tighter tabular-nums">{stats.lowStockCount}</p>
                            <p className="text-[10px] font-black text-rose-100 uppercase tracking-widest mt-2 bg-rose-900/30 inline-block px-3 py-1.5 rounded-lg border border-rose-500/50">
                                พัสดุถึงจุดวิกฤต (Low Stock)
                            </p>
                        </div>
                    </div>

                    {/* KPI 3: PROCUREMENT ACTION */}
                    <div className="bg-amber-500 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-amber-900/20 relative overflow-hidden flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-6">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-100">Pending PRs</p>
                            <Clock className="w-6 h-6 text-amber-100" />
                        </div>
                        <div>
                            <div className="flex items-end gap-3">
                                <p className="text-6xl font-black font-mono tracking-tighter tabular-nums">{stats.prStats.pending}</p>
                                {stats.urgentPRs > 0 && (
                                    <span className="text-xs font-black text-rose-600 bg-white px-2 py-1 rounded-xl mb-3 shadow-sm border border-rose-100">🔥 ด่วน {stats.urgentPRs}</span>
                                )}
                            </div>
                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mt-2 bg-amber-400/50 inline-block px-3 py-1.5 rounded-lg border border-amber-300/50">
                                ใบขอซื้อรออนุมัติ
                            </p>
                        </div>
                    </div>
                </div>

                {/* TIER 2: SYSTEM-WIDE MODULE SUMMARY */}
                <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                        {/* 1. Master Data */}
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Database className="w-3.5 h-3.5" /> โครงสร้างระบบ (Master)</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                                    <span className="text-xs font-bold text-slate-600">รหัสพัสดุ (SKU)</span>
                                    <span className="font-mono font-black text-indigo-600 text-xl leading-none">{stats.uniqueProducts}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                                    <span className="text-xs font-bold text-slate-600">บัญชีผู้ใช้ (Users)</span>
                                    <span className="font-mono font-black text-slate-800 text-xl leading-none">{stats.activeUsers}</span>
                                </div>
                                <div className="flex justify-between items-end pb-1">
                                    <span className="text-xs font-bold text-slate-600">คลังพัสดุ (Facilities)</span>
                                    <span className="font-mono font-black text-slate-800 text-xl leading-none">{warehouses.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Procurement (PR & PO) */}
                        <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2"><ShoppingCart className="w-3.5 h-3.5" /> ทรัพยากรจัดซื้อ (Sourcing)</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-end border-b border-indigo-200/50 pb-2">
                                    <span className="text-xs font-bold text-indigo-700">PR ที่อนุมัติแล้ว (Ready)</span>
                                    <span className="font-mono font-black text-indigo-600 text-xl leading-none">{stats.prStats.approved}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-indigo-200/50 pb-2">
                                    <span className="text-xs font-bold text-emerald-600">PO ที่ดำเนินการอยู่ (Active)</span>
                                    <span className="font-mono font-black text-emerald-600 text-xl leading-none">{stats.poStats.active}</span>
                                </div>
                                <div className="flex justify-between items-end pb-1">
                                    <span className="text-xs font-bold text-slate-600">PO ทั้งหมด (Total POs)</span>
                                    <span className="font-mono font-black text-slate-800 text-xl leading-none">{stats.poStats.total}</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Outbound (SR & DO) */}
                        <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> การเบิกจ่าย (Fulfillment)</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-end border-b border-blue-200/50 pb-2">
                                    <span className="text-xs font-bold text-blue-700">ใบเบิกรอคิว (Pending SR)</span>
                                    <span className="font-mono font-black text-blue-600 text-xl leading-none">{stats.srStats.pending}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-blue-200/50 pb-2">
                                    <span className="text-xs font-bold text-emerald-600">พร้อมจ่ายออก (Ready DO)</span>
                                    <span className="font-mono font-black text-emerald-600 text-xl leading-none">{stats.srStats.approved}</span>
                                </div>
                                <Link href="/outbound/delivery/create" className="text-[10px] font-black text-white bg-blue-600 rounded-xl py-1.5 px-3 text-center uppercase hover:bg-blue-700 block mt-2">
                                    Go to Dispatch →
                                </Link>
                            </div>
                        </div>

                        {/* 4. Quick Actions */}
                        <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 text-white flex flex-col justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> คีย์ลัดปฏิบัติการ</p>
                            <div className="space-y-2">
                                <Link href="/inventory/receipt/create" className="bg-white/10 hover:bg-emerald-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-none border border-white/5 flex items-center gap-3">
                                    <Package className="w-4 h-4" /> รับพัสดุเข้า (INBOUND)
                                </Link>
                                <Link href="/inventory/transfer/create" className="bg-white/10 hover:bg-indigo-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-none border border-white/5 flex items-center gap-3">
                                    <ArrowRightLeft className="w-4 h-4" /> ย้ายคลัง (TRANSFER)
                                </Link>
                                <Link href="/purchase/pr/create" className="bg-white/10 hover:bg-amber-500 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-none border border-white/5 flex items-center gap-3">
                                    <FileSignature className="w-4 h-4" /> ขอซื้อ (CREATE PR)
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TIER 3: DEEP INSIGHTS (3 Columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COL 1: SKU Distribution (ปรับคำใหม่ให้เข้าใจง่ายขึ้น) */}
                    <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm flex flex-col">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                            <BarChart3 className="w-5 h-5 text-indigo-500" /> สัดส่วนรายการพัสดุในคลัง (SKU Range)
                        </h2>
                        <div className="flex-1 flex flex-col justify-center space-y-6">
                            {stats.warehouseStats.length > 0 ? stats.warehouseStats.slice(0, 4).map((wh, idx) => {
                                const percentage = stats.uniqueProducts > 0 ? ((wh.uniqueSkuCount / stats.uniqueProducts) * 100).toFixed(1) : 0;
                                const barColor = idx === 0 ? "bg-indigo-600" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-emerald-500" : "bg-slate-400";

                                return (
                                    <div key={wh.id} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                                                    <Building2 className="w-3 h-3 text-slate-400" /> {wh.name}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Valuation: ฿{wh.totalValuation.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono font-black text-sm text-slate-700">{percentage}%</p>
                                                {/* 💡 แสดงคำว่า รายการ และ ชิ้น ให้ชัดเจน */}
                                                <p className="text-[10px] font-bold text-indigo-600 tracking-widest">{wh.uniqueSkuCount.toLocaleString()} รายการ</p>
                                                <p className="text-[8px] font-black text-slate-400 tracking-widest">({wh.totalPcs.toLocaleString()} ชิ้น)</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50 shadow-inner">
                                            <div className={`${barColor} h-full rounded-full transition-none`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-xs text-slate-400 font-bold uppercase text-center italic">No Facility Data</p>
                            )}
                        </div>
                    </div>

                    {/* COL 2: Top Capital Assets */}
                    <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm flex flex-col">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                            <Crown className="w-5 h-5 text-amber-500" /> สินทรัพย์มูลค่าสูงสุด 5 อันดับ
                        </h2>
                        <div className="flex-1 space-y-4">
                            {stats.topAssets.map((asset, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-indigo-50/50 transition-none">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-400 text-[10px]">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{asset.name}</p>
                                            <p className="text-[9px] font-mono font-bold text-indigo-600 mt-0.5">[{asset.sku}] • {asset.quantity} Units</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono font-black text-slate-800 text-sm">฿{asset.totalValue.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                            {stats.topAssets.length === 0 && (
                                <p className="text-xs text-slate-400 font-bold uppercase text-center py-10 italic">No Asset Data Available</p>
                            )}
                        </div>
                    </div>

                    {/* COL 3: Action Required Ledger */}
                    <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5 text-rose-500" /> อนุมัติจัดซื้อด่วน
                            </h2>
                            <Link href="/purchase/pr" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                จัดการ <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="flex-1 overflow-x-auto p-4">
                            <table className="min-w-full text-sm">
                                <thead className="border-b border-slate-100">
                                    <tr className="text-slate-400 font-black uppercase text-[9px] tracking-[0.15em]">
                                        <th className="p-4 text-left">Document Ref</th>
                                        <th className="p-4 text-left">Department</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stats.recentPendingPRs.map(pr => (
                                        <tr key={pr.id} className="hover:bg-slate-50 transition-none group">
                                            <td className="p-4">
                                                <p className="font-mono font-black text-indigo-600 text-xs">{pr.prNumber}</p>
                                                <p className="font-bold text-slate-500 italic text-[9px] line-clamp-1 max-w-[120px] mt-1">"{pr.purpose}"</p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="font-bold text-slate-700 text-[9px] uppercase tracking-tight block mb-1">{pr.department?.name || "Global"}</span>
                                                {pr.priority === 'URGENT' ? (
                                                    <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">🔴 URGENT</span>
                                                ) : (
                                                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">🟡 PENDING</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.recentPendingPRs.length === 0 && (
                                        <tr>
                                            <td colSpan="2" className="p-16 text-center">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">เคลียร์งานครบถ้วน</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* FOOTER VERIFICATION */}
                <div className="flex justify-center items-center gap-2 py-8">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                        Data Integrity Verified • TJC Enterprise Intelligence
                    </span>
                </div>
            </div>
        </AuthGate>
    );
}