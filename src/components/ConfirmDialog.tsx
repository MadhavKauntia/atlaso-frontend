"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import s from "./confirmDialog.module.css";

interface Props {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** red confirm button, for deleting and other things that can't be undone */
  danger?: boolean;
  /** the confirm action is running (button shows busyLabel and the dialog can't be dismissed) */
  busy?: boolean;
  busyLabel?: string;
  /** shown under the message, e.g. when the action failed */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Our own confirmation dialog, in place of the browser's confirm(). Cancel is focused
 * first (the safe choice), Esc and clicking outside cancel, focus returns afterwards.
 */
export default function ConfirmDialog({
  open, title, message, confirmLabel, cancelLabel = "cancel", danger, busy, busyLabel, error, onConfirm, onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(busy);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  const cancelCb = useRef(onCancel);
  useEffect(() => { cancelCb.current = onCancel; }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) cancelCb.current();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={s.overlay} onClick={() => { if (!busy) onCancel(); }}>
      <div
        className={s.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        {danger && (
          <span className={s.icon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </span>
        )}
        <h2 id="confirm-title" className={s.title}>{title}</h2>
        <div id="confirm-message" className={s.message}>{message}</div>
        {error && <p className={s.error} role="alert">{error}</p>}
        <div className={s.actions}>
          <button ref={cancelRef} type="button" className={s.cancel} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className={`${s.confirm} ${danger ? s.danger : ""}`} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel ?? confirmLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
