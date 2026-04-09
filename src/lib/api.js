import { getAccessToken, setAccessToken, clearAccessToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function tryRefresh() {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include", // สำคัญ: ส่ง cookie refresh_token
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json?.accessToken) {
        setAccessToken(json.accessToken);
        return true;
    }
    return false;
}

export async function apiFetch(path, options = {}, { retry = true } = {}) {
    const token = getAccessToken();
    
    // 1. เตรียม Headers
    const headers = { ...(options.headers || {}) };

    // 💡 2. จัดการ Content-Type ให้ฉลาดขึ้น
    if (options.body instanceof FormData) {
        // ถ้าเป็น FormData (อัปโหลดรูป) ห้ามเซต Content-Type เอง 
        // เบราว์เซอร์จะจัดการใส่ multipart/form-data พร้อม boundary ให้โดยอัตโนมัติ
        delete headers["Content-Type"];
    } else if (options.body && !headers["Content-Type"]) {
        // ถ้ามี body และไม่ใช่ FormData (เช่น JSON ทั่วไป) ให้เซตเป็น application/json
        headers["Content-Type"] = "application/json";
    }

    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include", // ให้ cookie ใช้งานได้ (refresh/logout)
    });

    if (res.status === 401 && retry) {
        const ok = await tryRefresh();
        if (ok) return apiFetch(path, options, { retry: false });
        clearAccessToken();
    }

    // parse json ถ้าเป็น json
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json().catch(() => null) : await res.text().catch(() => "");
    
    if (!res.ok) {
        const msg = data?.message || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

export { API_BASE };