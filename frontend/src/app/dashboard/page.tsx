"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import WalletButton from "@/components/WalletButton";
import CreateDealDrawer from "@/components/CreateDealDrawer";
import TransactionStatus from "@/components/TransactionStatus";
import { useDeal } from "@/hooks/useDeal";
import { useDeals } from "@/hooks/useDeals";
import { useProofEvents } from "@/hooks/useProofEvents";
import { useWalletContext } from "@/providers/WalletProvider";
import { useTransaction } from "@/hooks/useTransaction";
import { SLA_ESCROW_ADDRESS } from "@/lib/starknet";
import type { Deal, DealWithId } from "@/lib/types";

function formatStrk(amount: bigint): string {
  return (Number(amount) / 1e18).toFixed(2);
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getStatusBadge(deal: Deal): { label: string; className: string } {
  if (deal.is_slashed)
    return { label: "Slashed", className: "sla-f3-badge-slashed" };
  if (!deal.is_active)
    return { label: "Complete", className: "sla-f3-badge-complete" };
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

function formatTimeSince(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function Sidebar({
  deals,
  dealsLoading,
  selectedDealId,
  onSelectDeal,
  walletConnected,
  onCreateClick,
  sidebarOpen,
}: {
  deals: DealWithId[];
  dealsLoading: boolean;
  selectedDealId: number;
  onSelectDeal: (id: number) => void;
  walletConnected: boolean;
  onCreateClick: () => void;
  sidebarOpen: boolean;
}) {
  return (
    <aside
      className={`sla-f3-sidebar ${sidebarOpen ? "sla-f3-sidebar-open" : ""}`}
    >
      <div className="sla-f3-sidebar-logo">
        <span style={{ color: "var(--sla-accent)" }}>SLA</span>Stream
      </div>
      <div className="sla-f3-divider" />

      <div className="sla-f3-section-label">Deals</div>
      <div className="sla-f3-deal-list">
        {dealsLoading ? (
          <div style={{ padding: "0.75rem" }}>
            <div className="sla-skeleton" style={{ height: 44, marginBottom: 4 }} />
            <div className="sla-skeleton" style={{ height: 44, marginBottom: 4 }} />
            <div className="sla-skeleton" style={{ height: 44 }} />
          </div>
        ) : deals.length === 0 ? (
          <div
            style={{
              padding: "1rem 0.75rem",
              fontSize: "0.8rem",
              color: "var(--sla-text-muted)",
            }}
          >
            No deals found
          </div>
        ) : (
          deals.map((d) => {
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

      {walletConnected && (
        <button className="sla-f3-create-deal" onClick={onCreateClick}>
          + Create Deal
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

function HeroSection({ deal, dealId }: { deal: Deal; dealId: number }) {
  const badge = getStatusBadge(deal);
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, deal.sla_deadline - now);
  const totalValue = deal.total_amount + deal.collateral;

  return (
    <div className="sla-f3-hero">
      <div className="sla-f3-hero-label">Deal #{dealId}</div>
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
        <span>{formatTimeRemaining(remaining)} remaining</span>
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
          <div className="sla-f3-hero-stat-value">
            {formatTimeRemaining(remaining)}
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
  const percent = deal.num_chunks > 0
    ? Math.min(100, Math.round((deal.chunks_released / deal.num_chunks) * 100))
    : 0;

  return (
    <div className="sla-f3-card sla-f3-card-utility sla-f3-grid-full">
      <h2 className="sla-f3-card-header">SLA Deadline</h2>
      <div className="sla-f3-timer-track">
        <div className="sla-f3-timer-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="sla-f3-timer-labels">
        <span>{formatTimeRemaining(remaining)} remaining</span>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          {percent}%
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
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, deal.sla_deadline - now);
  const badge = getStatusBadge(deal);
  const totalValue = deal.total_amount + deal.collateral;

  return (
    <div className="sla-f3-card sla-f3-card-primary">
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
          <div className="sla-f3-kv-value sla-f3-kv-value-mono">
            {formatTimeRemaining(remaining)}
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
      {slashVisible && (
        <button className="sla-f3-slash-btn" onClick={onSlash}>
          Slash Deal
        </button>
      )}
    </div>
  );
}

function PaymentProgressCard({ deal }: { deal: Deal }) {
  const released = BigInt(deal.chunks_released) * deal.chunk_amount;

  return (
    <div className="sla-f3-card sla-f3-card-primary">
      <h2 className="sla-f3-card-header">Payment Progress</h2>
      <div className="sla-f3-pay-amount">{formatStrk(released)} STRK</div>
      <div className="sla-f3-pay-total">
        of {formatStrk(deal.total_amount)} STRK total
      </div>
      <div className="sla-f3-pay-chunks">
        {deal.chunks_released} / {deal.num_chunks} chunks
      </div>
      <div className="sla-f3-segments">
        {Array.from({ length: deal.num_chunks }, (_, i) => (
          <div
            key={i}
            className={`sla-f3-segment ${
              i < deal.chunks_released ? "sla-f3-segment-filled" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ChainPipelineCard() {
  return (
    <div className="sla-f3-card sla-f3-card-primary">
      <h2 className="sla-f3-card-header">Chain Pipeline</h2>
      <div className="sla-f3-pipeline">
        <div className="sla-f3-chain-step">
          <div
            className="sla-f3-chain-icon"
            style={{ background: "var(--sla-filecoin)" }}
          >
            F
          </div>
          <div className="sla-f3-chain-name">Filecoin</div>
          <div className="sla-f3-chain-role">Storage</div>
        </div>
        <div className="sla-f3-chain-step">
          <div
            className="sla-f3-chain-icon"
            style={{ background: "var(--sla-lit)" }}
          >
            L
          </div>
          <div className="sla-f3-chain-name">Lit Protocol</div>
          <div className="sla-f3-chain-role">Oracle</div>
        </div>
        <div className="sla-f3-chain-step">
          <div
            className="sla-f3-chain-icon"
            style={{ background: "var(--sla-starknet)" }}
          >
            S
          </div>
          <div className="sla-f3-chain-name">Starknet</div>
          <div className="sla-f3-chain-role">Settlement</div>
        </div>
      </div>
    </div>
  );
}

function ProofFeedCard({
  events,
  eventsLoading,
  chunkAmount,
}: {
  events: { chunk_index: number; transaction_hash: string; timestamp?: number }[];
  eventsLoading: boolean;
  chunkAmount: bigint;
}) {
  return (
    <div className="sla-f3-card sla-f3-card-secondary">
      <h2 className="sla-f3-card-header">
        Proof Feed
        <span className="sla-f3-live-dot">Live</span>
      </h2>
      <div className="sla-f3-proof-list">
        {eventsLoading ? (
          <>
            <div className="sla-skeleton" style={{ height: 32, marginBottom: 8 }} />
            <div className="sla-skeleton" style={{ height: 32, marginBottom: 8 }} />
            <div className="sla-skeleton" style={{ height: 32 }} />
          </>
        ) : events.length === 0 ? (
          <div
            style={{
              padding: "0.6rem 0",
              fontSize: "0.8rem",
              color: "var(--sla-text-muted)",
            }}
          >
            No proofs yet
          </div>
        ) : (
          events.slice(0, 5).map((ev) => (
            <div key={ev.chunk_index} className="sla-f3-proof-item">
              <span className="sla-f3-proof-check">&#10003;</span>
              <span>Chunk #{ev.chunk_index + 1}</span>
              <span className="sla-f3-proof-hash">
                {truncateAddress(ev.transaction_hash)}
              </span>
              <span className="sla-f3-proof-reward">
                +{formatStrk(chunkAmount)} STRK
              </span>
              <span className="sla-f3-proof-time">
                {ev.timestamp ? formatTimeSince(ev.timestamp) : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ background: "var(--sla-bg-primary)", minHeight: "100vh" }}>
      <div className="sla-f3-main">
        <div className="sla-f3-hero" style={{ padding: "2rem 1.5rem" }}>
          <div className="sla-skeleton" style={{ height: 16, width: 80, margin: "0 auto 0.5rem" }} />
          <div className="sla-skeleton" style={{ height: 48, width: 200, margin: "0 auto 0.5rem" }} />
          <div className="sla-skeleton" style={{ height: 16, width: 300, margin: "0 auto 1rem" }} />
          <div style={{ display: "flex", justifyContent: "center", gap: "2rem" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sla-skeleton" style={{ height: 36, width: 80 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedDealId, setSelectedDealId] = useState(
    Number(process.env.NEXT_PUBLIC_DEAL_ID || "1"),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { isConnected, account } = useWalletContext();
  const { deals, loading: dealsLoading, refetch } = useDeals();
  const { deal, loading, error } = useDeal(selectedDealId);
  const { events, loading: eventsLoading } = useProofEvents(selectedDealId);
  const { state: txState, txHash, error: txError, execute, reset } =
    useTransaction(account);

  function handleSelectDeal(id: number) {
    setSelectedDealId(id);
    setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  async function handleSlash() {
    if (!deal || !account) return;
    await execute({
      contractAddress: SLA_ESCROW_ADDRESS,
      entrypoint: "slash_deal",
      calldata: [selectedDealId.toString()],
    });
    if (txState === "confirmed") refetch();
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
        deals={deals}
        dealsLoading={dealsLoading}
        selectedDealId={selectedDealId}
        onSelectDeal={handleSelectDeal}
        walletConnected={isConnected}
        onCreateClick={() => setDrawerOpen(true)}
        sidebarOpen={sidebarOpen}
      />

      <main id="main-content" className="sla-f3-main">
        {loading && !deal ? (
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
            <HeroSection deal={deal} dealId={selectedDealId} />

            {isConnected && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button
                  className="sla-f3-create-cta"
                  onClick={() => setDrawerOpen(true)}
                >
                  + Create New Deal
                </button>
              </div>
            )}

            <div className="sla-f3-grid">
              <SLATimerCard deal={deal} />

              <DealDetailsCard
                deal={deal}
                onSlash={handleSlash}
                slashVisible={slashVisible}
              />

              <PaymentProgressCard deal={deal} />

              <ChainPipelineCard />

              <ProofFeedCard
                events={events}
                eventsLoading={eventsLoading}
                chunkAmount={deal.chunk_amount}
              />
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
    </div>
  );
}
