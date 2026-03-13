"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    ShieldCheck,
    Lock,
    User,
    Database,
    KeyRound,
    Fingerprint,
    ShieldAlert,
    Eye,
    EyeOff
} from "lucide-react";

export default function LoginPage() {
    // ✅ เปลี่ยนให้ใช้ username แทนอีเมล และตั้งค่าเริ่มต้นเป็น admin
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("Admin12345!");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function onSubmit(e) {
        e.preventDefault();
        if (!username.trim() || !password) {
            return toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
        }

        setLoading(true);
        try {
            const res = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    username: username.trim(), // ✅ ส่งเป็นตัวแปร username
                    password: password
                }),
            });

            setAccessToken(res.accessToken);
            toast.success("Identity Verified: Welcome Back");
            router.replace("/dashboard");
        } catch (err) {
            toast.error(err.message || "Authentication Failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
            <Toaster position="top-right" />

            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-3xl shadow-xl mb-4 border border-slate-800">
                        <Database className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Enterprise Resource Planning</p>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                        TJC GROUP
                    </h1>
                </div>
                <form
                    onSubmit={onSubmit}
                    className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-[0_30px_100px_-20px_rgba(15,23,42,0.1)] relative overflow-hidden animate-in zoom-in-95 duration-500 delay-150"
                >
                    <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-black px-6 py-2 rounded-bl-3xl tracking-[0.2em] uppercase flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> Authorized Access
                    </div>

                    <div className="mb-10 pt-4">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Login</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">กรุณายืนยันตัวตนเพื่อเข้าสู่ระบบ</p>
                    </div>

                    <div className="space-y-6">
                        {/* ✅ ช่อง Username */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <User className="w-3 h-3" /> System Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-50 transition-all pl-12"
                                    placeholder="e.g. admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={loading}
                                    autoComplete="username"
                                />
                                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <KeyRound className="w-3 h-3" /> Secure Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-50 transition-all pl-12 pr-12"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    tabIndex="-1"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !username.trim() || !password}
                            className="w-full bg-slate-900 text-white rounded-3xl py-5 font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-600 shadow-2xl shadow-slate-200 transition-all disabled:opacity-30 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Verifying...
                                </>
                            ) : (
                                "Execute Login"
                            )}
                        </button>
                    </div>
                    <div className="mt-10 flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <ShieldAlert className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed tracking-widest">
                            Warning: This system is for TJC GROUP authorized personnel only.
                            Unauthorized access is strictly monitored and logged.
                        </p>
                    </div>
                </form>
                <div className="text-center space-y-1 animate-in fade-in duration-700 delay-300">
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">TJC WMS Cloud Core v2.2</p>
                    <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest italic">* Secure HttpOnly Session Active</p>
                </div>
            </div>
        </div>
    );
}