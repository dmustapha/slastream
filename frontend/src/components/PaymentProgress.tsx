"use client";

import { useEffect, useRef, useState } from "react";

interface PaymentProgressProps {
  chunksReleased: number;
  numChunks: number;
  chunkAmount: bigint;
  loading?: boolean;
}

const VIEWBOX = 160;
const CENTER = 80;
const RADIUS = 60;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatStrk(wei: bigint): string {
  const strk = Number(wei) / 1e18;
  if (strk >= 1) return strk.toFixed(2);
  return strk.toFixed(4);
}

function getTickPosition(index: number, total: number): { cx: number; cy: number } {
  const angle = (index / total) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    cx: CENTER + RADIUS * Math.cos(rad),
    cy: CENTER + RADIUS * Math.sin(rad),
  };
}

type RingState = "active" | "complete" | "slashed" | "empty";

function deriveRingState(released: number, total: number): RingState {
  if (total === 0) return "empty";
  if (released >= total) return "complete";
  if (released === 0) return "empty";
  return "active";
}

function ringStrokeVar(state: RingState): string {
  switch (state) {
    case "complete":
      return "var(--sla-success)";
    case "slashed":
      return "var(--sla-danger)";
    default:
      return "var(--sla-accent)";
  }
}

function LoadingSkeleton() {
  return (
    <div className="sla-ring-container">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="sla-ring-svg sla-ring-pulse"
        role="img"
        aria-label="Loading payment progress"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--sla-border)"
          strokeWidth={STROKE_WIDTH}
        />
      </svg>
    </div>
  );
}

function ProgressRing({
  chunksReleased,
  numChunks,
  chunkAmount,
}: Omit<PaymentProgressProps, "loading">) {
  const progressRef = useRef<SVGCircleElement>(null);
  const [mounted, setMounted] = useState(false);

  const progress = numChunks > 0 ? chunksReleased / numChunks : 0;
  const percent = Math.round(progress * 100);
  const state = deriveRingState(chunksReleased, numChunks);
  const dashoffset = CIRCUMFERENCE * (1 - progress);
  const strokeColor = ringStrokeVar(state);

  const paid = chunkAmount * BigInt(chunksReleased);
  const total = chunkAmount * BigInt(numChunks);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const isComplete = state === "complete";
  const isEmpty = numChunks === 0;

  return (
    <div className="sla-ring-container">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="sla-ring-svg"
        role="img"
        aria-label={`Payment progress: ${chunksReleased} of ${numChunks} chunks released, ${percent}%`}
      >
        {/* Glow filter for complete state */}
        <defs>
          <filter id="sla-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--sla-border)"
          strokeWidth={STROKE_WIDTH}
        />

        {/* Progress ring */}
        {numChunks > 0 && (
          <circle
            ref={progressRef}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={mounted ? dashoffset : CIRCUMFERENCE}
            className="sla-ring-progress"
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
            filter={isComplete ? "url(#sla-ring-glow)" : undefined}
          />
        )}

        {/* Chunk tick marks */}
        {numChunks > 0 &&
          Array.from({ length: numChunks }, (_, i) => {
            const { cx, cy } = getTickPosition(i, numChunks);
            const isReleased = i < chunksReleased;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={3}
                fill={isReleased ? "var(--sla-accent)" : "var(--sla-border)"}
                className="sla-ring-tick"
              />
            );
          })}

        {/* Center text */}
        {isEmpty ? (
          <text
            x={CENTER}
            y={CENTER + 4}
            textAnchor="middle"
            fill="var(--sla-text-muted)"
            fontSize="14"
            fontFamily="var(--font-jetbrains-mono, monospace)"
          >
            No chunks
          </text>
        ) : (
          <>
            <text
              x={CENTER}
              y={CENTER - 4}
              textAnchor="middle"
              fill="var(--sla-text-primary)"
              fontSize="22"
              fontWeight="600"
              fontFamily="var(--font-jetbrains-mono, monospace)"
            >
              {chunksReleased}/{numChunks}
            </text>
            <text
              x={CENTER}
              y={CENTER + 18}
              textAnchor="middle"
              fill="var(--sla-text-secondary)"
              fontSize="13"
              fontFamily="var(--font-jetbrains-mono, monospace)"
            >
              {percent}%
            </text>
          </>
        )}
      </svg>

      {/* Amount summary below ring */}
      <div className="sla-ring-summary">
        <span className="sla-ring-paid">{formatStrk(paid)} STRK</span>
        <span className="sla-ring-total">of {formatStrk(total)} STRK</span>
      </div>
    </div>
  );
}

export default function PaymentProgress({
  chunksReleased,
  numChunks,
  chunkAmount,
  loading,
}: PaymentProgressProps) {
  if (loading) return <LoadingSkeleton />;

  return (
    <ProgressRing
      chunksReleased={chunksReleased}
      numChunks={numChunks}
      chunkAmount={chunkAmount}
    />
  );
}
