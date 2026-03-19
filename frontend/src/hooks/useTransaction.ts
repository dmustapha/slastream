"use client";

import { useState, useCallback } from "react";
import type { AccountInterface, Call } from "starknet";
import { RpcProvider } from "starknet";
import type { TransactionState, TransactionResult } from "@/lib/types";

const provider = new RpcProvider({
  nodeUrl:
    process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
    "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo",
});

const TX_TIMEOUT_MS = 120_000; // 2 minutes max wait

export function useTransaction(account: AccountInterface | null) {
  const [result, setResult] = useState<TransactionResult>({ state: "idle" });

  const execute = useCallback(
    async (calls: Call | Call[]) => {
      if (!account) {
        console.error("[SLAStream] execute called without account");
        setResult({ state: "failed", error: "Wallet not connected" });
        return;
      }

      const callArray = Array.isArray(calls) ? calls : [calls];
      console.log("[SLAStream] Submitting tx with", callArray.length, "calls:");
      callArray.forEach((c, i) =>
        console.log(`  [${i}] ${c.contractAddress} → ${c.entrypoint}`),
      );

      setResult({ state: "pending" });

      try {
        console.log("[SLAStream] Calling account.execute()...");
        const tx = await account.execute(callArray);
        const txHash = tx.transaction_hash;
        console.log("[SLAStream] Tx submitted:", txHash);
        setResult({ state: "confirming", txHash });

        console.log("[SLAStream] Waiting for confirmation (timeout:", TX_TIMEOUT_MS / 1000, "s)...");
        const waitPromise = provider.waitForTransaction(txHash);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transaction confirmation timed out after 2 minutes")), TX_TIMEOUT_MS),
        );
        await Promise.race([waitPromise, timeoutPromise]);

        console.log("[SLAStream] Tx confirmed:", txHash);
        setResult({ state: "confirmed", txHash });
      } catch (err: any) {
        const raw = err?.message ?? String(err);
        console.error("[SLAStream] Tx failed:", raw);
        const message =
          raw.includes("User abort") || raw.includes("rejected")
            ? "Transaction rejected by wallet"
            : raw.includes("timed out")
              ? "Confirmation timed out — check Starkscan for tx status"
              : raw;
        setResult({ state: "failed", error: message });
      }
    },
    [account],
  );

  const reset = useCallback(() => {
    setResult({ state: "idle" });
  }, []);

  return { ...result, execute, reset };
}
