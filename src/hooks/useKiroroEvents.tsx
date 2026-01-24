"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Hash, TransactionReceipt } from "viem";

type TransactionCallback = (data: { hash: Hash }) => void;
type ReceiptCallback = (data: { hash: Hash; receipt: TransactionReceipt }) => void;
type ErrorCallback = (data: { hash?: Hash; error: Error }) => void;
type ChainCallback = (data: { chainId: number }) => void;
type WalletCallback = (data: { address: `0x${string}` }) => void;

interface EventCallbacks {
    onTransactionSent: Set<TransactionCallback>;
    onTransactionConfirmed: Set<ReceiptCallback>;
    onTransactionFailed: Set<ErrorCallback>;
    onChainChanged: Set<ChainCallback>;
    onWalletCreated: Set<WalletCallback>;
}

// Global event emitter for Kiroro events
const eventCallbacks: EventCallbacks = {
    onTransactionSent: new Set(),
    onTransactionConfirmed: new Set(),
    onTransactionFailed: new Set(),
    onChainChanged: new Set(),
    onWalletCreated: new Set(),
};

// Event emitter functions (used internally by other hooks)
export const kiroroEvents = {
    emitTransactionSent: (hash: Hash) => {
        eventCallbacks.onTransactionSent.forEach((cb) => cb({ hash }));
    },
    emitTransactionConfirmed: (hash: Hash, receipt: TransactionReceipt) => {
        eventCallbacks.onTransactionConfirmed.forEach((cb) => cb({ hash, receipt }));
    },
    emitTransactionFailed: (error: Error, hash?: Hash) => {
        eventCallbacks.onTransactionFailed.forEach((cb) => cb({ hash, error }));
    },
    emitChainChanged: (chainId: number) => {
        eventCallbacks.onChainChanged.forEach((cb) => cb({ chainId }));
    },
    emitWalletCreated: (address: `0x${string}`) => {
        eventCallbacks.onWalletCreated.forEach((cb) => cb({ address }));
    },
};

/**
 * Hook to subscribe to Kiroro wallet events
 * 
 * @example
 * ```tsx
 * import { useKiroroEvents } from "@kirorolabs/sdk";
 * 
 * function TransactionMonitor() {
 *   const { onTransactionSent, onTransactionConfirmed, onTransactionFailed } = useKiroroEvents();
 *   
 *   useEffect(() => {
 *     const unsubSent = onTransactionSent(({ hash }) => {
 *       console.log("Transaction sent:", hash);
 *     });
 *     
 *     const unsubConfirmed = onTransactionConfirmed(({ hash, receipt }) => {
 *       console.log("Transaction confirmed:", hash, receipt.status);
 *     });
 *     
 *     const unsubFailed = onTransactionFailed(({ error }) => {
 *       console.error("Transaction failed:", error);
 *     });
 *     
 *     return () => {
 *       unsubSent();
 *       unsubConfirmed();
 *       unsubFailed();
 *     };
 *   }, []);
 *   
 *   return null;
 * }
 * ```
 */
export function useKiroroEvents() {
    /**
     * Subscribe to transaction sent events
     */
    const onTransactionSent = useCallback((callback: TransactionCallback) => {
        eventCallbacks.onTransactionSent.add(callback);
        return () => {
            eventCallbacks.onTransactionSent.delete(callback);
        };
    }, []);

    /**
     * Subscribe to transaction confirmed events
     */
    const onTransactionConfirmed = useCallback((callback: ReceiptCallback) => {
        eventCallbacks.onTransactionConfirmed.add(callback);
        return () => {
            eventCallbacks.onTransactionConfirmed.delete(callback);
        };
    }, []);

    /**
     * Subscribe to transaction failed events
     */
    const onTransactionFailed = useCallback((callback: ErrorCallback) => {
        eventCallbacks.onTransactionFailed.add(callback);
        return () => {
            eventCallbacks.onTransactionFailed.delete(callback);
        };
    }, []);

    /**
     * Subscribe to chain changed events
     */
    const onChainChanged = useCallback((callback: ChainCallback) => {
        eventCallbacks.onChainChanged.add(callback);
        return () => {
            eventCallbacks.onChainChanged.delete(callback);
        };
    }, []);

    /**
     * Subscribe to wallet created events
     */
    const onWalletCreated = useCallback((callback: WalletCallback) => {
        eventCallbacks.onWalletCreated.add(callback);
        return () => {
            eventCallbacks.onWalletCreated.delete(callback);
        };
    }, []);

    return {
        onTransactionSent,
        onTransactionConfirmed,
        onTransactionFailed,
        onChainChanged,
        onWalletCreated,
    };
}
