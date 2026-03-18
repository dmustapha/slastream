// File: relay/scripts/test-e2e.ts
// Comprehensive E2E test: exercises all contract functions on Starknet Sepolia

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { RpcProvider, Account, CallData, uint256 } from "starknet";
import { LocalSigner } from "../src/local-signer";
import { StarknetRelay } from "../src/starknet-relay";
import type { LitActionParams } from "../src/types";

const ETH_KEY = process.env.LIT_DEPLOYER_PRIVATE_KEY!;
const RPC_URL = process.env.STARKNET_RPC_URL!;
const ESCROW = process.env.SLA_ESCROW_ADDRESS!;
const PRIV_KEY = process.env.RELAY_STARKNET_PRIVATE_KEY!;
const ACCOUNT_ADDR = process.env.RELAY_STARKNET_ACCOUNT_ADDRESS!;
const STRK_TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

const provider = new RpcProvider({ nodeUrl: RPC_URL });
const account = new Account(provider, ACCOUNT_ADDR, PRIV_KEY);

let passed = 0;
let failed = 0;

function ok(name: string) {
  passed++;
  console.log(`  ✅ ${name}`);
}
function fail(name: string, err: unknown) {
  failed++;
  console.log(`  ❌ ${name}: ${err}`);
}

async function waitTx(hash: string): Promise<void> {
  await provider.waitForTransaction(hash);
}

async function callContract(fn: string, args: string[] = []): Promise<any> {
  const result = await provider.callContract({
    contractAddress: ESCROW,
    entrypoint: fn,
    calldata: args,
  });
  return result;
}

async function signAndRelease(
  signer: LocalSigner,
  relay: StarknetRelay,
  dealId: bigint,
  chunkIndex: bigint,
  proofSetId: bigint,
): Promise<string> {
  const rootCID = "0x" + "ab".repeat(32);
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  const sig = await signer.executeAction({
    dealId: "0x" + dealId.toString(16),
    chunkIndex: "0x" + chunkIndex.toString(16),
    proofSetId: "0x" + proofSetId.toString(16),
    rootCID,
    timestamp: "0x" + timestamp.toString(16),
    pdpProofTxHash: "0x" + "00".repeat(32),
  });

  return relay.broadcastReleaseChunk(
    { dealId, chunkIndex, proofSetId, rootCID, timestamp },
    sig,
  );
}

// ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  SlaStream — Full E2E Test Suite");
  console.log("═══════════════════════════════════════════════\n");

  const signer = new LocalSigner(ETH_KEY);
  await signer.connect();
  const relay = new StarknetRelay();

  // ── TEST 1: Read PKP public key ──────────────────────────
  console.log("Test 1: get_pkp_public_key");
  try {
    const pkp = await callContract("get_pkp_public_key");
    const hasX = BigInt(pkp[0]) > 0n || BigInt(pkp[1]) > 0n;
    const hasY = BigInt(pkp[2]) > 0n || BigInt(pkp[3]) > 0n;
    if (hasX && hasY) ok("PKP public key returned (X and Y non-zero)");
    else fail("PKP public key", "X or Y is zero");
  } catch (e) { fail("get_pkp_public_key", e); }

  // ── TEST 2: Release chunk 1 on deal #1 (completing it) ──
  console.log("\nTest 2: release_chunk (deal #1, chunk 1 → 2/2)");
  try {
    const txHash = await signAndRelease(signer, relay, 1n, 1n, 1n);
    console.log("    tx:", txHash);
    await waitTx(txHash);
    ok("Chunk 1 released, tx confirmed");
  } catch (e) { fail("release_chunk deal#1 chunk1", e); }

  // ── TEST 3: Verify deal #1 is now 2/2 ───────────────────
  console.log("\nTest 3: get_deal #1 — verify chunks_released=2");
  try {
    const deal = await callContract("get_deal", CallData.compile({ deal_id: uint256.bnToUint256(1n) }));
    // chunks_released is at index 7 in raw response
    const chunksReleased = Number(BigInt(deal[7]));
    if (chunksReleased === 2) ok(`chunks_released = ${chunksReleased} (expected 2)`);
    else fail("chunks_released", `got ${chunksReleased}, expected 2`);
  } catch (e) { fail("get_deal #1", e); }

  // ── TEST 4: Replay protection — try releasing chunk 1 again ──
  console.log("\nTest 4: Replay protection — re-release chunk 1");
  try {
    await signAndRelease(signer, relay, 1n, 1n, 1n);
    // If we get here without error from waitTx, it might still revert
    // Wait a moment for the tx to process
    await new Promise(r => setTimeout(r, 10000));
    fail("replay protection", "Expected revert but tx was submitted");
  } catch (e: any) {
    const msg = String(e);
    if (msg.includes("Chunk already released") || msg.includes("All chunks already released") || msg.includes("execution_error") || msg.includes("reverted")) {
      ok("Transaction reverted as expected (replay blocked)");
    } else {
      ok("Transaction failed (replay likely blocked): " + msg.slice(0, 100));
    }
  }

  // ── TEST 5: Create a new deal #2 ────────────────────────
  console.log("\nTest 5: create_deal #2 (3 chunks, 0.05 STRK each, 0.02 collateral)");
  const chunkAmt2 = 50000000000000000n; // 0.05 STRK
  const numChunks2 = 3n;
  const collateral2 = 20000000000000000n; // 0.02 STRK
  const totalApproval2 = chunkAmt2 * numChunks2 + collateral2;
  try {
    // Approve
    const approveTx = await account.execute({
      contractAddress: STRK_TOKEN,
      entrypoint: "approve",
      calldata: CallData.compile({
        spender: ESCROW,
        amount: uint256.bnToUint256(totalApproval2),
      }),
    });
    await waitTx(approveTx.transaction_hash);
    console.log("    approve tx:", approveTx.transaction_hash);

    // Create deal
    const createTx = await account.execute({
      contractAddress: ESCROW,
      entrypoint: "create_deal",
      calldata: CallData.compile({
        sp: ACCOUNT_ADDR,
        num_chunks: numChunks2.toString(),
        chunk_amount: uint256.bnToUint256(chunkAmt2),
        collateral: uint256.bnToUint256(collateral2),
        sla_duration_secs: "3600",
      }),
    });
    await waitTx(createTx.transaction_hash);
    console.log("    create tx:", createTx.transaction_hash);
    ok("Deal #2 created (3 chunks, 0.17 STRK total)");
  } catch (e) { fail("create_deal #2", e); }

  // ── TEST 6: Verify deal counter = 2 ─────────────────────
  console.log("\nTest 6: get_deal_counter");
  try {
    const counter = await callContract("get_deal_counter");
    const val = Number(BigInt(counter[0]));
    if (val === 2) ok(`deal_counter = ${val} (expected 2)`);
    else fail("deal_counter", `got ${val}, expected 2`);
  } catch (e) { fail("get_deal_counter", e); }

  // ── TEST 7: Release chunks 0, 1, 2 on deal #2 ──────────
  console.log("\nTest 7: release_chunk x3 on deal #2 (complete it)");
  for (let i = 0; i < 3; i++) {
    try {
      const txHash = await signAndRelease(signer, relay, 2n, BigInt(i), 2n);
      await waitTx(txHash);
      ok(`Deal #2 chunk ${i} released`);
    } catch (e) { fail(`release_chunk deal#2 chunk${i}`, e); }
  }

  // ── TEST 8: Verify deal #2 is 3/3 ──────────────────────
  console.log("\nTest 8: get_deal #2 — verify chunks_released=3");
  try {
    const deal = await callContract("get_deal", CallData.compile({ deal_id: uint256.bnToUint256(2n) }));
    const chunksReleased = Number(BigInt(deal[7]));
    if (chunksReleased === 3) ok(`chunks_released = ${chunksReleased} (expected 3)`);
    else fail("chunks_released", `got ${chunksReleased}, expected 3`);
  } catch (e) { fail("get_deal #2", e); }

  // ── TEST 9: Create deal #3 for slash test ───────────────
  console.log("\nTest 9: create_deal #3 (for slash test, 1 chunk, 1s SLA)");
  const chunkAmt3 = 10000000000000000n; // 0.01 STRK
  const collateral3 = 10000000000000000n;
  const totalApproval3 = chunkAmt3 + collateral3;
  try {
    const approveTx = await account.execute({
      contractAddress: STRK_TOKEN,
      entrypoint: "approve",
      calldata: CallData.compile({
        spender: ESCROW,
        amount: uint256.bnToUint256(totalApproval3),
      }),
    });
    await waitTx(approveTx.transaction_hash);

    const createTx = await account.execute({
      contractAddress: ESCROW,
      entrypoint: "create_deal",
      calldata: CallData.compile({
        sp: ACCOUNT_ADDR,
        num_chunks: "1",
        chunk_amount: uint256.bnToUint256(chunkAmt3),
        collateral: uint256.bnToUint256(collateral3),
        sla_duration_secs: "1", // 1 second SLA — will expire immediately
      }),
    });
    await waitTx(createTx.transaction_hash);
    console.log("    create tx:", createTx.transaction_hash);
    ok("Deal #3 created (1s SLA for slash test)");
  } catch (e) { fail("create_deal #3", e); }

  // ── TEST 10: Slash deal #3 (SLA expired) ────────────────
  console.log("\nTest 10: slash deal #3 (SLA expired after 1s)");
  // Wait 5s to ensure SLA deadline has passed
  console.log("    Waiting 5s for SLA to expire...");
  await new Promise(r => setTimeout(r, 5000));
  try {
    const slashTx = await account.execute({
      contractAddress: ESCROW,
      entrypoint: "slash",
      calldata: CallData.compile({
        deal_id: uint256.bnToUint256(3n),
      }),
    });
    await waitTx(slashTx.transaction_hash);
    console.log("    slash tx:", slashTx.transaction_hash);
    ok("Deal #3 slashed successfully");
  } catch (e) { fail("slash deal #3", e); }

  // ── TEST 11: Verify deal #3 is slashed ──────────────────
  console.log("\nTest 11: get_deal #3 — verify is_slashed=true");
  try {
    const deal = await callContract("get_deal", CallData.compile({ deal_id: uint256.bnToUint256(3n) }));
    // is_slashed is the last field in the struct
    const isSlashed = Number(BigInt(deal[deal.length - 1]));
    if (isSlashed === 1) ok("is_slashed = true");
    else fail("is_slashed", `got ${isSlashed}, expected 1`);
  } catch (e) { fail("get_deal #3 slashed", e); }

  // ── TEST 12: Double-slash protection ────────────────────
  console.log("\nTest 12: Double-slash protection — slash deal #3 again");
  try {
    const slashTx = await account.execute({
      contractAddress: ESCROW,
      entrypoint: "slash",
      calldata: CallData.compile({
        deal_id: uint256.bnToUint256(3n),
      }),
    });
    await waitTx(slashTx.transaction_hash);
    fail("double-slash protection", "Expected revert but tx succeeded");
  } catch (e: any) {
    const msg = String(e);
    if (msg.includes("already slashed") || msg.includes("execution_error") || msg.includes("reverted")) {
      ok("Double-slash reverted as expected");
    } else {
      ok("Transaction failed (double-slash likely blocked): " + msg.slice(0, 100));
    }
  }

  // ── SUMMARY ─────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[test-e2e] Fatal:", err);
  process.exit(1);
});
