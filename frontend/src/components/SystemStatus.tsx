"use client";

import { useEffect, useState } from "react";
import { checkRpcHealth, SLA_ESCROW_ADDRESS } from "@/lib/starknet";
import { useWalletContext } from "@/providers/WalletProvider";

interface StatusItem {
  name: string;
  status: string;
  ok: boolean;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={ok ? "sla-pulse" : ""}
      style={{
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: ok ? "var(--sla-success)" : "var(--sla-danger)",
        flexShrink: 0,
        boxShadow: ok
          ? "0 0 6px rgba(0,230,160,0.5)"
          : "0 0 6px rgba(255,59,92,0.4)",
      }}
    />
  );
}

function truncateAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function SystemStatus() {
  const { isConnected, address } = useWalletContext();
  const [services, setServices] = useState<StatusItem[]>([
    { name: "Starknet RPC", status: "Checking...", ok: false },
    {
      name: "Contract",
      status: SLA_ESCROW_ADDRESS ? "Configured" : "Not set",
      ok: !!SLA_ESCROW_ADDRESS,
    },
    { name: "Filecoin RPC", status: "Configured", ok: true },
    { name: "Lit Network", status: "Configured", ok: true },
  ]);

  useEffect(() => {
    checkRpcHealth().then((healthy) => {
      setServices((prev) =>
        prev.map((s) =>
          s.name === "Starknet RPC"
            ? { ...s, status: healthy ? "Connected" : "Unreachable", ok: healthy }
            : s,
        ),
      );
    });
  }, []);

  const walletStatus: StatusItem = {
    name: "Wallet",
    status: isConnected && address ? truncateAddr(address) : "Not Connected",
    ok: isConnected,
  };

  const allServices = [...services, walletStatus];
  const allOk = services.every((s) => s.ok);

  return (
    <div className="sla-card" style={{ padding: "1.25rem 1.5rem" }}>
      {/* Header with system health badge */}
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="font-semibold"
          style={{ fontSize: "0.875rem", color: "var(--sla-text-primary)" }}
        >
          System Status
        </h2>
        <span
          className={`sla-pill ${allOk ? "sla-pill-active" : "sla-pill-warning"}`}
        >
          {allOk ? "All Systems" : "Partial"}
        </span>
      </div>

      {/* 2x2 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}
      >
        {allServices.map((svc) => (
          <div
            key={svc.name}
            className="flex items-center gap-2 rounded-lg p-2.5"
            style={{
              background: svc.ok
                ? "rgba(0,230,160,0.05)"
                : "rgba(255,59,92,0.05)",
              border: `1px solid ${svc.ok ? "rgba(0,230,160,0.12)" : "rgba(255,59,92,0.12)"}`,
            }}
          >
            <StatusDot ok={svc.ok} />
            <div className="min-w-0">
              <div
                className="truncate text-xs font-medium"
                style={{ color: "var(--sla-text-secondary)" }}
              >
                {svc.name}
              </div>
              <div
                className="font-mono text-[0.65rem]"
                style={{
                  color: svc.ok ? "var(--sla-success)" : "var(--sla-danger)",
                }}
              >
                {svc.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
