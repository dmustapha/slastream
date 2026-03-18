// File: relay/scripts/simulate-sp-proof.ts
// Simulates an SP submitting PDP proofs by calling addRoots() on MockPDPVerifier.
// Usage: bun run scripts/simulate-sp-proof.ts [proofSetId] [numRoots]
// Defaults: proofSetId=1, numRoots=1

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const FEVM_RPC_URL =
  process.env.FEVM_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1";

const PDP_VERIFIER_ADDRESS = process.env.PDP_VERIFIER_ADDRESS;
const DEPLOYER_PRIVATE_KEY = process.env.LIT_DEPLOYER_PRIVATE_KEY;

if (!PDP_VERIFIER_ADDRESS) {
  throw new Error(
    "Missing PDP_VERIFIER_ADDRESS in .env. Deploy MockPDPVerifier first: bun run deploy-mock-pdp"
  );
}
if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error("Missing LIT_DEPLOYER_PRIVATE_KEY in .env");
}

const MOCK_PDP_ABI = [
  "event RootsAdded(uint256 indexed proofSetId, bytes32[] rootCIDs)",
  "function addRoots(uint256 proofSetId, bytes32[] rootCIDs)",
  "function createProofSet() returns (uint256)",
];

function parseArgs(): { proofSetId: number; numRoots: number } {
  const args = process.argv.slice(2);
  return {
    proofSetId: args[0] ? parseInt(args[0], 10) : 1,
    numRoots: args[1] ? parseInt(args[1], 10) : 1,
  };
}

async function simulateProof(): Promise<void> {
  const { proofSetId, numRoots } = parseArgs();

  console.log("[simulate-sp] Simulating SP proof submission...");
  console.log("  PDP Verifier:", PDP_VERIFIER_ADDRESS);
  console.log("  Proof Set ID:", proofSetId);
  console.log("  Number of roots:", numRoots);

  const provider = new ethers.providers.JsonRpcProvider(FEVM_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(
    PDP_VERIFIER_ADDRESS!,
    MOCK_PDP_ABI,
    wallet
  );

  const rootCIDs: string[] = [];
  for (let i = 0; i < numRoots; i++) {
    rootCIDs.push(ethers.utils.hexlify(ethers.utils.randomBytes(32)));
  }
  console.log("  Root CIDs:", rootCIDs);

  console.log("[simulate-sp] Sending addRoots() transaction...");
  const tx = await contract.addRoots(proofSetId, rootCIDs);
  console.log("  Tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("  Block number:", receipt.blockNumber);
  console.log("  Gas used:", receipt.gasUsed.toString());

  console.log("\n[simulate-sp] RootsAdded event emitted!");
  console.log(
    "  Filfox URL: https://calibration.filfox.info/en/tx/" + tx.hash
  );
  console.log(
    "\n  The relay should detect this event on next poll cycle (~15s)."
  );
}

simulateProof().catch((err) => {
  console.error("[simulate-sp] Fatal error:", err);
  process.exit(1);
});
