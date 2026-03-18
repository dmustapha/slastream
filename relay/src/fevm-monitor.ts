// File: relay/src/fevm-monitor.ts

import { ethers } from "ethers";
import {
  FEVM_RPC_URL,
  FEVM_RPC_URL_BACKUP,
  PDP_VERIFIER_ADDRESS,
  FEVM_LOOKBACK_BLOCKS,
} from "./config";
import type { ProofEvent, TrackedDeal } from "./types";

// Minimal ABI — only the RootsAdded event we need to filter
const PDP_VERIFIER_ABI = [
  "event RootsAdded(uint256 indexed proofSetId, bytes32[] rootCIDs)",
  "event ProofSetLive(uint256 indexed proofSetId)",
];

export class FevmMonitor {
  private provider: ethers.providers.JsonRpcProvider;
  private pdpVerifier: ethers.Contract;
  private lastBlock: number;
  private trackedProofSetIds: Set<bigint>;

  constructor(trackedDeals: TrackedDeal[]) {
    this.provider = new ethers.providers.JsonRpcProvider(FEVM_RPC_URL);
    this.pdpVerifier = new ethers.Contract(
      PDP_VERIFIER_ADDRESS,
      PDP_VERIFIER_ABI,
      this.provider
    );
    this.lastBlock = 0;
    this.trackedProofSetIds = new Set(trackedDeals.map((d) => d.proofSetId));
  }

  async initialize(): Promise<void> {
    let currentBlock: number;
    try {
      currentBlock = await this.provider.getBlockNumber();
    } catch (err) {
      console.warn("[fevm-monitor] Primary RPC failed, trying backup...", err);
      this.provider = new ethers.providers.JsonRpcProvider(FEVM_RPC_URL_BACKUP);
      this.pdpVerifier = new ethers.Contract(
        PDP_VERIFIER_ADDRESS,
        PDP_VERIFIER_ABI,
        this.provider
      );
      currentBlock = await this.provider.getBlockNumber();
    }
    this.lastBlock = Math.max(0, currentBlock - FEVM_LOOKBACK_BLOCKS);
    console.log(
      `[fevm-monitor] Initialized. Starting from block ${this.lastBlock} (current: ${currentBlock})`
    );
  }

  async pollForProofEvents(): Promise<ProofEvent[]> {
    let currentBlock: number;
    try {
      currentBlock = await this.provider.getBlockNumber();
    } catch (err) {
      console.error("[fevm-monitor] Failed to get block number:", err);
      return [];
    }

    if (currentBlock <= this.lastBlock) {
      return [];
    }

    const fromBlock = this.lastBlock + 1;
    const toBlock = currentBlock;

    console.log(
      `[fevm-monitor] Querying RootsAdded events from block ${fromBlock} to ${toBlock}`
    );

    let rawEvents: ethers.Event[];
    try {
      rawEvents = await this.pdpVerifier.queryFilter(
        this.pdpVerifier.filters.RootsAdded(),
        fromBlock,
        toBlock
      );
    } catch (err) {
      console.error("[fevm-monitor] queryFilter failed:", err);
      return [];
    }

    this.lastBlock = toBlock;

    const results: ProofEvent[] = [];
    for (const event of rawEvents) {
      const proofSetId = BigInt(event.args![0].toString());
      if (!this.trackedProofSetIds.has(proofSetId)) {
        continue;
      }

      const rawCIDs: string[] = event.args![1];
      const rootCIDs = rawCIDs.map((cid) =>
        ethers.utils.hexZeroPad(cid, 32)
      );

      results.push({
        proofSetId,
        rootCIDs,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
      });
    }

    if (results.length > 0) {
      console.log(
        `[fevm-monitor] Found ${results.length} matching RootsAdded events`
      );
    }

    return results;
  }

  addTrackedProofSet(proofSetId: bigint): void {
    this.trackedProofSetIds.add(proofSetId);
    console.log(`[fevm-monitor] Now tracking proofSetId: ${proofSetId}`);
  }

  getLastBlock(): number {
    return this.lastBlock;
  }
}
