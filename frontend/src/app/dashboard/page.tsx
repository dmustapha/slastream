"use client";

import { useState, useEffect, useRef } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import WalletButton from "@/components/WalletButton";
import CreateDealDrawer from "@/components/CreateDealDrawer";
import SPSimulatorDrawer from "@/components/SPSimulatorDrawer";
import TransactionStatus from "@/components/TransactionStatus";
import PaymentProgress from "@/components/PaymentProgress";
import ChainPipeline from "@/components/ChainPipeline";
import ProofFeed from "@/components/ProofFeed";
import { useDeal } from "@/hooks/useDeal";
import { useDeals } from "@/hooks/useDeals";
import { useProofEvents } from "@/hooks/useProofEvents";
import { useWalletContext } from "@/providers/WalletProvider";
import { useTransaction } from "@/hooks/useTransaction";
import { CallData, cairo } from "starknet";
import { SLA_ESCROW_ADDRESS } from "@/lib/starknet";
import { normalizeAddress } from "@/lib/address";
import type { Deal, DealWithId } from "@/lib/types";

function formatStrk(amount: bigint): string {
  return (Number(amount) / 1e18).toFixed(2);
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function isExpiredUnslashed(deal: Deal): boolean {
  if (!deal.is_active || deal.is_slashed) return false;
  const now = Math.floor(Date.now() / 1000);
  return deal.sla_deadline > 0 && now > deal.sla_deadline;
}

function getStatusBadge(deal: Deal): { label: string; className: string } {
  if (deal.is_slashed)
    return { label: "Slashed", className: "sla-f3-badge-slashed" };
  if (!deal.is_active)
    return { label: "Complete", className: "sla-f3-badge-complete" };
  if (isExpiredUnslashed(deal))
    return { label: "Expired", className: "sla-f3-badge-expired" };
  return { label: "Active", className: "sla-f3-badge-active" };
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDeadlineDate(unixTs: number): string {
  if (!unixTs) return "Unknown";
  const d = new Date(unixTs * 1000);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDeadlineLabel(unixTs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = unixTs - now;
  const date = formatDeadlineDate(unixTs);
  if (remaining > 0) return `${formatTimeRemaining(remaining)} · ${date}`;
  const ago = Math.abs(remaining);
  const days = Math.floor(ago / 86400);
  const hours = Math.floor((ago % 86400) / 3600);
  const agoStr = days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : "just now";
  return `Expired ${agoStr} · ${date}`;
}

function Sidebar({
  deals,
  dealsLoading,
  selectedDealId,
  onSelectDeal,
  walletConnected,
  onCreateClick,
  onSubmitProofClick,
  sidebarOpen,
  perspective,
}: {
  deals: DealWithId[];
  dealsLoading: boolean;
  selectedDealId: number | null;
  onSelectDeal: (id: number) => void;
  walletConnected: boolean;
  onCreateClick: () => void;
  onSubmitProofClick: () => void;
  sidebarOpen: boolean;
  perspective: "client" | "sp";
}) {
  const activeDeals = deals.filter(d => d.is_active && !d.is_slashed && !isExpiredUnslashed(d));
  const historyDeals = deals.filter(d => !d.is_active || d.is_slashed || isExpiredUnslashed(d));

  // Auto-switch to HISTORY when ACTIVE is empty but HISTORY has deals
  const defaultTab = activeDeals.length === 0 && historyDeals.length > 0 ? "history" : "active";
  const [dealFilter, setDealFilter] = useState<"active" | "history">(defaultTab);

  // Re-sync tab when deal counts change (e.g. wallet connects and deals load)
  useEffect(() => {
    if (activeDeals.length === 0 && historyDeals.length > 0 && dealFilter === "active") {
      setDealFilter("history");
    } else if (activeDeals.length > 0 && historyDeals.length === 0 && dealFilter === "history") {
      setDealFilter("active");
    }
  }, [activeDeals.length, historyDeals.length, dealFilter]);

  const visibleDeals = dealFilter === "active" ? activeDeals : historyDeals;

  return (
    <aside
      className={`sla-f3-sidebar ${sidebarOpen ? "sla-f3-sidebar-open" : ""}`}
    >
      <div className="sla-f3-sidebar-logo">
        <span style={{ color: "var(--sla-accent)" }}>SLA</span>Stream
      </div>
      <div className="sla-f3-divider" />

      {/* Active / History toggle */}
      <div style={{ display: "flex", gap: "0.25rem", padding: "0 0.75rem 0.5rem" }}>
        {(["active", "history"] as const).map((tab) => {
          const count = tab === "active" ? activeDeals.length : historyDeals.length;
          return (
            <button
              key={tab}
              onClick={() => setDealFilter(tab)}
              style={{
                flex: 1,
                padding: "0.3rem 0",
                borderRadius: "var(--radius-md, 6px)",
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
                border: "1px solid",
                transition: "all 0.15s",
                borderColor: dealFilter === tab ? "var(--sla-accent)" : "var(--sla-border-subtle)",
                background: dealFilter === tab ? "rgba(0,230,160,0.1)" : "transparent",
                color: dealFilter === tab ? "var(--sla-accent)" : "var(--sla-text-muted)",
              }}
            >
              {tab === "active" ? "Active" : "History"}
              {count > 0 && (
                <span style={{
                  marginLeft: "0.3rem",
                  fontSize: "0.65rem",
                  opacity: 0.7,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sla-f3-deal-list">
        {dealsLoading ? (
          <div style={{ padding: "0.75rem" }}>
            <div className="sla-skeleton sla-shimmer" style={{ height: 44, marginBottom: 4 }} />
            <div className="sla-skeleton sla-shimmer" style={{ height: 44, marginBottom: 4 }} />
            <div className="sla-skeleton sla-shimmer" style={{ height: 44 }} />
          </div>
        ) : visibleDeals.length === 0 ? (
          <div
            style={{
              padding: "1rem 0.75rem",
              fontSize: "0.8rem",
              color: "var(--sla-text-muted)",
            }}
          >
            {dealFilter === "active" ? "No active deals" : "No completed deals"}
          </div>
        ) : (
          visibleDeals.map((d) => {
            const badge = getStatusBadge(d);
            return (
              <button
                key={d.dealId}
                onClick={() => onSelectDeal(d.dealId)}
                className={`sla-f3-deal-item ${
                  d.dealId === selectedDealId ? "sla-f3-deal-item-active" : ""
                }`}
              >
                <div>
                  <div className="sla-f3-deal-name">Deal #{d.dealId}</div>
                </div>
                <div className="sla-f3-deal-meta">
                  <span className={`sla-f3-badge ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="sla-f3-deal-amount">
                    {formatStrk(d.total_amount)} STRK
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {walletConnected && perspective === "client" && (
        <button className="sla-f3-create-deal" onClick={onCreateClick}>
          + Create Deal
        </button>
      )}
      {walletConnected && perspective === "sp" && (
        <button className="sla-f3-create-deal" onClick={onSubmitProofClick}
          style={{ background: "rgba(255,165,0,0.1)", borderColor: "rgba(255,165,0,0.3)", color: "#f5a623" }}>
          Submit SP Proof
        </button>
      )}

      <div className="sla-f3-divider" />

      <div className="sla-f3-system-status">
        <div className="sla-f3-status-dots">
          <span className="sla-f3-status-dot sla-f3-dot-starknet">Starknet</span>
          <span className="sla-f3-status-dot sla-f3-dot-lit">Lit</span>
          <span className="sla-f3-status-dot sla-f3-dot-filecoin">Filecoin</span>
        </div>
        <div className="sla-f3-contract-addr">
          Contract: {truncateAddress(SLA_ESCROW_ADDRESS)}
        </div>
      </div>

      <div className="sla-f3-sidebar-bottom">
        <WalletButton />
        <ThemeToggle />
      </div>
    </aside>
  );
}

function HeroSection({
  deal,
  dealId,
  perspective,
  isFiltering,
}: {
  deal: Deal;
  dealId: number;
  perspective: "client" | "sp";
  isFiltering: boolean;
}) {
  const badge = getStatusBadge(deal);
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, deal.sla_deadline - now);
  const totalValue = deal.total_amount + deal.collateral;

  const heroLabel = isFiltering
    ? perspective === "client" ? "Your Active Deals" : "Your Earning Streams"
    : `Deal #${dealId}`;

  return (
    <div className="sla-f3-hero">
      <div className="sla-f3-hero-label">{heroLabel}</div>
      <h1 className="sla-f3-hero-amount">
        {formatStrk(deal.total_amount)} STRK
      </h1>
      <div className="sla-f3-hero-meta">
        <span className={`sla-f3-badge ${badge.className}`}>{badge.label}</span>
        <span className="sla-f3-hero-sep">&middot;</span>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "0.8rem" }}>
          SP: {truncateAddress(deal.sp)}
        </span>
        <span className="sla-f3-hero-sep">&middot;</span>
        <span>{remaining > 0 ? `${formatTimeRemaining(remaining)} remaining` : "Expired"}</span>
      </div>
      <div className="sla-f3-hero-stats">
        <div>
          <div className="sla-f3-hero-stat-label">Chunks</div>
          <div className="sla-f3-hero-stat-value">
            {deal.chunks_released} / {deal.num_chunks}
          </div>
        </div>
        <div>
          <div className="sla-f3-hero-stat-label">Collateral</div>
          <div className="sla-f3-hero-stat-value">
            {formatStrk(deal.collateral)} STRK
          </div>
        </div>
        <div>
          <div className="sla-f3-hero-stat-label">Deadline</div>
          <div className="sla-f3-hero-stat-value" style={{ fontSize: "0.75rem" }}>
            {formatDeadlineDate(deal.sla_deadline)}
          </div>
        </div>
        <div>
          <div className="sla-f3-hero-stat-label">Total Value</div>
          <div className="sla-f3-hero-stat-value">
            {formatStrk(totalValue)} STRK
          </div>
        </div>
      </div>
    </div>
  );
}

function SLATimerCard({ deal }: { deal: Deal }) {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, deal.sla_deadline - now);
  const isExpired = deal.sla_deadline > 0 && now >= deal.sla_deadline;

  // Chunk completion progress
  const chunkPercent = deal.num_chunks > 0
    ? Math.min(100, Math.round((deal.chunks_released / deal.num_chunks) * 100))
    : 0;

  return (
    <div className="sla-f3-card sla-f3-card-utility sla-f3-grid-full sla-card-lift">
      <h2 className="sla-f3-card-header">SLA Deadline</h2>
      <div style={{ marginBottom: "0.5rem" }}>
        <div style={{
          fontSize: "0.9rem",
          fontWeight: 600,
          color: isExpired ? "var(--sla-danger)" : "var(--sla-text-primary)",
        }}>
          {isExpired ? `Expired` : formatTimeRemaining(remaining)}
        </div>
        <div style={{
          fontSize: "0.75rem",
          color: "var(--sla-text-muted)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          marginTop: "0.15rem",
        }}>
          {formatDeadlineDate(deal.sla_deadline)}
        </div>
      </div>
      <div className="sla-f3-timer-track">
        <div className="sla-f3-timer-fill" style={{ width: `${chunkPercent}%` }} />
      </div>
      <div className="sla-f3-timer-labels">
        <span>Chunks released</span>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          {deal.chunks_released} / {deal.num_chunks} ({chunkPercent}%)
        </span>
      </div>
    </div>
  );
}

function DealDetailsCard({
  deal,
  onSlash,
  slashVisible,
}: {
  deal: Deal;
  onSlash: () => void;
  slashVisible: boolean;
}) {
  const badge = getStatusBadge(deal);
  const totalValue = deal.total_amount + deal.collateral;

  return (
    <div className="sla-f3-card sla-f3-card-primary sla-card-lift">
      <h2 className="sla-f3-card-header">Deal Details</h2>
      <div className="sla-f3-kv-grid">
        <div>
          <div className="sla-f3-kv-label">Client</div>
          <div className="sla-f3-kv-value sla-f3-kv-value-mono">
            {truncateAddress(deal.client)}
          </div>
        </div>
        <div>
          <div className="sla-f3-kv-label">SP</div>
          <div className="sla-f3-kv-value sla-f3-kv-value-mono">
            {truncateAddress(deal.sp)}
          </div>
        </div>
        <div>
          <div className="sla-f3-kv-label">Chunks</div>
          <div className="sla-f3-kv-value sla-f3-kv-value-mono">
            {deal.chunks_released} / {deal.num_chunks}
          </div>
        </div>
        <div>
          <div className="sla-f3-kv-label">Chunk Amount</div>
          <div className="sla-f3-kv-value sla-f3-kv-value-mono">
            {formatStrk(deal.chunk_amount)} STRK
          </div>
        </div>
        <div>
          <div className="sla-f3-kv-label">Collateral</div>
          <div className="sla-f3-kv-value sla-f3-kv-value-mono">
            {formatStrk(deal.collateral)} STRK
          </div>
        </div>
        <div>
          <div className="sla-f3-kv-label">Total Value</div>
          <div className="sla-f3-kv-value sla-f3-kv-value-mono">
            {formatStrk(totalValue)} STRK
          </div>
        </div>
        <div>
          <div className="sla-f3-kv-label">Deadline</div>
          <div className="sla-f3-kv-value sla-f3-kv-value-mono" style={{ fontSize: "0.8rem" }}>
            {formatDeadlineLabel(deal.sla_deadline)}
          </div>
        </div>
        <div>
          <div className="sla-f3-kv-label">Status</div>
          <div className="sla-f3-kv-value">
            <span className={`sla-f3-badge ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>
      {isExpiredUnslashed(deal) && (
        <div style={{
          marginTop: "0.75rem",
          padding: "0.65rem 0.85rem",
          borderRadius: "6px",
          background: "rgba(255,80,80,0.08)",
          border: "1px solid rgba(255,80,80,0.25)",
          fontSize: "0.78rem",
          color: "var(--sla-danger)",
          lineHeight: 1.5,
        }}>
          <strong>SLA deadline passed.</strong> The storage provider released{" "}
          {deal.chunks_released}/{deal.num_chunks} chunks.
          {slashVisible && " Slash to confiscate their collateral."}
        </div>
      )}
      {slashVisible && (
        <button className="sla-f3-slash-btn" onClick={onSlash}>
          Slash Deal
        </button>
      )}
    </div>
  );
}

function PerspectiveToggle({
  perspective,
  onChange,
  disabled,
}: {
  perspective: "client" | "sp";
  onChange: (p: "client" | "sp") => void;
  disabled: boolean;
}) {
  return (
    <div className="sla-f3-perspective-toggle" style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <button
        className={`sla-f3-perspective-btn ${perspective === "client" ? "sla-f3-perspective-active" : ""}`}
        onClick={() => onChange("client")}
      >
        Client
      </button>
      <button
        className={`sla-f3-perspective-btn ${perspective === "sp" ? "sla-f3-perspective-active" : ""}`}
        onClick={() => onChange("sp")}
      >
        SP
      </button>
      <div
        className="sla-f3-perspective-slider"
        style={{ transform: perspective === "sp" ? "translateX(100%)" : "translateX(0)" }}
      />
    </div>
  );
}

function NoPerspectiveDeals({ perspective, onCreateClick }: { perspective: "client" | "sp"; onCreateClick: () => void }) {
  return (
    <div className="sla-f3-empty-state">
      <div className="sla-f3-empty-float">
        <svg className="sla-f3-empty-icon" viewBox="0 0 80 80" fill="none">
          <rect x="8" y="16" width="64" height="48" rx="8" stroke="var(--sla-text-muted)" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="40" cy="40" r="12" stroke="var(--sla-accent)" strokeWidth="2" opacity="0.5" />
          <path d="M36 40h8M40 36v8" stroke="var(--sla-accent)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="sla-f3-empty-title">
        {perspective === "client" ? "No deals created yet" : "No earning streams yet"}
      </div>
      <div className="sla-f3-empty-desc">
        {perspective === "client"
          ? "Create your first deal to start streaming payments to a storage provider."
          : "Deals where you are the storage provider will appear here."}
      </div>
      {perspective === "client" && (
        <button className="sla-f3-empty-cta" onClick={onCreateClick}>
          Create Your First Deal
        </button>
      )}
    </div>
  );
}

function LastUpdated({ lastFetchedAt, error }: { lastFetchedAt: number | null; error: string | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!lastFetchedAt) return null;

  const secsAgo = Math.floor((now - lastFetchedAt) / 1000);
  const statusClass = error
    ? "sla-f3-status-indicator-error"
    : secsAgo > 60
      ? "sla-f3-status-indicator-stale"
      : "";

  return (
    <div className="sla-f3-last-updated">
      <span className={`sla-f3-status-indicator ${statusClass}`} />
      <span>{secsAgo}s ago</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ background: "var(--sla-bg-primary)", minHeight: "100vh" }}>
      <div className="sla-f3-main">
        <div className="sla-f3-hero" style={{ padding: "2rem 1.5rem" }}>
          <div className="sla-skeleton sla-shimmer" style={{ height: 16, width: 80, margin: "0 auto 0.5rem" }} />
          <div className="sla-skeleton sla-shimmer" style={{ height: 48, width: 200, margin: "0 auto 0.5rem" }} />
          <div className="sla-skeleton sla-shimmer" style={{ height: 16, width: 300, margin: "0 auto 1rem" }} />
          <div style={{ display: "flex", justifyContent: "center", gap: "2rem" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sla-skeleton sla-shimmer" style={{ height: 36, width: 80 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [spSimulatorOpen, setSpSimulatorOpen] = useState(false);
  const [pendingFilecoinTxHash, setPendingFilecoinTxHash] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<"client" | "sp">("client");

  const { isConnected, account } = useWalletContext();
  const { deals, loading: dealsLoading, refetch } = useDeals();
  const { deal, loading, error } = useDeal(selectedDealId);
  const { events, loading: eventsLoading, error: eventsError, lastFetchedAt } = useProofEvents(selectedDealId);
  const { state: txState, txHash, error: txError, execute, reset } =
    useTransaction(account);

  const topbarRef = useRef<HTMLDivElement>(null);
  const prevEventCountRef = useRef(events.length);
  const eventCountAtSubmissionRef = useRef(0);

  useEffect(() => {
    if (events.length > prevEventCountRef.current && topbarRef.current) {
      prevEventCountRef.current = events.length;
      topbarRef.current.classList.add("sla-f3-topbar-flash");
      const timer = setTimeout(() => {
        topbarRef.current?.classList.remove("sla-f3-topbar-flash");
      }, 600);
      return () => clearTimeout(timer);
    }
    prevEventCountRef.current = events.length;
  }, [events.length]);

  // Auto-clear pendingFilecoinTxHash once the relay processes the proof (new event appears)
  useEffect(() => {
    if (pendingFilecoinTxHash && events.length > eventCountAtSubmissionRef.current) {
      setPendingFilecoinTxHash(null);
    }
  }, [events.length, pendingFilecoinTxHash]);

  // Clear pendingFilecoinTxHash and reset submission ref on deal switch
  useEffect(() => {
    setPendingFilecoinTxHash(null);
    eventCountAtSubmissionRef.current = 0;
  }, [selectedDealId]);

  const filteredDeals = isConnected && account
    ? deals.filter(d => perspective === "client"
        ? normalizeAddress(d.client) === normalizeAddress(account.address)
        : normalizeAddress(d.sp) === normalizeAddress(account.address))
    : [];

  // Auto-select first active deal (or first deal) when deals load or perspective changes
  useEffect(() => {
    if (filteredDeals.length === 0) return;
    // If current selection is already in the filtered list, keep it
    if (selectedDealId !== null && filteredDeals.some(d => d.dealId === selectedDealId)) return;
    // Pick first active deal, fallback to first deal
    const activeDeal = filteredDeals.find(d => d.is_active && !d.is_slashed && !isExpiredUnslashed(d));
    setSelectedDealId(activeDeal?.dealId ?? filteredDeals[0].dealId);
  }, [filteredDeals, selectedDealId]);

  if (isConnected && account && deals.length > 0 && filteredDeals.length === 0) {
    console.log("[SLAStream] Address filter mismatch:", {
      wallet: account.address,
      walletNorm: normalizeAddress(account.address),
      perspective,
      deals: deals.map(d => ({
        id: d.dealId,
        client: d.client,
        clientNorm: normalizeAddress(d.client),
        sp: d.sp,
        spNorm: normalizeAddress(d.sp),
      })),
    });
  }

  const chainPipelineStep = (() => {
    if (!deal) return 0;
    if (deal.chunks_released >= deal.num_chunks) return 4; // all done — all steps show checkmarks
    if (deal.chunks_released > 0) return 3; // some released — Filecoin+Lit done, Starknet current
    if (pendingFilecoinTxHash) return 0; // proof submitted, relay processing (filecoinTxHash special-cases step 0)
    if (deal.is_active) return 1; // waiting for SP to prove on Filecoin
    return 0;
  })();

  const showConnectWallet = !isConnected;
  const showEmptyState = isConnected && filteredDeals.length === 0 && !dealsLoading;

  function handleSelectDeal(id: number) {
    setSelectedDealId(id);
    setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  async function handleSlash() {
    if (!deal || !account || selectedDealId === null) return;
    console.log("[SLAStream] Slashing deal:", selectedDealId);
    await execute({
      contractAddress: SLA_ESCROW_ADDRESS,
      entrypoint: "slash",
      calldata: CallData.compile({
        deal_id: cairo.uint256(selectedDealId),
      }),
    });
    refetch();
  }

  const now = Math.floor(Date.now() / 1000);
  const slashVisible =
    isConnected &&
    !!deal &&
    deal.is_active &&
    !deal.is_slashed &&
    deal.sla_deadline < now;

  return (
    <div style={{ background: "var(--sla-bg-primary)", minHeight: "100vh" }}>
      <a href="#main-content" className="sla-f3-skip-link">
        Skip to content
      </a>

      {/* Mobile hamburger */}
      <button
        className="sla-f3-hamburger"
        onClick={toggleSidebar}
        aria-label="Toggle navigation"
      >
        <span /><span /><span />
      </button>

      {/* Mobile overlay */}
      <div
        className={`sla-f3-overlay ${sidebarOpen ? "sla-f3-overlay-open" : ""}`}
        onClick={toggleSidebar}
      />

      <Sidebar
        deals={isConnected ? filteredDeals : []}
        dealsLoading={isConnected ? dealsLoading : false}
        selectedDealId={selectedDealId}
        onSelectDeal={handleSelectDeal}
        walletConnected={isConnected}
        onCreateClick={() => setDrawerOpen(true)}
        onSubmitProofClick={() => setSpSimulatorOpen(true)}
        sidebarOpen={sidebarOpen}
        perspective={perspective}
      />

      <div className="sla-f3-topbar" ref={topbarRef}>
        <PerspectiveToggle
          perspective={perspective}
          onChange={setPerspective}
          disabled={!isConnected}
        />
        <LastUpdated lastFetchedAt={lastFetchedAt} error={eventsError} />
      </div>

      <main id="main-content" className="sla-f3-main">
        {showConnectWallet ? (
          <div className="sla-f3-empty-state">
            <div className="sla-f3-empty-float">
              <svg className="sla-f3-empty-icon" viewBox="0 0 80 80" fill="none">
                <rect x="8" y="16" width="64" height="48" rx="8" stroke="var(--sla-text-muted)" strokeWidth="2" strokeDasharray="4 3" />
                <circle cx="40" cy="40" r="12" stroke="var(--sla-accent)" strokeWidth="2" opacity="0.5" />
                <path d="M36 40h8M40 36v8" stroke="var(--sla-accent)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="sla-f3-empty-title">Connect your wallet</div>
            <div className="sla-f3-empty-desc">
              Connect a Starknet wallet to view your deals and start streaming payments.
            </div>
          </div>
        ) : showEmptyState ? (
          <NoPerspectiveDeals perspective={perspective} onCreateClick={() => setDrawerOpen(true)} />
        ) : loading && !deal ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="sla-f3-hero">
            <div
              className="sla-f3-hero-label"
              style={{ color: "var(--sla-danger)" }}
            >
              Failed to load deal
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--sla-text-secondary)",
                marginTop: "0.5rem",
              }}
            >
              {error}
            </div>
          </div>
        ) : deal ? (
          <>
            <HeroSection
              deal={deal}
              dealId={selectedDealId!}
              perspective={perspective}
              isFiltering={isConnected && filteredDeals.length > 0}
            />

            {isConnected && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginBottom: "1rem" }}>
                {perspective === "sp" && (
                  <button
                    className="sla-sp-trigger-btn"
                    onClick={() => setSpSimulatorOpen(true)}
                  >
                    Submit SP Proof
                  </button>
                )}
                {perspective === "client" && (
                  <button
                    className="sla-f3-create-cta"
                    onClick={() => setDrawerOpen(true)}
                  >
                    + Create New Deal
                  </button>
                )}
              </div>
            )}

            <div className="sla-f3-grid">
              <SLATimerCard deal={deal} />

              <DealDetailsCard
                deal={deal}
                onSlash={handleSlash}
                slashVisible={slashVisible}
              />

              <PaymentProgress
                chunksReleased={deal.chunks_released}
                numChunks={deal.num_chunks}
                chunkAmount={deal.chunk_amount}
              />

              <ChainPipeline
                activeStep={chainPipelineStep}
                filecoinTxHash={pendingFilecoinTxHash}
              />

              <ProofFeed events={events} loading={eventsLoading} />
            </div>

            {(txState !== "idle") && (
              <div style={{ marginTop: "1rem" }}>
                <TransactionStatus
                  state={txState}
                  txHash={txHash}
                  error={txError}
                  onRetry={reset}
                />
              </div>
            )}
          </>
        ) : null}
      </main>

      <CreateDealDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        account={account}
        onSuccess={refetch}
      />

      <SPSimulatorDrawer
        isOpen={spSimulatorOpen}
        onClose={() => setSpSimulatorOpen(false)}
        onTxHash={(hash) => {
          eventCountAtSubmissionRef.current = events.length;
          setPendingFilecoinTxHash(hash);
          setTimeout(() => setSpSimulatorOpen(false), 1500);
        }}
      />
    </div>
  );
}
