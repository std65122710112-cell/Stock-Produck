"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";

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
            // { href: "/inventory/transfer", label: "โอนย้ายระหว่างคลัง" },
        ],
    },
    {
        title: "สต๊อกและรายงาน",
        items: [
            { href: "/inventory/balances", label: "ยอดสินค้าคงเหลือ" },
            { href: "/inventory/low-stock", label: "สินค้าใกล้หมด" },
            { href: "/inventory/adjust", label: "ปรับปรุงยอดสต๊อก" },
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
            className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-3 text-left text-sm
                transition-[background-color,color,border-color,opacity] duration-200 ease-out
                ${isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-white/90 hover:text-slate-900"
                }
                ${isPending && !isActive ? "opacity-80" : "opacity-100"}
            `}
        >
            <span
                className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-colors duration-200 ${isActive ? "bg-sky-400" : "bg-transparent group-hover:bg-slate-200"
                    }`}
            />
            <span
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 ${isActive ? "bg-sky-400" : "bg-slate-300 group-hover:bg-slate-400"
                    }`}
            />
            <span className="font-medium leading-5">{label}</span>
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8fafc,#f1f5f9_35%,#eef2f7_100%)] text-slate-800">
            <div className="flex min-h-screen">
                <aside
                    ref={sidebarRef}
                    onScroll={handleScroll}
                    className="sticky top-0 h-screen w-80 overflow-y-auto border-r border-slate-200/80 bg-white/80 backdrop-blur-xl print:hidden"
                >
                    <div className="flex h-full flex-col px-4 py-5">
                        <div className="mb-6">
                            <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.45)]">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_35%)]" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_30%)]" />
                                <div className="relative flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 text-sm font-black tracking-wide text-slate-900 shadow-lg">
                                        TJC
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
                                            Enterprise Platform
                                        </p>
                                        <h1 className="truncate text-lg font-semibold text-white">
                                            TJC Stock System
                                        </h1>
                                        <p className="text-xs text-slate-300">
                                            Inventory • Procurement • Control
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <nav className="flex-1 space-y-6">
                            {menuGroups.map((group) => (
                                <section key={group.title}>
                                    <div className="mb-2 px-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            {group.title}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        {group.items.map((n) => {
                                            // ✅ แก้ไขเงื่อนไขตรงนี้ เพื่อแยกเมนูแม่ออกจากเมนูลูกชัดเจน
                                            const isActive =
                                                path === n.href ||
                                                (n.href !== "/dashboard" &&
                                                    path.startsWith(n.href + "/") &&
                                                    // ยกเว้นกรณีของระบบใบเบิก
                                                    !(n.href === "/inventory/requisition" && path.startsWith("/inventory/requisition/approval")) &&
                                                    // ยกเว้นกรณีของระบบ PR
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

                        <div className="mt-6 space-y-3 border-t border-slate-200/80 pt-4">
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Current Section
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                    Internal Control System
                                </p>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                                ออกจากระบบ
                            </button>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 p-4 md:p-8">
                    <div
                        className={`w-full rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-opacity duration-200 md:p-8 ${isPending ? "opacity-95" : "opacity-100"
                            }`}
                    >
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}