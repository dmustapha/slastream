// File: relay/scripts/deploy-lit-action.ts
// Migrated to Lit Protocol Naga V1 (SDK v8)
//
// Mints a PKP on Chronicle Yellowstone and outputs the values needed for .env.
// The relay uses inline code execution (no IPFS needed for hackathon demo).
// If you later upload action.js to IPFS, set LIT_ACTION_IPFS_CID in .env
// and the relay will use ipfsId instead of inline code automatically.

import { createLitClient } from "@lit-protocol/lit-client";
import { nagaDev } from "@lit-protocol/networks";
import { privateKeyToAccount } from "viem/accounts";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const LIT_DEPLOYER_PRIVATE_KEY = process.env.LIT_DEPLOYER_PRIVATE_KEY;
if (!LIT_DEPLOYER_PRIVATE_KEY) {
  throw new Error("Missing LIT_DEPLOYER_PRIVATE_KEY in .env");
}

async function deployLitAction(): Promise<void> {
  console.log("[deploy-lit-action] Starting (Naga V1 / SDK v8)...");

  // Create Lit client on nagaDev (free devnet)
  const litClient = await createLitClient({ network: nagaDev });
  console.log("[deploy-lit-action] Connected to Lit Naga Dev network");

  // Create viem account from private key
  const privateKey = LIT_DEPLOYER_PRIVATE_KEY!.startsWith("0x")
    ? (LIT_DEPLOYER_PRIVATE_KEY as `0x${string}`)
    : (`0x${LIT_DEPLOYER_PRIVATE_KEY}` as `0x${string}`);
  const account = privateKeyToAccount(privateKey);
  console.log("[deploy-lit-action] Deployer address:", account.address);

  // Mint a new PKP
  console.log("[deploy-lit-action] Minting PKP...");
  const mintResult = await (litClient as any).mintWithEoa({ account });
  const pkpTokenId = mintResult.data.tokenId;
  const pkpPublicKey = mintResult.data.pubkey;
  const pkpEthAddress = mintResult.data.ethAddress;

  console.log("[deploy-lit-action] PKP minted:");
  console.log("  Token ID:", pkpTokenId);
  console.log("  Public Key:", pkpPublicKey);
  console.log("  ETH Address:", pkpEthAddress);

  // Extract X and Y coordinates from the uncompressed public key (0x04 + 64 bytes)
  const pubKeyNoPrefix = pkpPublicKey.startsWith("0x")
    ? pkpPublicKey.slice(2)
    : pkpPublicKey;
  // Skip the 04 prefix (uncompressed key marker)
  const xHex = pubKeyNoPrefix.slice(2, 66);
  const yHex = pubKeyNoPrefix.slice(66, 130);

  console.log("\n[deploy-lit-action] === ADD TO .env ===");
  console.log(`LIT_PKP_TOKEN_ID=${pkpTokenId}`);
  console.log(`LIT_PKP_PUBLIC_KEY=${pkpPublicKey}`);
  console.log(`LIT_PKP_ETH_ADDRESS=${pkpEthAddress}`);
  console.log(`PKP_PUBLIC_KEY_X=0x${xHex}`);
  console.log(`PKP_PUBLIC_KEY_Y=0x${yHex}`);
  console.log("=====================================");
  console.log("\nNote: LIT_ACTION_IPFS_CID is optional — the relay loads action.js inline by default.");
  console.log("To use IPFS instead, upload lit-action/action.js to Pinata/IPFS and set LIT_ACTION_IPFS_CID.");
  console.log("\n(Use PKP_PUBLIC_KEY_X and PKP_PUBLIC_KEY_Y as constructor args for deploy-contract.ts)");

  console.log("[deploy-lit-action] Done.");
}

deployLitAction().catch((err) => {
  console.error("[deploy-lit-action] Fatal error:", err);
  process.exit(1);
});
