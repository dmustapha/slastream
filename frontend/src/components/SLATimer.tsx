"use client";

import { useEffect, useState } from "react";

const WARNING_THRESHOLD = 3600;
const CRITICAL_THRESHOLD = 300;

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function getTimerState(seconds: number): {
  color: string;
  bgTint: string;
  pulseClass: string;
  label: string;
} {
  if (seconds <= 0) {
    return {
      color: "var(--sla-danger)",
      bgTint: "rgba(255,59,92,0.06)",
      pulseClass: "sla-pulse",
      label: "Deadline expired",
    };
  }
  if (seconds <= CRITICAL_THRESHOLD) {
    return {
      color: "var(--sla-danger)",
      bgTint: "rgba(255,59,92,0.05)",
      pulseClass: "sla-pulse",
      label: "Critical — auto-slash imminent",
    };
  }
  if (seconds <= WARNING_THRESHOLD) {
    return {
      color: "var(--sla-warning)",
      bgTint: "rgba(255,176,32,0.04)",
      pulseClass: "sla-pulse",
      label: "Warning — less than 1 hour",
    };
  }
  return {
    color: "var(--sla-text-primary)",
    bgTint: "transparent",
    pulseClass: "",
    label: "Auto-slash triggers at expiry",
  };
}

interface SLATimerProps {
  deadline: number;
  loading: boolean;
}

export default function SLATimer({ deadline, loading }: SLATimerProps) {
  const [remaining, setRemaining] = useState(() => {
    if (!deadline) return 0;
    return Math.max(0, deadline - Math.floor(Date.now() / 1000));
  });

  useEffect(() => {
    if (!deadline) return;
    setRemaining(Math.max(0, deadline - Math.floor(Date.now() / 1000)));
    const interval = setInterval(() => {
      setRemaining(Math.max(0, deadline - Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (loading) {
    return (
      <div className="sla-card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="sla-skeleton mb-2" style={{ width: "100px", height: "13px" }} />
        <div className="sla-skeleton mb-2" style={{ width: "160px", height: "48px" }} />
        <div className="sla-skeleton" style={{ width: "180px", height: "12px" }} />
      </div>
    );
  }

  const state = getTimerState(remaining);

  return (
    <div
      className="sla-card"
      style={{ padding: "1.25rem 1.5rem", background: state.bgTint !== "transparent" ? state.bgTint : undefined }}
    >
      {/* Label row */}
      <div
        className="mb-2 flex items-center justify-between"
      >
        <span
          className="font-mono text-[0.7rem] font-medium uppercase"
          style={{ color: "var(--sla-text-muted)", letterSpacing: "0.1em" }}
        >
          SLA Deadline
        </span>
        {remaining <= CRITICAL_THRESHOLD && remaining > 0 && (
          <span className="sla-pill sla-pill-danger">Critical</span>
        )}
        {remaining <= WARNING_THRESHOLD && remaining > CRITICAL_THRESHOLD && (
          <span className="sla-pill sla-pill-warning">Warning</span>
        )}
        {remaining <= 0 && (
          <span className="sla-pill sla-pill-danger">Expired</span>
        )}
      </div>

      {/* Timer */}
      <div
        className={`font-mono font-bold tracking-tight ${state.pulseClass}`}
        style={{
          fontSize: "clamp(2rem, 4vw, 2.75rem)",
          color: state.color,
          letterSpacing: "-0.02em",
          lineHeight: "1",
          marginBottom: "0.5rem",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {remaining <= 0 ? "EXPIRED" : formatTime(remaining)}
      </div>

      {/* Subtext */}
      <p
        className="font-serif-italic text-xs"
        style={{ color: "var(--sla-text-muted)" }}
      >
        {state.label}
      </p>
    </div>
  );
}
