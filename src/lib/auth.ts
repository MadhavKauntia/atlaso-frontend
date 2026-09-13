import type { User } from "./api";

const USER_KEY = "atlaso_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  if (process.env.NEXT_PUBLIC_MOCK === "1") return "mock-token";
  return localStorage.getItem("atlaso_token");
}

export function setToken(token: string): void {
  localStorage.setItem("atlaso_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("atlaso_token");
  localStorage.removeItem(USER_KEY);
}

/** Cache the signed-in user so the many places that need name/initials don't
 *  each round-trip to /auth/me. Set at login, cleared at logout. */
export function setCachedUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
