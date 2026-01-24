"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
    type Abi,
    type Hash,
    createPublicClient,
    http,
    erc20Abi,
} from "viem";
import { base } from "viem/chains";
import { useKiroroWallet, SUPPORTED_CHAINS } from "../wallet";

/**
 * Hook for interacting with ERC-20 tokens
 * 
 * @example
 * ```tsx
 * import { useKiroroToken } from "@kirorolabs/sdk";
 * 
 * function TokenBalance() {
 *   const { balance, transfer, approve, isLoading } = useKiroroToken("0x...");
 *   
 *   const handleTransfer = async () => {
 *     const hash = await transfer("0x...", BigInt(1e18));
 *     console.log("Transfer sent:", hash);
 *   };
 *   
 *   return <div>Balance: {balance?.toString()}</div>;
 * }
 * ```
 */
export function useKiroroToken(tokenAddress: `0x${string}`) {
    const { address, chainId, writeContract, isReady } = useKiroroWallet();
    const [balance, setBalance] = useState<bigint | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    // Get public client for reading
    const publicClient = useMemo(() => {
        const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS] ?? base;
        return createPublicClient({
            chain,
            transport: http(),
        });
    }, [chainId]);

    // Fetch balance
    const refreshBalance = useCallback(async () => {
        if (!address || !tokenAddress) return;

        setIsLoading(true);
        try {
            const bal = await publicClient.readContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            });
            setBalance(bal);
        } catch (err) {
            console.error("[Kiroro] Failed to fetch token balance:", err);
        } finally {
            setIsLoading(false);
        }
    }, [publicClient, address, tokenAddress]);

    // Fetch balance on mount and when address changes
    useEffect(() => {
        refreshBalance();
    }, [refreshBalance]);

    /**
     * Transfer tokens to another address
     */
    const transfer = useCallback(
        async (to: `0x${string}`, amount: bigint): Promise<Hash> => {
            if (!isReady) {
                throw new Error("[Kiroro] Wallet not ready");
            }

            const hash = await writeContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: "transfer",
                args: [to, amount],
            });

            // Refresh balance after transfer
            setTimeout(refreshBalance, 2000);
            return hash;
        },
        [isReady, writeContract, tokenAddress, refreshBalance]
    );

    /**
     * Approve spender to spend tokens
     */
    const approve = useCallback(
        async (spender: `0x${string}`, amount: bigint): Promise<Hash> => {
            if (!isReady) {
                throw new Error("[Kiroro] Wallet not ready");
            }

            return writeContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: "approve",
                args: [spender, amount],
            });
        },
        [isReady, writeContract, tokenAddress]
    );

    /**
     * Get allowance for a spender
     */
    const allowance = useCallback(
        async (owner: `0x${string}`, spender: `0x${string}`): Promise<bigint> => {
            return publicClient.readContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: "allowance",
                args: [owner, spender],
            });
        },
        [publicClient, tokenAddress]
    );

    /**
     * Get token decimals
     */
    const decimals = useCallback(async (): Promise<number> => {
        return publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "decimals",
        });
    }, [publicClient, tokenAddress]);

    /**
     * Get token symbol
     */
    const symbol = useCallback(async (): Promise<string> => {
        return publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "symbol",
        });
    }, [publicClient, tokenAddress]);

    return {
        balance,
        isLoading,
        transfer,
        approve,
        allowance,
        decimals,
        symbol,
        refreshBalance,
    };
}
