"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { base } from "viem/chains";
import { ThreadsAuthProvider, useThreadsAuth } from "./threads-auth";
import type {
    KiroroUser,
    KiroroConfig,
    KiroroAuthContextType,
    ValidateKeyResponse
} from "./types";

// Re-export types for consumers
export type { KiroroUser, KiroroConfig, KiroroAuthContextType } from "./types";

// Constants
const DEFAULT_BACKEND = "https://app.kiroro.xyz";
const DEFAULT_PRIVY_APP_ID = "clz5r7z0n00v1v7q6worlx8mk"; // Kiroro's managed Privy App

const KiroroAuthContext = createContext<KiroroAuthContextType | null>(null);

/**
 * Hook to access Kiroro authentication state and methods
 */
export function useKiroroAuth(): KiroroAuthContextType {
    const context = useContext(KiroroAuthContext);
    if (!context) {
        throw new Error("useKiroroAuth must be used within KiroroProvider");
    }
    return context;
}

interface KiroroProviderProps {
    children: React.ReactNode;
    config: KiroroConfig;
}

/**
 * Internal provider that combines Threads auth with Privy wallets
 */
function KiroroInternalProvider({
    children,
    config
}: {
    children: React.ReactNode;
    config: KiroroConfig;
}) {
    const { user: privyUser, ready: privyReady, createWallet } = usePrivy();
    const {
        user: threadsUser,
        isLoading: threadsLoading,
        error: threadsError,
        initiateThreadsLogin,
        logout: threadsLogout,
        getAccessToken
    } = useThreadsAuth();

    const [user, setUser] = useState<KiroroUser | null>(null);
    const [isValidated, setIsValidated] = useState(false);
    const [validating, setValidating] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string | null>(null);
    const [tier, setTier] = useState<string | null>(null);

    const backendUrl = config.backendUrl || DEFAULT_BACKEND;

    // Validate API key on mount
    useEffect(() => {
        const validateKey = async () => {
            if (!config.kiroroClientId) {
                setError("kiroroClientId is required");
                setValidating(false);
                return;
            }

            try {
                const response = await fetch(`${backendUrl}/api/validate-key`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ apiKey: config.kiroroClientId }),
                });

                const data: ValidateKeyResponse = await response.json();

                if (response.ok && data.valid) {
                    setIsValidated(true);
                    setProjectName(data.projectName || null);
                    setTier(data.tier || "starter");
                    console.log(`[Kiroro] ✓ Connected to "${data.projectName}" (${data.tier} tier)`);
                } else {
                    setError(data.error || "Invalid API Key");
                    console.error(`[Kiroro] ✗ ${data.error || "Invalid Client ID"}`);
                }
            } catch (err) {
                // Allow offline/dev mode with warning
                console.warn("[Kiroro] Backend unreachable. Running in offline mode.");
                setIsValidated(true);
            } finally {
                setValidating(false);
            }
        };

        validateKey();
    }, [config.kiroroClientId, backendUrl]);

    // Sync Threads user with Privy embedded wallet
    useEffect(() => {
        if (threadsUser && privyReady) {
            const walletAddress = privyUser?.wallet?.address;

            setUser({
                id: threadsUser.id,
                threadsId: threadsUser.threadsId,
                username: threadsUser.username,
                picture: threadsUser.picture,
                walletAddress,
                isVerified: threadsUser.isVerified,
            });

            // Create embedded wallet if user doesn't have one
            if (!walletAddress && typeof createWallet === 'function') {
                createWallet().catch(console.error);
            }
        } else if (!threadsUser) {
            setUser(null);
        }
    }, [threadsUser, privyReady, privyUser, createWallet]);

    // Update wallet address when Privy user changes
    useEffect(() => {
        if (user && privyUser?.wallet?.address && user.walletAddress !== privyUser.wallet.address) {
            setUser(prev => prev ? { ...prev, walletAddress: privyUser.wallet?.address } : null);
        }
    }, [privyUser?.wallet?.address, user]);

    /**
     * Initiate login flow
     */
    const login = useCallback(() => {
        if (!isValidated && !validating) {
            console.error(`[Kiroro] Cannot login: ${error || "Invalid API Key"}`);
            return;
        }
        initiateThreadsLogin(config.kiroroClientId, backendUrl);
    }, [isValidated, validating, error, initiateThreadsLogin, config.kiroroClientId, backendUrl]);

    /**
     * Logout
     */
    const logout = useCallback(() => {
        threadsLogout();
        setUser(null);
    }, [threadsLogout]);

    const isLoading = !privyReady || validating || threadsLoading;

    return (
        <KiroroAuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                isValidated,
                error: error || threadsError,
                projectName,
                tier,
                login,
                logout,
                getAccessToken,
            }}
        >
            {children}
        </KiroroAuthContext.Provider>
    );
}

/**
 * Main Kiroro Provider - wrap your app with this
 * 
 * @example
 * ```tsx
 * import { KiroroProvider } from "@kirorolabs/sdk";
 * 
 * function App() {
 *   return (
 *     <KiroroProvider config={{ kiroroClientId: "kiro_abc123..." }}>
 *       <YourApp />
 *     </KiroroProvider>
 *   );
 * }
 * ```
 */
export function KiroroProvider({ children, config }: KiroroProviderProps) {
    const privyAppId = config.privyAppId || DEFAULT_PRIVY_APP_ID;
    const backendUrl = config.backendUrl || DEFAULT_BACKEND;
    const theme = config.appearance?.theme || "dark";
    const accentColor = config.appearance?.accentColor || "#2563EB";

    return (
        <PrivyProvider
            appId={privyAppId}
            config={{
                loginMethods: ["wallet"], // Wallet only since Threads is our primary
                appearance: {
                    theme,
                    logo: config.appearance?.logo,
                },
                embeddedWallets: {
                    createOnLogin: "users-without-wallets",
                },
                defaultChain: base,
                supportedChains: [base],
            }}
        >
            <SmartWalletsProvider>
                <ThreadsAuthProvider backendUrl={backendUrl}>
                    <KiroroInternalProvider config={config}>
                        {children}
                    </KiroroInternalProvider>
                </ThreadsAuthProvider>
            </SmartWalletsProvider>
        </PrivyProvider>
    );
}

/**
 * Pre-built Connect Button component
 */
export function KiroroConnectButton({
    className = "",
    children
}: {
    className?: string;
    children?: React.ReactNode;
}) {
    const { user, isAuthenticated, isLoading, login, logout } = useKiroroAuth();

    if (isLoading) {
        return (
            <button
                disabled
                className={`kiroro-btn kiroro-btn-loading ${className}`}
            >
                Loading...
            </button>
        );
    }

    if (isAuthenticated && user) {
        return (
            <div className={`kiroro-user ${className}`}>
                <img
                    src={user.picture}
                    alt={user.username}
                    className="kiroro-avatar"
                />
                <span className="kiroro-username">@{user.username}</span>
                <button onClick={logout} className="kiroro-btn kiroro-btn-logout">
                    Logout
                </button>
            </div>
        );
    }

    return (
        <button onClick={login} className={`kiroro-btn kiroro-btn-connect ${className}`}>
            {children || "Connect with Threads"}
        </button>
    );
}
