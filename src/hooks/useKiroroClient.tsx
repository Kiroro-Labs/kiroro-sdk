"use client";

import { useMemo } from "react";
import { createPublicClient, http, type PublicClient } from "viem";
import { base } from "viem/chains";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { SUPPORTED_CHAINS } from "../wallet";

interface KiroroClientResult {
    /** Public client for read operations */
    publicClient: PublicClient;
    /** Smart account client for write operations (from Privy) */
    smartAccountClient: ReturnType<typeof useSmartWallets>["client"];
    /** Current chain ID */
    chainId: number;
    /** Whether the client is ready */
    isReady: boolean;
}

/**
 * Hook to access raw viem clients for advanced use cases
 * 
 * @example
 * ```tsx
 * import { useKiroroClient } from "@kirorolabs/sdk";
 * 
 * function AdvancedComponent() {
 *   const { publicClient, smartAccountClient, isReady } = useKiroroClient();
 *   
 *   const readData = async () => {
 *     const balance = await publicClient.getBalance({ address: "0x..." });
 *     console.log("Balance:", balance);
 *   };
 *   
 *   return <button onClick={readData}>Read Balance</button>;
 * }
 * ```
 */
export function useKiroroClient(): KiroroClientResult {
    const { client } = useSmartWallets();

    const chainId = client?.chain?.id ?? base.id;

    // Create public client for read operations
    const publicClient = useMemo(() => {
        const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS] ?? base;
        return createPublicClient({
            chain,
            transport: http(),
        });
    }, [chainId]);

    const isReady = !!client && !!client.account;

    return {
        publicClient,
        smartAccountClient: client,
        chainId,
        isReady,
    };
}
