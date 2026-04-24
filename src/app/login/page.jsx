"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    ShieldCheck,
    Lock,
    User,
    ShieldAlert,
    Eye,
    EyeOff,
    Package,
    ArrowRight,
    CircleCheckBig,
    CheckCircle2
} from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [cursorLight, setCursorLight] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setMounted(true);
        // 💡 ดึงค่า Username และ Password ที่เคยจดจำไว้
        const savedUsername = localStorage.getItem("tjc_remember_user");
        const savedPassword = localStorage.getItem("tjc_remember_pass");
        
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
            if (savedPassword) {
                try {
                    // ถอดรหัสที่ถูกเข้ารหัสไว้กลับมาเป็นข้อความปกติ
                    setPassword(atob(savedPassword));
                } catch (e) {
                    console.error("Failed to decode password");
                }
            }
        }
    }, []);

    const handleMouseMove = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCursorLight({ x, y });

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;

        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        card.style.boxShadow = `0 45px 85px -10px rgba(30,58,138,0.5)`;
    };

    const handleMouseLeave = (e) => {
        const card = e.currentTarget;
        card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
        card.style.boxShadow = `0 30px 70px -10px rgba(30,58,138,0.4)`;
    };

    async function onSubmit(e) {
        e.preventDefault();
        if (!username.trim() || !password) {
            return toast.error("ข้อมูลไม่ครบถ้วน", {
                description: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน", 
                style: {
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    color: '#334155',
                    border: '1px solid #fee2e2',
                    padding: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                },
            });
        }

        setLoading(true);
        try {
            const res = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    username: username.trim(),
                    password: password
                }),
            });

            // บันทึก Token ลงระบบ
            setAccessToken(res.accessToken);

            // 💡 ถ้าผู้ใช้กดจดจำรหัสผ่าน ให้บันทึกทั้ง Username และ Password (เข้ารหัส Base64 ป้องกันการมองเห็นตรงๆ)
            if (rememberMe) {
                localStorage.setItem("tjc_remember_user", username.trim());
                localStorage.setItem("tjc_remember_pass", btoa(password));
            } else {
                localStorage.removeItem("tjc_remember_user");
                localStorage.removeItem("tjc_remember_pass");
            }

            let targetRoute = "/dashboard"; 
            
            try {
                if (res.accessToken) {
                    const base64Url = res.accessToken.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    const payload = JSON.parse(jsonPayload);
                    const userPerms = payload.perms || [];

                    if (!userPerms.includes("DASHBOARD_VIEW") && userPerms.length > 0) {
                        if (userPerms.includes("REQUISITION_READ") || userPerms.includes("REQUISITION_CREATE")) targetRoute = "/inventory/requisition";
                        else if (userPerms.includes("PR_READ") || userPerms.includes("PR_CREATE")) targetRoute = "/purchase/pr";
                        else if (userPerms.includes("INBOUND_READ") || userPerms.includes("INBOUND_CREATE")) targetRoute = "/inbound";
                       else if (userPerms.includes("OUTBOUND_READ") || userPerms.includes("OUTBOUND_CREATE")) {
                                    targetRoute = "/outbound";
                                }
                        else if (userPerms.includes("INVENTORY_READ")) targetRoute = "/inventory/balances";
                        else if (userPerms.includes("MASTER_DATA_READ")) targetRoute = "/master/products";
                        else if (userPerms.includes("USER_MANAGE")) targetRoute = "/users";
                    }
                }
            } catch (decodeError) {
                console.error("Token decoding failed", decodeError);
                targetRoute = "/inventory/requisition";
            }

            toast.success(
                (t) => (
                    <div className="flex flex-col gap-1">
                        <p className="font-bold text-[#1E3A8A] text-sm">เข้าสู่ระบบสำเร็จ</p>
                        <p className="text-xs text-slate-500 font-medium">กำลังพายูสเซอร์ {username} เข้าสู่ระบบ...</p>
                    </div>
                ),
                {
                    duration: 3000,
                    icon: <div className="bg-blue-100 p-2 rounded-full"><ShieldCheck className="w-5 h-5 text-blue-600" /></div>,
                    style: {
                        borderRadius: '24px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid #e2e8f0',
                        padding: '12px 20px',
                        minWidth: '320px',
                        boxShadow: '0 20px 40px -12px rgba(30, 58, 138, 0.2)',
                    },
                }
            );

            router.replace(targetRoute);

        } catch (err) {
            const errorMessage = (err.message === "Unauthorized") 
                ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" 
                : (err.message || "ไม่สามารถเชื่อมต่อกับระบบได้ในขณะนี้");

            toast.error(
                (t) => (
                    <div className="flex flex-col gap-1">
                        <p className="font-bold text-rose-700 text-sm">การยืนยันตัวตนล้มเหลว</p>
                        <p className="text-xs text-rose-500/80 font-medium">
                            {errorMessage}
                        </p>
                    </div>
                ),
                {
                    duration: 4000,
                    icon: <div className="bg-rose-100 p-2 rounded-full"><ShieldAlert className="w-5 h-5 text-rose-600" /></div>,
                    style: {
                        borderRadius: '24px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid #ffe4e6',
                        padding: '12px 20px',
                        minWidth: '320px',
                        boxShadow: '0 20px 40px -12px rgba(225, 29, 72, 0.15)',
                    },
                }
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#F4F7FB] p-4 sm:p-6 font-sans relative overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                .bg-animated {
                    background: linear-gradient(-45deg, #1E3A8A, #1A3066, #24418A, #1E3A8A);
                    background-size: 400% 400%;
                    animation: gradientShift 10s ease infinite;
                }
                
                /* 💡 ซ่อนไอคอนดวงตาของ Browser ป้องกันการซ้อนทับ */
                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear {
                    display: none;
                }

                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .fade-up {
                    opacity: 0;
                    transform: translateY(40px);
                    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .fade-up.active {
                    opacity: 1;
                    transform: translateY(0);
                }
                .float-icon {
                    animation: floating 3s ease-in-out infinite;
                }
                @keyframes floating {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                    100% { transform: translateY(0px); }
                }
            `}} />

            <Toaster position="top-center" reverseOrder={false} />

            <div className="w-full max-w-md space-y-5 sm:space-y-6 z-10 relative">
                <div className={`text-center space-y-2 sm:space-y-3 fade-up ${mounted ? 'active' : ''}`} style={{ transitionDelay: '100ms' }}>
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xl mb-1 sm:mb-2 float-icon border-b-4 border-[#1E3A8A]">
                        <Package className="w-8 h-8 sm:w-10 sm:h-10 text-[#1E3A8A]" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.2em] text-slate-500 mb-1">
                            Warehouse Management
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={onSubmit}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        transition: 'transform 0.4s ease-out, box-shadow 0.4s ease-out',
                        background: `radial-gradient(600px circle at ${cursorLight.x}px ${cursorLight.y}px, rgba(30, 58, 138, 0.03), transparent 40%), white`
                    }}
                    className={`bg-white p-6 sm:p-8 md:p-10 rounded-3xl sm:rounded-[2rem] border border-slate-300/80 shadow-[0_30px_70px_-10px_rgba(30,58,138,0.4)] relative fade-up ${mounted ? 'active' : ''}`}
                >
                    <div
                        className={`mb-8 sm:mb-10 flex flex-col items-center text-center fade-up ${mounted ? 'active' : ''}`}
                        style={{ transitionDelay: '200ms' }}
                    >
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1D4ED8] via-[#1E40AF] to-[#1D4ED8]">
                                    เข้าสู่ระบบ
                                </span>
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                            <CircleCheckBig className="w-4 h-4 text-green-500" />
                            <p
                                className="text-xs sm:text-sm font-medium"
                                style={{ transitionDelay: '300ms' }}
                            >
                                จัดการคลังสินค้าและสต๊อคของคุณอย่างมั่นใจ
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <div className={`space-y-1.5 fade-up ${mounted ? 'active' : ''}`} style={{ transitionDelay: '500ms' }}>
                            <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                                รหัสพนักงาน / ชื่อผู้ใช้
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    maxLength={50} 
                                    className="w-full border border-gray-200 bg-gray-50/50 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-[#1E3A8A] focus:ring-4 focus:ring-[#1E3A8A]/10 disabled:opacity-50 transition-all pl-10 sm:pl-11 duration-300"
                                    placeholder="กรอกชื่อผู้ใช้งาน..."
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={loading}
                                    autoComplete="username"
                                />
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-[#1E3A8A] group-focus-within:scale-110 transition-all duration-300" />
                            </div>
                        </div>

                        <div className={`space-y-1.5 fade-up ${mounted ? 'active' : ''}`} style={{ transitionDelay: '600ms' }}>
                            <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                                รหัสผ่าน
                            </label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    maxLength={100} 
                                    className="w-full border border-gray-200 bg-gray-50/50 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-[#1E3A8A] focus:ring-4 focus:ring-[#1E3A8A]/10 disabled:opacity-50 transition-all pl-10 sm:pl-11 pr-10 sm:pr-11 duration-300"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-[#1E3A8A] group-focus-within:scale-110 transition-all duration-300" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#1E3A8A] transition-colors"
                                    tabIndex="-1"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Eye className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
                                </button>
                            </div>
                        </div>

                        <div className={`flex items-center justify-between fade-up ${mounted ? 'active' : ''}`} style={{ transitionDelay: '650ms' }}>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only" 
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <div className="w-4 h-4 border-2 border-slate-300 rounded transition-all peer-checked:bg-[#1E3A8A] peer-checked:border-[#1E3A8A] group-hover:border-[#1E3A8A]"></div>
                                    <CheckCircle2 className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-slate-600 group-hover:text-[#1E3A8A] transition-colors select-none">
                                    จดจำชื่อผู้ใช้งานและรหัสผ่าน
                                </span>
                            </label>
                        </div>

                        <div className={`fade-up ${mounted ? 'active' : ''}`} style={{ transitionDelay: '700ms' }}>
                            <button
                                type="submit"
                                disabled={loading || !username.trim() || !password}
                                className="w-full relative flex items-center justify-center gap-2 sm:gap-2.5 py-3 sm:py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-bold text-white transition-all duration-500 bg-gradient-to-r from-[#1E3A8A] via-[#2a52be] to-[#1E3A8A] bg-[length:200%_auto] rounded-xl outline-none focus:ring-4 focus:ring-[#1E3A8A]/20 hover:bg-[position:right_center] hover:-translate-y-1 hover:shadow-[0_15px_30px_-10px_rgba(30,58,138,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 overflow-hidden group border border-white/10 mt-2 sm:mt-4"
                            >
                                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-[shine_1.5s_ease-in-out]"></div>
                                <style dangerouslySetInnerHTML={{ __html: `@keyframes shine { 0% { left: -100%; } 100% { left: 200%; } }` }} />

                                {loading ? (
                                    <>
                                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span className="tracking-wide">กำลังตรวจสอบข้อมูล...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="tracking-wide">เข้าสู่ระบบ</span>

                                        <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 group-hover:bg-white group-hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:translate-x-1 transition-all duration-300">
                                            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white group-hover:text-[#1E3A8A] transition-colors duration-300" />
                                        </div>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div
                        className={`mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-100 fade-up ${mounted ? 'active' : ''}`}
                        style={{ transitionDelay: '800ms' }}
                    >
                        <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 bg-blue-50/60 rounded-xl sm:rounded-2xl border border-blue-100 shadow-sm transition-all duration-300 hover:bg-blue-50 hover:shadow-md">

                            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-100 shrink-0">
                                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 animate-pulse" />
                            </div>

                            <div className="flex flex-col justify-start gap-1 sm:gap-1.5 max-w-xs text-left">
                                <p className="text-[11px] sm:text-[12px] font-bold text-blue-800 tracking-wide leading-tight">
                                    ⚠️ คำเตือนด้านความปลอดภัย
                                </p>

                                <p className="text-[10px] sm:text-[11px] text-gray-600 leading-relaxed break-words">
                                    ระบบนี้สงวนสิทธิ์เฉพาะพนักงานที่ได้รับอนุญาตเท่านั้น
                                    <br />
                                    การเข้าถึงโดยไม่ได้รับอนุญาตจะถูกบันทึกและตรวจสอบทุกกรณี
                                </p>
                            </div>

                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}