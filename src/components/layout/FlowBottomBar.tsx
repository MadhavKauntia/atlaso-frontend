"use client";

interface FlowBottomBarProps {
  leftContent?: React.ReactNode;
  rightButton: React.ReactNode;
  /** 0–100 to show a thin loading line across the top edge; null/undefined hides it. */
  progress?: number | null;
}

export default function FlowBottomBar({ leftContent, rightButton, progress }: FlowBottomBarProps) {
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
      {progress != null && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 3,
            width: `${progress}%`,
            background: "var(--sb-gold)",
            transition: "width 0.3s ease",
          }}
        />
      )}
      <div style={{ fontSize: 13, color: "var(--sb-muted-2)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
        {leftContent}
      </div>
      <div>{rightButton}</div>
    </div>
  );
}
