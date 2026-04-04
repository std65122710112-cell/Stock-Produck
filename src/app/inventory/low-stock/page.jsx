"use client";

import React, { useState, useEffect } from 'react';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
    AlertTriangle,
    CheckCircle2,
    Package,
    ShoppingCart,
    ChevronRight,
    Database,
    ShieldAlert,
    Info,
    Hash,
    Archive
} from "lucide-react";

export default function LowStockAlertPage() {
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch("/inventory/low-stock-alerts");
                setAlerts(res || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    return (
        <AuthGate>
            <div className="max-w-6xl mx-auto space-y-6 pb-10 pt-4">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-100 pb-6 gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider w-fit">
                            <ShieldAlert className="w-3.5 h-3.5" /> ระบบบริหารจัดการความเสี่ยงสินค้าคงคลัง
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            รายการสินค้าใกล้หมด
                        </h1>
                        <p className="text-slate-500 text-sm font-bold flex items-center gap-2">
                            <Archive className="w-4 h-4 text-slate-300" />
                            รายการสินค้าที่ต้องเติมสต๊อก (การควบคุมสต๊อกขั้นต่ำ)
                        </p>
                    </div>

                    <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-50 rounded-lg">
                            <Database className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-nowrap">เกณฑ์ควบคุมมาตรฐาน</span>
                            <span className="text-sm font-black text-slate-800 uppercase">20 หน่วย (มาตรฐาน)</span>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-[40vh] space-y-4">
                        <div className="w-10 h-10 border-3 border-slate-100 border-t-rose-500 rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">กำลังตรวจสอบระดับพัสดุคงคลัง...</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-emerald-50/30 border border-emerald-100 p-16 rounded-[2rem] text-center shadow-sm backdrop-blur-sm">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <p className="text-slate-900 font-black text-2xl tracking-tight mb-1">สต๊อกพัสดุอยู่ในระดับปกติ</p>
                        <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">ขณะนี้ยังไม่มีรายการพัสดุที่ต่ำกว่าเกณฑ์ควบคุม</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        <div className="flex items-center gap-2 px-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                ตรวจพบ <span className="text-rose-600">{alerts.length} รายการ</span> ที่ต้องเร่งดำเนินการจัดซื้อ
                            </span>
                        </div>

                        {alerts.map((item) => (
                            <div
                                key={item.id}
                                className={`group flex flex-col md:flex-row items-center justify-between p-5 md:p-6 rounded-2xl border bg-white transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/40 relative overflow-hidden ${item.currentStock === 0 ? 'border-rose-200' : 'border-orange-200'
                                    }`}
                            >
                                {/* Subtle Indicator Line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.currentStock === 0 ? 'bg-rose-500' : 'bg-orange-400'
                                    }`}></div>

                                <div className="flex items-center gap-5 w-full md:w-auto">
                                    {/* Compact Status Badge */}
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 flex-shrink-0 ${item.currentStock === 0
                                        ? 'bg-rose-50 text-rose-600'
                                        : 'bg-orange-50 text-orange-600'
                                        }`}>
                                        <AlertTriangle className="w-7 h-7" />
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs tabular-nums font-black text-blue-800 uppercase tracking-tighter flex items-center gap-1">
                                                <Hash className="w-3.5 h-3.5" /> {item.sku}
                                            </span>
                                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase border ${item.currentStock === 0
                                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                                : 'bg-orange-50 text-orange-600 border-orange-200'
                                                }`}>
                                                {item.currentStock === 0 ? "ระดับวิกฤต" : "เฝ้าระวัง"}
                                            </span>
                                        </div>
                                        {/* ขยายชื่อสินค้า */}
                                        <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                                            {item.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-slate-500 mt-1.5">
                                            <Info className="w-4 h-4" />
                                            {/* ขยายคำอธิบายด้านล่างชื่อ */}
                                            <p className="text-xs font-bold uppercase tracking-wide">
                                                {item.currentStock === 0
                                                    ? "สินค้าหมด: กรุณาเร่งสั่งซื้อทันที"
                                                    : `ต่ำกว่าเกณฑ์ขั้นต่ำ: ${item.threshold} ${item.unit}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 mt-5 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-5 md:pt-0">
                                    <div className="text-center px-4">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 text-nowrap">คงเหลือปัจจุบัน</p>
                                        <div className="flex items-baseline justify-center gap-1.5">

                                            <span className={`text-4xl font-black tabular-nums leading-none ${item.currentStock === 0 ? 'text-rose-600' : 'text-orange-500'
                                                }`}>
                                                {item.currentStock}
                                            </span>
                                            <span className={`text-xs font-black uppercase ${item.currentStock === 0 ? 'text-rose-600' : 'text-orange-500'
                                                }`}>
                                                {item.unit || 'ชิ้น'}
                                            </span>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/purchase/create?productId=${item.id}&suggestedQty=${item.threshold * 2}`}
                                        className="bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center gap-2 group/btn active:scale-95 whitespace-nowrap"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        สร้างใบขอซื้อ
                                        <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AuthGate>
    );
}