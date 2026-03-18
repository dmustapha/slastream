// File: relay/src/local-signer.ts
// Local secp256k1 signer — fallback when Lit Protocol faucet is unavailable.
// Signs the same payload the Lit Action would, producing identical (r, s, v).
// The Cairo contract only verifies the secp256k1 signature — it doesn't know
// whether Lit or a local key produced it.

import { ethers } from "ethers";
import type { LitActionParams, LitSig } from "./types";

export class LocalSigner {
  private wallet: ethers.Wallet;

  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
    console.log("[local-signer] Initialized with address:", this.wallet.address);
  }

  async connect(): Promise<void> {
    console.log("[local-signer] Ready (no network connection needed)");
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async executeAction(params: LitActionParams): Promise<LitSig> {
    console.log("[local-signer] Signing payload for deal:", params.dealId);

    // Construct the same payload the Lit Action builds:
    // keccak256(solidityPack(['uint256','uint256','uint256','uint256','uint256'],
    //   [dealId, chunkIndex, proofSetId, rootCID, timestamp]))
    const packedData = ethers.utils.solidityPack(
      ["uint256", "uint256", "uint256", "uint256", "uint256"],
      [
        ethers.BigNumber.from(params.dealId),
        ethers.BigNumber.from(params.chunkIndex),
        ethers.BigNumber.from(params.proofSetId),
        ethers.BigNumber.from(params.rootCID),
        ethers.BigNumber.from(params.timestamp),
      ]
    );

    const msgHash = ethers.utils.keccak256(packedData);
    const msgHashBytes = ethers.utils.arrayify(msgHash);

    // Sign the raw hash (not EIP-191 prefixed)
    const signingKey = new ethers.utils.SigningKey(this.wallet.privateKey);
    const sig = signingKey.signDigest(msgHashBytes);

    const rawV = sig.v;
    const normalizedV = rawV >= 27 ? rawV - 27 : rawV;

    console.log("[local-signer] Signed. v:", normalizedV);

    return {
      sig_r: sig.r,
      sig_s: sig.s,
      sig_v: normalizedV,
    };
  }
}
