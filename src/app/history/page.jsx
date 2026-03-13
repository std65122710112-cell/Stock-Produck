"use client";

import React, { useState } from 'react';
import AuthGate from "@/components/AuthGate";
import GoodsReceiptHistoryPage from './inbound/page';
import OutboundHistoryPage from './outbound/page';
import TransferHistoryPage from './transfer/page';
import AdjustmentHistoryPage from './adjust/page';
import { Toaster } from "react-hot-toast";
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Scale,
  Printer,
  ShieldCheck,
  Database
} from "lucide-react";

export default function HistoryDashboardPage() {
  const [activeTab, setActiveTab] = useState('inbound');

  const tabs = [
    { id: 'inbound', label: 'ประวัติรับสินค้า', sub: 'Inbound', icon: ArrowDownLeft, color: 'text-emerald-500' },
    { id: 'outbound', label: 'ประวัติจ่ายสินค้า', sub: 'Outbound', icon: ArrowUpRight, color: 'text-blue-500' },
    { id: 'transfer', label: 'ประวัติโอนย้าย', sub: 'Transfer', icon: RefreshCw, color: 'text-indigo-500' },
    { id: 'adjust', label: 'ประวัติปรับยอด', sub: 'Adjustment', icon: Scale, color: 'text-slate-500' },
  ];

  return (
    <AuthGate>
      <Toaster position="top-right" />

      {/* Header Section: Static Executive Look */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory Movement Archive</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
            Global History
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-300" />
            ศูนย์รวมประวัติการเคลื่อนไหวทรัพย์สิน TJC GROUP
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800"
        >
          <Printer className="w-4 h-4" />
          พิมพ์รายงานสรุป (Audit Report)
        </button>
      </div>

      {/* Tab Navigation: Static Modern Control */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white/50 p-2 rounded-[2rem] border border-slate-100 shadow-sm w-fit print:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-[1.5rem] ${isActive
                  ? "bg-slate-900 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-900 hover:bg-white"
                }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? "bg-white/10" : "bg-slate-50"}`}>
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : tab.color}`} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-black uppercase leading-none">{tab.label}</p>
                <p className={`text-[9px] font-bold uppercase tracking-tighter mt-1 ${isActive ? "text-slate-400" : "text-slate-300"}`}>
                  {tab.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content Container: Performance Optimized */}
      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden min-h-[600px] relative">
        {/* Subtle Watermark (Static) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none overflow-hidden">
          <div className="text-[120px] font-black -rotate-12 uppercase tracking-tighter">
            TJC OFFICIAL AUDIT
          </div>
        </div>

        <div className="p-4 relative z-10">
          {/* Logic การเปลี่ยนหน้าทำงานทันทีโดยไม่มี Animation Delay */}
          <div className="static">
            {activeTab === 'inbound' && <GoodsReceiptHistoryPage />}
            {activeTab === 'outbound' && <OutboundHistoryPage />}
            {activeTab === 'transfer' && <TransferHistoryPage />}
            {activeTab === 'adjust' && <AdjustmentHistoryPage />}
          </div>
        </div>
      </div>

      {/* Footer info: Static Professional Compliance */}
      <div className="mt-6 flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
            Authorized Internal Audit Access Only
          </span>
        </div>
        <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          Last System Sync: {new Date().toLocaleString('th-TH')}
        </div>
      </div>

    </AuthGate>
  );
}