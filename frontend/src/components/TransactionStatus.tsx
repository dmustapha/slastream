"use client";

import type { TransactionState } from "@/lib/types";
import { STARKSCAN_BASE } from "@/lib/constants";

interface TransactionStatusProps {
  state: TransactionState;
  txHash?: string;
  error?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export default function TransactionStatus({
  state,
  txHash,
  error,
  onRetry,
  compact = false,
}: TransactionStatusProps) {
  if (state === "idle") return null;

  const starkscanUrl = txHash ? `${STARKSCAN_BASE}/tx/${txHash}` : null;

  if (state === "pending") {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "mt-3"}`}>
        <span
          className="sla-pulse inline-block rounded-full"
          style={{ width: "8px", height: "8px", background: "var(--sla-accent)" }}
        />
        <span className="text-xs" style={{ color: "var(--sla-text-secondary)" }}>
          Waiting for wallet…
        </span>
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "mt-3"}`}>
        <span
          className="inline-block animate-spin"
          style={{
            width: "14px",
            height: "14px",
            border: "2px solid var(--sla-border)",
            borderTopColor: "var(--sla-accent)",
            borderRadius: "50%",
          }}
        />
        <span className="text-xs" style={{ color: "var(--sla-text-secondary)" }}>
          Confirming…
        </span>
        {starkscanUrl && (
          <a
            href={starkscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sla-explorer-link font-mono text-[0.65rem]"
          >
            View tx
          </a>
        )}
      </div>
    );
  }

  if (state === "confirmed") {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "mt-3"}`}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--sla-success)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-xs" style={{ color: "var(--sla-success)" }}>
          Confirmed
        </span>
        {starkscanUrl && (
          <a
            href={starkscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sla-explorer-link font-mono text-[0.65rem]"
          >
            View tx
          </a>
        )}
      </div>
    );
  }

  // failed
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mt-3"}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--sla-danger)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      <span className="text-xs" style={{ color: "var(--sla-danger)" }}>
        {error ?? "Failed"}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-medium"
          style={{ color: "var(--sla-accent)" }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
