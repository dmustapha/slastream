// File: relay/src/lit-bridge.ts
// Migrated to Lit Protocol Naga V1 (SDK v8)

import { createLitClient } from "@lit-protocol/lit-client";
import { nagaDev, nagaTest } from "@lit-protocol/networks";
import { createAuthManager, storagePlugins } from "@lit-protocol/auth";
import { privateKeyToAccount } from "viem/accounts";
import {
  LIT_NETWORK_NAME,
  LIT_ACTION_IPFS_CID,
  LIT_PKP_PUBLIC_KEY,
} from "./config";

import type { LitActionParams, LitSig } from "./types";

type LitClient = Awaited<ReturnType<typeof createLitClient>>;

const NETWORK_MAP: Record<string, typeof nagaDev> = {
  nagaDev,
  nagaTest,
};

export class LitBridge {
  private litClient: LitClient | null = null;
  private authContext: any = null;
  private privateKey: `0x${string}`;

  constructor(litEthPrivateKey: string) {
    this.privateKey = litEthPrivateKey.startsWith("0x")
      ? (litEthPrivateKey as `0x${string}`)
      : (`0x${litEthPrivateKey}` as `0x${string}`);
  }

  async connect(): Promise<void> {
    const network = NETWORK_MAP[LIT_NETWORK_NAME] ?? nagaDev;

    this.litClient = await createLitClient({ network });
    console.log("[lit-bridge] Connected to Lit network:", LIT_NETWORK_NAME);

    const account = privateKeyToAccount(this.privateKey);

    const authManager = createAuthManager({
      storage: storagePlugins.localStorageNode({
        appName: "slastream-relay",
        networkName: LIT_NETWORK_NAME,
        storagePath: "./.lit-sessions",
      }),
    });

    this.authContext = await authManager.createEoaAuthContext({
      config: { account },
      authConfig: {
        domain: "slastream.localhost",
        statement: "SLAStream relay Lit session",
        resources: [
          ["lit-action-execution", "*"],
          ["pkp-signing", "*"],
        ],
        expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      litClient: this.litClient,
    });

    console.log("[lit-bridge] Auth context created");
  }

  async disconnect(): Promise<void> {
    this.litClient = null;
    this.authContext = null;
  }

  async executeAction(params: LitActionParams): Promise<LitSig> {
    if (!this.litClient || !this.authContext) {
      throw new Error("[lit-bridge] Not connected. Call connect() first.");
    }

    console.log("[lit-bridge] Executing Lit Action:", LIT_ACTION_IPFS_CID);
    console.log("[lit-bridge] jsParams:", params);

    const result = await this.litClient.executeJs({
      ipfsId: LIT_ACTION_IPFS_CID,
      authContext: this.authContext,
      jsParams: {
        dealId: params.dealId,
        chunkIndex: params.chunkIndex,
        proofSetId: params.proofSetId,
        rootCID: params.rootCID,
        timestamp: params.timestamp,
        pdpProofTxHash: params.pdpProofTxHash,
        pkpPublicKey: LIT_PKP_PUBLIC_KEY,
        fevmRpcUrl: "https://api.calibration.node.glif.io/rpc/v1",
        pdpVerifierAddress: "0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C",
      },
    });

    console.log("[lit-bridge] Raw Lit Action result:", result);

    let parsed: { sig_r: string; sig_s: string; sig_v: number };
    try {
      parsed = JSON.parse(result.response as string);
    } catch (e) {
      throw new Error(
        `[lit-bridge] Failed to parse Lit Action response: ${result.response}`
      );
    }

    const rawV = parsed.sig_v;
    const normalizedV = rawV >= 27 ? rawV - 27 : rawV;

    return {
      sig_r: parsed.sig_r,
      sig_s: parsed.sig_s,
      sig_v: normalizedV,
    };
  }
}
