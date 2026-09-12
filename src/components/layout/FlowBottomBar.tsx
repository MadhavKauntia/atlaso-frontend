"use client";

interface FlowBottomBarProps {
  leftContent?: React.ReactNode;
  rightButton: React.ReactNode;
}

export default function FlowBottomBar({ leftContent, rightButton }: FlowBottomBarProps) {
  return (
    <div
      className="flow-bottom-bar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--sb-bg-deep)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        borderTop: "1px solid #3d3833",
        zIndex: 10,
      }}
    >
      <div style={{ fontSize: 13, color: "var(--sb-muted-2)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
        {leftContent}
      </div>
      <div>{rightButton}</div>
    </div>
  );
}
