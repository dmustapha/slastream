// File: relay/scripts/deploy-mock-pdp.ts
// Deploys MockPDPVerifier to Filecoin Calibration FEVM.

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const FEVM_RPC_URL =
  process.env.FEVM_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1";

const DEPLOYER_PRIVATE_KEY = process.env.LIT_DEPLOYER_PRIVATE_KEY;

if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error("Missing LIT_DEPLOYER_PRIVATE_KEY in .env");
}

// Pre-compiled from contracts/MockPDPVerifier.sol (solc 0.8.28)
const MOCK_PDP_ABI = [
  "event RootsAdded(uint256 indexed proofSetId, bytes32[] rootCIDs)",
  "event ProofSetLive(uint256 indexed proofSetId)",
  "function nextProofSetId() view returns (uint256)",
  "function createProofSet() returns (uint256)",
  "function addRoots(uint256 proofSetId, bytes32[] rootCIDs)",
];

const MOCK_PDP_BYTECODE =
  "0x608060405260015f553480156012575f5ffd5b5061020a806100205f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c8063bc96e20514610043578063f621149214610058578063fea5a16a14610072575b5f5ffd5b6100566100513660046100ff565b61007a565b005b6100606100b9565b60405190815260200160405180910390f35b6100605f5481565b827f99f7782ee2f637075b86aa3406f31c03a322925b53e42ef2daeb53c646f8f40b83836040516100ac929190610179565b60405180910390a2505050565b5f8054819081806100c9836101b0565b9091555060405190915081907f4c0ee6e6655ba8eafaad738e4700fd5d35761fb8c52622a5713bcf1199968059905f90a2919050565b5f5f5f60408486031215610111575f5ffd5b83359250602084013567ffffffffffffffff81111561012e575f5ffd5b8401601f8101861361013e575f5ffd5b803567ffffffffffffffff811115610154575f5ffd5b8660208260051b8401011115610168575f5ffd5b939660209190910195509293505050565b602080825281018290525f6001600160fb1b03831115610197575f5ffd5b8260051b80856040850137919091016040019392505050565b5f600182016101cd57634e487b7160e01b5f52601160045260245ffd5b506001019056fea26469706673582212203bd8c6855783f6c57abc05c877a0cd5d39b03e4e91742426ed40485bdaaf2a3364736f6c634300081c0033";

async function deployMockPDP(): Promise<void> {
  console.log("[deploy-mock-pdp] Connecting to Calibration FEVM...");
  console.log("  RPC:", FEVM_RPC_URL);

  const provider = new ethers.providers.JsonRpcProvider(FEVM_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY!, provider);

  const balance = await wallet.getBalance();
  console.log("  Deployer:", wallet.address);
  console.log("  Balance:", ethers.utils.formatEther(balance), "FIL");

  if (balance.isZero()) {
    throw new Error(
      `Deployer ${wallet.address} has zero balance. ` +
        "Fund it via https://faucet.calibnet.chainsafe-fil.io"
    );
  }

  console.log("[deploy-mock-pdp] Deploying MockPDPVerifier...");
  const factory = new ethers.ContractFactory(
    MOCK_PDP_ABI,
    MOCK_PDP_BYTECODE,
    wallet
  );
  const contract = await factory.deploy();
  console.log("  Deploy tx:", contract.deployTransaction.hash);

  await contract.deployed();

  const nextId = await contract.nextProofSetId();
  console.log("  nextProofSetId:", nextId.toString());

  console.log("\n[deploy-mock-pdp] MockPDPVerifier deployed!");
  console.log("  Contract address:", contract.address);
  console.log(
    "  Filfox URL: https://calibration.filfox.info/en/address/" +
      contract.address
  );

  console.log("\n[deploy-mock-pdp] === ADD TO .env ===");
  console.log(`PDP_VERIFIER_ADDRESS=${contract.address}`);
  console.log("=====================================\n");
}

deployMockPDP().catch((err) => {
  console.error("[deploy-mock-pdp] Fatal error:", err);
  process.exit(1);
});
