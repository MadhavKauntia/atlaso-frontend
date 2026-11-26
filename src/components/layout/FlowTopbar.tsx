"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useOptionalUploadSession } from "@/components/upload/UploadSession";

interface FlowTopbarProps {
  currentStep: 1 | 2 | 3 | 4;
  rightSlot?: React.ReactNode;
}

const STEPS = [
  { num: 1, label: "cover" },
  { num: 2, label: "photos" },
  { num: 3, label: "preview" },
  { num: 4, label: "order" },
];

export default function FlowTopbar({ currentStep, rightSlot }: FlowTopbarProps) {
  // Leaving the cover/photo steps through the logo is an in-app navigation, so the
  // browser's reload/close warning never fires. Ask here instead while photos upload.
  const uploadSession = useOptionalUploadSession();
  const router = useRouter();
  const [askLeave, setAskLeave] = useState(false);
  const guardLeave = (e: React.MouseEvent) => {
    if (!uploadSession?.uploading) return;
    e.preventDefault();
    e.stopPropagation();
    setAskLeave(true);
  };
  return (
    <div
      className="flow-topbar"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        borderBottom: "1px solid #ece5d8",
        background: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <span onClickCapture={guardLeave} style={{ display: "inline-flex" }}>
        <Brand height={26} />
      </span>
      <ConfirmDialog
        open={askLeave}
        title="Photos still uploading"
        message="If you leave now, photos that haven't finished won't be saved to this book."
        confirmLabel="leave anyway"
        cancelLabel="stay"
        onConfirm={() => { setAskLeave(false); router.push("/"); }}
        onCancel={() => setAskLeave(false)}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 1.6vw, 18px)", flexWrap: "wrap" }}>
        {STEPS.map((step) => {
          const done = step.num < currentStep;
          const active = step.num === currentStep;
          return (
            <div key={step.num} style={{ display: "flex", alignItems: "center", gap: 9, opacity: done || active ? 1 : 0.5 }}>
              <span
                style={{
                  flex: "none",
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  background: active ? "var(--sb-gold)" : done ? "var(--sb-green)" : "#ece5d8",
                  color: active ? "var(--sb-ink)" : done ? "#ffffff" : "#8a7f6f",
                }}
              >
                {done ? "✓" : step.num}
              </span>
              <span
                className="flow-step-label"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: active ? "#262220" : "#8a7f6f",
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 13, color: "#8a7f6f", fontFamily: "var(--font-dm-sans), sans-serif" }}>{rightSlot}</div>
    </div>
  );
}
