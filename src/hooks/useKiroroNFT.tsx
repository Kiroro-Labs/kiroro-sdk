"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
    type Hash,
    createPublicClient,
    http,
} from "viem";
import { base } from "viem/chains";
import { useKiroroWallet, SUPPORTED_CHAINS } from "../wallet";

// Standard ERC-721 ABI for common functions
const erc721Abi = [
    {
        inputs: [{ name: "owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "tokenId", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "tokenId", type: "uint256" },
        ],
        name: "safeTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "to", type: "address" },
            { name: "tokenId", type: "uint256" },
        ],
        name: "approve",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "getApproved",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "tokenURI",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

/**
 * Hook for interacting with ERC-721 NFT contracts
 * 
 * @example
 * ```tsx
 * import { useKiroroNFT } from "@kirorolabs/sdk";
 * 
 * function NFTGallery() {
 *   const { balance, transfer, ownerOf, isLoading } = useKiroroNFT("0x...");
 *   
 *   const handleTransfer = async (tokenId: bigint) => {
 *     const hash = await transfer("0x...", tokenId);
 *     console.log("NFT transferred:", hash);
 *   };
 *   
 *   return <div>NFTs owned: {balance?.toString()}</div>;
 * }
 * ```
 */
export function useKiroroNFT(contractAddress: `0x${string}`) {
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
        if (!address || !contractAddress) return;

        setIsLoading(true);
        try {
            const bal = await publicClient.readContract({
                address: contractAddress,
                abi: erc721Abi,
                functionName: "balanceOf",
                args: [address],
            });
            setBalance(bal);
        } catch (err) {
            console.error("[Kiroro] Failed to fetch NFT balance:", err);
        } finally {
            setIsLoading(false);
        }
    }, [publicClient, address, contractAddress]);

    // Fetch balance on mount and when address changes
    useEffect(() => {
        refreshBalance();
    }, [refreshBalance]);

    /**
     * Get the owner of a specific token
     */
    const ownerOf = useCallback(
        async (tokenId: bigint): Promise<`0x${string}`> => {
            return publicClient.readContract({
                address: contractAddress,
                abi: erc721Abi,
                functionName: "ownerOf",
                args: [tokenId],
            }) as Promise<`0x${string}`>;
        },
        [publicClient, contractAddress]
    );

    /**
     * Transfer an NFT to another address
     */
    const transfer = useCallback(
        async (to: `0x${string}`, tokenId: bigint): Promise<Hash> => {
            if (!isReady || !address) {
                throw new Error("[Kiroro] Wallet not ready");
            }

            const hash = await writeContract({
                address: contractAddress,
                abi: erc721Abi,
                functionName: "safeTransferFrom",
                args: [address, to, tokenId],
            });

            // Refresh balance after transfer
            setTimeout(refreshBalance, 2000);
            return hash;
        },
        [isReady, address, writeContract, contractAddress, refreshBalance]
    );

    /**
     * Approve an address to transfer a specific token
     */
    const approve = useCallback(
        async (spender: `0x${string}`, tokenId: bigint): Promise<Hash> => {
            if (!isReady) {
                throw new Error("[Kiroro] Wallet not ready");
            }

            return writeContract({
                address: contractAddress,
                abi: erc721Abi,
                functionName: "approve",
                args: [spender, tokenId],
            });
        },
        [isReady, writeContract, contractAddress]
    );

    /**
     * Get the approved address for a token
     */
    const getApproved = useCallback(
        async (tokenId: bigint): Promise<`0x${string}`> => {
            return publicClient.readContract({
                address: contractAddress,
                abi: erc721Abi,
                functionName: "getApproved",
                args: [tokenId],
            }) as Promise<`0x${string}`>;
        },
        [publicClient, contractAddress]
    );

    /**
     * Get the token URI for metadata
     */
    const tokenURI = useCallback(
        async (tokenId: bigint): Promise<string> => {
            return publicClient.readContract({
                address: contractAddress,
                abi: erc721Abi,
                functionName: "tokenURI",
                args: [tokenId],
            });
        },
        [publicClient, contractAddress]
    );

    /**
     * Get collection name
     */
    const name = useCallback(async (): Promise<string> => {
        return publicClient.readContract({
            address: contractAddress,
            abi: erc721Abi,
            functionName: "name",
        });
    }, [publicClient, contractAddress]);

    /**
     * Get collection symbol
     */
    const symbol = useCallback(async (): Promise<string> => {
        return publicClient.readContract({
            address: contractAddress,
            abi: erc721Abi,
            functionName: "symbol",
        });
    }, [publicClient, contractAddress]);

    return {
        balance,
        isLoading,
        ownerOf,
        transfer,
        approve,
        getApproved,
        tokenURI,
        name,
        symbol,
        refreshBalance,
    };
}
