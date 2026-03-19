"use client";

import { useEffect, useRef, useState } from "react";
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

function formatTimeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${Math.max(0, diff)}s ago`;
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

function LiveIndicator() {
  return (
    <span className="sla-live-indicator">
      <span className="sla-live-dot" />
      <span className="sla-live-text">LIVE</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-10"
      style={{ gap: "0.75rem" }}
    >
      <div className="sla-sonar-container">
        <div className="sla-sonar-ring sla-sonar-ring-1" />
        <div className="sla-sonar-ring sla-sonar-ring-2" />
        <div className="sla-sonar-ring sla-sonar-ring-3" />
        <div className="sla-sonar-core" />
      </div>
      <p className="sla-monitoring-text">
        Monitoring chain for proofs...
      </p>
    </div>
  );
}

export default function ProofFeed({ events, loading }: ProofFeedProps) {
  const prevCountRef = useRef(events.length);
  const [newEventCount, setNewEventCount] = useState(0);
  const [, setTick] = useState(0);

  // Refresh relative timestamps every 10s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Detect new events arriving
  useEffect(() => {
    const prevCount = prevCountRef.current;
    const currentCount = events.length;

    if (currentCount > prevCount) {
      setNewEventCount(currentCount - prevCount);
      const timer = setTimeout(() => setNewEventCount(0), 2000);
      prevCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }

    prevCountRef.current = currentCount;
  }, [events.length]);

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
        <div className="flex items-center gap-2.5">
          <h2
            className="font-semibold"
            style={{ fontSize: "0.9375rem", color: "var(--sla-text-primary)" }}
          >
            Proof Verification Log
          </h2>
          {events.length > 0 && <LiveIndicator />}
        </div>
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
        <EmptyState />
      ) : (
        <div
          className="sla-scroll sla-fade-bottom overflow-y-auto"
          style={{ maxHeight: "300px" }}
        >
          {events.map((event, i) => {
            const isNewEvent = newEventCount > 0 && i < newEventCount;

            return (
              <div
                key={`${event.deal_id}-${event.chunk_index}`}
                className="flex items-start gap-3 py-3"
                style={{
                  borderTop: i > 0 ? "1px solid var(--sla-border-subtle)" : "none",
                  opacity: 0,
                  animation: "sla-slide-in-left 0.4s ease-out forwards",
                  animationDelay: `${i * 0.1}s`,
                  boxShadow: isNewEvent
                    ? "0 0 12px 4px var(--sla-accent-glow)"
                    : "none",
                  transition: "box-shadow 2s ease-out",
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
                        {event.timestamp ? formatTimeAgo(event.timestamp) : "Pending..."}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
