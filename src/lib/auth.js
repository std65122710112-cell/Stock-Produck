let accessToken = null;

function canUseStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function setAccessToken(token) {
  accessToken = token || null;
  if (!canUseStorage()) return;

  if (token) sessionStorage.setItem("accessToken", token);
  else sessionStorage.removeItem("accessToken");
}

export function getAccessToken() {
  if (accessToken) return accessToken;
  if (!canUseStorage()) return null;

  const t = sessionStorage.getItem("accessToken");
  accessToken = t || null;
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
  if (!canUseStorage()) return;
  sessionStorage.removeItem("accessToken");
}