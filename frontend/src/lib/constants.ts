export const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export const SN_SEPOLIA_CHAIN_ID = "SN_SEPOLIA";

export const STARKSCAN_BASE = "https://sepolia.starkscan.co";

// Filecoin Calibration
export const FILECOIN_CALIBRATION_CHAIN_ID = 314159;
export const FILECOIN_CALIBRATION_CHAIN_ID_HEX = "0x4CB2F";
export const FILECOIN_CALIBRATION_RPC =
  process.env.NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC ||
  "https://api.calibration.node.glif.io/rpc/v1";
export const PDP_VERIFIER_ADDRESS =
  process.env.NEXT_PUBLIC_PDP_VERIFIER_ADDRESS ||
  "0x7e5e5f5D80d73a1Cc9E960A3cB3f9b35fdE49e25";

export const ADD_ROOTS_ABI = [
  "function addRoots(uint256 proofSetId, bytes32[] calldata rootCIDs) external",
];

export const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "core::starknet::contract_address::ContractAddress" },
      { name: "amount", type: "core::integer::u256" },
    ],
    outputs: [{ type: "core::bool" }],
    state_mutability: "external",
  },
] as const;
