"use client";

import { useState, useEffect } from "react";
import { useFilecoinWallet } from "@/hooks/useFilecoinWallet";
import { callAddRoots } from "@/lib/filecoin";

interface SPSimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTxHash: (hash: string) => void;
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Connect", "Configure", "Status"];
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
              {isComplete ? "✓" : n}
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [proofSetId, setProofSetId] = useState("1");
  const [rootCIDs, setRootCIDs] = useState(
    "0xdeadbeef00000000000000000000000000000000000000000000000000000000",
  );
  const [txHash, setTxHash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const { address, isCorrectChain, connecting, error: walletError, connect, switchChain } =
    useFilecoinWallet();

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

  async function handleSubmit() {
    setTxError(null);

    const parsedId = parseInt(proofSetId, 10);
    if (isNaN(parsedId) || parsedId < 0) {
      setTxError("Proof Set ID must be a non-negative integer");
      return;
    }

    const cids = rootCIDs.split("\n").map((s) => s.trim()).filter(Boolean);
    const invalidCid = cids.find((c) => !/^0x[0-9a-fA-F]{1,64}$/.test(c));
    if (invalidCid) {
      setTxError(`Invalid CID: "${invalidCid.slice(0, 20)}…" — must be 0x + up to 64 hex chars`);
      return;
    }
    if (cids.length === 0) {
      setTxError("Enter at least one root CID");
      return;
    }

    setSubmitting(true);
    try {
      const hash = await callAddRoots(parsedId, cids);
      setTxHash(hash);
      setStep(3);
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
              style={{ fontSize: "1.125rem", color: "var(--sla-text-primary)" }}
            >
              Submit SP Proof
            </h2>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--sla-text-muted)",
                marginTop: "0.2rem",
              }}
            >
              Trigger Filecoin PDP → Relay → Starknet pipeline
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
            {/* Panel 1: Connect */}
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
                    ? "Filecoin Calibration (314159)"
                    : address
                      ? "Wrong network — switch required"
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
                  <div style={{ fontSize: "0.75rem", color: "var(--sla-danger)" }}>
                    {walletError}
                  </div>
                )}

                {!address ? (
                  <button
                    className="sla-sp-connect-btn"
                    onClick={connect}
                    disabled={connecting}
                  >
                    {connecting ? "Connecting…" : "Connect MetaMask"}
                  </button>
                ) : !isCorrectChain ? (
                  <button className="sla-btn-primary w-full justify-center" onClick={switchChain}>
                    Switch to Filecoin Calibration
                  </button>
                ) : (
                  <button
                    className="sla-btn-primary w-full justify-center"
                    onClick={() => setStep(2)}
                  >
                    Next: Configure Proof
                  </button>
                )}

                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--sla-text-muted)",
                    lineHeight: 1.6,
                  }}
                >
                  This calls <code style={{ fontFamily: "monospace" }}>addRoots()</code> on the
                  MockPDPVerifier contract on Filecoin Calibration. The relay will detect the
                  RootsAdded event and trigger chunk release on Starknet.
                </div>
              </div>
            </div>

            {/* Panel 2: Configure */}
            <div className="sla-wiz-panel">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="sla-input-label">Proof Set ID</label>
                  <input
                    type="number"
                    className="sla-input"
                    placeholder="1"
                    min="0"
                    value={proofSetId}
                    onChange={(e) => setProofSetId(e.target.value)}
                  />
                  <p className="sla-wiz-helper">
                    The proofSetId registered with the PDPVerifier contract
                  </p>
                </div>

                <div>
                  <label className="sla-input-label">Root CIDs (one per line)</label>
                  <textarea
                    className="sla-sp-roots-textarea"
                    rows={4}
                    value={rootCIDs}
                    onChange={(e) => setRootCIDs(e.target.value)}
                    placeholder="0xdeadbeef..."
                    spellCheck={false}
                  />
                  <p className="sla-wiz-helper">
                    bytes32 values — padded to 64 hex chars (without 0x) automatically
                  </p>
                </div>

                {txError && (
                  <div style={{ fontSize: "0.75rem", color: "var(--sla-danger)" }}>
                    {txError}
                  </div>
                )}

                <div className="sla-wiz-actions">
                  <button className="sla-wiz-back" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button
                    className="sla-btn-primary"
                    style={{ flex: 2 }}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting…" : "Submit addRoots()"}
                  </button>
                </div>
              </div>
            </div>

            {/* Panel 3: Status */}
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
                      <span style={{ color: "var(--sla-accent)", fontSize: "1.1rem" }}>✓</span>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "var(--sla-accent)",
                        }}
                      >
                        Transaction confirmed
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
                        TX Hash
                      </div>
                      <a
                        className="sla-sp-tx-link"
                        href={`https://calibration.filfox.info/en/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {txHash.slice(0, 18)}…{txHash.slice(-6)}
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
                        Relay watching…
                      </div>
                      <div style={{ fontSize: "0.72rem", lineHeight: 1.6 }}>
                        The relay polls Filecoin every ~30s for RootsAdded events. It will
                        sign and broadcast <code style={{ fontFamily: "monospace" }}>release_chunk</code> on
                        Starknet within one poll interval.
                      </div>
                    </div>
                  </>
                )}

                <button className="sla-btn-primary w-full justify-center" onClick={onClose}>
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
