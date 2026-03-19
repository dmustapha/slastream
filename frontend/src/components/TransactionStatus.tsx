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
}: TransactionStatusProps) {
  if (state === "idle") return null;

  const starkscanUrl = txHash ? `${STARKSCAN_BASE}/tx/${txHash}` : null;

  if (state === "pending") {
    return (
      <div
        className="sla-tx-status"
        style={{ "--sla-tx-accent": "var(--sla-accent)" } as React.CSSProperties}
      >
        <div className="sla-spinner" />
        <div className="sla-tx-status-text">
          <span className="sla-tx-status-label">Waiting for wallet</span>
          <span className="sla-tx-status-sub">Approve in your wallet extension</span>
        </div>
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div
        className="sla-tx-status"
        style={{ "--sla-tx-accent": "var(--sla-accent)" } as React.CSSProperties}
      >
        <div className="sla-spinner" />
        <div className="sla-tx-status-text">
          <span className="sla-tx-status-label">Confirming on Starknet</span>
          {starkscanUrl ? (
            <a
              href={starkscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sla-explorer-link font-mono"
              style={{ fontSize: "0.7rem" }}
            >
              {txHash!.slice(0, 8)}...{txHash!.slice(-6)} ↗
            </a>
          ) : (
            <span className="sla-tx-status-sub">Waiting for block inclusion</span>
          )}
        </div>
      </div>
    );
  }

  if (state === "confirmed") {
    return (
      <div
        className="sla-tx-status sla-tx-status-success"
        style={{ "--sla-tx-accent": "var(--sla-success)" } as React.CSSProperties}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--sla-success)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <div className="sla-tx-status-text">
          <span className="sla-tx-status-label" style={{ color: "var(--sla-success)" }}>
            Transaction confirmed
          </span>
          {starkscanUrl && (
            <a
              href={starkscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sla-explorer-link font-mono"
              style={{ fontSize: "0.7rem" }}
            >
              {txHash!.slice(0, 8)}...{txHash!.slice(-6)} ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  // failed
  return (
    <div
      className="sla-tx-status sla-tx-status-error"
      style={{ "--sla-tx-accent": "var(--sla-danger)" } as React.CSSProperties}
    >
      <svg
        width="20"
        height="20"
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
      <div className="sla-tx-status-text">
        <span className="sla-tx-status-label" style={{ color: "var(--sla-danger)" }}>
          {error ?? "Transaction failed"}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="sla-tx-retry"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
