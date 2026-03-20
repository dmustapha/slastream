// File: relay/src/types.ts

/**
 * A proof event detected on Filecoin Calibration FEVM.
 * Emitted by PDP Verifier when SP adds roots to a proof set.
 */
export interface ProofEvent {
  proofSetId: bigint;
  rootCIDs: string[]; // array of 0x-prefixed hex strings (bytes32 each)
  transactionHash: string; // 0x-prefixed FEVM tx hash
  blockNumber: number;
  logIndex: number;
}

/**
 * Parameters passed to the Lit Action as jsParams.
 */
export interface LitActionParams {
  dealId: string;      // hex string of u256, e.g. "0x1"
  chunkIndex: string;  // hex string of u64
  proofSetId: string;  // hex string of u256
  rootCID: string;     // hex string of bytes32 (32 bytes), e.g. "0xdeadbeef..."
  timestamp: string;   // hex string of u64 (Unix seconds)
  pdpProofTxHash: string; // FEVM tx hash — Lit Action verifies this exists on FEVM
}

/**
 * Signature returned by Lit Action after PKP signs the payload.
 * sig_v is 0 or 1 (relay normalizes from Lit's 27/28 output).
 */
export interface LitSig {
  sig_r: string; // 32-byte hex string
  sig_s: string; // 32-byte hex string
  sig_v: number; // 0 or 1
}

/**
 * Parameters for a release_chunk call to SLAEscrow Cairo contract.
 */
export interface ReleaseParams {
  dealId: bigint;
  chunkIndex: bigint;
  proofSetId: bigint;
  rootCID: string;   // 0x-prefixed 32-byte hex
  timestamp: bigint;
}

/**
 * Tracks which (dealId, chunkIndex) pairs have been processed.
 * Used for in-memory deduplication across polling cycles.
 */
export type ProcessedChunkKey = string; // format: `${dealId}-${chunkIndex}`

/**
 * A tracked deal: maps a proofSetId to a dealId and the next expected chunk index.
 */
export interface TrackedDeal {
  dealId: bigint;
  proofSetId: bigint;
  nextChunkIndex: bigint;
  numChunks: bigint; // total chunks in deal — stop routing when nextChunkIndex >= numChunks
}
