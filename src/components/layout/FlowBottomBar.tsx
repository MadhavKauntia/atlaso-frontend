"use client";

interface FlowBottomBarProps {
  leftContent?: React.ReactNode;
  rightButton: React.ReactNode;
}

export default function FlowBottomBar({ leftContent, rightButton }: FlowBottomBarProps) {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "#ffffff",
      padding: "20px 48px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: "1px solid rgba(10,26,58,0.08)",
      zIndex: 10,
    }}>
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{leftContent}</div>
      <div>{rightButton}</div>
    </div>
  );
}
