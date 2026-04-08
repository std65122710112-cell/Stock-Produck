"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { LogOut, ChevronRight, LayoutGrid } from "lucide-react"; // เพิ่ม icon เพื่อความสวยงาม

const menuGroups = [
    {
        title: "ภาพรวมระบบ",
        items: [{ href: "/dashboard", label: "Dashboard" }],
    },
    {
        title: "ระบบใบเบิกภายใน",
        items: [
            { href: "/inventory/requisition", label: "รายการใบขอเบิกสินค้า" },
            { href: "/inventory/requisition/approval", label: "อนุมัติใบเบิก" },
        ],
    },
    {
        title: "ระบบงานจัดซื้อ",
        items: [
            { href: "/purchase/pr", label: "รายการใบขอซื้อ (PR)" },
            { href: "/purchase/pr/approval", label: "อนุมัติใบขอซื้อ" },
            { href: "/purchase/create", label: "สร้างใบสั่งซื้อ (PO)" },
        ],
    },
    {
        title: "การจัดการคลังสินค้า",
        items: [
            { href: "/inbound", label: "รับสินค้าเข้า" },
            { href: "/outbound", label: "เบิกจ่ายสินค้า" },
            { href: "/inventory/transfer", label: "ย้ายสินค้าระหว่างคลัง" },
            { href: "/inventory/adjust", label: "ปรับปรุงยอดสต๊อก" },
        ],
    },
    {
        title: "สต๊อกและรายงาน",
        items: [
            { href: "/inventory/balances", label: "ยอดสินค้าคงเหลือ" },
            { href: "/inventory/low-stock", label: "สินค้าใกล้หมด" },
            { href: "/inventory/agedstock", label: "สินค้าค้างสต๊อก" },
            { href: "/history", label: "ประวัติความเคลื่อนไหว" },
            { href: "/reports", label: "รายงานสรุปผล" },
        ],
    },
    {
        title: "ข้อมูลหลัก",
        items: [
            { href: "/master/products", label: "ฐานข้อมูลสินค้า" },
            { href: "/master/suppliers", label: "ฐานข้อมูลคู่ค้า" },
            { href: "/master/categoriesandunits", label: "หมวดหมู่และหน่วยนับ" },
            { href: "/master/warehousessettings", label: "ตั้งค่าคลังและจุดจัดเก็บ" },
        ],
    },
    {
        title: "ความปลอดภัยและระบบ",
        items: [
            { href: "/users", label: "จัดการสิทธิ์ผู้ใช้งาน" },
            { href: "/company", label: "จัดการข้อมูลบริษัท" },
            { href: "/audit", label: "ประวัติการใช้งาน (Audit)" },
        ],
    },
];

function MenuButton({ href, label, isActive, onNavigate, isPending }) {
    return (
        <button
            type="button"
            onClick={() => onNavigate(href)}
            className={`group relative flex w-full items-center justify-between overflow-hidden rounded-[1.25rem] px-4 py-3 text-left text-sm
                transition-all duration-200 ease-out active:scale-[0.98]
                ${isActive
                    ? "bg-[#1e3b8a] text-white shadow-lg shadow-blue-900/20 font-bold"
                    : "text-slate-600 hover:bg-blue-50 hover:text-[#1e3b8a]"
                }
                ${isPending && !isActive ? "opacity-60" : "opacity-100"}
            `}
        >
            <div className="flex items-center gap-3 relative z-10">
                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${isActive ? "bg-white scale-125" : "bg-slate-300 group-hover:bg-[#1e3b8a]"}`} />
                <span className="leading-5">{label}</span>
            </div>

            {isActive && <ChevronRight className="w-4 h-4 text-white/70 relative z-10" />}
        </button>
    );
}

export default function AppShell({ children }) {
    const path = usePathname();
    const router = useRouter();
    const sidebarRef = useRef(null);

    const [isPending, startTransition] = useTransition();
    const [pendingHref, setPendingHref] = useState(null);

    useEffect(() => {
        const savedScrollPos = sessionStorage.getItem("sidebar-scroll");
        if (sidebarRef.current && savedScrollPos) {
            sidebarRef.current.scrollTop = parseInt(savedScrollPos, 10);
        }
    }, [path]);

    useEffect(() => {
        setPendingHref(null);
    }, [path]);

    useEffect(() => {
        const warmupRoutes = menuGroups.flatMap((group) =>
            group.items.map((item) => item.href)
        );
        for (const href of warmupRoutes) {
            router.prefetch?.(href);
        }
    }, [router]);

    const handleScroll = () => {
        if (sidebarRef.current) {
            sessionStorage.setItem("sidebar-scroll", String(sidebarRef.current.scrollTop));
        }
    };

    const handleNavigate = (href) => {
        if (href === path) return;
        setPendingHref(href);

        startTransition(() => {
            router.push(href);
        });
    };

    async function logout() {
        if (!confirm("ยืนยันการออกจากระบบ?")) return;
        try {
            await apiFetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout error", e);
        }
        clearAccessToken();
        window.location.href = "/login";
    }

    if (path === "/login") {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <div className="flex min-h-screen">
                <aside
                    ref={sidebarRef}
                    onScroll={handleScroll}
                    className="sticky top-0 h-screen w-80 overflow-y-auto border-r border-slate-200 bg-white print:hidden shadow-sm"
                >
                    <div className="flex h-full flex-col px-5 py-6">
                        {/* LOGO SECTION - THEME NAVY */}
                        <div className="mb-8">
                            <div className="relative overflow-hidden rounded-[2rem] bg-[#1e3b8a] p-5 shadow-xl shadow-blue-900/20">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-10 -mt-10" />
                                <div className="relative flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1e3b8a] shadow-inner font-black text-sm">
                                        TJC
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-200/70 mb-0.5">
                                            Enterprise Portal
                                        </p>
                                        <h1 className="truncate text-base font-black text-white tracking-tight uppercase">
                                            TJC Stock System
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NAVIGATION SECTION */}
                        <nav className="flex-1 space-y-7">
                            {menuGroups.map((group) => (
                                <section key={group.title} className="space-y-2">
                                    <div className="px-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400/80">
                                            {group.title}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        {group.items.map((n) => {
                                            const isActive =
                                                path === n.href ||
                                                (n.href !== "/dashboard" &&
                                                    path.startsWith(n.href + "/") &&
                                                    !(n.href === "/inventory/requisition" && path.startsWith("/inventory/requisition/approval")) &&
                                                    !(n.href === "/purchase/pr" && path.startsWith("/purchase/pr/approval"))
                                                );

                                            const itemPending = isPending && pendingHref === n.href;

                                            return (
                                                <MenuButton
                                                    key={n.href}
                                                    href={n.href}
                                                    label={n.label}
                                                    isActive={isActive}
                                                    isPending={itemPending}
                                                    onNavigate={handleNavigate}
                                                />
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </nav>

                        {/* BOTTOM ACTIONS */}
                        <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    System Mode
                                </p>
                                <p className="mt-0.5 text-xs font-bold text-[#1e3b8a] flex items-center gap-2">
                                    <LayoutGrid className="w-3 h-3" /> Internal Control
                                </p>
                            </div>

                            <button
                                onClick={logout}
                                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm font-black text-rose-600 shadow-sm transition-all hover:bg-rose-600 hover:text-white active:scale-95"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>ออกจากระบบ</span>
                            </button>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 p-4 md:p-8 bg-slate-50/50">
                    <div
                        className={`w-full rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 md:p-10 ${isPending ? "opacity-50 grayscale" : "opacity-100"
                            }`}
                    >
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}