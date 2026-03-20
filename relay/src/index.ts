// File: relay/src/index.ts

import http from "http";
import https from "https";
import { validateConfig, FEVM_POLL_INTERVAL_MS, TRACKED_DEALS_CONFIG, LIT_ETH_PRIVATE_KEY } from "./config";
import { FevmMonitor } from "./fevm-monitor";
import { LocalSigner } from "./local-signer";
import { StarknetRelay } from "./starknet-relay";
import type { TrackedDeal, ProofEvent, LitActionParams, ProcessedChunkKey } from "./types";

// Default proofSetId for the MockPDPVerifier (all deals share this)
const DEFAULT_PROOF_SET_ID = 1n;

// ---------------------------------------------------------------------------
// Parse TRACKED_DEALS_CONFIG env var (optional seed deals)
// Format: "proofSetId:dealId:nextChunkIndex,..." e.g. "42:1:0,43:2:0"
// ---------------------------------------------------------------------------
function parseTrackedDeals(configStr: string): TrackedDeal[] {
  if (!configStr.trim()) return [];
  return configStr.split(",").map((entry) => {
    const parts = entry.trim().split(":");
    if (parts.length !== 3) {
      throw new Error(
        `Invalid TRACKED_DEALS_CONFIG entry: "${entry}". Expected format: proofSetId:dealId:nextChunkIndex`
      );
    }
    return {
      proofSetId: BigInt(parts[0]),
      dealId: BigInt(parts[1]),
      nextChunkIndex: BigInt(parts[2]),
      numChunks: 999n, // unknown for seeded deals — treat as unlimited
    };
  });
}

// ---------------------------------------------------------------------------
// Main relay loop
// ---------------------------------------------------------------------------
// Health check server (required for Render web service hosting)
// ---------------------------------------------------------------------------
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "slastream-relay" }));
}).listen(PORT, () => {
  console.log(`[relay] Health server listening on port ${PORT}`);
});

// Keep-alive: ping self every 14 minutes to prevent Render free tier spin-down
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL!;
    const client = url.startsWith("https") ? https : http;
    client.get(url, () => {}).on("error", () => {});
  }, 14 * 60 * 1000);
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("[relay] SLAStream Relay starting...");

  validateConfig();

  // Seed deals from env (optional — relay will auto-discover new ones)
  const seedDeals = parseTrackedDeals(TRACKED_DEALS_CONFIG);

  // dealId -> TrackedDeal (keyed by dealId, not proofSetId)
  const dealMap = new Map<bigint, TrackedDeal>();
  for (const d of seedDeals) {
    dealMap.set(d.dealId, d);
  }
  console.log(`[relay] Seeded ${dealMap.size} deals from env`);

  const processedChunks = new Set<ProcessedChunkKey>();

  // All deals share proofSetId=1 (MockPDPVerifier)
  const fevmMonitor = new FevmMonitor([{ proofSetId: DEFAULT_PROOF_SET_ID, dealId: 0n, nextChunkIndex: 0n, numChunks: 0n }]);
  const litBridge = new LocalSigner(LIT_ETH_PRIVATE_KEY);
  const starknetRelay = new StarknetRelay();

  await fevmMonitor.initialize();
  await litBridge.connect();
  await starknetRelay.initializeBlockCursor();

  console.log(`[relay] Auto-discovery enabled — watching Starknet for DealCreated events`);
  console.log(`[relay] Starting poll loop (interval: ${FEVM_POLL_INTERVAL_MS}ms)`);

  while (true) {
    try {
      // 1. Check for new deals on Starknet
      const newDeals = await starknetRelay.pollForNewDeals();
      for (const nd of newDeals) {
        if (!dealMap.has(nd.dealId)) {
          const tracked: TrackedDeal = {
            proofSetId: DEFAULT_PROOF_SET_ID,
            dealId: nd.dealId,
            nextChunkIndex: 0n,
            numChunks: nd.numChunks,
          };
          dealMap.set(nd.dealId, tracked);
          console.log(`[relay] Auto-tracking new deal #${nd.dealId} (${nd.numChunks} chunks)`);
        }
      }

      // 2. Check for proofs on Filecoin
      await pollCycle(fevmMonitor, litBridge, starknetRelay, dealMap, processedChunks);
    } catch (err) {
      console.error("[relay] Poll cycle error (will retry next interval):", err);
    }

    await sleep(FEVM_POLL_INTERVAL_MS);
  }
}

async function pollCycle(
  fevmMonitor: FevmMonitor,
  litBridge: LocalSigner,
  starknetRelay: StarknetRelay,
  dealMap: Map<bigint, TrackedDeal>,
  processedChunks: Set<ProcessedChunkKey>
): Promise<void> {
  const events = await fevmMonitor.pollForProofEvents();

  for (const event of events) {
    // Find the next deal that needs chunks released
    // (all deals share the same proofSetId with MockPDPVerifier)
    const nextDeal = findNextDealNeedingChunks(dealMap, processedChunks);
    if (!nextDeal) {
      console.log("[relay] No deals need chunks — ignoring proof event");
      continue;
    }

    await processProofEvent(
      event,
      nextDeal,
      litBridge,
      starknetRelay,
      dealMap,
      processedChunks
    );
  }
}

function findNextDealNeedingChunks(
  dealMap: Map<bigint, TrackedDeal>,
  _processedChunks: Set<ProcessedChunkKey>
): TrackedDeal | null {
  // Return the deal with the lowest ID that still has chunks remaining
  const candidates = Array.from(dealMap.values())
    .filter((d) => d.nextChunkIndex < d.numChunks)
    .sort((a, b) => Number(a.dealId - b.dealId));

  return candidates[0] ?? null;
}

async function processProofEvent(
  event: ProofEvent,
  trackedDeal: TrackedDeal,
  litBridge: LocalSigner,
  starknetRelay: StarknetRelay,
  dealMap: Map<bigint, TrackedDeal>,
  processedChunks: Set<ProcessedChunkKey>
): Promise<void> {
  const rootCID = event.rootCIDs[0];
  if (!rootCID) {
    console.warn("[relay] RootsAdded event with empty rootCIDs, skipping");
    return;
  }

  const chunkIndex = trackedDeal.nextChunkIndex;
  const chunkKey: ProcessedChunkKey = `${trackedDeal.dealId}-${chunkIndex}`;

  if (processedChunks.has(chunkKey)) {
    console.log(
      `[relay] Chunk ${chunkKey} already processed, skipping duplicate event`
    );
    return;
  }

  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  console.log(
    `[relay] Processing chunk ${chunkIndex} for deal ${trackedDeal.dealId}`
  );
  console.log(`  proofSetId: ${event.proofSetId}`);
  console.log(`  rootCID: ${rootCID}`);
  console.log(`  pdpProofTxHash: ${event.transactionHash}`);

  const litParams: LitActionParams = {
    dealId: "0x" + trackedDeal.dealId.toString(16),
    chunkIndex: "0x" + chunkIndex.toString(16),
    proofSetId: "0x" + event.proofSetId.toString(16),
    rootCID: rootCID,
    timestamp: "0x" + timestamp.toString(16),
    pdpProofTxHash: event.transactionHash,
  };

  let litSig;
  try {
    litSig = await litBridge.executeAction(litParams);
    console.log("[relay] Got PKP signature, v:", litSig.sig_v);
  } catch (err) {
    console.error("[relay] Lit Action execution failed:", err);
    return;
  }

  let starknetTxHash: string;
  try {
    starknetTxHash = await starknetRelay.broadcastReleaseChunk(
      {
        dealId: trackedDeal.dealId,
        chunkIndex: chunkIndex,
        proofSetId: event.proofSetId,
        rootCID: rootCID,
        timestamp: timestamp,
      },
      litSig
    );
    console.log("[relay] release_chunk tx:", starknetTxHash);
  } catch (err) {
    console.error("[relay] Starknet broadcast failed:", err);
    return;
  }

  processedChunks.add(chunkKey);
  trackedDeal.nextChunkIndex = chunkIndex + 1n;
  dealMap.set(trackedDeal.dealId, trackedDeal);

  console.log(
    `[relay] Chunk ${chunkKey} processed successfully. Next expected: ${trackedDeal.nextChunkIndex}`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on("SIGINT", () => {
  console.log("[relay] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[relay] Shutting down...");
  process.exit(0);
});

main().catch((err) => {
  console.error("[relay] Fatal error:", err);
  process.exit(1);
});
