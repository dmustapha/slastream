// File: relay/scripts/run-full-demo.ts
// Step-by-step interactive demo of the full 3-chain pipeline:
//   Filecoin PDP (mock) → Relay (local signer) → Starknet (escrow)

import { ethers } from "ethers";
import { RpcProvider, Account, CallData, uint256 } from "starknet";
import * as dotenv from "dotenv";
import * as path from "path";
import { spawn, type ChildProcess } from "child_process";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const FEVM_RPC_URL =
  process.env.FEVM_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1";
const STARKNET_RPC_URL =
  process.env.STARKNET_RPC_URL ||
  "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo";
const STRK_TOKEN =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

function requireDemo(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing ${name} in .env — cannot run demo.`);
  }
  return val;
}

const PDP_VERIFIER_ADDRESS = requireDemo("PDP_VERIFIER_ADDRESS");
const SLA_ESCROW_ADDRESS = requireDemo("SLA_ESCROW_ADDRESS");
const DEPLOYER_KEY = requireDemo("LIT_DEPLOYER_PRIVATE_KEY");
const RELAY_PRIV_KEY = requireDemo("RELAY_STARKNET_PRIVATE_KEY");
const RELAY_ACCOUNT = requireDemo("RELAY_STARKNET_ACCOUNT_ADDRESS");
const CLIENT_KEY =
  process.env.CLIENT_PRIVATE_KEY || RELAY_PRIV_KEY;
const CLIENT_ACCOUNT =
  process.env.CLIENT_ACCOUNT_ADDRESS || RELAY_ACCOUNT;

const MOCK_PDP_ABI = [
  "event RootsAdded(uint256 indexed proofSetId, bytes32[] rootCIDs)",
  "function addRoots(uint256 proofSetId, bytes32[] rootCIDs)",
  "function createProofSet() returns (uint256)",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function banner(step: number, title: string): void {
  console.log(
    `\n${"=".repeat(60)}\n  STEP ${step}: ${title}\n${"=".repeat(60)}\n`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function step1_validateEnv(): Promise<void> {
  banner(1, "Validate environment");

  const vars = [
    "PDP_VERIFIER_ADDRESS",
    "SLA_ESCROW_ADDRESS",
    "LIT_DEPLOYER_PRIVATE_KEY",
    "RELAY_STARKNET_PRIVATE_KEY",
    "RELAY_STARKNET_ACCOUNT_ADDRESS",
    "TRACKED_DEALS_CONFIG",
  ];

  for (const v of vars) {
    const present = !!process.env[v];
    console.log(`  ${present ? "[ok]" : "[!!]"} ${v}`);
  }

  console.log("\n  Filecoin RPC:", FEVM_RPC_URL);
  console.log("  Starknet RPC:", STARKNET_RPC_URL);
  console.log("  Mock PDP Verifier:", PDP_VERIFIER_ADDRESS);
  console.log("  SLA Escrow:", SLA_ESCROW_ADDRESS);
}

async function step2_createDeal(): Promise<{ dealId: bigint }> {
  banner(2, "Create deal on Starknet (chain 3)");

  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  const account = new Account(provider, CLIENT_ACCOUNT, CLIENT_KEY);

  const chunkAmount = 10000000000000000n; // 0.01 STRK
  const numChunks = 2n;
  const collateral = 10000000000000000n; // 0.01 STRK
  const totalApproval = chunkAmount * numChunks + collateral;

  console.log("  Client:", CLIENT_ACCOUNT);
  console.log("  num_chunks:", numChunks.toString());
  console.log("  chunk_amount: 0.01 STRK");
  console.log("  collateral: 0.01 STRK");
  console.log("  sla_duration: 3600s");

  console.log("\n  Approving STRK...");
  const approveTx = await account.execute({
    contractAddress: STRK_TOKEN,
    entrypoint: "approve",
    calldata: CallData.compile({
      spender: SLA_ESCROW_ADDRESS,
      amount: uint256.bnToUint256(totalApproval),
    }),
  });
  await provider.waitForTransaction(approveTx.transaction_hash);
  console.log("  Approve tx:", approveTx.transaction_hash);

  console.log("  Creating deal...");
  const createTx = await account.execute({
    contractAddress: SLA_ESCROW_ADDRESS,
    entrypoint: "create_deal",
    calldata: CallData.compile({
      sp: RELAY_ACCOUNT,
      num_chunks: numChunks.toString(),
      chunk_amount: uint256.bnToUint256(chunkAmount),
      collateral: uint256.bnToUint256(collateral),
      sla_duration_secs: "3600",
    }),
  });
  await provider.waitForTransaction(createTx.transaction_hash);
  console.log("  Create tx:", createTx.transaction_hash);

  // Read deal counter to find the new deal ID
  const counter = await provider.callContract({
    contractAddress: SLA_ESCROW_ADDRESS,
    entrypoint: "get_deal_counter",
  });
  const dealId = BigInt(counter[0]);
  console.log("  Deal ID:", dealId.toString());
  console.log(
    "  Starkscan: https://sepolia.starkscan.co/tx/" +
      createTx.transaction_hash
  );

  return { dealId };
}

function step3_startRelay(): ChildProcess {
  banner(3, "Start relay service (chains 1+2 bridge)");

  console.log("  Spawning: bun run src/index.ts");
  const relayDir = path.resolve(__dirname, "..");
  const relay = spawn("bun", ["run", "src/index.ts"], {
    cwd: relayDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  relay.stdout!.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      console.log("  [relay]", line);
    }
  });

  relay.stderr!.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      console.log("  [relay:err]", line);
    }
  });

  relay.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.log(`  [relay] Process exited with code ${code}`);
    }
  });

  return relay;
}

async function step4_simulateSPProof(proofSetId: number): Promise<string> {
  banner(4, "Simulate SP proof on Filecoin (chain 1)");

  const provider = new ethers.providers.JsonRpcProvider(FEVM_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const contract = new ethers.Contract(
    PDP_VERIFIER_ADDRESS,
    MOCK_PDP_ABI,
    wallet
  );

  const rootCID = ethers.utils.hexlify(ethers.utils.randomBytes(32));
  console.log("  Proof Set ID:", proofSetId);
  console.log("  Root CID:", rootCID);

  console.log("  Sending addRoots() transaction...");
  const tx = await contract.addRoots(proofSetId, [rootCID]);
  console.log("  Tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("  Block:", receipt.blockNumber);
  console.log(
    "  Filfox: https://calibration.filfox.info/en/tx/" + tx.hash
  );

  return tx.hash;
}

async function step5_waitForRelay(): Promise<void> {
  banner(5, "Wait for relay to detect event and broadcast to Starknet");

  console.log(
    "  Relay polls every ~15s. Waiting up to 60s for detection...\n"
  );
  console.log(
    "  Watch the [relay] logs above for 'release_chunk' confirmation.\n"
  );

  // The relay logs are already streaming to stdout from step 3.
  // Just wait a reasonable amount of time.
  await sleep(45000);
}

async function step6_verifyStarknet(dealId: bigint): Promise<void> {
  banner(6, "Verify deal state on Starknet (chain 3)");

  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });

  const deal = await provider.callContract({
    contractAddress: SLA_ESCROW_ADDRESS,
    entrypoint: "get_deal",
    calldata: CallData.compile({
      deal_id: uint256.bnToUint256(dealId),
    }),
  });

  // chunks_released is at index 7 in the raw response
  const chunksReleased = Number(BigInt(deal[7]));
  const numChunks = Number(BigInt(deal[5]));

  console.log("  Deal ID:", dealId.toString());
  console.log("  Chunks released:", chunksReleased, "/", numChunks);

  if (chunksReleased > 0) {
    console.log(
      "\n  Pipeline confirmed: Filecoin proof -> Relay sign -> Starknet escrow release"
    );
  } else {
    console.log(
      "\n  No chunks released yet. The relay may need more time,"
    );
    console.log(
      "  or check TRACKED_DEALS_CONFIG in .env matches the deal."
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("  SLAStream — Full 3-Chain Pipeline Demo");
  console.log("  Filecoin PDP -> Relay (signer) -> Starknet Escrow");
  console.log("=".repeat(60));

  // Parse optional --skip-deal flag for reusing an existing deal
  const skipDeal = process.argv.includes("--skip-deal");
  const proofSetIdArg = process.argv.find((a) => a.startsWith("--proof-set-id="));
  const proofSetId = proofSetIdArg
    ? parseInt(proofSetIdArg.split("=")[1], 10)
    : 1;

  await step1_validateEnv();

  let dealId: bigint;
  if (skipDeal) {
    banner(2, "Skipping deal creation (--skip-deal)");
    // Parse deal ID from TRACKED_DEALS_CONFIG (format: proofSetId:dealId:lastChunk)
    const config = process.env.TRACKED_DEALS_CONFIG || "";
    const parts = config.split(":");
    dealId = parts[1] ? BigInt(parts[1]) : 1n;
    console.log("  Using existing deal ID:", dealId.toString());
  } else {
    const result = await step2_createDeal();
    dealId = result.dealId;

    console.log("\n  IMPORTANT: Update TRACKED_DEALS_CONFIG in .env:");
    console.log(
      `  TRACKED_DEALS_CONFIG=${proofSetId}:${dealId}:0`
    );
    console.log(
      "\n  Then re-run with: bun run demo -- --skip-deal"
    );
    console.log(
      "  (The relay reads TRACKED_DEALS_CONFIG at startup)\n"
    );
  }

  const relay = step3_startRelay();

  console.log("\n  Waiting 8s for relay to initialize...");
  await sleep(8000);

  await step4_simulateSPProof(proofSetId);

  await step5_waitForRelay();

  await step6_verifyStarknet(dealId);

  // Cleanup
  relay.kill("SIGTERM");
  console.log("\n  Relay process stopped.");

  console.log("\n" + "=".repeat(60));
  console.log("  Demo complete.");
  console.log("=".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("[demo] Fatal error:", err);
  process.exit(1);
});
