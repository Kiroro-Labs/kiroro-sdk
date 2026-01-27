"use client";

import { useCallback, useMemo } from "react";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import {
    Connection,
    Transaction,
    PublicKey,
    clusterApiUrl
} from "@solana/web3.js";
import { KiroroSolanaContextType, SolanaCluster } from "./types";

export function useKiroroSolana(clusters?: SolanaCluster[]): KiroroSolanaContextType {
    const { wallets, createWallet } = useSolanaWallets();

    // Get the first active Solana wallet
    const wallet = useMemo(() => wallets[0], [wallets]);

    const connect = useCallback(async () => {
        if (!wallet) {
            try {
                await createWallet();
            } catch (err) {
                console.error("[Kiroro] Failed to create Solana wallet:", err);
            }
        }
    }, [wallet, createWallet]);

    const signMessage = useCallback(async (message: string) => {
        if (!wallet) throw new Error("No Solana wallet connected");

        const encodedMessage = new TextEncoder().encode(message);
        return await wallet.signMessage(encodedMessage);
    }, [wallet]);

    const sendTransaction = useCallback(async (
        transaction: Transaction,
        connection: Connection
    ) => {
        if (!wallet) throw new Error("No Solana wallet connected");

        // Ensure wallet behaves like a signer
        // Privy's wallet object might need specific handling depending on version
        // Usually assume standard adapter interface

        // Note: In a real app, you might want to handle fee payer logic here
        // or let the consumer handle it.

        // For Privy integrated wallets:
        const signature = await wallet.signTransaction(transaction);
        // Then we broadcast

        // Actually Privy's `signTransaction` might return the signed transaction object
        // We'll need to verify the exact return type of Privy's useSolanaWallets().wallets[0].signTransaction
        // Assuming it aligns with Wallet Adapter Standard

        // Broadcasst
        const rawTransaction = signature.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction);
        return txid;
    }, [wallet]);

    return {
        connect,
        signMessage,
        sendTransaction,
        walletAddress: wallet?.address || null,
        isConnected: !!wallet
    };
}
