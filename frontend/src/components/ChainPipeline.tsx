interface ChainPipelineProps {
  activeStep: number;
}

const steps = [
  {
    name: "Filecoin",
    role: "PDP Proof",
    network: "Calibration",
    color: "var(--sla-filecoin)",
    bgColor: "rgba(0,144,255,0.10)",
    borderColor: "rgba(0,144,255,0.25)",
    icon: "⬡",
  },
  {
    name: "Lit Protocol",
    role: "Oracle Bridge",
    network: "Chr. Yellowstone",
    color: "var(--sla-lit)",
    bgColor: "rgba(155,89,255,0.10)",
    borderColor: "rgba(155,89,255,0.25)",
    icon: "◈",
  },
  {
    name: "Starknet",
    role: "Cairo Escrow",
    network: "Sepolia",
    color: "var(--sla-starknet)",
    bgColor: "rgba(236,121,107,0.10)",
    borderColor: "rgba(236,121,107,0.25)",
    icon: "◆",
  },
];

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

          return (
            <div key={step.name}>
              {/* Step row */}
              <div
                className="flex items-center gap-3 py-2.5"
                style={{
                  borderTop: i > 0 ? "1px solid var(--sla-border-subtle)" : "none",
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
                    opacity: isActive ? 1 : 0.5,
                    transition: "all 0.3s var(--sla-ease-smooth)",
                  }}
                >
                  {step.icon}
                  {/* Pulse ring on current active step */}
                  {isCurrent && (
                    <span
                      className="absolute inset-[-3px] rounded-[10px] border"
                      style={{
                        borderColor: step.color,
                        animation: "sla-node-pulse 2.4s ease-in-out infinite",
                        opacity: 0,
                      }}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold text-xs"
                    style={{
                      color: isActive ? "var(--sla-text-primary)" : "var(--sla-text-muted)",
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
                    style={{ color: "var(--sla-text-muted)", letterSpacing: "0.05em" }}
                  >
                    {step.network}
                  </div>
                </div>

                {/* Status */}
                {isActive ? (
                  <span className="sla-pill sla-pill-active">Active</span>
                ) : (
                  <span className="sla-pill sla-pill-warning">Pending</span>
                )}
              </div>

              {/* Connector line between steps */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    marginLeft: "18px",
                    width: "2px",
                    height: "8px",
                    background: isActive
                      ? `linear-gradient(180deg, ${step.color}, ${steps[i + 1].color})`
                      : "var(--sla-border-subtle)",
                    opacity: isActive ? 0.4 : 0.3,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
