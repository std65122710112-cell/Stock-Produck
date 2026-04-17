"use client";

import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { LogOut, ChevronRight, UserCircle, ShieldCheck, Camera, ShieldAlert } from "lucide-react";

// 💡 กำหนดสิทธิ์และโครงสร้างเมนู
const menuGroups = [
    {
        title: "ภาพรวมระบบ",
        items: [{ href: "/dashboard", label: "Dashboard", permissions: ["DASHBOARD_VIEW"] }],
    },
    {
        title: "ระบบใบเบิกภายใน",
        items: [
            { href: "/inventory/requisition", label: "รายการใบขอเบิกสินค้า", permissions: ["REQUISITION_READ", "REQUISITION_CREATE"] },
            { href: "/inventory/requisition/approval", label: "อนุมัติใบเบิก", permissions: ["REQUISITION_APPROVE"] },
        ],
    },
    {
        title: "ระบบงานจัดซื้อ",
        items: [
            { href: "/purchase/pr", label: "รายการใบขอซื้อ (PR)", permissions: ["PR_READ", "PR_MANAGE"] },
            { href: "/purchase/pr/approval", label: "อนุมัติใบขอซื้อ", permissions: ["PR_APPROVE"] },
            { href: "/purchase/create", label: "สร้างใบสั่งซื้อ (PO)", permissions: ["PO_MANAGE"] },
        ],
    },
    {
        title: "การจัดการคลังสินค้า",
        items: [
            { href: "/inbound", label: "รับสินค้าเข้า", permissions: ["INBOUND_CREATE"] },
            { href: "/outbound", label: "เบิกจ่ายสินค้า", permissions: ["OUTBOUND_CREATE"] },
            { href: "/inventory/transfer", label: "ย้ายสินค้าระหว่างคลัง", permissions: ["TRANSFER_MANAGE"] },
            { href: "/inventory/adjust", label: "ปรับปรุงยอดสต๊อก", permissions: ["ADJUSTMENT_MANAGE"] },
        ],
    },
    {
        title: "สต๊อกและรายงาน",
        items: [
            { href: "/inventory/balances", label: "ยอดสินค้าคงเหลือ", permissions: ["INVENTORY_READ"] },
            { href: "/reports/expiry", label: "ตรวจสอบวันหมดอายุสินค้า", permissions: ["REPORT_EXPORT"] },
            { href: "/inventory/low-stock", label: "สินค้าใกล้หมด", permissions: ["INVENTORY_READ"] },
            { href: "/inventory/agedstock", label: "สินค้าค้างสต๊อก", permissions: ["INVENTORY_READ"] },
            { href: "/history", label: "ประวัติความเคลื่อนไหว", permissions: ["MOVEMENT_READ"] },
            { href: "/reports", label: "รายงานสรุปผล", permissions: ["REPORT_EXPORT"] },
        ],
    },
    {
        title: "ข้อมูลหลัก",
        items: [
            { href: "/master/products", label: "ฐานข้อมูลสินค้า", permissions: ["MASTER_DATA_READ", "MASTER_DATA_MANAGE"] },
            { href: "/master/suppliers", label: "ฐานข้อมูลคู่ค้า", permissions: ["MASTER_DATA_READ", "MASTER_DATA_MANAGE"] },
            { href: "/master/categoriesandunits", label: "หมวดหมู่และหน่วยนับ", permissions: ["MASTER_DATA_READ", "MASTER_DATA_MANAGE"] },
            { href: "/master/warehousessettings", label: "ตั้งค่าคลังและจุดจัดเก็บ", permissions: ["WAREHOUSE_MANAGE"] }, 
        ],
    },
    {
        title: "ความปลอดภัยและระบบ",
        items: [
            { href: "/users", label: "จัดการสิทธิ์ผู้ใช้งาน", permissions: ["USER_MANAGE"] },
            { href: "/company", label: "จัดการข้อมูลบริษัท", permissions: ["SYSTEM_SETTINGS_MANAGE"] },
            { href: "/audit", label: "ประวัติการใช้งาน (Audit)", permissions: ["AUDIT_LOG_VIEW"] },
        ],
    },
];

function MenuButton({ href, label, isActive, onNavigate, isPending }) {
    return (
        <button
            type="button"
            onClick={() => onNavigate(href)}
            className={`group relative flex w-full items-center justify-between overflow-hidden rounded-2xl px-4 py-3 text-left text-sm font-medium
                transition-all duration-300 ease-out active:scale-[0.98]
                ${isActive
                    ? "bg-gradient-to-r from-[#1e3b8a] to-[#2563eb] text-white shadow-md shadow-blue-900/20"
                    : "text-slate-600 hover:bg-blue-50/80 hover:text-[#1e3b8a]"
                }
                ${isPending && !isActive ? "opacity-50" : "opacity-100"}
            `}
        >
            <div className="flex items-center gap-3 relative z-10">
                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${isActive ? "bg-white scale-110 shadow-sm" : "bg-slate-300 group-hover:bg-[#2563eb]"}`} />
                <span className="leading-5 tracking-wide">{label}</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isActive ? "text-white/80 translate-x-1" : "text-slate-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"}`} />
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

    // สร้าง List เมนูทั้งหมดแบบราบ (Flat) เพื่อใช้เช็คความซ้ำซ้อนของ Path
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
                        message: "บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้านี้ ระบบจะพาคุณกลับไปยังหน้าหลัก",
                        shouldRedirect: true
                    });
                    return;
                }
            }
        }
        
        setIsAuthorized(true);
    };

    useEffect(() => {
        const savedScrollPos = sessionStorage.getItem("sidebar-scroll");
        if (sidebarRef.current && savedScrollPos) {
            sidebarRef.current.scrollTop = parseInt(savedScrollPos, 10);
        }
    }, [path]);

    useEffect(() => {
        setPendingHref(null);
    }, [path]);

    const handleScroll = () => {
        if (sidebarRef.current) {
            sessionStorage.setItem("sidebar-scroll", String(sidebarRef.current.scrollTop));
        }
    };

    const handleNavigate = (href) => {
        if (href === path) return;
        
        if (userPerms) {
           let targetItem = null;
           for (const group of menuGroups) {
               targetItem = group.items.find(item => item.href === href);
               if(targetItem) break;
           }
           
           if(targetItem && targetItem.permissions.length > 0) {
               const hasAccess = targetItem.permissions.some(p => userPerms.includes(p));
               if(!hasAccess) {
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
            const res = await apiFetch("/auth/avatar", {
                method: "POST",
                body: formData
            });

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

    async function logout() {
        if (!confirm("ยืนยันการออกจากระบบ?")) return;
        try {
            await apiFetch("/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout error", e);
        }
        clearAccessToken();
        window.location.href = "/login";
    }

    const getAvatarSrc = () => {
        if (!userAvatar) return null;
        if (userAvatar.startsWith('http')) return userAvatar;
        const baseUrl = API_BASE.replace('/api', '');
        return `${baseUrl}${userAvatar}`;
    };

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

    const avatarSrc = getAvatarSrc();

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 relative">
            
            {/* Modal แจ้งเตือนสิทธิ์ */}
            {accessModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl shadow-rose-900/20 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
                                <ShieldAlert className="w-8 h-8 text-rose-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">การเข้าถึงถูกปฏิเสธ</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    {accessModal.message}
                                </p>
                            </div>
                            <div className="w-full pt-4">
                                <button
                                    onClick={handleCloseModal}
                                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-bold rounded-2xl transition-all shadow-md shadow-slate-900/20"
                                >
                                    รับทราบ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex min-h-screen">
                <aside
                    ref={sidebarRef}
                    onScroll={handleScroll}
                    className="sticky top-0 h-screen w-[300px] overflow-y-auto border-r border-slate-200/60 bg-white/80 backdrop-blur-xl print:hidden flex-shrink-0 custom-scrollbar flex flex-col"
                >
                    <div className="flex-1 flex flex-col px-5 py-6">

                        {/* BRAND LOGO */}
                        <div className="mb-8 space-y-5">
                            <div className="flex items-center gap-3 px-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-gradient-to-br from-[#1e3b8a] to-[#2563eb] text-white shadow-md font-black text-sm tracking-wider">
                                    TJC
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-base font-black text-slate-800 tracking-tight uppercase">
                                        Stock System
                                    </h1>
                                    <div className="flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            Enterprise Portal
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* USER PROFILE CARD */}
                            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 border border-blue-100 shadow-sm shadow-blue-900/5">
                                <div
                                    onClick={() => !isUploading && fileInputRef.current.click()}
                                    className={`relative group flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1e3b8a] overflow-hidden border border-blue-100/50 cursor-pointer transition-all hover:ring-2 hover:ring-blue-400/50 ${isUploading ? "animate-pulse opacity-50" : ""}`}
                                >
                                    {avatarSrc ? (
                                        <img
                                            src={avatarSrc}
                                            alt="Profile"
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.classList.add('flex-col');
                                            }}
                                        />
                                    ) : (
                                        <UserCircle className="w-5 h-5" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-col">
                                        <p className="text-sm font-bold text-[#1e3b8a] truncate tracking-wide">
                                            {userFullName === null ? (
                                                <span className="animate-pulse text-slate-400">กำลังโหลด...</span>
                                            ) : (
                                                userFullName
                                            )}
                                        </p>
                                        {userRole && (
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                                                {userRole}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NAVIGATION SECTION */}
                        <nav className="flex-1 space-y-8">
                            {userPerms === null ? (
                                <div className="animate-pulse space-y-4 opacity-50 px-2">
                                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                                    <div className="h-10 bg-slate-200 rounded-xl"></div>
                                    <div className="h-10 bg-slate-200 rounded-xl"></div>
                                </div>
                            ) : (
                                filteredMenuGroups.map((group) => (
                                    <section key={group.title} className="space-y-3">
                                        <div className="px-2 flex items-center gap-2">
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{group.title}</p>
                                            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                                        </div>
                                        <div className="space-y-1">
                                            {group.items.map((n) => {
                                                // 💡 แก้ไข Logic: ค้นหาว่ามีเมนูอื่นในระบบที่ "ตรงกว่า" (href ยาวกว่า) หรือไม่
                                                const isBetterMatchInMenu = allMenuItems.some(other => 
                                                    other.href !== n.href && 
                                                    path.startsWith(other.href) && 
                                                    other.href.length > n.href.length
                                                );

                                                const isActive = 
                                                    path === n.href || 
                                                    (n.href !== "/dashboard" && 
                                                     path.startsWith(n.href + "/") && 
                                                     !isBetterMatchInMenu);
                                                     
                                                const itemPending = isPending && pendingHref === n.href;
                                                
                                                return <MenuButton key={n.href} href={n.href} label={n.label} isActive={isActive} isPending={itemPending} onNavigate={handleNavigate} />;
                                            })}
                                        </div>
                                    </section>
                                ))
                            )}
                        </nav>
                    </div>

                    <div className="px-5 pb-6 pt-4 bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-100/60">
                        <button
                            onClick={logout}
                            className="group relative flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-500 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 hover:shadow-sm active:scale-95"
                        >
                            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            <span>ออกจากระบบ</span>
                        </button>
                    </div>
                </aside>

                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
                    <div className={`w-full min-h-[calc(100vh-4rem)] rounded-4xl border border-slate-200/60 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition-all duration-500 md:p-10 ${isPending ? "opacity-50 blur-[2px] grayscale-[20%]" : "opacity-100"}`}>
                        {isAuthorized ? children : (
                            <div className="flex h-full items-center justify-center">
                                <span className="animate-pulse text-slate-400 font-bold">ตรวจสอบสิทธิ์ความปลอดภัย...</span>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
}