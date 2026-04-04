"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // ตรวจว่ามี session/token ใช้งานได้ไหม (apiFetch จะ auto-refresh ให้ถ้า access หมดอายุ)
        await apiFetch("/auth/me", { method: "GET" });
        router.replace("/dashboard");
      } catch (e) {
        clearAccessToken();
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border rounded-lg p-6 shadow-sm w-full max-w-md text-center">
        <div className="text-xl font-bold">TJC Admin</div>
        <div className="text-gray-600 mt-2">Checking session...</div>
      </div>
    </div>
  );
}