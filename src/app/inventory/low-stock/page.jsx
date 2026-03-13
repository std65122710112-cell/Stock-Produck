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
    ArrowRight,
    Database,
    ShieldAlert,
    Info,
    Hash
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
            <div className="max-w-5xl mx-auto space-y-8">

                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory Risk Management</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            Critical Alerts
                            <span className="not-italic bg-rose-600 text-white text-[10px] px-3 py-1 rounded-full tracking-[0.2em] font-black border border-rose-700 shadow-lg">MIN-STOCK CONTROL</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                            รายการสินค้าที่ต่ำกว่าเกณฑ์ควบคุม (Buffer Stock Alert)
                        </p>
                    </div>

                    <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                            Threshold: 20 Units Standard
                        </span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-[50vh] space-y-4">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Scanning Inventory Depletion...</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-20 rounded-[3rem] text-center shadow-inner">
                        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-emerald-200/50 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <p className="text-emerald-900 font-black text-2xl uppercase tracking-tighter italic">All Assets Secured</p>
                        <p className="text-emerald-600/60 text-[10px] font-black uppercase tracking-[0.3em] mt-2">สต๊อกพัสดุทุกรายการอยู่ในเกณฑ์ปลอดภัย</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <div className="flex items-center gap-2 px-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Detected {alerts.length} Assets requiring urgent procurement
                            </span>
                        </div>

                        {alerts.map((item) => (
                            <div
                                key={item.id}
                                className={`flex flex-col md:flex-row items-center justify-between p-8 rounded-[2.5rem] border relative overflow-hidden bg-white shadow-sm ${item.currentStock === 0 ? 'border-rose-200' : 'border-orange-100'
                                    }`}
                            >
                                {/* Indicator Line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-2 ${item.currentStock === 0 ? 'bg-rose-600' : 'bg-orange-500'
                                    }`}></div>

                                <div className="flex items-center gap-8 w-full md:w-auto">
                                    {/* Status Badge */}
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${item.currentStock === 0
                                            ? 'bg-rose-600 text-white shadow-rose-200'
                                            : 'bg-orange-500 text-white shadow-orange-100'
                                        }`}>
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                <Hash className="w-3 h-3" /> {item.sku}
                                            </span>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${item.currentStock === 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                }`}>
                                                {item.currentStock === 0 ? "Out of Stock" : "Low Priority"}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">{item.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 flex items-center gap-1 italic">
                                            <Info className="w-3 h-3" />
                                            {item.currentStock === 0
                                                ? "สินค้าหมดกะทันหัน กรุณาเร่งการสั่งซื้อทันที"
                                                : `ปริมาณคงเหลือต่ำกว่าเกณฑ์ควบคุม (${item.threshold} ${item.unit})`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-10 mt-6 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                                    <div className="text-center px-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Balance</p>
                                        <p className={`text-4xl font-mono font-black tracking-tighter ${item.currentStock === 0 ? 'text-rose-600' : 'text-orange-600'
                                            }`}>
                                            {item.currentStock}
                                        </p>
                                        <p className="text-[8px] font-black text-slate-300 uppercase">{item.unit || 'Units'}</p>
                                    </div>

                                    <div className="h-12 w-[1px] bg-slate-100 hidden md:block"></div>

                                    <Link
                                        href={`/purchase/create?productId=${item.id}&suggestedQty=${item.threshold * 2}`}
                                        className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-none shadow-xl shadow-slate-200 flex items-center gap-2 group"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        สั่งซื้อเพิ่ม (PR)
                                        <ArrowRight className="w-3 h-3 text-slate-500" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Security Note */}
                <div className="flex justify-center items-center gap-2 py-6">
                    <CheckCircle2 className="w-3 h-3 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Min-Stock threshold synced with TJC Group Policy</span>
                </div>
            </div>
        </AuthGate>
    );
}