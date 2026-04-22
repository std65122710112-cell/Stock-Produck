"use client";

import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import {
    LogOut,
    ChevronRight,
    UserCircle,
    ShieldCheck,
    Camera,
    ShieldAlert,
    Activity,
    Loader2,

    LayoutDashboard,
    BarChart3,
    FileText,
    ReceiptText,
    ClipboardCheck,
    CreditCard,
    History,
    Handshake,
    ClipboardList,
    CheckSquare,
    ShoppingCart,
    FilePlus2,
    Truck,
    PackageMinus,
    ArrowLeftRight,
    SlidersHorizontal,
    Boxes,
    CalendarClock,
    PackageX,
    ListChecks,
    Package,
    Tags,
    Warehouse,
    Users,
    Building2,
    ScrollText,
} from "lucide-react";

// 💡 1. กำหนดสิทธิ์และโครงสร้างเมนู
const menuGroups = [
    {
        title: "ภาพรวมระบบ",
        items: [
            {
                href: "/dashboard",
                label: "Dashboard",
                icon: LayoutDashboard,
                permissions: ["DASHBOARD_VIEW"],
            },
        ],
    },
    {
        title: "ฝ่ายบัญชีและการเงิน",
        items: [
            {
                href: "/accounting/dashboard",
                label: "แดชบอร์ดบัญชีเจ้าหนี้",
                icon: BarChart3,
                permissions: ["AP_READ"],
            },
            {
                href: "/accounting/ap",
                label: "ทะเบียนใบตั้งหนี้",
                icon: FileText,
                permissions: ["AP_READ", "AP_MANAGE"],
            },
            {
                href: "/accounting/payment-requests",
                label: "คำขออนุมัติจ่ายเงิน",
                icon: ClipboardCheck,
                permissions: ["AP_PAYMENT_REQUEST", "AP_PAYMENT_APPROVE"],
            },
            {
                href: "/accounting/payments",
                label: "บันทึกจ่ายเงินเจ้าหนี้",
                icon: CreditCard,
                permissions: ["AP_PAYMENT_MANAGE", "AP_PAYMENT_DIRECT"],
            },
            {
                href: "/accounting/history",
                label: "ประวัติการจ่ายเงิน",
                icon: History,
                permissions: ["AP_READ", "AP_PAYMENT_MANAGE", "AP_PAYMENT_VOID"],
            },
            {
                href: "/accounting/supplier-statement",
                label: "รายงานเจ้าหนี้รายคู่ค้า",
                icon: Handshake,
                permissions: ["AP_READ"],
            },
        ],
    },
    {
        title: "ระบบใบเบิกภายใน",
        items: [
            {
                href: "/inventory/requisition",
                label: "รายการใบขอเบิกสินค้า",
                icon: ClipboardList,
                permissions: ["REQUISITION_READ", "REQUISITION_CREATE"],
            },
            {
                href: "/inventory/requisition/approval",
                label: "อนุมัติใบเบิกพัสดุ",
                icon: CheckSquare,
                permissions: ["REQUISITION_APPROVE"],
            },
        ],
    },
    {
        title: "ระบบงานจัดซื้อ",
        items: [
            {
                href: "/purchase/pr",
                label: "รายการใบขอซื้อ (PR)",
                icon: ShoppingCart,
                permissions: ["PR_READ", "PR_CREATE"],
            },
            {
                href: "/purchase/pr/approval",
                label: "พิจารณาอนุมัติขอซื้อ",
                icon: ClipboardCheck,
                permissions: ["PR_APPROVE_L1", "PR_APPROVE_L2", "PR_APPROVE_L3"],
            },
            {
                href: "/purchase/create",
                label: "สร้างใบสั่งซื้อ (PO)",
                icon: FilePlus2,
                permissions: ["PO_MANAGE"],
            },
        ],
    },
    {
        title: "การจัดการคลังสินค้า",
        items: [
            {
                href: "/inbound",
                label: "รับสินค้าเข้าคลัง (GR)",
                icon: Truck,
                permissions: ["INBOUND_CREATE"],
            },
            {
                href: "/outbound",
                label: "เบิกจ่ายสินค้า (DO)",
                icon: PackageMinus,
                permissions: ["OUTBOUND_CREATE"],
            },
            {
                href: "/inventory/transfer",
                label: "โอนย้ายระหว่างคลัง",
                icon: ArrowLeftRight,
                permissions: ["TRANSFER_MANAGE"],
            },
            {
                href: "/inventory/adjust",
                label: "ปรับปรุงยอดสต๊อก",
                icon: SlidersHorizontal,
                permissions: ["ADJUSTMENT_MANAGE"],
            },
        ],
    },
    {
        title: "สต๊อกและรายงาน",
        items: [
            {
                href: "/inventory/balances",
                label: "ยอดสินค้าคงเหลือ",
                icon: Boxes,
                permissions: ["INVENTORY_READ"],
            },
            {
                href: "/reports/expiry",
                label: "ตรวจสอบวันหมดอายุ",
                icon: CalendarClock,
                permissions: ["REPORT_EXPORT"],
            },
            {
                href: "/inventory/low-stock",
                label: "สินค้าใกล้หมด (Min)",
                icon: PackageX,
                permissions: ["INVENTORY_READ"],
            },
            {
                href: "/inventory/agedstock",
                label: "สินค้าค้างสต๊อก (Aged)",
                icon: History,
                permissions: ["INVENTORY_READ"],
            },
            {
                href: "/history",
                label: "ประวัติความเคลื่อนไหว",
                icon: ListChecks,
                permissions: ["MOVEMENT_READ"],
            },
            {
                href: "/reports",
                label: "รายงานภาพรวม",
                icon: BarChart3,
                permissions: ["REPORT_EXPORT"],
            },
        ],
    },
    {
        title: "ฐานข้อมูลหลัก",
        items: [
            {
                href: "/master/products",
                label: "ฐานข้อมูลสินค้า",
                icon: Package,
                permissions: ["MASTER_DATA_READ", "MASTER_DATA_MANAGE"],
            },
            {
                href: "/master/suppliers",
                label: "ฐานข้อมูลคู่ค้า",
                icon: Handshake,
                permissions: ["MASTER_DATA_READ", "MASTER_DATA_MANAGE"],
            },
            {
                href: "/master/categoriesandunits",
                label: "หมวดหมู่และหน่วยนับ",
                icon: Tags,
                permissions: ["MASTER_DATA_READ", "MASTER_DATA_MANAGE"],
            },
            {
                href: "/master/warehousessettings",
                label: "ตั้งค่าคลังและจุดจัดเก็บ",
                icon: Warehouse,
                permissions: ["WAREHOUSE_MANAGE"],
            },
        ],
    },
    {
        title: "ความปลอดภัยและระบบ",
        items: [
            {
                href: "/users",
                label: "จัดการพนักงานและสิทธิ์",
                icon: Users,
                permissions: ["USER_MANAGE"],
            },
            {
                href: "/company",
                label: "ตั้งค่าข้อมูลบริษัท",
                icon: Building2,
                permissions: ["SYSTEM_SETTINGS_MANAGE"],
            },
            {
                href: "/audit",
                label: "ประวัติการใช้งาน (Audit)",
                icon: ScrollText,
                permissions: ["AUDIT_LOG_VIEW"],
            },
        ],
    },
];

function MenuButton({ href, label, icon: Icon, isActive, onNavigate, isPending }) {
    return (
        <button
            type="button"
            onClick={() => onNavigate(href)}
            className={`group relative flex w-full items-center justify-between overflow-hidden rounded-2xl px-4 py-3 text-left text-sm font-medium
                transition-all duration-300 ease-out active:scale-[0.98]
                ${isActive
                    ? "bg-gradient-to-r from-[#1F3B8B] to-[#2563eb] text-white shadow-md shadow-blue-900/20"
                    : "text-slate-600 hover:bg-blue-50/80 hover:text-[#1F3B8B]"
                }
                ${isPending && !isActive ? "opacity-50" : "opacity-100"}
            `}
        >
            <div className="flex items-center gap-3 relative z-10 min-w-0">
                <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${isActive
                            ? "bg-white/15 text-white shadow-sm"
                            : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-[#2563eb]"
                        }`}
                >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                </div>

                <span className="leading-5 tracking-wide truncate">{label}</span>
            </div>

            <ChevronRight
                className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive
                        ? "text-white/80 translate-x-1"
                        : "text-slate-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                    }`}
            />
        </button>
    );
}

export default function AppShell({ children }) {
    const path = usePathname();
    const router = useRouter();
    const sidebarRef = useRef(null);
    const fileInputRef = useRef(null);

    const [isPending, startTransition] = useTransition();
    const [pendingHref, setPendingHref] = useState(null);

    const [userFullName, setUserFullName] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userAvatar, setUserAvatar] = useState(null);

    const [userPerms, setUserPerms] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [accessModal, setAccessModal] = useState({ isOpen: false, message: "", shouldRedirect: false });

    const [isUploading, setIsUploading] = useState(false);

    // 🟢 State สำหรับป็อปอัพยืนยันการออกจากระบบ
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const allMenuItems = useMemo(() => menuGroups.flatMap(g => g.items), []);

    useEffect(() => {
        if (path === "/login") {
            setIsAuthorized(true);
            return;
        }

        async function fetchUserProfileAndCheckAccess() {
            try {
                const res = await apiFetch("/auth/me");
                if (res) {
                    const fullName = res.firstName
                        ? `${res.firstName} ${res.lastName || ''}`.trim()
                        : (res.username || "User");

                    setUserFullName(fullName);
                    setUserRole(res.roleName || "Member");
                    if (res.avatarUrl) setUserAvatar(res.avatarUrl);

                    const perms = Array.isArray(res.perms) ? res.perms : [];
                    setUserPerms(perms);

                    checkRouteAccess(path, perms);
                }
            } catch (error) {
                console.error("Fetch profile failed", error);
                clearAccessToken();
                router.replace("/login");
            }
        }

        setIsAuthorized(false);
        fetchUserProfileAndCheckAccess();
    }, [path, router]);

    const checkRouteAccess = (currentPath, perms) => {
        let matchedItem = null;

        for (const group of menuGroups) {
            for (const item of group.items) {
                if (item.href === "/dashboard") {
                    if (currentPath === "/dashboard") matchedItem = item;
                } else if (currentPath.startsWith(item.href)) {
                    if (!matchedItem || item.href.length > matchedItem.href.length) {
                        matchedItem = item;
                    }
                }
            }
        }

        if (matchedItem) {
            const requiredPerms = matchedItem.permissions;
            if (requiredPerms && requiredPerms.length > 0) {
                const hasAccess = requiredPerms.some(p => perms.includes(p));

                if (!hasAccess) {
                    setAccessModal({
                        isOpen: true,
                        message: "บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้านี้ ระบบจะพาคุณกลับไปยังหน้าแดชบอร์ด",
                        shouldRedirect: true
                    });
                    return;
                }
            }
        }

        setIsAuthorized(true);
    };

    const handleNavigate = (href) => {
        if (href === path) return;

        if (userPerms) {
            let targetItem = null;
            for (const group of menuGroups) {
                targetItem = group.items.find(item => item.href === href);
                if (targetItem) break;
            }

            if (targetItem && targetItem.permissions.length > 0) {
                const hasAccess = targetItem.permissions.some(p => userPerms.includes(p));
                if (!hasAccess) {
                    setAccessModal({
                        isOpen: true,
                        message: "คุณไม่มีสิทธิ์เข้าถึงเมนูนี้ กรุณาติดต่อผู้ดูแลระบบ",
                        shouldRedirect: false
                    });
                    return;
                }
            }
        }

        setPendingHref(href);
        startTransition(() => {
            router.push(href);
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB");
            return;
        }
        const formData = new FormData();
        formData.append("avatar", file);
        try {
            setIsUploading(true);
            const res = await apiFetch("/auth/avatar", { method: "POST", body: formData });
            if (res && res.avatarUrl) {
                setUserAvatar(res.avatarUrl);
                alert("อัปโหลดรูปโปรไฟล์สำเร็จ");
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("อัปโหลดรูปภาพล้มเหลว: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    // 🟢 เปลี่ยนจากฟังก์ชัน confirm เดิม มาเป็นการเปิด Pop-up แทน
    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    async function executeLogout() {
        setIsLoggingOut(true);
        try {
            await apiFetch("/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout error", e);
        }
        clearAccessToken();
        window.location.href = "/login";
    }

    const filteredMenuGroups = useMemo(() => {
        if (!userPerms) return [];
        return menuGroups
            .map(group => ({
                ...group,
                items: group.items.filter(item => {
                    if (item.permissions.length === 0) return true;
                    return item.permissions.some(p => userPerms.includes(p));
                })
            }))
            .filter(group => group.items.length > 0);
    }, [userPerms]);

    const handleCloseModal = () => {
        setAccessModal({ ...accessModal, isOpen: false });
        if (accessModal.shouldRedirect) {
            router.replace("/dashboard");
        }
    };

    if (path === "/login") return <>{children}</>;

    const avatarSrc = userAvatar ? (userAvatar.startsWith('http') ? userAvatar : `${API_BASE.replace('/api', '')}${userAvatar}`) : null;

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-100 selection:text-[#1F3B8B] relative">

            {/* Modal แจ้งเตือนสิทธิ์ */}
            {accessModal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-rose-50 border-4 border-rose-100 rounded-3xl flex items-center justify-center shadow-sm">
                                <ShieldAlert className="w-10 h-10 text-rose-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">การเข้าถึงถูกจำกัด</h3>
                                <p className="text-sm font-bold text-slate-400 leading-relaxed">
                                    {accessModal.message}
                                </p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="w-full py-4 bg-[#1F3B8B] hover:bg-blue-900 active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg"
                            >
                                เข้าใจแล้ว
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 Modal ยืนยันการออกจากระบบ (Logout Popup) */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl shadow-slate-900/20 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
                                <LogOut className="w-8 h-8 text-rose-600 ml-1" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">ยืนยันการออกจากระบบ?</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    คุณต้องการออกจากระบบใช่หรือไม่
                                </p>
                            </div>
                            <div className="flex w-full gap-3 pt-4">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    disabled={isLoggingOut}
                                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 text-sm font-bold rounded-2xl transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={executeLogout}
                                    disabled={isLoggingOut}
                                    className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-sm font-bold rounded-2xl transition-all shadow-md shadow-rose-900/20 flex items-center justify-center gap-2"
                                >
                                    {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                    ออกจากระบบ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex min-h-screen">
                {/* SIDEBAR */}
                <aside
                    ref={sidebarRef}
                    className="sticky top-0 h-screen w-[320px] overflow-y-auto border-r border-slate-200/60 bg-white/90 backdrop-blur-2xl print:hidden flex-shrink-0 custom-scrollbar flex flex-col"
                >
                    <div className="flex-1 flex flex-col px-6 py-8">
                        {/* BRAND */}
                        <div className="mb-10 space-y-6">
                            <div className="flex items-center gap-4 px-1">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1F3B8B] to-[#2563eb] text-white shadow-xl font-black text-sm tracking-wider">
                                    TJC
                                </div>
                                <div>
                                    <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">
                                        Stock Manager
                                    </h1>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                            Enterprise v2.0
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* USER PROFILE */}
                            <div className="flex items-center gap-4 rounded-[1.5rem] bg-slate-50 border border-slate-200/60 p-4 shadow-sm">
                                <div
                                    onClick={() => !isUploading && fileInputRef.current.click()}
                                    className={`relative group flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1F3B8B] overflow-hidden border-2 border-white shadow-md cursor-pointer transition-all hover:scale-105 ${isUploading ? "animate-pulse opacity-50" : ""}`}
                                >
                                    {avatarSrc ? <img src={avatarSrc} alt="P" className="h-full w-full object-cover" /> : <UserCircle size={24} />}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-slate-900 truncate">
                                        {userFullName || "กำลังโหลด..."}
                                    </p>
                                    <p className="text-[10px] font-black text-[#1F3B8B] uppercase tracking-widest mt-0.5 truncate bg-blue-100/50 w-fit px-2 py-0.5 rounded-md">
                                        {userRole || "-"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* NAV MENU */}
                        <nav className="flex-1 space-y-10">
                            {userPerms === null ? (
                                <div className="animate-pulse space-y-6 opacity-40 px-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
                                </div>
                            ) : (
                                filteredMenuGroups.map((group) => (
                                    <section key={group.title} className="space-y-4">
                                        <div className="px-2 flex items-center gap-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{group.title}</p>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                                        </div>
                                        <div className="space-y-1.5">
                                            {group.items.map((n) => {
                                                const isBetterMatchInMenu = allMenuItems.some(other =>
                                                    other.href !== n.href && path.startsWith(other.href) && other.href.length > n.href.length
                                                );
                                                const isActive = path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href + "/") && !isBetterMatchInMenu);

                                                return (
                                                    <MenuButton
                                                        key={n.href}
                                                        href={n.href}
                                                        label={n.label}
                                                        icon={n.icon}
                                                        isActive={isActive}
                                                        isPending={isPending && pendingHref === n.href}
                                                        onNavigate={handleNavigate}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))
                            )}
                        </nav>
                    </div>

                    <div className="px-5 pb-6 pt-4 bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-100/60">
                        {/* 🟢 เปลี่ยนฟังก์ชัน onClick จาก logout() เป็น handleLogoutClick */}
                        <button
                            onClick={handleLogoutClick}
                            className="group relative flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-500 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 hover:shadow-sm active:scale-95"
                        >
                            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            <span>ออกจากระบบ</span>
                        </button>
                    </div>
                </aside>

                {/* CONTENT AREA */}
                <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-x-hidden bg-slate-50/50">
                    <div className={`w-full min-h-[calc(100vh-5rem)] rounded-[3rem] border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-500 md:p-12 ${isPending ? "opacity-40 blur-[1px]" : "opacity-100"}`}>
                        {isAuthorized ? children : (
                            <div className="flex h-full flex-col items-center justify-center space-y-4">
                                <Activity className="w-10 h-10 text-blue-200 animate-bounce" />
                                <span className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Security Checking...</span>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
}