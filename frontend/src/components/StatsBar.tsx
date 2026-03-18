interface StatsBarProps {
  numChunks: number;
  totalLocked: bigint;
}

function formatStrk(wei: bigint): string {
  const strk = Number(wei) / 1e18;
  if (strk >= 1) return strk.toFixed(2) + " STRK";
  return strk.toFixed(4) + " STRK";
}

export default function StatsBar({ numChunks, totalLocked }: StatsBarProps) {
  return (
    <div className="hidden items-center gap-3 sm:flex">
      {/* Chunks */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5"
        style={{
          background: "var(--sla-bg-card)",
          border: "1px solid var(--sla-border)",
        }}
      >
        <span
          className="font-mono text-xs font-semibold"
          style={{ color: "var(--sla-text-primary)" }}
        >
          {numChunks}
        </span>
        <span
          className="text-[0.6rem] font-medium uppercase tracking-widest"
          style={{ color: "var(--sla-text-muted)" }}
        >
          Chunks
        </span>
      </div>

      {/* Locked STRK */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5"
        style={{
          background: "var(--sla-bg-card)",
          border: "1px solid var(--sla-border)",
        }}
      >
        <span
          className="font-mono text-xs font-semibold"
          style={{ color: "var(--sla-mint)" }}
        >
          {formatStrk(totalLocked)}
        </span>
        <span
          className="text-[0.6rem] font-medium uppercase tracking-widest"
          style={{ color: "var(--sla-text-muted)" }}
        >
          Locked
        </span>
      </div>
    </div>
  );
}
