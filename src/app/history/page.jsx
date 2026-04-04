"use client";

import React, { useState } from 'react';
import AuthGate from "@/components/AuthGate";
import GoodsReceiptHistoryPage from './inbound/page';
import OutboundHistoryPage from './outbound/page';
import TransferHistoryPage from './transfer/page';
import AdjustmentHistoryPage from './adjust/page';
import { Toaster } from "react-hot-toast";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Scale,
  Database,
  History,
  PackagePlus,
  Truck,
  ArrowRightLeft,
  ClipboardCheck,
  Logs, 
    DatabaseBackup, 
    ArrowLeftRight
} from "lucide-react";

export default function HistoryDashboardPage() {
  const [activeTab, setActiveTab] = useState('inbound');

  const tabs = [
    // Inbound: ใช้ PackagePlus สื่อถึงการเพิ่มพัสดุเข้าคลัง
    { id: 'inbound', label: 'ประวัติรับเข้า', sub: 'Inbound', icon: PackagePlus, color: 'text-emerald-600' },

    // Outbound: ใช้ Truck สื่อถึงการนำสินค้าออกไปจัดส่ง (ตรงกับหน้า DO)
    { id: 'outbound', label: 'ประวัติจ่ายออก', sub: 'Outbound', icon: Truck, color: 'text-blue-600' },

    // Transfer: ใช้ ArrowRightLeft สื่อถึงการเคลื่อนย้ายไปมา (ตรงกับหน้าโอนย้าย)
    { id: 'transfer', label: 'ประวัติโอนย้าย', sub: 'Transfer', icon: ArrowRightLeft, color: 'text-indigo-600' },

    // Adjust: ใช้ ClipboardCheck สื่อถึงการตรวจสอบและปรับยอด (ตรงกับหน้า Audit)
    { id: 'adjust', label: 'ประวัติปรับยอด', sub: 'Adjust', icon: ClipboardCheck, color: 'text-slate-600' },
  ];

  return (
    <AuthGate>
      <Toaster position="top-right" />

      {/* ควบคุมระยะห่างหลักด้วย space-y-8 ตาม Blueprint */}
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER SECTION - ปรับตามคอนเซปต์พรีเมียม (ชิดซ้าย/เส้นยาว) print:hidden */}
        <div className="w-full border-b-2 border-slate-100 mb-10 print:hidden">

          {/* กล่องใน: จัดตำแหน่งให้ชิดซ้าย (px-6 md:px-10) ตามคอนเซปต์ */}
          <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between pb-6 gap-6">

            {/* --- ส่วนซ้าย: ไอคอนและชื่อหน้า (ปรับไอคอนให้ตรงหัวเรื่อง) --- */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* 💡 เปลี่ยนไอคอนหลักเป็น Logs (สัญลักษณ์บันทึกประวัติ) */}
              <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                <Logs className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
              </div>

              {/* กลุ่มข้อความเรียงซ้อนกัน */}
              <div className="flex flex-col">
                {/* ภาษาอังกฤษด้านบน */}
                <div className="flex items-center gap-2 mb-1.5">
                  {/* 💡 ไอคอน DatabaseBackup สื่อถึงแหล่งข้อมูลย้อนหลัง */}
                  <DatabaseBackup className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                    Audit Log / Inventory Movement
                  </p>
                </div>

                {/* หัวข้อหลัก (ตัวตรง หนาพิเศษ) */}
                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                  ประวัติการเคลื่อนไหว
                </h1>

                {/* คำอธิบายด้านล่าง พร้อมไอคอนสีเขียวมรกต */}
                <div className="flex items-center gap-2 pt-1 opacity-90">
                  {/* 💡 ไอคอน ArrowLeftRight สื่อถึงการเคลื่อนไหว เข้า-ออก */}
                  <ArrowLeftRight className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                    ศูนย์รวมประวัติการเข้า-ออกของสินค้าพัสดุ
                  </p>
                </div>
              </div>
            </div>

            {/* --- ส่วนขวา: (ถ้ามีปุ่ม Filter หรือ Export สามารถใส่ตรงนี้ได้) --- */}
          </div>
        </div>

        {/* TAB NAVIGATION - ปรับสัดส่วนให้พรีเมียม */}
        <div className="flex flex-wrap gap-3 mb-8 bg-slate-50 p-2.5 rounded-[2.5rem] border border-slate-200 w-fit print:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-4 px-8 py-4 rounded-[1.8rem] transition-all duration-300 ${isActive
                  ? "bg-[#1e3b8a] text-white shadow-2xl shadow-blue-900/40 scale-105"
                  : "text-slate-500 hover:text-[#1e3b8a] hover:bg-white"
                  }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${isActive ? "bg-white/20" : "bg-white border border-slate-200 shadow-sm"}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : tab.color}`} />
                </div>
                <div className="text-left text-nowrap">
                  <p className="text-sm font-black uppercase leading-none tracking-tight">{tab.label}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 ${isActive ? "text-blue-200" : "text-slate-400"}`}>
                    {tab.sub}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* CONTENT CONTAINER - ปรับโค้งมนเป็น rounded-[2.5rem] และเงาตาม Blueprint */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.1)] min-h-[700px]">
          {/* Watermark */}


          {/* Padding p-8 ตามมาตรฐานตารางหลัก */}
          <div className="p-8 relative z-10">
            {activeTab === 'inbound' && <GoodsReceiptHistoryPage />}
            {activeTab === 'outbound' && <OutboundHistoryPage />}
            {activeTab === 'transfer' && <TransferHistoryPage />}
            {activeTab === 'adjust' && <AdjustmentHistoryPage />}
          </div>
        </section>
      </div>
    </AuthGate>
  );
}