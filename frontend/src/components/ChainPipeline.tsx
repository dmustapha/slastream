interface ChainPipelineProps {
  activeStep: number;
}

const steps = [
  {
    name: "Filecoin",
    role: "PDP Proof",
    network: "Calibration",
    color: "var(--sla-filecoin)",
    rawColor: "rgba(0,144,255",
    bgColor: "rgba(0,144,255,0.10)",
    borderColor: "rgba(0,144,255,0.25)",
    icon: "⬡",
  },
  {
    name: "Lit Protocol",
    role: "Oracle Bridge",
    network: "Chr. Yellowstone",
    color: "var(--sla-lit)",
    rawColor: "rgba(155,89,255",
    bgColor: "rgba(155,89,255,0.10)",
    borderColor: "rgba(155,89,255,0.25)",
    icon: "◈",
  },
  {
    name: "Starknet",
    role: "Cairo Escrow",
    network: "Sepolia",
    color: "var(--sla-starknet)",
    rawColor: "rgba(236,121,107",
    bgColor: "rgba(236,121,107,0.10)",
    borderColor: "rgba(236,121,107,0.25)",
    icon: "◆",
  },
];

const DOT_COUNT = 3;
const DOT_DURATION_S = 2;
const DOT_STAGGER_S = DOT_DURATION_S / DOT_COUNT;

function FlowingDots({ destinationColor }: { destinationColor: string }) {
  return (
    <div className="sla-connector-dots">
      {Array.from({ length: DOT_COUNT }, (_, j) => (
        <span
          key={j}
          className="sla-flow-dot"
          style={{
            background: destinationColor,
            animationDelay: `${j * DOT_STAGGER_S}s`,
          }}
        />
      ))}
    </div>
  );
}

function CheckmarkBadge() {
  return (
    <span className="sla-checkmark-badge">
      <svg
        width="10"
        height="10"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 8.5L6.5 12L13 4"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function ChainPipeline({ activeStep }: ChainPipelineProps) {
  return (
    <div className="sla-card" style={{ padding: "1.25rem 1.5rem" }}>
      <h2
        className="mb-4 font-semibold"
        style={{ fontSize: "0.875rem", color: "var(--sla-text-primary)" }}
      >
        Pipeline Status
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {steps.map((step, i) => {
          const isActive = i < activeStep;
          const isCurrent = i === activeStep - 1;
          const isCompleted = i < activeStep - 1;
          const isFuture = i >= activeStep;
          const segmentActive = i < activeStep - 1;

          return (
            <div key={step.name}>
              {/* Step row */}
              <div
                className="flex items-center gap-3 py-2.5"
                style={{
                  borderTop:
                    i > 0 ? "1px solid var(--sla-border-subtle)" : "none",
                  opacity: isFuture ? 0.4 : 1,
                  transition: "opacity 0.4s ease",
                }}
              >
                {/* Icon */}
                <div
                  className="relative flex shrink-0 items-center justify-center rounded-lg"
                  style={{
                    width: "36px",
                    height: "36px",
                    background: isActive ? step.bgColor : "var(--sla-bg-tertiary)",
                    border: `1px solid ${isActive ? step.borderColor : "var(--sla-border-subtle)"}`,
                    color: isActive ? step.color : "var(--sla-text-muted)",
                    fontSize: "0.9rem",
                    transform: isCurrent ? "scale(1.08)" : "scale(1.0)",
                    transition: "all 0.3s var(--sla-ease-smooth)",
                  }}
                >
                  {step.icon}
                  {/* Pulse ring on current active step */}
                  {isCurrent && (
                    <span
                      className="sla-pulse-ring"
                      style={{ borderColor: step.color }}
                    />
                  )}
                  {/* Checkmark badge on completed steps */}
                  {isCompleted && <CheckmarkBadge />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold text-xs"
                    style={{
                      color: isActive
                        ? "var(--sla-text-primary)"
                        : "var(--sla-text-muted)",
                    }}
                  >
                    {step.name}
                  </div>
                  <div
                    className="font-serif-italic text-[0.7rem]"
                    style={{ color: "var(--sla-text-muted)" }}
                  >
                    {step.role}
                  </div>
                  <div
                    className="font-mono text-[0.6rem] mt-0.5"
                    style={{
                      color: "var(--sla-text-muted)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {step.network}
                  </div>
                </div>

                {/* Status */}
                {isCompleted ? (
                  <span className="sla-pill sla-pill-active">Done</span>
                ) : isCurrent ? (
                  <span className="sla-pill sla-pill-active">Active</span>
                ) : (
                  <span className="sla-pill sla-pill-warning">Pending</span>
                )}
              </div>

              {/* Connector line between steps */}
              {i < steps.length - 1 && (
                <div className="sla-connector-wrapper">
                  <div
                    className="sla-connector-line"
                    style={{
                      background: segmentActive
                        ? `linear-gradient(180deg, ${step.color}, ${steps[i + 1].color})`
                        : "var(--sla-border-subtle)",
                      opacity: segmentActive ? 0.5 : 0.3,
                    }}
                  />
                  {segmentActive && (
                    <FlowingDots destinationColor={steps[i + 1].color} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
