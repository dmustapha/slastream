import type { Deal } from "@/lib/types";
import type { AccountInterface } from "starknet";
import { CallData, uint256 } from "starknet";
import { SLA_ESCROW_ADDRESS } from "@/lib/starknet";
import { useTransaction } from "@/hooks/useTransaction";
import TransactionStatus from "./TransactionStatus";

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatStrk(wei: bigint): string {
  const strk = Number(wei) / 1e18;
  if (strk >= 1) return strk.toFixed(2) + " STRK";
  return strk.toFixed(4) + " STRK";
}

function formatDeadline(ts: number): string {
  if (!ts) return "N/A";
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  if (diff <= 0) return "Expired";
  if (diff < 3600) return `in ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `in ${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  return new Date(ts * 1000).toLocaleDateString();
}

interface DealCardProps {
  deal: Deal | null;
  dealId: number;
  loading: boolean;
  walletConnected?: boolean;
  account?: AccountInterface | null;
  onSlashSuccess?: () => void;
}

function Skeleton() {
  return (
    <div
      className="sla-card"
      style={{ padding: "1.5rem" }}
    >
      {/* Header skeleton */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="sla-skeleton" style={{ width: "80px", height: "20px" }} />
          <div className="sla-skeleton" style={{ width: "40px", height: "20px" }} />
        </div>
        <div className="sla-skeleton" style={{ width: "60px", height: "20px" }} />
      </div>
      {/* Row skeletons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.65rem 0",
              borderTop: i > 0 ? "1px solid var(--sla-border-subtle)" : "none",
            }}
          >
            <div className="sla-skeleton" style={{ width: `${60 + (i % 3) * 20}px`, height: "14px" }} />
            <div className="sla-skeleton" style={{ width: `${80 + (i % 4) * 15}px`, height: "14px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlashButton({
  dealId,
  account,
  onSuccess,
}: {
  dealId: number;
  account: AccountInterface;
  onSuccess?: () => void;
}) {
  const { state, txHash, error, execute, reset } = useTransaction(account);

  async function handleSlash() {
    await execute({
      contractAddress: SLA_ESCROW_ADDRESS,
      entrypoint: "slash",
      calldata: CallData.compile({
        deal_id: uint256.bnToUint256(dealId),
      }),
    });
    onSuccess?.();
  }

  if (state === "confirmed") {
    return (
      <TransactionStatus state={state} txHash={txHash} compact />
    );
  }

  return (
    <div>
      {state === "idle" && (
        <button
          onClick={handleSlash}
          className="sla-btn-danger text-xs"
        >
          Slash Deal
        </button>
      )}
      <TransactionStatus
        state={state}
        txHash={txHash}
        error={error}
        onRetry={reset}
        compact
      />
    </div>
  );
}

export default function DealCard({
  deal,
  dealId,
  loading,
  walletConnected,
  account,
  onSlashSuccess,
}: DealCardProps) {
  if (loading || !deal) return <Skeleton />;

  const status = deal.is_slashed ? "SLASHED" : deal.is_active ? "ACTIVE" : "COMPLETED";

  const statusPillClass = deal.is_slashed
    ? "sla-pill sla-pill-danger"
    : deal.is_active
      ? "sla-pill sla-pill-active"
      : "sla-pill sla-pill-completed";

  const nowSecs = Math.floor(Date.now() / 1000);
  const canSlash =
    walletConnected &&
    account &&
    deal.is_active &&
    !deal.is_slashed &&
    deal.sla_deadline < nowSecs;

  const dealRows: Array<{ label: string; value: string; mono?: boolean; accent?: boolean }> = [
    { label: "Client", value: truncateAddress(deal.client), mono: true },
    { label: "Storage Provider", value: truncateAddress(deal.sp), mono: true },
    { label: "Amount Locked", value: formatStrk(deal.total_amount + deal.collateral), mono: true, accent: true },
    { label: "Per-chunk Rate", value: formatStrk(deal.chunk_amount), mono: true },
    { label: "Chunks Released", value: `${deal.chunks_released} / ${deal.num_chunks}`, mono: true },
    { label: "SLA Deadline", value: formatDeadline(deal.sla_deadline) },
    { label: "Collateral", value: formatStrk(deal.collateral), mono: true },
    { label: "Network", value: "Starknet Sepolia" },
  ];

  return (
    <div
      className="sla-card"
      style={{ padding: "1.5rem" }}
    >
      {/* Card header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2
            className="font-semibold"
            style={{ fontSize: "0.9375rem", color: "var(--sla-text-primary)" }}
          >
            Active Deal
          </h2>
          <span
            className="font-mono rounded px-2 py-0.5 text-xs"
            style={{
              background: "var(--sla-bg-tertiary)",
              color: "var(--sla-text-secondary)",
            }}
          >
            #{dealId}
          </span>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          {deal.is_active && (
            <span
              className="sla-pulse inline-block rounded-full"
              style={{
                width: "6px",
                height: "6px",
                background: "var(--sla-success)",
              }}
            />
          )}
          <span className={statusPillClass}>{status}</span>
        </div>
      </div>

      {/* Data rows */}
      <div>
        {dealRows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-[0.6rem]"
            style={{
              borderTop: i > 0 ? "1px solid var(--sla-border-subtle)" : "none",
            }}
          >
            <span
              className="text-sm"
              style={{ color: "var(--sla-text-muted)" }}
            >
              {row.label}
            </span>
            <span
              className={row.mono ? "font-mono" : ""}
              style={{
                fontSize: "0.8125rem",
                color: row.accent ? "var(--sla-mint)" : "var(--sla-text-primary)",
                fontWeight: row.accent ? "600" : undefined,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Slash button — only when eligible */}
      {canSlash && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: "1px solid var(--sla-border-subtle)" }}
        >
          <SlashButton
            dealId={dealId}
            account={account!}
            onSuccess={onSlashSuccess}
          />
        </div>
      )}
    </div>
  );
}
