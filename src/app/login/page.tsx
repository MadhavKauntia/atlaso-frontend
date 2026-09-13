"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import Brand from "@/components/Brand";
import { googleAuth } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";
import s from "./login.module.css";

const SHELF = [
  { src: "/assets/covers/keepsake-italy.jpg", tf: "rotate(-7deg) translateY(34px)", z: 1, ml: 0 },
  { src: "/assets/covers/keepsake-bali.jpg", tf: "rotate(-1deg) translateY(16px)", z: 3, ml: -34 },
  { src: "/assets/covers/keepsake-japan.jpg", tf: "rotate(6deg) translateY(34px)", z: 2, ml: -34 },
];

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
      {/* Left showcase */}
      <div className={s.showcase}>
        <div className={s.showcaseTop}>
          <div className={s.eyebrow}>
            <span className={s.eyebrowDot} /> welcome to atlaso
          </div>
          <h1 className={s.showcaseTitle}>
            Your trip, <em>bound</em> into a keepsake.
          </h1>
          <p className={s.showcaseSub}>
            Drop in your photos and pick a cover. Your photobook designs itself in minutes. You
            review; we print and ship it across India.
          </p>
          <ul className={s.points}>
            <li className={s.point}><span className={s.pointIcon}>✓</span> Designed automatically in minutes</li>
            <li className={s.point}><span className={s.pointIcon}>✓</span> Free to preview, pay only if you love it</li>
            <li className={s.point}><span className={s.pointIcon}>✓</span> Hardbound, printed and shipped across India</li>
          </ul>
        </div>
        <div className={s.shelf}>
          {SHELF.map((b, i) => (
            <div key={i} className={s.shelfBook} style={{ transform: b.tf, zIndex: b.z, marginLeft: b.ml }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt="" />
            </div>
          ))}
        </div>
      </div>

      {/* Right sign-in card */}
      <div className={s.panel}>
        <div className={s.card}>
          <div className={s.logoWrap}>
            <Brand dark height={30} href="/" />
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

          <div className={s.trust}>🔒 Secure sign-in with Google</div>

          <p className={s.terms}>
            By continuing, you agree to our{" "}
            <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
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
