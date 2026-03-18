// File: relay/src/config.ts

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from relay/ directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// ---------------------------------------------------------------------------
// Chain configuration
// ---------------------------------------------------------------------------

export const FEVM_RPC_URL = optionalEnv(
  "FEVM_RPC_URL",
  "https://api.calibration.node.glif.io/rpc/v1"
);

export const FEVM_RPC_URL_BACKUP = optionalEnv(
  "FEVM_RPC_URL_BACKUP",
  "https://rpc.ankr.com/filecoin_testnet"
);

export const FEVM_CHAIN_ID = 314159;

export const STARKNET_RPC_URL = optionalEnv(
  "STARKNET_RPC_URL",
  "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo"
);

export const STARKNET_RPC_URL_BACKUP = optionalEnv(
  "STARKNET_RPC_URL_BACKUP",
  "https://api.zan.top/public/starknet-sepolia/rpc/v0_10"
);

export const CHRONICLE_YELLOWSTONE_RPC = optionalEnv(
  "CHRONICLE_YELLOWSTONE_RPC",
  "https://yellowstone-rpc.litprotocol.com/"
);

// ---------------------------------------------------------------------------
// Contract addresses
// ---------------------------------------------------------------------------

// PDP Verifier on Filecoin Calibration FEVM
// Override via env to point at MockPDPVerifier for hackathon demo
export const PDP_VERIFIER_ADDRESS = optionalEnv(
  "PDP_VERIFIER_ADDRESS",
  "0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C"
);

// STRK ERC20 token on Starknet Sepolia
export const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

// SLAEscrow contract address on Starknet Sepolia — set after deployment
export const SLA_ESCROW_ADDRESS = optionalEnv("SLA_ESCROW_ADDRESS", "");

// ---------------------------------------------------------------------------
// Lit Protocol configuration (Naga V1 / SDK v8)
// Optional — not needed when using local signer fallback
// ---------------------------------------------------------------------------

export const LIT_ACTION_IPFS_CID = optionalEnv("LIT_ACTION_IPFS_CID", "");
export const LIT_PKP_PUBLIC_KEY = optionalEnv("LIT_PKP_PUBLIC_KEY", "");
export const LIT_PKP_TOKEN_ID = optionalEnv("LIT_PKP_TOKEN_ID", "");

// Network: "nagaDev" (free devnet) or "nagaTest" (paid testnet)
export const LIT_NETWORK_NAME = optionalEnv("LIT_NETWORK", "nagaDev");

// Ethereum key for Lit auth context (Chronicle Yellowstone)
export const LIT_ETH_PRIVATE_KEY = requireEnv("LIT_DEPLOYER_PRIVATE_KEY");

// ---------------------------------------------------------------------------
// Relay wallet (Starknet burner — for gas only)
// ---------------------------------------------------------------------------

export const RELAY_STARKNET_PRIVATE_KEY = requireEnv("RELAY_STARKNET_PRIVATE_KEY");
export const RELAY_STARKNET_ACCOUNT_ADDRESS = requireEnv("RELAY_STARKNET_ACCOUNT_ADDRESS");

// ---------------------------------------------------------------------------
// Relay operational config
// ---------------------------------------------------------------------------

export const FEVM_POLL_INTERVAL_MS = parseInt(
  optionalEnv("FEVM_POLL_INTERVAL_MS", "15000"),
  10
);

export const FEVM_LOOKBACK_BLOCKS = parseInt(
  optionalEnv("FEVM_LOOKBACK_BLOCKS", "100"),
  10
);

export const TRACKED_DEALS_CONFIG = optionalEnv("TRACKED_DEALS_CONFIG", "");

export function validateConfig(): void {
  const required = [
    ["RELAY_STARKNET_PRIVATE_KEY", RELAY_STARKNET_PRIVATE_KEY],
    ["RELAY_STARKNET_ACCOUNT_ADDRESS", RELAY_STARKNET_ACCOUNT_ADDRESS],
    ["LIT_DEPLOYER_PRIVATE_KEY", LIT_ETH_PRIVATE_KEY],
    ["SLA_ESCROW_ADDRESS", SLA_ESCROW_ADDRESS],
  ] as const;

  const missing = required.filter(([, val]) => !val).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const useLit = LIT_ACTION_IPFS_CID && LIT_PKP_PUBLIC_KEY && LIT_PKP_TOKEN_ID;
  console.log(`[config] Mode: ${useLit ? "Lit PKP" : "Local signer"}`);
  console.log(`[config] Escrow: ${SLA_ESCROW_ADDRESS}`);
}
