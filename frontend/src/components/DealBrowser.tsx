"use client";

import type { DealWithId } from "@/lib/types";

function formatStrk(wei: bigint): string {
  const strk = Number(wei) / 1e18;
  return strk >= 1 ? strk.toFixed(1) : strk.toFixed(3);
}

interface DealBrowserProps {
  deals: DealWithId[];
  loading: boolean;
  selectedId: number;
  onSelect: (id: number) => void;
  walletConnected: boolean;
  onCreateClick: () => void;
}

export default function DealBrowser({
  deals,
  loading,
  selectedId,
  onSelect,
  walletConnected,
  onCreateClick,
}: DealBrowserProps) {
  if (loading) {
    return (
      <div className="mb-5 flex gap-3 overflow-x-auto pb-2 sla-scroll">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="sla-skeleton shrink-0 rounded-lg"
            style={{ width: "140px", height: "72px" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-5 flex gap-3 overflow-x-auto pb-2 sla-scroll">
      {deals.map((deal) => {
        const isSelected = deal.dealId === selectedId;
        const status = deal.is_slashed
          ? "Slashed"
          : deal.is_active
            ? "Active"
            : "Complete";
        const pillClass = deal.is_slashed
          ? "sla-status-pill-danger"
          : deal.is_active
            ? "sla-status-pill-active"
            : "sla-status-pill-completed";

        return (
          <button
            key={deal.dealId}
            onClick={() => onSelect(deal.dealId)}
            className="sla-card shrink-0 text-left transition-all"
            style={{
              padding: "0.75rem 1rem",
              width: "148px",
              cursor: "pointer",
              borderColor: isSelected
                ? "var(--sla-accent)"
                : "var(--sla-border)",
              boxShadow: isSelected
                ? "var(--sla-shadow-glow-accent)"
                : undefined,
            }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span
                className="font-mono text-xs font-bold"
                style={{ color: "var(--sla-text-primary)" }}
              >
                #{deal.dealId}
              </span>
              <span className={`sla-status-pill ${pillClass}`}>{status}</span>
            </div>
            <div
              className="font-mono text-xs"
              style={{ color: "var(--sla-text-muted)" }}
            >
              {formatStrk(deal.total_amount)} STRK
            </div>
          </button>
        );
      })}

      {/* Create Deal button — only visible when wallet connected */}
      {walletConnected && (
        <button
          onClick={onCreateClick}
          className="shrink-0 flex items-center justify-center rounded-xl border-2 border-dashed transition-colors"
          style={{
            width: "148px",
            height: "72px",
            borderColor: "var(--sla-border)",
            color: "var(--sla-text-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--sla-accent)";
            e.currentTarget.style.color = "var(--sla-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--sla-border)";
            e.currentTarget.style.color = "var(--sla-text-muted)";
          }}
        >
          <span className="text-sm font-medium">+ Create Deal</span>
        </button>
      )}

      {/* Empty state */}
      {deals.length === 0 && !walletConnected && (
        <div
          className="flex items-center rounded-xl px-4 py-3"
          style={{
            background: "var(--sla-bg-tertiary)",
            color: "var(--sla-text-muted)",
          }}
        >
          <span className="font-serif-italic text-sm">
            No deals found. Connect a wallet to create one.
          </span>
        </div>
      )}
    </div>
  );
}
