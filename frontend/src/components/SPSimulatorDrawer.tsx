"use client";

import { useState, useEffect } from "react";
import { useFilecoinWallet } from "@/hooks/useFilecoinWallet";
import { callAddRoots } from "@/lib/filecoin";

interface SPSimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTxHash: (hash: string) => void;
}

// Auto-filled proof params — SP doesn't need to know these
const DEFAULT_PROOF_SET_ID = 1;
const DEFAULT_ROOT_CID =
  "0xdeadbeef00000000000000000000000000000000000000000000000000000000";

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = ["Connect", "Status"];
  return (
    <div className="sla-wiz-steps">
      {steps.map((label, i) => {
        const n = i + 1;
        const isActive = n === step;
        const isComplete = n < step;
        return (
          <div key={label} className="sla-wiz-step-item">
            {i > 0 && (
              <div
                className={`sla-wiz-step-line ${isComplete ? "sla-wiz-step-line-done" : ""}`}
              />
            )}
            <div
              className={`sla-wiz-step-dot ${isActive ? "sla-wiz-step-dot-active" : ""} ${isComplete ? "sla-wiz-step-dot-done" : ""}`}
            >
              {isComplete ? "\u2713" : n}
            </div>
            <span
              className={`sla-wiz-step-label ${isActive || isComplete ? "sla-wiz-step-label-active" : ""}`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function SPSimulatorDrawer({
  isOpen,
  onClose,
  onTxHash,
}: SPSimulatorDrawerProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const {
    address,
    isCorrectChain,
    connecting,
    error: walletError,
    connect,
    switchChain,
  } = useFilecoinWallet();

  // Reset when drawer closes
  useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setStep(1);
        setTxHash(null);
        setTxError(null);
        setSubmitting(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  async function handleProve() {
    setTxError(null);
    setSubmitting(true);
    try {
      const hash = await callAddRoots(DEFAULT_PROOF_SET_ID, [DEFAULT_ROOT_CID]);
      setTxHash(hash);
      setStep(2);
      onTxHash(hash);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="sla-nav-overlay"
        style={{
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="sla-drawer"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between mb-6"
          style={{
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--sla-border-subtle)",
          }}
        >
          <div>
            <h2
              className="font-bold"
              style={{
                fontSize: "1.125rem",
                color: "var(--sla-text-primary)",
              }}
            >
              Prove Storage
            </h2>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--sla-text-muted)",
                marginTop: "0.2rem",
              }}
            >
              Submit a storage proof to release payment
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: "var(--sla-text-muted)" }}
            className="p-1 transition-colors hover:opacity-80"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <StepIndicator step={step} />

        <div className="sla-wiz-container">
          <div
            className="sla-wiz-track"
            style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
          >
            {/* Panel 1: Connect + Prove */}
            <div className="sla-wiz-panel">
              <div className="flex flex-col gap-4">
                {/* Chain badge */}
                <div
                  className="sla-sp-chain-badge"
                  style={{
                    borderColor: isCorrectChain
                      ? "rgba(16,185,129,0.4)"
                      : "rgba(255,176,32,0.4)",
                    background: isCorrectChain
                      ? "rgba(16,185,129,0.08)"
                      : "rgba(255,176,32,0.08)",
                    color: isCorrectChain
                      ? "var(--sla-accent)"
                      : "var(--sla-warning)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: isCorrectChain
                        ? "var(--sla-accent)"
                        : "var(--sla-warning)",
                      display: "inline-block",
                      marginRight: "0.4rem",
                      flexShrink: 0,
                    }}
                  />
                  {isCorrectChain
                    ? "Filecoin Calibration"
                    : address
                      ? "Wrong network"
                      : "Not connected"}
                </div>

                {/* Connected address */}
                {address && (
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--sla-text-secondary)",
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      background: "var(--sla-bg-tertiary)",
                      border: "1px solid var(--sla-border-subtle)",
                    }}
                  >
                    {truncateAddress(address)}
                  </div>
                )}

                {walletError && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--sla-danger)",
                    }}
                  >
                    {walletError}
                  </div>
                )}

                {txError && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--sla-danger)",
                    }}
                  >
                    {txError}
                  </div>
                )}

                {!address ? (
                  <button
                    className="sla-sp-connect-btn"
                    onClick={connect}
                    disabled={connecting}
                  >
                    {connecting ? "Connecting..." : "Connect Wallet"}
                  </button>
                ) : !isCorrectChain ? (
                  <button
                    className="sla-btn-primary w-full justify-center"
                    onClick={switchChain}
                  >
                    Switch to Filecoin Calibration
                  </button>
                ) : (
                  <button
                    className="sla-btn-primary w-full justify-center"
                    onClick={handleProve}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting proof..." : "Prove Storage"}
                  </button>
                )}

                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--sla-text-muted)",
                    lineHeight: 1.6,
                  }}
                >
                  Submits a cryptographic storage proof on Filecoin. Once
                  verified, the relay automatically releases your payment on
                  Starknet.
                </div>
              </div>
            </div>

            {/* Panel 2: Status */}
            <div className="sla-wiz-panel">
              <div className="flex flex-col gap-4">
                {txHash && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.25)",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--sla-accent)",
                          fontSize: "1.1rem",
                        }}
                      >
                        {"\u2713"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "var(--sla-accent)",
                        }}
                      >
                        Proof submitted
                      </span>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--sla-text-muted)",
                          marginBottom: "0.25rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Filecoin TX
                      </div>
                      <a
                        className="sla-sp-tx-link"
                        href={`https://calibration.filfox.info/en/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {txHash.slice(0, 18)}...{txHash.slice(-6)}
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginLeft: "0.3rem" }}
                        >
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>

                    <div className="sla-sp-relay-note">
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.78rem",
                          marginBottom: "0.3rem",
                          color: "var(--sla-text-primary)",
                        }}
                      >
                        Verifying proof and releasing payment...
                      </div>
                      <div style={{ fontSize: "0.72rem", lineHeight: 1.6 }}>
                        The relay verifies your proof on Filecoin and
                        automatically releases the next chunk payment on
                        Starknet. This typically takes 15-30 seconds.
                      </div>
                    </div>
                  </>
                )}

                <button
                  className="sla-btn-primary w-full justify-center"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
