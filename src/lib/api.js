import { getAccessToken, setAccessToken, clearAccessToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function tryRefresh() {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
    });

    if (!res.ok) return false;

    const json = await res.json().catch(() => null);
    if (json?.accessToken) {
        setAccessToken(json.accessToken);
        return true;
    }

    return false;
}

export async function apiFetch(path, options = {}, { retry = true } = {}) {
    const token = getAccessToken();
    const headers = { ...(options.headers || {}) };

    if (options.body instanceof FormData) {
        delete headers["Content-Type"];
    } else if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
    });

    if (res.status === 401 && retry) {
        const ok = await tryRefresh();
        if (ok) return apiFetch(path, options, { retry: false });
        clearAccessToken();
    }

    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => "");

    if (!res.ok) {
        const msg = data?.message || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}

export async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    } finally {
        clearAccessToken();
    }
}

export { API_BASE };