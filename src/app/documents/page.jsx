"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth";
import {
  Eye,
  Download,
  Loader2,
  FileText,
  RefreshCw,
  Search,
  FolderOpen,
  FileStack,
  ShoppingCart,
  Warehouse,
  Send,
  CreditCard,
  BarChart3,
  Layers3,
  CalendarDays,
  X,
  Filter,
  Sparkles,
  ShieldCheck,
  Clock3,
  Files,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";

const BASE_URL = API_BASE || "http://localhost:4000";

const DOC_TYPES = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "PR", label: "PR ใบขอซื้อ" },
  { value: "PO", label: "PO ใบสั่งซื้อ" },
  { value: "GR", label: "GR ใบรับสินค้า" },
  { value: "SR", label: "SR ใบขอเบิก" },
  { value: "DO", label: "DO ใบจ่ายสินค้า" },
  { value: "AP_INVOICE", label: "AP ใบแจ้งหนี้" },
  { value: "PV", label: "PV ใบสำคัญจ่าย" },
  { value: "COUNT", label: "CNT ใบตรวจนับ" },
  { value: "REPORT", label: "รายงาน" },
];

const GROUPS = [
  {
    key: "ALL",
    label: "ทั้งหมด",
    title: "เอกสารทั้งหมด",
    desc: "รวมเอกสารทุกประเภทที่ผู้ใช้มีสิทธิ์เข้าถึง",
    types: ["PR", "PO", "GR", "SR", "DO", "AP_INVOICE", "PV", "COUNT", "REPORT"],
    icon: FileStack,
    gradient: "from-slate-950 via-slate-900 to-slate-700",
    glow: "shadow-slate-900/25",
    bg: "bg-slate-950",
    ring: "ring-slate-300",
  },
  {
    key: "PURCHASE",
    label: "จัดซื้อ",
    title: "เอกสารจัดซื้อ",
    desc: "ใบขอซื้อ PR และใบสั่งซื้อ PO",
    types: ["PR", "PO"],
    icon: ShoppingCart,
    gradient: "from-blue-700 via-indigo-700 to-violet-700",
    glow: "shadow-blue-900/25",
    bg: "bg-blue-700",
    ring: "ring-blue-200",
  },
  {
    key: "INVENTORY",
    label: "คลังสินค้า",
    title: "เอกสารคลังสินค้า",
    desc: "ใบรับสินค้า GR และใบตรวจนับ CNT",
    types: ["GR", "COUNT"],
    icon: Warehouse,
    gradient: "from-emerald-700 via-teal-700 to-cyan-700",
    glow: "shadow-emerald-900/25",
    bg: "bg-emerald-700",
    ring: "ring-emerald-200",
  },
  {
    key: "OUTBOUND",
    label: "เบิก/จ่ายสินค้า",
    title: "เอกสารเบิกและจ่ายสินค้า",
    desc: "ใบขอเบิก SR และใบจ่ายสินค้า DO",
    types: ["SR", "DO"],
    icon: Send,
    gradient: "from-orange-600 via-amber-600 to-yellow-500",
    glow: "shadow-orange-900/25",
    bg: "bg-orange-600",
    ring: "ring-orange-200",
  },
  {
    key: "FINANCE",
    label: "การเงิน/AP",
    title: "เอกสารการเงินและเจ้าหนี้",
    desc: "ใบแจ้งหนี้ AP และใบสำคัญจ่าย PV",
    types: ["AP_INVOICE", "PV"],
    icon: CreditCard,
    gradient: "from-violet-700 via-fuchsia-700 to-pink-700",
    glow: "shadow-violet-900/25",
    bg: "bg-violet-700",
    ring: "ring-violet-200",
  },
  {
    key: "REPORT",
    label: "รายงาน",
    title: "รายงานระบบ",
    desc: "รายงาน PDF และ Excel",
    types: ["REPORT"],
    icon: BarChart3,
    gradient: "from-cyan-700 via-sky-700 to-blue-700",
    glow: "shadow-cyan-900/25",
    bg: "bg-cyan-700",
    ring: "ring-cyan-200",
  },
];

const TYPE_STYLE = {
  PR: {
    label: "ใบขอซื้อ PR",
    short: "PR",
    badge: "bg-blue-600 text-white border-blue-700",
    soft: "bg-blue-50 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    gradient: "from-blue-600 to-indigo-700",
  },
  PO: {
    label: "ใบสั่งซื้อ PO",
    short: "PO",
    badge: "bg-indigo-600 text-white border-indigo-700",
    soft: "bg-indigo-50 text-indigo-800 border-indigo-200",
    dot: "bg-indigo-500",
    gradient: "from-indigo-600 to-violet-700",
  },
  GR: {
    label: "ใบรับสินค้า GR",
    short: "GR",
    badge: "bg-emerald-600 text-white border-emerald-700",
    soft: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    gradient: "from-emerald-600 to-teal-700",
  },
  SR: {
    label: "ใบขอเบิก SR",
    short: "SR",
    badge: "bg-amber-500 text-slate-950 border-amber-600",
    soft: "bg-amber-50 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
    gradient: "from-amber-500 to-orange-600",
  },
  DO: {
    label: "ใบจ่ายสินค้า DO",
    short: "DO",
    badge: "bg-orange-600 text-white border-orange-700",
    soft: "bg-orange-50 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
    gradient: "from-orange-600 to-red-600",
  },
  AP_INVOICE: {
    label: "AP Invoice",
    short: "AP",
    badge: "bg-pink-600 text-white border-pink-700",
    soft: "bg-pink-50 text-pink-800 border-pink-200",
    dot: "bg-pink-500",
    gradient: "from-pink-600 to-rose-700",
  },
  PV: {
    label: "Payment Voucher",
    short: "PV",
    badge: "bg-violet-600 text-white border-violet-700",
    soft: "bg-violet-50 text-violet-800 border-violet-200",
    dot: "bg-violet-500",
    gradient: "from-violet-600 to-fuchsia-700",
  },
  COUNT: {
    label: "ใบตรวจนับ CNT",
    short: "CNT",
    badge: "bg-slate-700 text-white border-slate-800",
    soft: "bg-slate-100 text-slate-800 border-slate-200",
    dot: "bg-slate-500",
    gradient: "from-slate-700 to-slate-950",
  },
  REPORT: {
    label: "รายงาน",
    short: "RPT",
    badge: "bg-cyan-600 text-white border-cyan-700",
    soft: "bg-cyan-50 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
    gradient: "from-cyan-600 to-blue-700",
  },
};

function buildUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  const n = Number(value || 0);
  if (!n) return "-";

  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getSafeFileName(doc) {
  return (
    doc?.fileName ||
    `${doc?.type || "document"}-${doc?.documentNo || Date.now()}.pdf`
  );
}

function getFileExt(doc) {
  const name = String(doc?.fileName || doc?.viewUrl || "").toLowerCase();
  const clean = name.split("?")[0];
  const parts = clean.split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isImageFile(doc, blob) {
  const ext = getFileExt(doc);
  const mime = String(blob?.type || "").toLowerCase();

  if (mime.startsWith("image/")) return true;
  return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
}

function isPdfFile(doc, blob) {
  const ext = getFileExt(doc);
  const mime = String(blob?.type || "").toLowerCase();

  if (mime.includes("pdf")) return true;
  return ext === "pdf";
}

function isPreviewableFile(doc, blob) {
  return isPdfFile(doc, blob) || isImageFile(doc, blob);
}

async function refreshAccessTokenForBlob() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.accessToken) {
    clearAccessToken();
    throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  setAccessToken(json.accessToken);
  return json.accessToken;
}

async function fetchBlobWithAuth(url, retry = true) {
  const token = getAccessToken();

  const res = await fetch(buildUrl(url), {
    method: "GET",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401 && retry) {
    await refreshAccessTokenForBlob();
    return fetchBlobWithAuth(url, false);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `เปิดเอกสารไม่สำเร็จ HTTP ${res.status}`);
  }

  return res.blob();
}

function downloadBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60 * 1000);
}

function renderLoadingTab(tab, doc) {
  if (!tab) return;

  tab.document.title = "กำลังเปิดเอกสาร...";
  tab.document.body.innerHTML = `
    <div style="
      font-family: Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top left,#dbeafe,#eef2ff 45%,#f8fafc);
      color: #0f172a;
      margin: 0;
      overflow: hidden;
    ">
      <div style="position:absolute;width:360px;height:360px;border-radius:999px;background:rgba(37,99,235,.16);filter:blur(60px);top:-120px;right:-120px;"></div>
      <div style="position:absolute;width:360px;height:360px;border-radius:999px;background:rgba(124,58,237,.14);filter:blur(60px);bottom:-140px;left:-100px;"></div>

      <div style="
        position:relative;
        text-align: center;
        background: rgba(255,255,255,.9);
        border: 1px solid rgba(191,219,254,.9);
        border-radius: 34px;
        padding: 44px 56px;
        box-shadow: 0 34px 90px rgba(30, 64, 175, 0.20);
        max-width: 620px;
        backdrop-filter: blur(12px);
      ">
        <div style="
          width: 70px;
          height: 70px;
          border-radius: 999px;
          border: 8px solid #dbeafe;
          border-top-color: #1d4ed8;
          animation: spin 1s linear infinite;
          margin: 0 auto 24px auto;
        "></div>

        <h2 style="margin:0;font-size:26px;font-weight:900;">
          กำลังเปิดเอกสาร
        </h2>

        <p style="margin-top:14px;color:#475569;font-size:15px;line-height:1.7;">
          ${escapeHtml(doc?.documentNo || "")}
          ${doc?.title ? " · " + escapeHtml(doc.title) : ""}
        </p>

        <p style="margin-top:8px;color:#94a3b8;font-size:12px;">
          ระบบกำลังตรวจสอบสิทธิ์และโหลดไฟล์
        </p>
      </div>

      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `;
}

function renderDownloadOnlyTab(tab, doc) {
  if (!tab) return;

  tab.document.title = "ดาวน์โหลดเอกสาร";
  tab.document.body.innerHTML = `
    <div style="
      font-family: Arial, sans-serif;
      min-height: 100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:linear-gradient(135deg,#f8fafc,#eff6ff);
      color:#0f172a;
      margin:0;
    ">
      <div style="
        text-align:center;
        background:#ffffff;
        border:1px solid #dbeafe;
        border-radius:34px;
        padding:44px 56px;
        box-shadow:0 32px 90px rgba(15,23,42,0.14);
        max-width:580px;
      ">
        <div style="
          width:70px;
          height:70px;
          border-radius:26px;
          background:#dbeafe;
          color:#1d4ed8;
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 auto 24px auto;
          font-size:34px;
          font-weight:900;
        ">↓</div>

        <h2 style="margin:0;font-size:25px;font-weight:900;">
          ไฟล์นี้เปิดดูใน Browser ไม่ได้
        </h2>

        <p style="margin-top:14px;color:#64748b;font-size:15px;line-height:1.7;">
          ระบบได้ดาวน์โหลดไฟล์ให้แล้ว กรุณาตรวจสอบที่โฟลเดอร์ Downloads
        </p>

        <p style="margin-top:10px;color:#94a3b8;font-size:12px;">
          ${escapeHtml(getSafeFileName(doc))}
        </p>
      </div>
    </div>
  `;
}

function renderErrorTab(tab, error) {
  if (!tab) return;

  tab.document.title = "เปิดเอกสารไม่สำเร็จ";
  tab.document.body.innerHTML = `
    <div style="
      font-family: Arial, sans-serif;
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fff1f2;
      color:#991b1b;
      margin:0;
    ">
      <div style="
        text-align:center;
        background:#ffffff;
        border:1px solid #fecdd3;
        border-radius:34px;
        padding:44px 56px;
        box-shadow:0 32px 90px rgba(153,27,27,0.16);
        max-width:600px;
      ">
        <div style="
          width:70px;
          height:70px;
          border-radius:26px;
          background:#fee2e2;
          color:#dc2626;
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 auto 24px auto;
          font-size:34px;
          font-weight:900;
        ">!</div>

        <h2 style="margin:0;font-size:25px;font-weight:900;">
          เปิดเอกสารไม่สำเร็จ
        </h2>

        <p style="margin-top:14px;font-size:15px;line-height:1.7;color:#b91c1c;">
          ${escapeHtml(error?.message || "เกิดข้อผิดพลาด")}
        </p>
      </div>
    </div>
  `;
}

function getGroupByType(type) {
  return GROUPS.find((group) => group.key !== "ALL" && group.types.includes(type));
}

function GlassStatCard({ title, value, sub, icon: Icon, gradient }) {
  return (
    <div className="group relative overflow-hidden rounded-[1.8rem] border border-white/15 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/15">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl transition group-hover:scale-125" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55">
            {title}
          </p>
          <p className="mt-2 text-4xl font-black tabular-nums">
            {Number(value || 0).toLocaleString("th-TH")}
          </p>
          <p className="mt-1 text-xs font-semibold text-white/60">{sub}</p>
        </div>

        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${gradient} text-white shadow-xl`}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ doc }) {
  const style = TYPE_STYLE[doc.type];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${
        style?.badge || "border-slate-700 bg-slate-700 text-white"
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-white/80" />
      {style?.label || doc.typeLabel || doc.type}
    </span>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "-").toUpperCase();

  const isGood = ["APPROVED", "COMPLETED", "PAID", "ACTIVE", "RECEIVED", "ISSUED"].includes(value);
  const isPending = ["PENDING", "PARTIAL_PAID", "PENDING_L1", "PENDING_L2", "PENDING_L3"].includes(value);
  const isBad = ["REJECTED", "VOID", "CANCELLED", "CANCELED"].includes(value);

  const cls = isGood
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isPending
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : isBad
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${cls}`}>
      {isGood ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
      {status || "-"}
    </span>
  );
}

function ViewButton({ doc, busyId, onView }) {
  const isLoading = busyId === `view-${doc.id}`;
  const disabled = Boolean(busyId);

  return (
    <button
      type="button"
      onClick={() => onView(doc)}
      disabled={disabled}
      title="เปิดดูเอกสารในแท็บใหม่"
      className="group inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-950 px-4 py-3 text-xs font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Eye className="h-4 w-4 transition group-hover:scale-110" />
      )}
      <span>{isLoading ? "กำลังเปิด..." : "ดูเอกสาร"}</span>
      {!isLoading ? <ArrowUpRight className="h-3.5 w-3.5 opacity-70" /> : null}
    </button>
  );
}

function DownloadButton({ doc, busyId, onDownload }) {
  const isLoading = busyId === `download-${doc.id}`;
  const disabled = Boolean(busyId);

  return (
    <button
      type="button"
      onClick={() => onDownload(doc)}
      disabled={disabled}
      title="ดาวน์โหลดเอกสาร"
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span>{isLoading ? "กำลังโหลด..." : "ดาวน์โหลด"}</span>
    </button>
  );
}

function DocumentCard({ doc, busyId, onView, onDownload }) {
  const group = getGroupByType(doc.type);
  const typeStyle = TYPE_STYLE[doc.type] || TYPE_STYLE.REPORT;

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-white transition duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_32px_90px_rgba(30,64,175,0.18)]">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${typeStyle.gradient}`} />
      <div className={`pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gradient-to-br ${typeStyle.gradient} opacity-10 blur-xl transition group-hover:scale-125 group-hover:opacity-20`} />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <TypeBadge doc={doc} />
          <StatusBadge status={doc.status} />
        </div>

        <div className="mt-5 flex gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${typeStyle.gradient} text-white shadow-lg`}>
            <FileText className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-xl font-black text-slate-950">
              {doc.documentNo || "-"}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-slate-600">
              {doc.title || "-"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-xs font-bold text-slate-600">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                วันที่
              </p>
              <p className="text-slate-900">{doc.dateLabel || "-"}</p>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                มูลค่า
              </p>
              <p className="text-slate-900">{formatMoney(doc.amount)}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              ผู้เกี่ยวข้อง
            </p>
            <p className="truncate text-slate-900">{doc.ownerName || "-"}</p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              ชื่อไฟล์
            </p>
            <p className="truncate text-slate-500">{doc.fileName || "-"}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <ViewButton doc={doc} busyId={busyId} onView={onView} />
          <DownloadButton doc={doc} busyId={busyId} onDownload={onDownload} />
        </div>
      </div>
    </div>
  );
}

function GroupButton({ group, active, count, onClick }) {
  const Icon = group.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[1.6rem] px-4 py-4 text-left shadow-sm transition duration-300 ${
        active
          ? `bg-gradient-to-r ${group.gradient} text-white shadow-xl ${group.glow}`
          : "border border-slate-200 bg-white/90 text-slate-800 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            active ? "bg-white/18 text-white" : `${group.bg} text-white`
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black">{group.label}</p>
          <p className={`${active ? "text-white/70" : "text-slate-500"} mt-0.5 text-xs font-semibold`}>
            {count.toLocaleString("th-TH")} รายการ
          </p>
        </div>
      </div>

      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${active ? "bg-white/10" : "bg-slate-100"} blur-xl`} />
    </button>
  );
}

function DocumentSection({ group, rows, busyId, onView, onDownload }) {
  if (!rows.length) return null;

  const Icon = group.icon;

  const byType = rows.reduce((acc, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="overflow-hidden rounded-[2.2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className={`relative overflow-hidden bg-gradient-to-r ${group.gradient} p-6 text-white`}>
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
              <Icon className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black md:text-3xl">{group.title}</h2>
              <p className="mt-1 text-sm font-semibold text-white/80">
                {group.desc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(byType).map(([type, count]) => (
              <span
                key={type}
                className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur"
              >
                {type}: {count.toLocaleString("th-TH")}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 bg-slate-50/80 p-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            busyId={busyId}
            onView={onView}
            onDownload={onDownload}
          />
        ))}
      </div>
    </section>
  );
}

export default function DocumentCenterPage() {
  const [docs, setDocs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byType: {} });
  const [paging, setPaging] = useState({
    total: 0,
    page: 1,
    limit: 60,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    q: "",
    type: "ALL",
    from: "",
    to: "",
    page: 1,
    limit: 60,
  });

  const [activeGroup, setActiveGroup] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, value);
      }
    });

    return params.toString();
  }, [filters]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const json = await apiFetch(`/api/documents?${queryString}`, {
        method: "GET",
      });

      setDocs(Array.isArray(json.data) ? json.data : []);
      setSummary(json.summary || { total: 0, byType: {} });

      setPaging({
        total: Number(json.total || 0),
        page: Number(json.page || 1),
        limit: Number(json.limit || 60),
        totalPages: Number(json.totalPages || 1),
      });
    } catch (err) {
      console.error("[Document Center] Load Error:", err);

      if (err?.status === 401) {
        setError("Session หมดอายุ หรือยังไม่ได้เข้าสู่ระบบ กรุณา Login ใหม่");
      } else if (err?.status === 403) {
        setError("คุณไม่มีสิทธิ์เข้าถึงศูนย์รวมเอกสาร");
      } else {
        setError(err?.message || "โหลดรายการเอกสารไม่สำเร็จ");
      }

      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  function setFilter(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  }

  function resetFilters() {
    setFilters({
      q: "",
      type: "ALL",
      from: "",
      to: "",
      page: 1,
      limit: 60,
    });
    setActiveGroup("ALL");
  }

  async function handleView(doc) {
    if (!doc?.viewUrl) return;

    setBusyId(`view-${doc.id}`);
    setError("");

    let previewTab = null;
    let blobUrl = "";

    try {
      previewTab = window.open("about:blank", "_blank");

      if (!previewTab) {
        throw new Error(
          "Browser บล็อกการเปิดแท็บใหม่ กรุณาอนุญาต Pop-ups สำหรับเว็บไซต์นี้"
        );
      }

      renderLoadingTab(previewTab, doc);

      const blob = await fetchBlobWithAuth(doc.viewUrl);
      blobUrl = URL.createObjectURL(blob);

      if (isPreviewableFile(doc, blob)) {
        previewTab.location.href = blobUrl;

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 5 * 60 * 1000);

        return;
      }

      downloadBlob(blob, getSafeFileName(doc));
      renderDownloadOnlyTab(previewTab, doc);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60 * 1000);
    } catch (err) {
      console.error("[Document Center] View Error:", err);

      if (previewTab && !previewTab.closed) {
        renderErrorTab(previewTab, err);
      }

      setError(err?.message || "เปิดเอกสารไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  async function handleDownload(doc) {
    if (!doc?.downloadUrl && !doc?.viewUrl) return;

    setBusyId(`download-${doc.id}`);
    setError("");

    try {
      const blob = await fetchBlobWithAuth(doc.downloadUrl || doc.viewUrl);
      downloadBlob(blob, getSafeFileName(doc));
    } catch (err) {
      console.error("[Document Center] Download Error:", err);
      setError(err?.message || "ดาวน์โหลดเอกสารไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  const byType = summary?.byType || {};

  const docsByGroup = useMemo(() => {
    const map = {};

    GROUPS.forEach((group) => {
      if (group.key === "ALL") return;
      map[group.key] = docs.filter((doc) => group.types.includes(doc.type));
    });

    return map;
  }, [docs]);

  const visibleGroups = useMemo(() => {
    if (activeGroup === "ALL") {
      return GROUPS.filter((group) => group.key !== "ALL").map((group) => ({
        ...group,
        rows: docsByGroup[group.key] || [],
      }));
    }

    const group = GROUPS.find((item) => item.key === activeGroup);
    if (!group) return [];

    return [
      {
        ...group,
        rows: docs.filter((doc) => group.types.includes(doc.type)),
      },
    ];
  }, [activeGroup, docs, docsByGroup]);

  const groupCounts = useMemo(() => {
    const counts = { ALL: docs.length };

    GROUPS.forEach((group) => {
      if (group.key === "ALL") return;
      counts[group.key] = docs.filter((doc) =>
        group.types.includes(doc.type)
      ).length;
    });

    return counts;
  }, [docs]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#eef2f7] text-slate-900">
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, -22px, 0) scale(1.06); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-18px, 18px, 0) scale(1.08); }
        }
        .vault-float-1 { animation: float-slow 8s ease-in-out infinite; }
        .vault-float-2 { animation: float-slower 10s ease-in-out infinite; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="vault-float-1 absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="vault-float-2 absolute -left-36 top-48 h-[380px] w-[380px] rounded-full bg-violet-500/18 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-slate-950 shadow-[0_40px_110px_rgba(15,23,42,0.34)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.36),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,.30),transparent_30%),radial-gradient(circle_at_70%_90%,rgba(34,211,238,.20),transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,.92),rgba(15,23,42,.76),rgba(30,41,59,.92))]" />

          <div className="relative p-6 text-white md:p-9">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-100 backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                  Premium Document Vault
                </div>

                <h1 className="max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                  ศูนย์รวมเอกสารทั้งหมด
                </h1>

                <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300 md:text-base">
                  รวมเอกสารจากทุกโมดูล แยกหมวดชัดเจน ค้นหาง่าย เปิดดูในแท็บใหม่ และดาวน์โหลดได้ทันที
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    Secure Access
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur">
                    <Clock3 className="h-4 w-4 text-blue-300" />
                    Real-time Documents
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur">
                    <Files className="h-4 w-4 text-violet-300" />
                    Multi-module Center
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={loadDocuments}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-slate-950 shadow-2xl transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
              </button>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-4">
              <GlassStatCard
                title="Total Documents"
                value={summary.total}
                sub="เอกสารทั้งหมด"
                icon={FileStack}
                gradient="from-slate-600 to-slate-950"
              />

              <GlassStatCard
                title="Purchasing"
                value={(byType.PR || 0) + (byType.PO || 0)}
                sub="PR + PO"
                icon={ShoppingCart}
                gradient="from-blue-500 to-indigo-700"
              />

              <GlassStatCard
                title="Inventory"
                value={
                  (byType.GR || 0) +
                  (byType.SR || 0) +
                  (byType.DO || 0) +
                  (byType.COUNT || 0)
                }
                sub="GR + SR + DO + CNT"
                icon={Warehouse}
                gradient="from-emerald-500 to-teal-700"
              />

              <GlassStatCard
                title="Finance"
                value={(byType.AP_INVOICE || 0) + (byType.PV || 0)}
                sub="AP + PV"
                icon={CreditCard}
                gradient="from-violet-500 to-fuchsia-700"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[2.2rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">ตัวกรองเอกสาร</h2>
              <p className="text-xs font-semibold text-slate-500">
                ค้นหาเลขเอกสาร ชื่อเอกสาร ผู้เกี่ยวข้อง ประเภท และช่วงวันที่
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr_.8fr_.8fr_.8fr_auto]">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">
                ค้นหา
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={filters.q}
                  onChange={(e) => setFilter("q", e.target.value)}
                  placeholder="ค้นหาเลขเอกสาร, ชื่อเอกสาร, สถานะ, ผู้เกี่ยวข้อง..."
                  className="h-13 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">
                ประเภท
              </label>

              <select
                value={filters.type}
                onChange={(e) => setFilter("type", e.target.value)}
                className="h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                {DOC_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                ตั้งแต่วันที่
              </label>

              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilter("from", e.target.value)}
                className="h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                ถึงวันที่
              </label>

              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilter("to", e.target.value)}
                className="h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-950 px-5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                ล้าง
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {GROUPS.map((group) => (
            <GroupButton
              key={group.key}
              group={group}
              active={activeGroup === group.key}
              count={groupCounts[group.key] || 0}
              onClick={() => setActiveGroup(group.key)}
            />
          ))}
        </section>

        {error ? (
          <div className="rounded-3xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-[2.2rem] border border-white/70 bg-white/90 p-14 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="inline-flex items-center gap-3 text-sm font-black text-slate-600">
              <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
              กำลังโหลดรายการเอกสาร...
            </div>
          </section>
        ) : docs.length === 0 ? (
          <section className="rounded-[2.2rem] border border-white/70 bg-white/90 p-14 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-100 text-slate-500">
              <Layers3 className="h-10 w-10" />
            </div>
            <div className="mt-5 text-sm font-black text-slate-500">
              ไม่พบเอกสารตามเงื่อนไขที่เลือก
            </div>
          </section>
        ) : (
          <div className="space-y-7">
            {visibleGroups.map((group) => (
              <DocumentSection
                key={group.key}
                group={group}
                rows={group.rows}
                busyId={busyId}
                onView={handleView}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}

        <section className="flex flex-col justify-between gap-3 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur md:flex-row md:items-center">
          <div className="text-sm font-black text-slate-600">
            แสดง {docs.length.toLocaleString("th-TH")} จาก{" "}
            {paging.total.toLocaleString("th-TH")} รายการ
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">
              Page {paging.page} / {paging.totalPages || 1}
            </div>

            <button
              type="button"
              disabled={paging.page <= 1 || loading}
              onClick={() => setFilter("page", Math.max(paging.page - 1, 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </button>

            <button
              type="button"
              disabled={paging.page >= paging.totalPages || loading}
              onClick={() =>
                setFilter("page", Math.min(paging.page + 1, paging.totalPages || 1))
              }
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}