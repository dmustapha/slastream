"use client";

import { useState, useCallback, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { FILECOIN_CALIBRATION_CHAIN_ID } from "@/lib/constants";
import { switchToFilecoinCalibration } from "@/lib/filecoin";

interface UseFilecoinWalletReturn {
  address: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchChain: () => Promise<void>;
}

export function useFilecoinWallet(): UseFilecoinWalletReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorrectChain = chainId === FILECOIN_CALIBRATION_CHAIN_ID;

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress(accounts[0] ?? null);
    };
    const handleChain = (...args: unknown[]) => {
      setChainId(parseInt(args[0] as string, 16));
    };

    const eth = window.ethereum;
    eth.on("accountsChanged", handleAccounts);
    eth.on("chainChanged", handleChain);
    return () => {
      eth.removeListener("accountsChanged", handleAccounts);
      eth.removeListener("chainChanged", handleChain);
    };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask not installed");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      setAddress(await signer.getAddress());
      setChainId(Number(network.chainId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchChain = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask not installed");
      return;
    }
    setError(null);
    try {
      await switchToFilecoinCalibration();
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chain switch failed");
    }
  }, []);

  return { address, chainId, isCorrectChain, connecting, error, connect, switchChain };
}
