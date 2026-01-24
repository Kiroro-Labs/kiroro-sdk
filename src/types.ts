"use client";

import type { Abi, TransactionReceipt, Chain } from "viem";

/**
 * Kiroro SDK Type Definitions - v2.0
 */

// ============================================
// User Types
// ============================================

export interface KiroroUser {
    id: string;
    threadsId: string;
    username: string;
    picture: string;
    walletAddress?: string;
    isVerified?: boolean;
    /** ERC-4337 smart wallet address */
    smartWalletAddress?: string;
    /** Underlying EOA signer address */
    eoaAddress?: string;
    /** Current chain ID */
    chainId?: number;
}

// ============================================
// Configuration Types
// ============================================

export interface KiroroConfig {
    /** Your Kiroro Client ID from the dashboard */
    kiroroClientId: string;
    /** Optional: Custom Privy App ID for white-label mode */
    privyAppId?: string;
    /** Optional: Override the backend URL (default: https://app.kiroro.xyz) */
    backendUrl?: string;
    /** Enable gasless transactions (requires Pro tier or higher) */
    gasless?: boolean;
    /** Custom appearance options */
    appearance?: {
        theme?: "dark" | "light";
        accentColor?: string;
        logo?: string;
    };
    /** Supported chains (defaults to Base) */
    chains?: Chain[];
    /** Default chain (defaults to Base) */
    defaultChain?: Chain;
    /** Paymaster configuration for gasless transactions */
    paymaster?: {
        url: string;
        context?: Record<string, unknown>;
    };
}

// ============================================
// Auth Context Types
// ============================================

export interface KiroroAuthContextType {
    user: KiroroUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isValidated: boolean;
    error: string | null;
    projectName: string | null;
    tier: string | null;
    login: () => void;
    logout: () => void;
    getAccessToken: () => Promise<string | null>;
}

// ============================================
// Wallet Context Types (NEW in v2.0)
// ============================================

export interface KiroroWalletContextType {
    /** Primary wallet address (smart wallet if available) */
    address: `0x${string}` | undefined;
    /** ERC-4337 smart wallet address */
    smartWalletAddress: `0x${string}` | undefined;
    /** Underlying EOA signer address */
    eoaAddress: `0x${string}` | undefined;
    /** Whether the wallet is ready for transactions */
    isReady: boolean;
    /** Current chain ID */
    chainId: number;

    // Transactions
    /** Send a native token transfer or raw transaction */
    sendTransaction: (request: SendTransactionRequest) => Promise<`0x${string}`>;
    /** Call a smart contract function */
    writeContract: <TAbi extends Abi>(request: WriteContractRequest<TAbi>) => Promise<`0x${string}`>;

    // Signing
    /** Sign a plain text message */
    signMessage: (message: string) => Promise<`0x${string}`>;
    /** Sign EIP-712 typed data */
    signTypedData: (typedData: TypedDataDefinition) => Promise<`0x${string}`>;

    // Chain management
    /** Switch to a different chain */
    switchChain: (chainId: number) => Promise<void>;

    // Utilities
    /** Wait for a transaction to be confirmed */
    waitForTransaction: (hash: `0x${string}`) => Promise<TransactionReceipt>;
}

// ============================================
// Transaction Request Types
// ============================================

export interface SendTransactionRequest {
    /** Recipient address */
    to: `0x${string}`;
    /** Value in wei */
    value?: bigint;
    /** Encoded transaction data */
    data?: `0x${string}`;
    /** Override gasless setting for this transaction */
    gasless?: boolean;
}

export interface WriteContractRequest<TAbi extends Abi> {
    /** Contract address */
    address: `0x${string}`;
    /** Contract ABI */
    abi: TAbi;
    /** Function name to call */
    functionName: string;
    /** Function arguments */
    args?: readonly unknown[];
    /** Value in wei to send with the call */
    value?: bigint;
    /** Override gasless setting for this transaction */
    gasless?: boolean;
}

/** EIP-712 Typed Data Definition */
export interface TypedDataDefinition {
    domain: {
        name?: string;
        version?: string;
        chainId?: number;
        verifyingContract?: `0x${string}`;
        salt?: `0x${string}`;
    };
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
}

// ============================================
// OAuth & Session Types
// ============================================

export interface ThreadsOAuthState {
    isLoading: boolean;
    error: string | null;
}

export interface ValidateKeyResponse {
    valid: boolean;
    projectName?: string;
    tier?: string;
    privyAppId?: string;
    error?: string;
    limitExceeded?: boolean;
}

export interface ThreadsAuthResponse {
    success: boolean;
    /** The actual Threads Access Token (valid for ~60 days) to be used for data fetching */
    token?: string;
    user?: {
        id: string;
        username: string;
        picture: string;
        isVerified: boolean;
    };
    error?: string;
}

