// File: relay/src/starknet-relay.ts

import { RpcProvider, Account, CallData, uint256 } from "starknet";
import {
  STARKNET_RPC_URL,
  STARKNET_RPC_URL_BACKUP,
  SLA_ESCROW_ADDRESS,
  RELAY_STARKNET_PRIVATE_KEY,
  RELAY_STARKNET_ACCOUNT_ADDRESS,
} from "./config";
import type { ReleaseParams, LitSig } from "./types";

export class StarknetRelay {
  private provider: RpcProvider;
  private account: Account;

  constructor() {
    this.provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
    this.account = new Account(
      this.provider,
      RELAY_STARKNET_ACCOUNT_ADDRESS,
      RELAY_STARKNET_PRIVATE_KEY
    );
  }

  async broadcastReleaseChunk(
    params: ReleaseParams,
    sig: LitSig
  ): Promise<string> {
    const rootCIDBigInt = BigInt(params.rootCID);
    const sigRBigInt = BigInt(sig.sig_r);
    const sigSBigInt = BigInt(sig.sig_s);

    const calldata = CallData.compile({
      deal_id: uint256.bnToUint256(params.dealId),
      chunk_index: params.chunkIndex.toString(),
      proof_set_id: uint256.bnToUint256(params.proofSetId),
      root_cid: uint256.bnToUint256(rootCIDBigInt),
      timestamp: params.timestamp.toString(),
      sig_r: uint256.bnToUint256(sigRBigInt),
      sig_s: uint256.bnToUint256(sigSBigInt),
      sig_v: sig.sig_v.toString(),
    });

    console.log("[starknet-relay] Broadcasting release_chunk:");
    console.log("  deal_id:", params.dealId.toString());
    console.log("  chunk_index:", params.chunkIndex.toString());
    console.log("  proof_set_id:", params.proofSetId.toString());
    console.log("  sig_v (normalized):", sig.sig_v);

    let txResponse;
    try {
      txResponse = await this.account.execute({
        contractAddress: SLA_ESCROW_ADDRESS,
        entrypoint: "release_chunk",
        calldata,
      });
    } catch (err) {
      console.error("[starknet-relay] Primary RPC failed, trying backup...", err);
      const backupProvider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL_BACKUP });
      const backupAccount = new Account(
        backupProvider,
        RELAY_STARKNET_ACCOUNT_ADDRESS,
        RELAY_STARKNET_PRIVATE_KEY
      );
      txResponse = await backupAccount.execute({
        contractAddress: SLA_ESCROW_ADDRESS,
        entrypoint: "release_chunk",
        calldata,
      });
    }

    console.log(
      "[starknet-relay] Transaction submitted:",
      txResponse.transaction_hash
    );

    this.provider
      .waitForTransaction(txResponse.transaction_hash)
      .then(() => {
        console.log(
          "[starknet-relay] Transaction confirmed:",
          txResponse.transaction_hash
        );
      })
      .catch((err) => {
        console.error(
          "[starknet-relay] Transaction failed to confirm:",
          txResponse.transaction_hash,
          err
        );
      });

    return txResponse.transaction_hash;
  }

  async broadcastSlash(dealId: bigint): Promise<string> {
    const calldata = CallData.compile({
      deal_id: uint256.bnToUint256(dealId),
    });

    console.log("[starknet-relay] Broadcasting slash for deal_id:", dealId.toString());

    const txResponse = await this.account.execute({
      contractAddress: SLA_ESCROW_ADDRESS,
      entrypoint: "slash",
      calldata,
    });

    console.log(
      "[starknet-relay] Slash transaction submitted:",
      txResponse.transaction_hash
    );

    return txResponse.transaction_hash;
  }
}
