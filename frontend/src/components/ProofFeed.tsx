import type { ChunkReleasedEvent } from "@/lib/types";

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return hash.slice(0, 8) + "..." + hash.slice(-6);
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatStrk(wei: bigint): string {
  const strk = Number(wei) / 1e18;
  if (strk >= 1) return "+" + strk.toFixed(2) + " STRK";
  return "+" + strk.toFixed(4) + " STRK";
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface ProofFeedProps {
  events: ChunkReleasedEvent[];
  loading: boolean;
}

function SkeletonRow() {
  return (
    <div
      className="flex items-start gap-3 py-3"
      style={{ borderTop: "1px solid var(--sla-border-subtle)" }}
    >
      <div
        className="sla-skeleton mt-1 shrink-0 rounded-full"
        style={{ width: "8px", height: "8px" }}
      />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between gap-2">
          <div className="sla-skeleton" style={{ width: "120px", height: "13px" }} />
          <div className="sla-skeleton" style={{ width: "50px", height: "13px" }} />
        </div>
        <div className="sla-skeleton" style={{ width: "160px", height: "12px" }} />
        <div className="sla-skeleton" style={{ width: "100px", height: "12px" }} />
      </div>
    </div>
  );
}

export default function ProofFeed({ events, loading }: ProofFeedProps) {
  if (loading) {
    return (
      <div className="sla-card" style={{ padding: "1.5rem" }}>
        <div className="sla-skeleton mb-5" style={{ width: "160px", height: "15px" }} />
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sla-card" style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="font-semibold"
          style={{ fontSize: "0.9375rem", color: "var(--sla-text-primary)" }}
        >
          Proof Verification Log
        </h2>
        {events.length > 0 && (
          <span
            className="font-mono rounded px-2 py-0.5 text-xs"
            style={{
              background: "rgba(0,230,160,0.1)",
              color: "var(--sla-success)",
              border: "1px solid rgba(0,230,160,0.15)",
            }}
          >
            {events.length} verified
          </span>
        )}
      </div>

      {events.length === 0 ? (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center py-10"
          style={{ gap: "0.75rem" }}
        >
          <div
            className="sla-pulse flex items-center justify-center rounded-full"
            style={{
              width: "40px",
              height: "40px",
              background: "var(--sla-accent-muted)",
              border: "1px solid var(--sla-border-accent)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--sla-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p
            className="font-serif-italic text-sm"
            style={{ color: "var(--sla-text-muted)" }}
          >
            Waiting for proof events...
          </p>
        </div>
      ) : (
        <div
          className="sla-scroll sla-fade-bottom overflow-y-auto"
          style={{ maxHeight: "300px" }}
        >
          {events.map((event, i) => (
            <div
              key={`${event.deal_id}-${event.chunk_index}`}
              className="flex items-start gap-3 py-3"
              style={{
                borderTop: i > 0 ? "1px solid var(--sla-border-subtle)" : "none",
              }}
            >
              {/* Status dot */}
              <span
                className="sla-pulse mt-[5px] inline-block shrink-0 rounded-full"
                style={{
                  width: "6px",
                  height: "6px",
                  background: "var(--sla-success)",
                }}
              />

              <div className="min-w-0 flex-1">
                {/* Top row: event + amount + time */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className="font-semibold text-sm"
                      style={{ color: "var(--sla-text-primary)" }}
                    >
                      ChunkReleased
                    </span>
                    <span
                      className="font-mono ml-1.5 text-xs"
                      style={{ color: "var(--sla-text-muted)" }}
                    >
                      #{event.chunk_index}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span
                      className="font-mono text-xs font-semibold"
                      style={{ color: "var(--sla-mint)" }}
                    >
                      {formatStrk(event.amount)}
                    </span>
                    <span
                      className="font-mono text-[0.65rem]"
                      style={{ color: "var(--sla-text-muted)" }}
                    >
                      {event.timestamp ? timeAgo(event.timestamp) : ""}
                    </span>
                  </div>
                </div>

                {/* SP address */}
                <div
                  className="font-mono mt-1 text-xs"
                  style={{ color: "var(--sla-text-secondary)" }}
                >
                  <span style={{ color: "var(--sla-text-muted)" }}>to </span>
                  {truncateAddress(event.sp)}
                </div>

                {/* TX hash — links to explorer */}
                <div
                  className="font-mono mt-0.5 text-[0.65rem]"
                  style={{ color: "var(--sla-text-muted)" }}
                >
                  tx:{" "}
                  <a
                    href={`https://sepolia.starkscan.co/tx/${event.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sla-explorer-link"
                  >
                    {truncateHash(event.transaction_hash)}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
