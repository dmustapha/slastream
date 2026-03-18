"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AccountInterface } from "starknet";
import { constants } from "starknet";

const SN_SEPOLIA_CHAIN_ID = constants.StarknetChainId.SN_SEPOLIA;

// Request the wallet to switch to Sepolia — silently ignored if unsupported
async function ensureSepoliaNetwork(wallet: any): Promise<void> {
  try {
    if (typeof wallet?.request === "function") {
      await wallet.request({
        type: "wallet_switchStarknetChain",
        params: { chainId: SN_SEPOLIA_CHAIN_ID },
      });
    }
  } catch {
    // Wallet may not support this RPC method — continue anyway
  }
}

interface WalletState {
  address: string | null;
  account: AccountInterface | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
}

async function buildWalletAccount(
  wallet: any,
  address: string,
): Promise<AccountInterface> {
  const { WalletAccount, RpcProvider } = await import("starknet");
  const provider = new RpcProvider({
    nodeUrl:
      process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
      "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo",
  });
  return new WalletAccount(
    provider,
    wallet,
    address,
  ) as unknown as AccountInterface;
}

function extractAddress(result: any): string | null {
  const connectorData = result.connectorData as any;
  const wallet = result.wallet as any;
  return (
    connectorData?.account ??
    wallet?.selectedAddress ??
    wallet?.account?.address ??
    null
  );
}

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>({
    address: null,
    account: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });
  const connectingRef = useRef(false);

  // Silent auto-reconnect on mount — no modal, no user interaction
  useEffect(() => {
    let cancelled = false;

    async function tryReconnect() {
      // Only attempt if starknetkit saved a last-connected wallet
      const lastWallet = localStorage.getItem("starknetLastConnectedWallet");
      if (!lastWallet) return;

      try {
        const { connect: skConnect } = await import("starknetkit");
        const result = await skConnect({
          modalMode: "neverAsk",
          dappName: "SLAStream",
          modalTheme: "dark",
        });

        if (cancelled || !result?.wallet) return;

        await ensureSepoliaNetwork(result.wallet);

        const address = extractAddress(result);
        if (!address) return;

        const account = await buildWalletAccount(result.wallet, address);
        if (cancelled) return;

        setState({
          address,
          account,
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      } catch {
        // Silent fail — user can manually connect
      }
    }

    tryReconnect();
    return () => {
      cancelled = true;
    };
  }, []);

  // Interactive connect — always show wallet picker modal
  const connect = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      const { connect: skConnect } = await import("starknetkit");
      const result = await skConnect({
        modalMode: "alwaysAsk",
        dappName: "SLAStream",
        modalTheme: "dark",
      });

      if (!result) {
        setState((s) => ({ ...s, isConnecting: false }));
        return;
      }

      const wallet = result.wallet as any;

      // Ask wallet to switch to Sepolia before proceeding
      await ensureSepoliaNetwork(wallet);

      const address = extractAddress(result);

      if (!address) {
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: "Connected but no address returned",
        }));
        return;
      }

      const account = await buildWalletAccount(wallet, address);

      setState({
        address,
        account,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      console.error("[SLAStream] connect error:", err);
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err instanceof Error ? err.message : "Connection failed",
      }));
    } finally {
      connectingRef.current = false;
    }
  }, []);

  const disconnect = useCallback(() => {
    import("starknetkit").then(({ disconnect: skDisconnect }) => {
      skDisconnect({ clearLastWallet: true });
    });
    setState({
      address: null,
      account: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  return { ...state, connect, disconnect };
}
