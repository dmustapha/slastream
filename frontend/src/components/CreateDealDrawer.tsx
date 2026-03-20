"use client";

import { useState, useEffect } from "react";
import { CallData, cairo } from "starknet";
import type { AccountInterface } from "starknet";
import { useTransaction } from "@/hooks/useTransaction";
import { STRK_TOKEN_ADDRESS } from "@/lib/constants";
import { SLA_ESCROW_ADDRESS } from "@/lib/starknet";
import TransactionStatus from "./TransactionStatus";
import ChainPipeline from "./ChainPipeline";

interface CreateDealDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountInterface | null;
  onSuccess: () => void;
}

function validateHexAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(addr);
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Parameters", "Review", "Transaction"];
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sla-wiz-review-row">
      <span className="sla-wiz-review-label">{label}</span>
      <span className="sla-wiz-review-value">{value}</span>
    </div>
  );
}

export default function CreateDealDrawer({
  isOpen,
  onClose,
  account,
  onSuccess,
}: CreateDealDrawerProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [spAddress, setSpAddress] = useState("");
  const numChunks = "2"; // Default: 2 proof checkpoints per deal
  const [chunkAmount, setChunkAmount] = useState("");
  const [collateral, setCollateral] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { state, txHash, error, execute, reset } = useTransaction(account);

  const chunkAmountWei = BigInt(
    Math.floor(parseFloat(chunkAmount || "0") * 1e18),
  );
  const collateralWei = BigInt(
    Math.floor(parseFloat(collateral || "0") * 1e18),
  );
  const totalWei =
    chunkAmountWei * BigInt(parseInt(numChunks || "0", 10)) + collateralWei;
  const totalStrk = Number(totalWei) / 1e18;

  // Reset step when drawer closes
  useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => setStep(1), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Auto-close on confirmed
  useEffect(() => {
    if (state === "confirmed") {
      const timeout = setTimeout(() => {
        onSuccess();
        reset();
        onClose();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [state, onSuccess, reset, onClose]);

  function validate(): boolean {
    if (!validateHexAddress(spAddress)) {
      setValidationError("Invalid SP address (must be 0x + hex)");
      return false;
    }
    if (!parseFloat(chunkAmount) || parseFloat(chunkAmount) <= 0) {
      setValidationError("Chunk amount must be positive");
      return false;
    }
    if (!parseFloat(collateral) || parseFloat(collateral) <= 0) {
      setValidationError("Collateral must be positive");
      return false;
    }
    const hours = parseFloat(durationHours);
    if (!hours || hours <= 0) {
      setValidationError("Duration must be positive");
      return false;
    }
    setValidationError(null);
    return true;
  }

  function handleNext() {
    if (!validate()) return;
    setStep(2);
  }

  async function handleCreate() {
    setStep(3);

    if (!SLA_ESCROW_ADDRESS) {
      console.error("[SLAStream] FATAL: SLA_ESCROW_ADDRESS is empty!");
      return;
    }

    const durationSecs = Math.floor(parseFloat(durationHours) * 3600);

    console.log("[SLAStream] Creating deal:", {
      escrow: SLA_ESCROW_ADDRESS,
      strk: STRK_TOKEN_ADDRESS,
      sp: spAddress,
      numChunks,
      chunkAmountWei: chunkAmountWei.toString(),
      collateralWei: collateralWei.toString(),
      totalWei: totalWei.toString(),
      durationSecs,
    });

    const calls = [
      {
        contractAddress: STRK_TOKEN_ADDRESS,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: SLA_ESCROW_ADDRESS,
          amount: cairo.uint256(totalWei),
        }),
      },
      {
        contractAddress: SLA_ESCROW_ADDRESS,
        entrypoint: "create_deal",
        calldata: CallData.compile({
          sp: spAddress,
          num_chunks: cairo.felt(parseInt(numChunks, 10)),
          chunk_amount: cairo.uint256(chunkAmountWei),
          collateral: cairo.uint256(collateralWei),
          sla_duration_secs: cairo.felt(durationSecs),
        }),
      },
    ];

    await execute(calls);
  }

  function truncateAddress(addr: string): string {
    if (addr.length <= 14) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
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
          <h2
            className="font-bold"
            style={{ fontSize: "1.125rem", color: "var(--sla-text-primary)" }}
          >
            Create Deal
          </h2>
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
            {/* Panel 1: Parameters */}
            <div className="sla-wiz-panel">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="sla-input-label">
                    Provider
                  </label>
                  <div className="sla-wiz-input-wrap">
                    <input
                      type="text"
                      className="sla-input font-mono"
                      placeholder="0x..."
                      value={spAddress}
                      onChange={(e) => setSpAddress(e.target.value)}
                    />
                  </div>
                  <p className="sla-wiz-helper">
                    Paste the SP's Starknet address
                  </p>
                </div>

                <div>
                  <label className="sla-input-label">Payment per proof</label>
                  <div className="sla-wiz-input-wrap">
                    <input
                      type="number"
                      className="sla-input"
                      placeholder="0.1"
                      step="any"
                      min="0"
                      value={chunkAmount}
                      onChange={(e) => setChunkAmount(e.target.value)}
                      style={{ paddingRight: "3.5rem" }}
                    />
                    <span className="sla-wiz-input-suffix">STRK</span>
                  </div>
                  <p className="sla-wiz-helper">
                    Amount released to the SP for each verified proof
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="sla-input-label">Collateral</label>
                    <div className="sla-wiz-input-wrap">
                      <input
                        type="number"
                        className="sla-input"
                        placeholder="1.0"
                        step="any"
                        min="0"
                        value={collateral}
                        onChange={(e) => setCollateral(e.target.value)}
                        style={{ paddingRight: "3.5rem" }}
                      />
                      <span className="sla-wiz-input-suffix">STRK</span>
                    </div>
                    <p className="sla-wiz-helper">
                      SP forfeits this if they miss the deadline
                    </p>
                  </div>
                  <div>
                    <label className="sla-input-label">Storage period</label>
                    <input
                      type="number"
                      className="sla-input"
                      placeholder="24"
                      step="any"
                      min="0"
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                    />
                    <p className="sla-wiz-helper">
                      Hours the SP must store your data
                    </p>
                  </div>
                </div>

                {validationError && (
                  <div
                    className="text-xs"
                    style={{ color: "var(--sla-danger)" }}
                  >
                    {validationError}
                  </div>
                )}

                <button
                  className="sla-btn-primary w-full justify-center"
                  onClick={handleNext}
                >
                  Next: Review
                </button>
              </div>
            </div>

            {/* Panel 2: Review */}
            <div className="sla-wiz-panel">
              <div
                style={{
                  fontSize: "0.82rem",
                  lineHeight: 1.7,
                  color: "var(--sla-text-secondary)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "var(--sla-bg-tertiary)",
                  border: "1px solid var(--sla-border-subtle)",
                  marginBottom: "1rem",
                }}
              >
                You're paying{" "}
                <strong style={{ color: "var(--sla-text-primary)" }}>
                  {(parseFloat(chunkAmount || "0") * parseInt(numChunks || "0", 10)).toFixed(2)} STRK
                </strong>{" "}
                for {numChunks} storage proofs over{" "}
                <strong style={{ color: "var(--sla-text-primary)" }}>
                  {durationHours || "0"} hours
                </strong>
                . The SP stakes{" "}
                <strong style={{ color: "var(--sla-text-primary)" }}>
                  {collateral || "0"} STRK
                </strong>{" "}
                as collateral.
              </div>

              <div className="sla-wiz-review">
                <ReviewRow
                  label="Provider"
                  value={truncateAddress(spAddress)}
                />
                <ReviewRow
                  label="Proof checkpoints"
                  value={numChunks}
                />
                <ReviewRow
                  label="Payment per proof"
                  value={`${chunkAmount || "0"} STRK`}
                />
                <ReviewRow
                  label="Collateral"
                  value={`${collateral || "0"} STRK`}
                />
                <ReviewRow
                  label="Storage period"
                  value={`${durationHours || "0"} hours`}
                />
              </div>

              <div className="sla-wiz-total">
                <span className="sla-wiz-total-label">Total Required</span>
                <span className="sla-wiz-total-value">
                  {totalStrk.toFixed(4)} STRK
                </span>
              </div>

              <div className="sla-wiz-actions">
                <button
                  className="sla-wiz-back"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  className="sla-btn-primary"
                  style={{ flex: 2 }}
                  onClick={handleCreate}
                >
                  Approve &amp; Create Deal
                </button>
              </div>
            </div>

            {/* Panel 3: Transaction */}
            <div className="sla-wiz-panel">
              <div className="flex flex-col gap-4">
                <ChainPipeline activeStep={3} />
                <TransactionStatus
                  state={state}
                  txHash={txHash}
                  error={error}
                  onRetry={reset}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
