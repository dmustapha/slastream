// File: relay/src/index.ts

import { validateConfig, FEVM_POLL_INTERVAL_MS, TRACKED_DEALS_CONFIG, LIT_ETH_PRIVATE_KEY } from "./config";
import { FevmMonitor } from "./fevm-monitor";
import { LocalSigner } from "./local-signer";
import { StarknetRelay } from "./starknet-relay";
import type { TrackedDeal, ProofEvent, LitActionParams, ProcessedChunkKey } from "./types";

// ---------------------------------------------------------------------------
// Parse TRACKED_DEALS_CONFIG env var
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
    };
  });
}

// ---------------------------------------------------------------------------
// Main relay loop
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("[relay] SLAStream Relay starting...");

  validateConfig();

  const trackedDeals = parseTrackedDeals(TRACKED_DEALS_CONFIG);
  console.log(`[relay] Tracking ${trackedDeals.length} deals:`, trackedDeals);

  const dealMap = new Map<bigint, TrackedDeal>(
    trackedDeals.map((d) => [d.proofSetId, d])
  );

  const processedChunks = new Set<ProcessedChunkKey>();

  const fevmMonitor = new FevmMonitor(trackedDeals);
  const litBridge = new LocalSigner(LIT_ETH_PRIVATE_KEY);
  const starknetRelay = new StarknetRelay();

  await fevmMonitor.initialize();
  await litBridge.connect();

  console.log(`[relay] Starting poll loop (interval: ${FEVM_POLL_INTERVAL_MS}ms)`);

  while (true) {
    try {
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
    const trackedDeal = dealMap.get(event.proofSetId);
    if (!trackedDeal) {
      console.warn("[relay] Event for untracked proofSetId:", event.proofSetId);
      continue;
    }

    await processProofEvent(
      event,
      trackedDeal,
      litBridge,
      starknetRelay,
      dealMap,
      processedChunks
    );
  }
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
  dealMap.set(event.proofSetId, trackedDeal);

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
