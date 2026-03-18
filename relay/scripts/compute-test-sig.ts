// File: relay/scripts/compute-test-sig.ts
// Computes secp256k1 signature for the test vector in test_sla_escrow.cairo
// Uses the known test private key from ARCHITECTURE.md Section 4 comments.
// Run: bun run scripts/compute-test-sig.ts
// Copy output into test_sla_escrow.cairo TEST_SIG_R / TEST_SIG_S / TEST_SIG_V constants.

import { ethers } from "ethers";

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const wallet = new ethers.Wallet(TEST_PRIVATE_KEY);

// Test vector: must match test_release_chunk in test_sla_escrow.cairo exactly
const dealId = 1n;
const chunkIndex = 0n;
const proofSetId = 42n;
const rootCID = BigInt("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
const timestamp = 1234n;

const packed = ethers.utils.solidityPack(
  ["uint256", "uint256", "uint256", "uint256", "uint256"],
  [dealId, chunkIndex, proofSetId, rootCID, timestamp]
);

const msgHash = ethers.utils.keccak256(packed);
const msgHashBytes = ethers.utils.arrayify(msgHash);

console.log("Message hash:", msgHash);

const sigFlat = wallet._signingKey().signDigest(msgHashBytes);
const sig = ethers.utils.splitSignature(sigFlat);

console.log("\n=== COPY THESE INTO test_sla_escrow.cairo ===");
console.log(`const TEST_SIG_R: u256 = ${sig.r};`);
console.log(`const TEST_SIG_S: u256 = ${sig.s};`);
// Cairo expects v as 0 or 1 (Lit PKP normalized value)
const normalizedV = sig.v >= 27 ? sig.v - 27 : sig.v;
console.log(`const TEST_SIG_V: u32 = ${normalizedV};`);
console.log("==============================================\n");

console.log("Verification:");
console.log("  Public key X:", "0x" + wallet.publicKey.slice(4, 68));
console.log("  Public key Y:", "0x" + wallet.publicKey.slice(68, 132));
console.log("  (These should match TEST_PKP_X and TEST_PKP_Y in test file)");
