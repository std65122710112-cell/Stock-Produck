"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function PermissionGate({ children, requiredPermissions = [] }) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkPermission() {
            try {
                const res = await apiFetch("/auth/me");
                const userPerms = res?.perms || [];
                if (requiredPermissions.length === 0) {
                    setIsAuthorized(true);
                    return;
                }
                const hasAccess = requiredPermissions.some(perm => userPerms.includes(perm));
                setIsAuthorized(hasAccess);

            } catch (error) {
                console.error("Failed to check permissions", error);
                setIsAuthorized(false);
            } finally {
                setIsLoading(false);
            }
        }

        checkPermission();
    }, [requiredPermissions]);
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-100 w-full text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p className="text-sm font-bold animate-pulse">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
            </div>
        );
    }
    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-100 w-full bg-slate-50/50 rounded-3xl border border-dashed border-slate-300 p-8">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert className="w-8 h-8 text-rose-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">ไม่มีสิทธิ์เข้าถึงเนื้อหานี้</h2>
                <p className="text-sm text-slate-500 text-center max-w-sm">
                    บัญชีของคุณไม่ได้รับอนุญาตให้ดูข้อมูลหรือทำรายการในส่วนนี้ หากคุณคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ (Admin)
                </p>
                <div className="mt-6 px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-mono font-bold">
                    Required: {requiredPermissions.join(", ")}
                </div>
            </div>
        );
    }
    return <>{children}</>;
}