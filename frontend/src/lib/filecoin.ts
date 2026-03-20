"use client";

import { BrowserProvider, Contract } from "ethers";
import {
  FILECOIN_CALIBRATION_CHAIN_ID,
  FILECOIN_CALIBRATION_CHAIN_ID_HEX,
  FILECOIN_CALIBRATION_RPC,
  PDP_VERIFIER_ADDRESS,
  ADD_ROOTS_ABI,
} from "./constants";

export async function switchToFilecoinCalibration(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: FILECOIN_CALIBRATION_CHAIN_ID_HEX }],
    });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: FILECOIN_CALIBRATION_CHAIN_ID_HEX,
          chainName: "Filecoin Calibration",
          nativeCurrency: { name: "tFIL", symbol: "tFIL", decimals: 18 },
          rpcUrls: [FILECOIN_CALIBRATION_RPC],
          blockExplorerUrls: ["https://calibration.filfox.info/en"],
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function callAddRoots(
  proofSetId: number,
  rootCIDs: string[],
): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== FILECOIN_CALIBRATION_CHAIN_ID) {
    throw new Error("Switch to Filecoin Calibration first");
  }

  const signer = await provider.getSigner();
  const contract = new Contract(PDP_VERIFIER_ADDRESS, ADD_ROOTS_ABI, signer);

  const bytes32CIDs = rootCIDs.map((cid) => {
    const hex = cid.startsWith("0x") ? cid : "0x" + cid;
    return hex.padEnd(66, "0");
  });

  const tx = await contract.addRoots(proofSetId, bytes32CIDs);
  await tx.wait();
  return tx.hash;
}
