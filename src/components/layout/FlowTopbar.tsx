"use client";

import Link from "next/link";

interface FlowTopbarProps {
  currentStep: 1 | 2 | 3 | 4;
  rightSlot?: React.ReactNode;
}

const STEPS = [
  { num: 1, label: "Upload" },
  { num: 2, label: "Design cover" },
  { num: 3, label: "Preview" },
  { num: 4, label: "Order" },
];

export default function FlowTopbar({ currentStep, rightSlot }: FlowTopbarProps) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "24px 48px",
      borderBottom: "1px solid rgba(10,26,58,0.08)",
      background: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}>
      <Link href="/" style={{
        fontFamily: "var(--font-fraunces), serif",
        fontWeight: 800,
        fontSize: 22,
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "var(--ink)",
        textDecoration: "none",
      }}>
        <span style={{ width: 9, height: 9, background: "var(--blue)", borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
        Atlaso
      </Link>

      <div style={{ display: "flex", gap: 32, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em" }}>
        {STEPS.map((step) => {
          const done = step.num < currentStep;
          const active = step.num === currentStep;
          return (
            <div key={step.num} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: done ? "var(--ink)" : active ? "var(--blue)" : "rgba(10,26,58,0.4)",
            }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "1px solid currentColor",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 500,
                background: done ? "var(--ink)" : active ? "var(--blue)" : "transparent",
                color: done || active ? "white" : "currentColor",
                flexShrink: 0,
              }}>
                {done ? "✓" : step.num}
              </div>
              {step.label}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{rightSlot}</div>
    </div>
  );
}
