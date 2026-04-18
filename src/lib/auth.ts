export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("atlaso_token");
}

export function setToken(token: string): void {
  localStorage.setItem("atlaso_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("atlaso_token");
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
