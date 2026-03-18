"use client";

import { useWalletContext } from "@/providers/WalletProvider";

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return addr.slice(0, 6) + "\u2026" + addr.slice(-4);
}

export default function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } =
    useWalletContext();

  if (isConnecting) {
    return (
      <button
        className="sla-btn-secondary"
        style={{ padding: "0.5rem 1.1rem", fontSize: "0.8125rem" }}
        disabled
      >
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
        Connecting…
      </button>
    );
  }

  if (!isConnected || !address) {
    return (
      <button
        onClick={connect}
        className="sla-btn-secondary"
        style={{
          padding: "0.5rem 1.1rem",
          fontSize: "0.8125rem",
          borderColor: "var(--sla-accent-muted)",
          color: "var(--sla-accent)",
        }}
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 rounded-md px-3 py-1.5"
        style={{
          background: "var(--sla-bg-tertiary)",
          border: "1px solid var(--sla-border)",
        }}
      >
        <span
          className="inline-block rounded-full"
          style={{
            width: "7px",
            height: "7px",
            background: "var(--sla-success)",
            boxShadow: "0 0 6px rgba(0,230,160,0.5)",
            flexShrink: 0,
          }}
        />
        <span
          className="font-mono text-xs"
          style={{ color: "var(--sla-text-primary)" }}
        >
          {truncateAddress(address)}
        </span>
      </div>
      <button
        onClick={disconnect}
        className="rounded-md p-1.5 transition-colors"
        style={{
          color: "var(--sla-text-muted)",
          border: "1px solid var(--sla-border-subtle)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sla-danger)")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--sla-text-muted)")
        }
        title="Disconnect wallet"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
