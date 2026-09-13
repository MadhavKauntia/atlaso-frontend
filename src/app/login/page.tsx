"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import AppShell from "@/components/AppShell";
import Brand from "@/components/Brand";
import { googleAuth } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/create";

  useEffect(() => {
    if (getToken()) router.replace(next);
  }, [router, next]);

  async function handleSuccess(response: CredentialResponse) {
    if (!response.credential) return;
    try {
      const { token } = await googleAuth(response.credential);
      setToken(token);
      router.push(next);
    } catch {
      alert("Sign-in failed. Please try again.");
    }
  }

  return (
    <AppShell maxWidth="420px">
      <div style={{ textAlign: "center", paddingTop: 40 }}>
        <div style={{ marginBottom: 36, display: "flex", justifyContent: "center" }}>
          <Brand dark height={30} href={null} />
        </div>

        <h1 style={{
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          color: "var(--sb-cream)",
          marginBottom: 12,
          lineHeight: 1.1,
        }}>
          welcome back
        </h1>

        <p style={{ color: "var(--sb-muted)", fontSize: 15, marginBottom: 40, lineHeight: 1.6 }}>
          Sign in to build your travel photo book — free until you order.
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => alert("Sign-in failed. Please try again.")}
            size="large"
            shape="pill"
            text="continue_with"
          />
        </div>

        <p style={{ marginTop: 32, fontSize: 13, color: "var(--sb-muted-2)", lineHeight: 1.6 }}>
          By continuing, you agree to our{" "}
          <Link href="/terms" style={{ color: "var(--sb-gold)", textDecoration: "underline" }}>Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" style={{ color: "var(--sb-gold)", textDecoration: "underline" }}>Privacy Policy</Link>.
        </p>
      </div>
    </AppShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
