"use client";

import React, { useState } from 'react';
import AuthGate from "@/components/AuthGate";
import GoodsReceiptHistoryPage from './inbound/page';
import OutboundHistoryPage from './outbound/page';
import TransferHistoryPage from './transfer/page';
import AdjustmentHistoryPage from './adjust/page';
import ProductHistoryPage from './products/page';
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import {
  Logs,
  DatabaseBackup,
  ArrowLeftRight,
  PackagePlus,
  Truck,
  ArrowRightLeft,
  ClipboardCheck,
  Package,
  ArrowLeft
} from "lucide-react";

export default function HistoryDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('inbound');

  const tabs = [
    { id: 'inbound', label: 'ประวัติรับเข้า', sub: 'Inbound', icon: PackagePlus, color: 'text-emerald-600' },
    { id: 'outbound', label: 'ประวัติจ่ายออก', sub: 'Outbound', icon: Truck, color: 'text-blue-600' },
    { id: 'transfer', label: 'ประวัติโอนย้าย', sub: 'Transfer', icon: ArrowRightLeft, color: 'text-indigo-600' },
    { id: 'adjust', label: 'ประวัติปรับยอด', sub: 'Adjust', icon: ClipboardCheck, color: 'text-slate-600' },
    { id: 'products', label: 'ประวัติสินค้า', sub: 'Products', icon: Package, color: 'text-[#1F3B8B]' },
  ];

  return (
    <AuthGate>
      <Toaster position="top-right" />
      <div className="w-full max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 print:hidden">
          

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                <Logs className="w-6 h-6 text-[#1F3B8B]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <DatabaseBackup className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Audit Log / Inventory Movement
                  </p>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  ประวัติการเคลื่อนไหว
                </h1>
              </div>
            </div>

            {/* ส่วนสรุปเล็กๆ ด้านขวา */}
            <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl flex flex-col items-end min-w-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Active View
              </span>
              <div className="flex items-center gap-2 text-[#1F3B8B]">
                <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
                <span className="text-lg font-bold">
                  {tabs.find(t => t.id === activeTab)?.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- TAB NAVIGATION --- */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/50 border border-slate-200 rounded-2xl w-fit print:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-white text-[#1F3B8B] shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#1F3B8B]" : "text-slate-400"}`} />
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-tight leading-none">{tab.label}</p>
                  <p className="text-[9px] font-medium uppercase tracking-wider mt-1 opacity-60">{tab.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* --- CONTENT CONTAINER --- */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-150 overflow-hidden">
          {/* ส่วนเนื้อหาภายใน Tab จะใช้ Padding มาตรฐาน p-6 */}
          <div className="p-6">
            {activeTab === 'inbound' && <GoodsReceiptHistoryPage />}
            {activeTab === 'outbound' && <OutboundHistoryPage />}
            {activeTab === 'transfer' && <TransferHistoryPage />}
            {activeTab === 'adjust' && <AdjustmentHistoryPage />}
            {activeTab === 'products' && <ProductHistoryPage />}
          </div>
        </section>

      </div>
    </AuthGate>
  );
}