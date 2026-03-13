"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function AuthGate({ children }) {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                await apiFetch("/auth/me", { method: "GET" });
                setLoading(false);
            } catch (e) {
                clearAccessToken();
                router.replace("/login");
            }
        })();
    }, [router]);

    if (loading) return <div className="p-6">Loading...</div>;
    return children;
}