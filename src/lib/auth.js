let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
  if (token) sessionStorage.setItem("accessToken", token);
  else sessionStorage.removeItem("accessToken");
}

export function getAccessToken() {
  if (accessToken) return accessToken;
  const t = sessionStorage.getItem("accessToken");
  accessToken = t || null;
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
  sessionStorage.removeItem("accessToken");
}