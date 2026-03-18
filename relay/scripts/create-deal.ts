// File: relay/scripts/create-deal.ts

import { RpcProvider, Account, CallData, uint256 } from "starknet";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const STARKNET_RPC_URL =
  process.env.STARKNET_RPC_URL ||
  "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo";

const SLA_ESCROW_ADDRESS = process.env.SLA_ESCROW_ADDRESS;
const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

const CLIENT_PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY || process.env.RELAY_STARKNET_PRIVATE_KEY;
const CLIENT_ACCOUNT_ADDRESS = process.env.CLIENT_ACCOUNT_ADDRESS || process.env.RELAY_STARKNET_ACCOUNT_ADDRESS;

if (!SLA_ESCROW_ADDRESS) {
  throw new Error("Missing SLA_ESCROW_ADDRESS in .env. Deploy contract first.");
}
if (!CLIENT_PRIVATE_KEY || !CLIENT_ACCOUNT_ADDRESS) {
  throw new Error("Missing CLIENT_PRIVATE_KEY or CLIENT_ACCOUNT_ADDRESS in .env");
}

function parseArgs(): {
  sp: string;
  numChunks: bigint;
  chunkAmount: bigint;
  collateral: bigint;
  slaDurationSecs: bigint;
} {
  const args = process.argv.slice(2);
  const argMap: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace("--", "");
    argMap[key] = args[i + 1];
  }

  if (!argMap.sp) throw new Error("Missing --sp <starknet_address>");
  if (!argMap["num-chunks"]) throw new Error("Missing --num-chunks <n>");
  if (!argMap["chunk-amount"]) throw new Error("Missing --chunk-amount <strk_in_wei>");
  if (!argMap.collateral) throw new Error("Missing --collateral <strk_in_wei>");
  if (!argMap["sla-secs"]) throw new Error("Missing --sla-secs <seconds>");

  return {
    sp: argMap.sp,
    numChunks: BigInt(argMap["num-chunks"]),
    chunkAmount: BigInt(argMap["chunk-amount"]),
    collateral: BigInt(argMap.collateral),
    slaDurationSecs: BigInt(argMap["sla-secs"]),
  };
}

async function createDeal(): Promise<void> {
  const params = parseArgs();

  console.log("[create-deal] Parameters:");
  console.log("  SP address:", params.sp);
  console.log("  num_chunks:", params.numChunks.toString());
  console.log("  chunk_amount:", params.chunkAmount.toString(), "wei");
  console.log("  collateral:", params.collateral.toString(), "wei");
  console.log("  sla_duration_secs:", params.slaDurationSecs.toString());

  const totalAmount = params.chunkAmount * params.numChunks;
  const requiredApproval = totalAmount + params.collateral;
  console.log("  Total STRK to approve:", requiredApproval.toString(), "wei");

  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  const account = new Account(provider, CLIENT_ACCOUNT_ADDRESS!, CLIENT_PRIVATE_KEY!);

  console.log("[create-deal] Approving STRK...");
  const approveCalldata = CallData.compile({
    spender: SLA_ESCROW_ADDRESS!,
    amount: uint256.bnToUint256(requiredApproval),
  });

  const approveTx = await account.execute({
    contractAddress: STRK_TOKEN_ADDRESS,
    entrypoint: "approve",
    calldata: approveCalldata,
  });

  console.log("[create-deal] Approve tx submitted:", approveTx.transaction_hash);
  await provider.waitForTransaction(approveTx.transaction_hash);
  console.log("[create-deal] Approve confirmed.");

  console.log("[create-deal] Creating deal...");
  const createDealCalldata = CallData.compile({
    sp: params.sp,
    num_chunks: params.numChunks.toString(),
    chunk_amount: uint256.bnToUint256(params.chunkAmount),
    collateral: uint256.bnToUint256(params.collateral),
    sla_duration_secs: params.slaDurationSecs.toString(),
  });

  const createTx = await account.execute({
    contractAddress: SLA_ESCROW_ADDRESS!,
    entrypoint: "create_deal",
    calldata: createDealCalldata,
  });

  console.log("[create-deal] create_deal tx submitted:", createTx.transaction_hash);
  await provider.waitForTransaction(createTx.transaction_hash);
  console.log("[create-deal] Deal created!");
  console.log(
    "[create-deal] View on Starkscan: https://sepolia.starkscan.co/tx/" +
      createTx.transaction_hash
  );
  console.log(
    "\nNext step: Add the deal to TRACKED_DEALS_CONFIG in .env"
  );
  console.log(
    "Format: TRACKED_DEALS_CONFIG=<proofSetId>:<dealId>:0"
  );
  console.log(
    "(Check the DealCreated event in Starkscan to find the deal_id)"
  );
}

createDeal().catch((err) => {
  console.error("[create-deal] Fatal error:", err);
  process.exit(1);
});
