"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE } from "@/lib/api";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth";
import {
  Eye, Download, Loader2, FileText, RefreshCw, Search, FileStack,
  ShoppingCart, Warehouse, Send, CreditCard, BarChart3, Layers3,
  CalendarDays, X, Sparkles, ChevronLeft, ChevronRight, BadgeCheck,
  ArrowUpRight, SlidersHorizontal,
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
    key: "ALL", label: "ทั้งหมด", title: "เอกสารทั้งหมด",
    desc: "รวมเอกสารทุกประเภทที่ผู้ใช้มีสิทธิ์เข้าถึง",
    types: ["PR","PO","GR","SR","DO","AP_INVOICE","PV","COUNT","REPORT"],
    icon: FileStack, color: "#0f172a", accent: "#334155",
    pill: "bg-slate-900 text-white", tag: "ALL",
  },
  {
    key: "PURCHASE", label: "จัดซื้อ", title: "เอกสารจัดซื้อ",
    desc: "ใบขอซื้อ PR และใบสั่งซื้อ PO",
    types: ["PR","PO"], icon: ShoppingCart, color: "#1d4ed8", accent: "#3b82f6",
    pill: "bg-blue-600 text-white", tag: "PURCHASE",
  },
  {
    key: "INVENTORY", label: "คลังสินค้า", title: "เอกสารคลังสินค้า",
    desc: "ใบรับสินค้า GR และใบตรวจนับ CNT",
    types: ["GR","COUNT"], icon: Warehouse, color: "#059669", accent: "#10b981",
    pill: "bg-emerald-600 text-white", tag: "INVENTORY",
  },
  {
    key: "OUTBOUND", label: "เบิก/จ่าย", title: "เอกสารเบิกและจ่ายสินค้า",
    desc: "ใบขอเบิก SR และใบจ่ายสินค้า DO",
    types: ["SR","DO"], icon: Send, color: "#d97706", accent: "#f59e0b",
    pill: "bg-amber-500 text-white", tag: "OUTBOUND",
  },
  {
    key: "FINANCE", label: "การเงิน/AP", title: "เอกสารการเงินและเจ้าหนี้",
    desc: "ใบแจ้งหนี้ AP และใบสำคัญจ่าย PV",
    types: ["AP_INVOICE","PV"], icon: CreditCard, color: "#7c3aed", accent: "#a855f7",
    pill: "bg-violet-600 text-white", tag: "FINANCE",
  },
  {
    key: "REPORT", label: "รายงาน", title: "รายงานระบบ",
    desc: "รายงาน PDF และ Excel",
    types: ["REPORT"], icon: BarChart3, color: "#0891b2", accent: "#06b6d4",
    pill: "bg-cyan-600 text-white", tag: "REPORT",
  },
];

const TYPE_META = {
  PR: { label: "PR", full: "ใบขอซื้อ", color: "#1d4ed8", bg: "#eff6ff", text: "#1e40af" },
  PO: { label: "PO", full: "ใบสั่งซื้อ", color: "#4f46e5", bg: "#eef2ff", text: "#3730a3" },
  GR: { label: "GR", full: "ใบรับสินค้า", color: "#059669", bg: "#ecfdf5", text: "#065f46" },
  SR: { label: "SR", full: "ใบขอเบิก", color: "#d97706", bg: "#fffbeb", text: "#92400e" },
  DO: { label: "DO", full: "ใบจ่ายสินค้า", color: "#ea580c", bg: "#fff7ed", text: "#9a3412" },
  AP_INVOICE: { label: "AP", full: "AP Invoice", color: "#db2777", bg: "#fdf2f8", text: "#9d174d" },
  PV: { label: "PV", full: "Payment Voucher", color: "#7c3aed", bg: "#f5f3ff", text: "#4c1d95" },
  COUNT: { label: "CNT", full: "ใบตรวจนับ", color: "#475569", bg: "#f8fafc", text: "#1e293b" },
  REPORT: { label: "RPT", full: "รายงาน", color: "#0891b2", bg: "#ecfeff", text: "#164e63" },
};

function buildUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}
function escapeHtml(v) {
  return String(v||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function formatMoney(value) {
  const n = Number(value || 0);
  if (!n) return "–";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function getSafeFileName(doc) {
  return doc?.fileName || `${doc?.type||"document"}-${doc?.documentNo||Date.now()}.pdf`;
}
function getFileExt(doc) {
  const name = String(doc?.fileName||doc?.viewUrl||"").toLowerCase().split("?")[0];
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop() : "";
}
function isImageFile(doc, blob) {
  const ext = getFileExt(doc);
  const mime = String(blob?.type||"").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return ["jpg","jpeg","png","webp","gif"].includes(ext);
}
function isPdfFile(doc, blob) {
  const ext = getFileExt(doc);
  const mime = String(blob?.type||"").toLowerCase();
  if (mime.includes("pdf")) return true;
  return ext === "pdf";
}
function isPreviewableFile(doc, blob) { return isPdfFile(doc, blob) || isImageFile(doc, blob); }

async function refreshAccessTokenForBlob() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.accessToken) { clearAccessToken(); throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่"); }
  setAccessToken(json.accessToken);
  return json.accessToken;
}

async function fetchBlobWithAuth(url, retry = true) {
  const token = getAccessToken();
  const res = await fetch(buildUrl(url), {
    method: "GET", credentials: "include",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401 && retry) { await refreshAccessTokenForBlob(); return fetchBlobWithAuth(url, false); }
  if (!res.ok) { const text = await res.text().catch(() => ""); throw new Error(text || `เปิดเอกสารไม่สำเร็จ HTTP ${res.status}`); }
  return res.blob();
}

function downloadBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

function renderLoadingTab(tab, doc) {
  if (!tab) return;
  tab.document.title = "กำลังเปิดเอกสาร...";
  tab.document.body.innerHTML = `<div style="font-family:system-ui;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;"><div style="text-align:center;background:#fff;border-radius:24px;padding:48px;box-shadow:0 20px 60px rgba(0,0,0,.1);"><div style="width:56px;height:56px;border-radius:999px;border:6px solid #e2e8f0;border-top-color:#1d4ed8;animation:spin 1s linear infinite;margin:0 auto 24px;"></div><h2 style="margin:0;font-size:22px;font-weight:700;">กำลังเปิดเอกสาร</h2><p style="margin-top:8px;color:#64748b;">${escapeHtml(doc?.documentNo||"")}</p></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style></div>`;
}

function renderDownloadOnlyTab(tab, doc) {
  if (!tab) return;
  tab.document.title = "ดาวน์โหลดเอกสาร";
  tab.document.body.innerHTML = `<div style="font-family:system-ui;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;"><div style="text-align:center;background:#fff;border-radius:24px;padding:48px;box-shadow:0 20px 60px rgba(0,0,0,.1);"><div style="font-size:48px;margin-bottom:24px;">⬇️</div><h2 style="margin:0;font-size:22px;font-weight:700;">ไฟล์ถูกดาวน์โหลดแล้ว</h2><p style="margin-top:8px;color:#64748b;">ตรวจสอบที่โฟลเดอร์ Downloads</p><p style="margin-top:4px;color:#94a3b8;font-size:13px;">${escapeHtml(getSafeFileName(doc))}</p></div></div>`;
}

function renderErrorTab(tab, error) {
  if (!tab) return;
  tab.document.title = "เปิดเอกสารไม่สำเร็จ";
  tab.document.body.innerHTML = `<div style="font-family:system-ui;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff1f2;"><div style="text-align:center;background:#fff;border-radius:24px;padding:48px;box-shadow:0 20px 60px rgba(153,27,27,.12);"><div style="font-size:48px;margin-bottom:24px;">⚠️</div><h2 style="margin:0;font-size:22px;font-weight:700;color:#dc2626;">เปิดเอกสารไม่สำเร็จ</h2><p style="margin-top:8px;color:#b91c1c;">${escapeHtml(error?.message||"เกิดข้อผิดพลาด")}</p></div></div>`;
}

function getGroupByType(type) {
  return GROUPS.find((g) => g.key !== "ALL" && g.types.includes(type));
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, icon: Icon, color, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{Number(value||0).toLocaleString("th-TH")}</p>
          <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${accent})` }} />
    </div>
  );
}

/* ─── Type Chip ─── */
function TypeChip({ type }) {
  const m = TYPE_META[type] || TYPE_META.REPORT;
  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-black"
      style={{ background: m.bg, color: m.text }}>
      {m.label}
    </span>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const v = String(status||"").toUpperCase();
  const isGood = ["APPROVED","COMPLETED","PAID","ACTIVE","RECEIVED","ISSUED"].includes(v);
  const isPend = ["PENDING","PARTIAL_PAID","PENDING_L1","PENDING_L2","PENDING_L3"].includes(v);
  const isBad = ["REJECTED","VOID","CANCELLED","CANCELED"].includes(v);
  const cls = isGood
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : isPend ? "bg-amber-50 text-amber-700 ring-amber-200"
    : isBad ? "bg-red-50 text-red-700 ring-red-200"
    : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ring-1 ${cls}`}>
      {isGood && <BadgeCheck className="h-3 w-3" />}
      {status||"–"}
    </span>
  );
}

/* ─── Document Card ─── */
function DocumentCard({ doc, busyId, onView, onDownload }) {
  const m = TYPE_META[doc.type] || TYPE_META.REPORT;
  const isViewBusy = busyId === `view-${doc.id}`;
  const isDlBusy = busyId === `download-${doc.id}`;
  const disabled = Boolean(busyId);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80 hover:ring-slate-300">
      {/* top accent bar */}
      <div className="h-1 shrink-0" style={{ background: `linear-gradient(90deg, ${m.color}, ${m.color}99)` }} />

      <div className="flex flex-1 flex-col p-5">
        {/* header row */}
        <div className="flex items-center justify-between gap-2">
          <TypeChip type={doc.type} />
          <StatusBadge status={doc.status} />
        </div>

        {/* doc identity */}
        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black"
            style={{ background: m.bg, color: m.text }}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-900">{doc.documentNo||"–"}</p>
            <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-slate-500">{doc.title||"–"}</p>
          </div>
        </div>

        {/* meta grid */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-3 text-xs">
          <div>
            <p className="font-semibold uppercase tracking-widest text-slate-400" style={{ fontSize: 10 }}>วันที่</p>
            <p className="mt-0.5 font-semibold text-slate-700">{doc.dateLabel||"–"}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-widest text-slate-400" style={{ fontSize: 10 }}>มูลค่า</p>
            <p className="mt-0.5 font-semibold text-slate-700">{formatMoney(doc.amount)}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold uppercase tracking-widest text-slate-400" style={{ fontSize: 10 }}>ผู้เกี่ยวข้อง</p>
            <p className="mt-0.5 truncate font-semibold text-slate-700">{doc.ownerName||"–"}</p>
          </div>
          {doc.fileName && (
            <div className="col-span-2">
              <p className="font-semibold uppercase tracking-widest text-slate-400" style={{ fontSize: 10 }}>ไฟล์</p>
              <p className="mt-0.5 truncate text-slate-400">{doc.fileName}</p>
            </div>
          )}
        </div>

        {/* spacer */}
        <div className="flex-1" />

        {/* action buttons */}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => onView(doc)} disabled={disabled}
            className="group/btn flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: m.color }}>
            {isViewBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            {isViewBusy ? "เปิด..." : "ดูเอกสาร"}
            {!isViewBusy && <ArrowUpRight className="h-3 w-3 opacity-70" />}
          </button>

          <button type="button" onClick={() => onDownload(doc)} disabled={disabled}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
            {isDlBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {isDlBusy ? "โหลด..." : "ดาวน์โหลด"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Group Tab Button ─── */
function GroupTab({ group, active, count, onClick }) {
  const Icon = group.icon;
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
        active
          ? "text-white shadow-md"
          : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
      }`}
      style={active ? { background: group.color } : {}}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{group.label}</span>
      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-black ${
        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
      }`}>
        {count.toLocaleString("th-TH")}
      </span>
    </button>
  );
}

/* ─── Group Section ─── */
function GroupSection({ group, rows, busyId, onView, onDownload }) {
  if (!rows.length) return null;
  const Icon = group.icon;
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
      <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${group.color}18` }}>
          <Icon className="h-4.5 w-4.5" style={{ color: group.color }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-900">{group.title}</h2>
          <p className="text-xs text-slate-500">{group.desc}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-xs font-black" style={{ background: `${group.color}18`, color: group.color }}>
          {rows.length.toLocaleString("th-TH")} รายการ
        </span>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} busyId={busyId} onView={onView} onDownload={onDownload} />
        ))}
      </div>
    </section>
  );
}

/* ─── Main Page ─── */
export default function DocumentCenterPage() {
  const [docs, setDocs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byType: {} });
  const [paging, setPaging] = useState({ total: 0, page: 1, limit: 60, totalPages: 1 });
  const [filters, setFilters] = useState({ q: "", type: "ALL", from: "", to: "", page: 1, limit: 60 });
  const [activeGroup, setActiveGroup] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") p.set(k, v);
    });
    return p.toString();
  }, [filters]);

  const loadDocuments = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const json = await apiFetch(`/api/documents?${queryString}`, { method: "GET" });
      setDocs(Array.isArray(json.data) ? json.data : []);
      setSummary(json.summary || { total: 0, byType: {} });
      setPaging({ total: Number(json.total||0), page: Number(json.page||1), limit: Number(json.limit||60), totalPages: Number(json.totalPages||1) });
    } catch (err) {
      if (err?.status === 401) setError("Session หมดอายุ กรุณา Login ใหม่");
      else if (err?.status === 403) setError("คุณไม่มีสิทธิ์เข้าถึงศูนย์รวมเอกสาร");
      else setError(err?.message || "โหลดรายการเอกสารไม่สำเร็จ");
      setDocs([]);
    } finally { setLoading(false); }
  }, [queryString]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? value : 1 }));
  }
  function resetFilters() {
    setFilters({ q: "", type: "ALL", from: "", to: "", page: 1, limit: 60 });
    setActiveGroup("ALL");
  }

  async function handleView(doc) {
    if (!doc?.viewUrl) return;
    setBusyId(`view-${doc.id}`); setError("");
    let previewTab = null;
    try {
      previewTab = window.open("about:blank", "_blank");
      if (!previewTab) throw new Error("Browser บล็อกการเปิดแท็บใหม่ กรุณาอนุญาต Pop-ups");
      renderLoadingTab(previewTab, doc);
      const blob = await fetchBlobWithAuth(doc.viewUrl);
      const blobUrl = URL.createObjectURL(blob);
      if (isPreviewableFile(doc, blob)) {
        previewTab.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
        return;
      }
      downloadBlob(blob, getSafeFileName(doc));
      renderDownloadOnlyTab(previewTab, doc);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      if (previewTab && !previewTab.closed) renderErrorTab(previewTab, err);
      setError(err?.message || "เปิดเอกสารไม่สำเร็จ");
    } finally { setBusyId(""); }
  }

  async function handleDownload(doc) {
    if (!doc?.downloadUrl && !doc?.viewUrl) return;
    setBusyId(`download-${doc.id}`); setError("");
    try {
      const blob = await fetchBlobWithAuth(doc.downloadUrl || doc.viewUrl);
      downloadBlob(blob, getSafeFileName(doc));
    } catch (err) {
      setError(err?.message || "ดาวน์โหลดเอกสารไม่สำเร็จ");
    } finally { setBusyId(""); }
  }

  const byType = summary?.byType || {};

  const docsByGroup = useMemo(() => {
    const map = {};
    GROUPS.forEach((g) => { if (g.key !== "ALL") map[g.key] = docs.filter((d) => g.types.includes(d.type)); });
    return map;
  }, [docs]);

  const visibleGroups = useMemo(() => {
    if (activeGroup === "ALL") {
      return GROUPS.filter((g) => g.key !== "ALL").map((g) => ({ ...g, rows: docsByGroup[g.key] || [] }));
    }
    const g = GROUPS.find((item) => item.key === activeGroup);
    if (!g) return [];
    return [{ ...g, rows: docs.filter((d) => g.types.includes(d.type)) }];
  }, [activeGroup, docs, docsByGroup]);

  const groupCounts = useMemo(() => {
    const c = { ALL: docs.length };
    GROUPS.forEach((g) => { if (g.key !== "ALL") c[g.key] = docs.filter((d) => g.types.includes(d.type)).length; });
    return c;
  }, [docs]);

  const hasActiveFilters = filters.q || filters.type !== "ALL" || filters.from || filters.to;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">

        {/* ── Hero Header ── */}
        <header className="overflow-hidden rounded-2xl bg-slate-900 px-7 py-8 text-white shadow-xl shadow-slate-900/20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-blue-300">
                <Sparkles className="h-3 w-3" />
                Document Center
              </div>
              <h1 className="text-3xl font-black md:text-4xl">ศูนย์รวมเอกสาร</h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                รวมเอกสารจากทุกโมดูล ค้นหาง่าย เปิดดูในแท็บใหม่ และดาวน์โหลดได้ทันที
              </p>
            </div>
            <button type="button" onClick={loadDocuments} disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {loading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>

          {/* Stat cards */}
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "เอกสารทั้งหมด", value: summary.total, sub: "ทุกประเภท", icon: FileStack, color: "#94a3b8" },
              { label: "จัดซื้อ", value: (byType.PR||0)+(byType.PO||0), sub: "PR + PO", icon: ShoppingCart, color: "#60a5fa" },
              { label: "คลังสินค้า", value: (byType.GR||0)+(byType.SR||0)+(byType.DO||0)+(byType.COUNT||0), sub: "GR + SR + DO + CNT", icon: Warehouse, color: "#34d399" },
              { label: "การเงิน/AP", value: (byType.AP_INVOICE||0)+(byType.PV||0), sub: "AP + PV", icon: CreditCard, color: "#c084fc" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/8 bg-white/6 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: s.color }}>{s.label}</p>
                  <s.icon className="h-4 w-4 opacity-50" style={{ color: s.color }} />
                </div>
                <p className="mt-2 text-2xl font-black tabular-nums text-white">{Number(s.value||0).toLocaleString("th-TH")}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </header>

        {/* ── Filter Bar ── */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={filters.q} onChange={(e) => setFilter("q", e.target.value)}
                placeholder="ค้นหาเลขเอกสาร, ชื่อเอกสาร, ผู้เกี่ยวข้อง..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100" />
            </div>

            {/* Toggle advanced */}
            <button type="button" onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 h-10 text-sm font-bold transition ${
                showFilters || hasActiveFilters
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
              }`}>
              <SlidersHorizontal className="h-4 w-4" />
              ตัวกรอง
              {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-blue-500" />}
            </button>

            {hasActiveFilters && (
              <button type="button" onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 h-10 text-sm font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                <X className="h-3.5 w-3.5" />
                ล้าง
              </button>
            )}
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">ประเภทเอกสาร</label>
                <select value={filters.type} onChange={(e) => setFilter("type", e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100">
                  {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <CalendarDays className="h-3 w-3" /> ตั้งแต่วันที่
                </label>
                <input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <CalendarDays className="h-3 w-3" /> ถึงวันที่
                </label>
                <input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          )}
        </section>

        {/* ── Group Tabs ── */}
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <GroupTab key={g.key} group={g} active={activeGroup === g.key}
              count={groupCounts[g.key] || 0} onClick={() => setActiveGroup(g.key)} />
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <X className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white py-16 text-sm font-semibold text-slate-400 ring-1 ring-slate-200">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            กำลังโหลดรายการเอกสาร...
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white py-16 ring-1 ring-slate-200">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Layers3 className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-slate-400">ไม่พบเอกสารตามเงื่อนไขที่เลือก</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                ล้างตัวกรอง
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {visibleGroups.map((g) => (
              <GroupSection key={g.key} group={g} rows={g.rows} busyId={busyId} onView={handleView} onDownload={handleDownload} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 ring-1 ring-slate-200 sm:flex-row">
          <p className="text-sm font-semibold text-slate-500">
            แสดง <span className="font-black text-slate-900">{docs.length.toLocaleString("th-TH")}</span>{" "}
            จาก <span className="font-black text-slate-900">{paging.total.toLocaleString("th-TH")}</span> รายการ
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">หน้า {paging.page} / {paging.totalPages||1}</span>
            <button type="button" disabled={paging.page <= 1 || loading} onClick={() => setFilter("page", Math.max(paging.page-1,1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
            </button>
            <button type="button" disabled={paging.page >= paging.totalPages || loading} onClick={() => setFilter("page", Math.min(paging.page+1, paging.totalPages||1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              ถัดไป <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>

      </div>
    </main>
  );
}