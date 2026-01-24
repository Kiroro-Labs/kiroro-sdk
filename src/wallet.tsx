"use client";

import { useCallback, useMemo } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { usePrivy } from "@privy-io/react-auth";
import {
    type Abi,
    type Hash,
    type TransactionReceipt,
    encodeFunctionData,
    createPublicClient,
    http,
    isAddress,
} from "viem";
import { base, baseSepolia, arbitrum, optimism, polygon, mainnet } from "viem/chains";
import type {
    KiroroWalletContextType,
    SendTransactionRequest,
    WriteContractRequest,
    TypedDataDefinition,
} from "./types";

// Supported chains mapping
const SUPPORTED_CHAINS = {
    [base.id]: base,
    [baseSepolia.id]: baseSepolia,
    [arbitrum.id]: arbitrum,
    [optimism.id]: optimism,
    [polygon.id]: polygon,
    [mainnet.id]: mainnet,
} as const;

// Only log in development
const IS_DEV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

/**
 * Hook to access Kiroro wallet transaction capabilities
 * 
 * @example
 * ```tsx
 * import { useKiroroWallet } from "@kirorolabs/sdk";
 * 
 * function SendButton() {
 *   const { sendTransaction, isReady, address } = useKiroroWallet();
 *   
 *   const handleSend = async () => {
 *     const hash = await sendTransaction({
 *       to: "0x...",
 *       value: BigInt(1e16), // 0.01 ETH
 *     });
 *     console.log("Transaction sent:", hash);
 *   };
 *   
 *   return <button onClick={handleSend} disabled={!isReady}>Send</button>;
 * }
 * ```
 */
export function useKiroroWallet(): KiroroWalletContextType {
    const { client } = useSmartWallets();
    const { user: privyUser, ready: privyReady } = usePrivy();

    // Current chain ID from smart wallet client
    const chainId = useMemo(() => {
        return client?.chain?.id ?? base.id;
    }, [client?.chain?.id]);

    // EOA address (underlying signer)
    const eoaAddress = privyUser?.wallet?.address as `0x${string}` | undefined;

    // Smart wallet address
    const smartWalletAddress = useMemo(() => {
        return client?.account?.address as `0x${string}` | undefined;
    }, [client?.account?.address]);

    // Primary address is the smart wallet (for transactions)
    const address = smartWalletAddress ?? eoaAddress;

    // Wallet is ready when Privy is ready and we have a smart wallet client
    const isReady = privyReady && !!client && !!smartWalletAddress;

    /**
     * Send a transaction
     */
    const sendTransaction = useCallback(
        async (request: SendTransactionRequest): Promise<Hash> => {
            if (!client) {
                throw new Error("[Kiroro] Wallet not ready. Please authenticate first.");
            }

            if (IS_DEV) console.log("[Kiroro] Sending transaction:", request);

            const hash = await client.sendTransaction({
                to: request.to,
                value: request.value ?? BigInt(0),
                data: request.data ?? "0x",
                chain: client.chain,
                account: client.account!,
            });

            if (IS_DEV) console.log("[Kiroro] Transaction sent:", hash);
            return hash;
        },
        [client]
    );

    /**
     * Write to a smart contract
     */
    const writeContract = useCallback(
        async <TAbi extends Abi>(request: WriteContractRequest<TAbi>): Promise<Hash> => {
            if (!client) {
                throw new Error("[Kiroro] Wallet not ready. Please authenticate first.");
            }

            if (IS_DEV) console.log("[Kiroro] Writing contract:", request.functionName, "at", request.address);

            // Encode the function call
            const data = encodeFunctionData({
                abi: request.abi,
                functionName: request.functionName,
                args: request.args ?? [],
            });

            const hash = await client.sendTransaction({
                to: request.address,
                data: data as `0x${string}`,
                value: request.value ?? BigInt(0),
                chain: client.chain,
                account: client.account!,
            });

            if (IS_DEV) console.log("[Kiroro] Contract write sent:", hash);
            return hash;
        },
        [client]
    );

    /**
     * Sign a message
     */
    const signMessage = useCallback(
        async (message: string): Promise<Hash> => {
            if (!client) {
                throw new Error("[Kiroro] Wallet not ready. Please authenticate first.");
            }

            if (IS_DEV) console.log("[Kiroro] Signing message");

            // @ts-ignore - Privy smart wallet client has slightly different interface
            const signature = await client.signMessage({ message });

            return signature;
        },
        [client]
    );

    /**
     * Sign typed data (EIP-712)
     */
    const signTypedData = useCallback(
        async (typedData: TypedDataDefinition): Promise<Hash> => {
            if (!client) {
                throw new Error("[Kiroro] Wallet not ready. Please authenticate first.");
            }

            if (IS_DEV) console.log("[Kiroro] Signing typed data");

            // @ts-ignore - Privy smart wallet client has slightly different interface
            const signature = await client.signTypedData(typedData as any);

            return signature;
        },
        [client]
    );

    /**
     * Switch to a different chain
     */
    const switchChain = useCallback(
        async (targetChainId: number): Promise<void> => {
            if (!client) {
                throw new Error("[Kiroro] Wallet not ready. Please authenticate first.");
            }

            const chain = SUPPORTED_CHAINS[targetChainId as keyof typeof SUPPORTED_CHAINS];
            if (!chain) {
                throw new Error(`[Kiroro] Chain ${targetChainId} is not supported.`);
            }

            if (IS_DEV) console.log("[Kiroro] Switching to chain:", chain.name);
            await client.switchChain({ id: targetChainId });
        },
        [client]
    );

    /**
     * Wait for a transaction to be confirmed
     */
    const waitForTransaction = useCallback(
        async (hash: Hash): Promise<TransactionReceipt> => {
            const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS] ?? base;

            const publicClient = createPublicClient({
                chain,
                transport: http(),
            });

            if (IS_DEV) console.log("[Kiroro] Waiting for transaction:", hash);

            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            if (IS_DEV) console.log("[Kiroro] Transaction confirmed:", receipt.status);
            return receipt;
        },
        [chainId]
    );

    return {
        // State
        address,
        smartWalletAddress,
        eoaAddress,
        isReady,
        chainId,

        // Transactions
        sendTransaction,
        writeContract,

        // Signing
        signMessage,
        signTypedData,

        // Chain management
        switchChain,

        // Utilities
        waitForTransaction,
    };
}

// Export supported chains for consumer convenience
export { SUPPORTED_CHAINS };
