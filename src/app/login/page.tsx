"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { googleAuth } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";
import s from "./login.module.css";

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
    <div className={s.root}>
      <SiteHeader />

      <main className={s.main}>
        <div className={s.card}>
          <div className={s.eyebrow}>
            <span className={s.eyebrowDot} /> welcome to atlaso
          </div>
          <h1 className={s.h1}>welcome back</h1>
          <p className={s.sub}>Sign in to build your travel photobook. Free until you order.</p>

          <div className={s.googleWrap}>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => alert("Sign-in failed. Please try again.")}
              size="large"
              shape="pill"
              text="continue_with"
              width="300"
            />
          </div>

          <div className={s.secure}>🔒 Secure sign-in with Google</div>

          <ul className={s.points}>
            <li className={s.point}><span className={s.pointIcon}>✓</span> Your photobook designs itself in minutes</li>
            <li className={s.point}><span className={s.pointIcon}>✓</span> Free to preview, pay only if you love it</li>
            <li className={s.point}><span className={s.pointIcon}>✓</span> Hardbound, printed and shipped across India</li>
          </ul>

          <p className={s.terms}>
            By continuing, you agree to our{" "}
            <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
