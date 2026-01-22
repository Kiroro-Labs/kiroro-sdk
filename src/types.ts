"use client";

/**
 * Kiroro SDK Type Definitions
 */

export interface KiroroUser {
    id: string;
    threadsId: string;
    username: string;
    picture: string;
    walletAddress?: string;
    isVerified?: boolean;
}

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
}

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
    token?: string;
    user?: {
        id: string;
        username: string;
        picture: string;
        isVerified: boolean;
    };
    error?: string;
}
