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

export function useTransaction(account: AccountInterface | null) {
  const [result, setResult] = useState<TransactionResult>({ state: "idle" });

  const execute = useCallback(
    async (calls: Call | Call[]) => {
      if (!account) {
        setResult({ state: "failed", error: "Wallet not connected" });
        return;
      }

      setResult({ state: "pending" });

      try {
        const tx = await account.execute(Array.isArray(calls) ? calls : [calls]);
        const txHash = tx.transaction_hash;
        setResult({ state: "confirming", txHash });

        await provider.waitForTransaction(txHash);
        setResult({ state: "confirmed", txHash });
      } catch (err: any) {
        const message =
          err?.message?.includes("User abort") || err?.message?.includes("rejected")
            ? "Transaction rejected"
            : err?.message ?? "Transaction failed";
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
