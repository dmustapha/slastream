// File: relay/scripts/deploy-contract.ts

import { RpcProvider, Account, CallData, uint256 } from "starknet";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const STARKNET_RPC_URL =
  process.env.STARKNET_RPC_URL ||
  "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo";

const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

const STARKNET_DEPLOYER_PRIVATE_KEY = process.env.RELAY_STARKNET_PRIVATE_KEY;
const STARKNET_DEPLOYER_ADDRESS = process.env.RELAY_STARKNET_ACCOUNT_ADDRESS;
const PKP_PUBLIC_KEY_X = process.env.PKP_PUBLIC_KEY_X;
const PKP_PUBLIC_KEY_Y = process.env.PKP_PUBLIC_KEY_Y;

if (!STARKNET_DEPLOYER_PRIVATE_KEY || !STARKNET_DEPLOYER_ADDRESS) {
  throw new Error("Missing RELAY_STARKNET_PRIVATE_KEY or RELAY_STARKNET_ACCOUNT_ADDRESS in .env");
}
if (!PKP_PUBLIC_KEY_X || !PKP_PUBLIC_KEY_Y) {
  throw new Error(
    "Missing PKP_PUBLIC_KEY_X or PKP_PUBLIC_KEY_Y in .env. Run deploy-lit-action.ts first."
  );
}

async function deployContract(): Promise<void> {
  console.log("[deploy-contract] Starting SLAEscrow deployment...");

  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  const account = new Account(
    provider,
    STARKNET_DEPLOYER_ADDRESS!,
    STARKNET_DEPLOYER_PRIVATE_KEY!
  );

  const sierraPath = path.resolve(
    __dirname,
    "../../contracts/target/dev/slastream_contracts_SLAEscrow.contract_class.json"
  );
  const casmPath = path.resolve(
    __dirname,
    "../../contracts/target/dev/slastream_contracts_SLAEscrow.compiled_contract_class.json"
  );

  if (!fs.existsSync(sierraPath)) {
    throw new Error(
      `Sierra file not found at ${sierraPath}. Run: cd contracts && scarb build`
    );
  }
  if (!fs.existsSync(casmPath)) {
    throw new Error(
      `CASM file not found at ${casmPath}. Run: cd contracts && scarb build`
    );
  }

  const sierraContract = JSON.parse(fs.readFileSync(sierraPath, "utf-8"));
  const casmContract = JSON.parse(fs.readFileSync(casmPath, "utf-8"));

  console.log("[deploy-contract] Contract files loaded.");
  console.log("[deploy-contract] Declaring contract class...");

  let declareResult;
  try {
    declareResult = await account.declare({
      contract: sierraContract,
      casm: casmContract,
    });
    await provider.waitForTransaction(declareResult.transaction_hash);
    console.log("[deploy-contract] Contract declared. Class hash:", declareResult.class_hash);
  } catch (err: any) {
    if (err.message && err.message.includes("already declared")) {
      console.log("[deploy-contract] Contract already declared. Extracting class hash...");
      declareResult = { class_hash: err.class_hash || err.message.match(/0x[0-9a-f]+/i)?.[0] };
      if (!declareResult.class_hash) {
        throw new Error("Could not extract class hash from already-declared error: " + err.message);
      }
    } else {
      throw err;
    }
  }

  const pkpXBigInt = BigInt(PKP_PUBLIC_KEY_X!);
  const pkpYBigInt = BigInt(PKP_PUBLIC_KEY_Y!);

  const constructorCalldata = CallData.compile({
    pkp_public_key_x: uint256.bnToUint256(pkpXBigInt),
    pkp_public_key_y: uint256.bnToUint256(pkpYBigInt),
    strk_token_address: STRK_TOKEN_ADDRESS,
  });

  console.log("[deploy-contract] Deploying contract with constructor args:");
  console.log("  pkp_public_key_x:", PKP_PUBLIC_KEY_X);
  console.log("  pkp_public_key_y:", PKP_PUBLIC_KEY_Y);
  console.log("  strk_token_address:", STRK_TOKEN_ADDRESS);

  const deployResult = await account.deployContract({
    classHash: declareResult.class_hash,
    constructorCalldata,
    salt: "0x1",
  });

  await provider.waitForTransaction(deployResult.transaction_hash);

  const contractAddress = deployResult.contract_address;

  console.log("[deploy-contract] Contract deployed successfully!");
  console.log("  Contract address:", contractAddress);
  console.log("  Deploy tx hash:", deployResult.transaction_hash);
  console.log(
    "  Starkscan URL: https://sepolia.starkscan.co/contract/" + contractAddress
  );

  console.log("\n[deploy-contract] === ADD TO .env ===");
  console.log(`SLA_ESCROW_ADDRESS=${contractAddress}`);
  console.log("=====================================\n");
}

deployContract().catch((err) => {
  console.error("[deploy-contract] Fatal error:", err);
  process.exit(1);
});
