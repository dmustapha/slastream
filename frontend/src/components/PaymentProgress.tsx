interface PaymentProgressProps {
  chunksReleased: number;
  numChunks: number;
  chunkAmount: bigint;
  loading: boolean;
}

function formatStrk(wei: bigint): string {
  const strk = Number(wei) / 1e18;
  if (strk >= 1) return strk.toFixed(2);
  return strk.toFixed(4);
}

export default function PaymentProgress({
  chunksReleased,
  numChunks,
  chunkAmount,
  loading,
}: PaymentProgressProps) {
  if (loading) {
    return (
      <div className="sla-card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="sla-skeleton" style={{ width: "130px", height: "13px" }} />
          <div className="sla-skeleton" style={{ width: "90px", height: "13px" }} />
        </div>
        <div className="sla-skeleton" style={{ width: "100%", height: "8px", borderRadius: "99px" }} />
        <div className="sla-skeleton mt-2" style={{ width: "140px", height: "12px" }} />
      </div>
    );
  }

  const paid = chunkAmount * BigInt(chunksReleased);
  const total = chunkAmount * BigInt(numChunks);
  const percent = numChunks > 0 ? (chunksReleased / numChunks) * 100 : 0;

  return (
    <div className="sla-card" style={{ padding: "1.25rem 1.5rem" }}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2
          className="font-semibold"
          style={{ fontSize: "0.875rem", color: "var(--sla-text-primary)" }}
        >
          Payment Progress
        </h2>
        <span
          className="font-mono text-xs"
          style={{ color: "var(--sla-text-secondary)" }}
        >
          {formatStrk(paid)} / {formatStrk(total)} STRK
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="relative overflow-hidden"
        style={{
          height: "8px",
          borderRadius: "99px",
          background: "var(--sla-bg-tertiary)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${percent}%`,
            background: "var(--sla-gradient-progress)",
            borderRadius: "99px",
            transition: "width 0.6s var(--sla-ease-out)",
            boxShadow: percent > 0 ? "0 0 8px rgba(0,230,160,0.3)" : "none",
          }}
        />
      </div>

      {/* Footer */}
      <div
        className="mt-2 flex items-center justify-between"
        style={{ fontSize: "0.75rem", color: "var(--sla-text-muted)" }}
      >
        <span>
          <span className="font-mono" style={{ color: "var(--sla-text-secondary)" }}>
            {chunksReleased}
          </span>
          {" of "}
          <span className="font-mono" style={{ color: "var(--sla-text-secondary)" }}>
            {numChunks}
          </span>
          {" chunks verified"}
        </span>
        <span className="font-mono" style={{ color: "var(--sla-mint)" }}>
          {percent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
