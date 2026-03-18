"use client";

import { useState } from "react";
import { CallData, cairo } from "starknet";
import type { AccountInterface } from "starknet";
import { useTransaction } from "@/hooks/useTransaction";
import { STRK_TOKEN_ADDRESS } from "@/lib/constants";
import { SLA_ESCROW_ADDRESS } from "@/lib/starknet";
import TransactionStatus from "./TransactionStatus";

interface CreateDealDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountInterface | null;
  onSuccess: () => void;
}

function validateHexAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(addr);
}

export default function CreateDealDrawer({
  isOpen,
  onClose,
  account,
  onSuccess,
}: CreateDealDrawerProps) {
  const [spAddress, setSpAddress] = useState("");
  const [numChunks, setNumChunks] = useState("");
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

  function validate(): boolean {
    if (!validateHexAddress(spAddress)) {
      setValidationError("Invalid SP address (must be 0x + hex)");
      return false;
    }
    const chunks = parseInt(numChunks, 10);
    if (!chunks || chunks <= 0) {
      setValidationError("Number of chunks must be positive");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const durationSecs = Math.floor(parseFloat(durationHours) * 3600);

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

  // Auto-close on confirmed
  if (state === "confirmed") {
    setTimeout(() => {
      onSuccess();
      reset();
      onClose();
    }, 1500);
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="sla-input-label">Storage Provider Address</label>
            <input
              type="text"
              className="sla-input font-mono"
              placeholder="0x..."
              value={spAddress}
              onChange={(e) => setSpAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sla-input-label">Chunks</label>
              <input
                type="number"
                className="sla-input"
                placeholder="10"
                min="1"
                value={numChunks}
                onChange={(e) => setNumChunks(e.target.value)}
              />
            </div>
            <div>
              <label className="sla-input-label">Per Chunk (STRK)</label>
              <input
                type="number"
                className="sla-input"
                placeholder="0.1"
                step="any"
                min="0"
                value={chunkAmount}
                onChange={(e) => setChunkAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sla-input-label">Collateral (STRK)</label>
              <input
                type="number"
                className="sla-input"
                placeholder="1.0"
                step="any"
                min="0"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
              />
            </div>
            <div>
              <label className="sla-input-label">Duration (hours)</label>
              <input
                type="number"
                className="sla-input"
                placeholder="24"
                step="any"
                min="0"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
              />
            </div>
          </div>

          {/* Total display */}
          {totalStrk > 0 && (
            <div
              className="rounded-lg px-3 py-2.5"
              style={{
                background: "var(--sla-mint-muted)",
                border: "1px solid rgba(0,255,209,0.2)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: "var(--sla-text-secondary)" }}
                >
                  Total required
                </span>
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: "var(--sla-mint)" }}
                >
                  {totalStrk.toFixed(4)} STRK
                </span>
              </div>
            </div>
          )}

          {validationError && (
            <div className="text-xs" style={{ color: "var(--sla-danger)" }}>
              {validationError}
            </div>
          )}

          <TransactionStatus
            state={state}
            txHash={txHash}
            error={error}
            onRetry={reset}
          />

          <button
            type="submit"
            className="sla-btn-primary w-full justify-center"
            disabled={state === "pending" || state === "confirming"}
            style={{
              opacity: state === "pending" || state === "confirming" ? 0.6 : 1,
            }}
          >
            {state === "pending" || state === "confirming"
              ? "Processing…"
              : "Approve & Create Deal"}
          </button>
        </form>
      </div>
    </>
  );
}
