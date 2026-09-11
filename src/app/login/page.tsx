"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import AppShell from "@/components/AppShell";
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
        <div style={{
          width: 48, height: 48,
          background: "var(--blue)",
          borderRadius: "50%",
          margin: "0 auto 32px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: "var(--font-fraunces), serif",
          fontSize: 34,
          fontWeight: 300,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          marginBottom: 12,
          lineHeight: 1.1,
        }}>
          Welcome to Atlaso
        </h1>

        <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 40, lineHeight: 1.6 }}>
          Sign in to start creating your travel photobook.
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

        <p style={{ marginTop: 32, fontSize: 13, color: "var(--ink-soft)", opacity: 0.7 }}>
          By continuing, you agree to our{" "}
          <Link href="/terms" style={{ color: "var(--blue)", textDecoration: "underline" }}>Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" style={{ color: "var(--blue)", textDecoration: "underline" }}>Privacy Policy</Link>.
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
