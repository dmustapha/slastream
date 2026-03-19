"use client";

import { useEffect, useRef } from "react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  onDismiss: (id: string) => void;
}

const ICON_SIZE = 16;

function SuccessIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="var(--sla-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="var(--sla-danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="var(--sla-filecoin)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

const ICON_MAP: Record<ToastType, () => React.ReactElement> = {
  success: SuccessIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

const COLOR_MAP: Record<ToastType, string> = {
  success: "var(--sla-success)",
  error: "var(--sla-danger)",
  info: "var(--sla-filecoin)",
};

export default function Toast({ id, message, type, duration, onDismiss }: ToastProps) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICON_MAP[type];
  const accentColor = COLOR_MAP[type];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.animate(
      [{ transform: "translateX(100%)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
      { duration: 300, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
    );
  }, []);

  function handleDismiss() {
    const el = ref.current;
    if (!el) { onDismiss(id); return; }
    el.animate(
      [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(100%)", opacity: 0 }],
      { duration: 200, easing: "ease-in", fill: "forwards" },
    ).onfinish = () => onDismiss(id);
  }

  return (
    <div
      ref={ref}
      role="alert"
      className="sla-toast-root"
      style={{ opacity: 0, transform: "translateX(100%)" }}
    >
      <div className="sla-toast-body">
        <span className="sla-toast-icon"><Icon /></span>
        <p className="sla-toast-message">{message}</p>
        <button className="sla-toast-close" onClick={handleDismiss} aria-label="Dismiss">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div
        className="sla-toast-progress"
        style={{ background: accentColor, animationDuration: `${duration}ms` }}
      />
    </div>
  );
}
