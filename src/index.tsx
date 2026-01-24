"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { base, baseSepolia, arbitrum, optimism, polygon, mainnet } from "viem/chains";
import { ThreadsAuthProvider, useThreadsAuth } from "./threads-auth";
import type {
    KiroroUser,
    KiroroConfig,
    KiroroAuthContextType,
    ValidateKeyResponse
} from "./types";

// Re-export types for consumers
export type {
    KiroroUser,
    KiroroConfig,
    KiroroAuthContextType,
    KiroroWalletContextType,
    SendTransactionRequest,
    WriteContractRequest,
    TypedDataDefinition,
} from "./types";

// Re-export wallet hook
export { useKiroroWallet, SUPPORTED_CHAINS } from "./wallet";

// Re-export helper hooks
export {
    useKiroroToken,
    useKiroroNFT,
    useKiroroClient,
    useKiroroEvents,
} from "./hooks";

// Constants
const DEFAULT_BACKEND = "https://app.kiroro.xyz";
const DEFAULT_PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmk2ylfti000jjj0drm8hn5d2"; // Kiroro's managed Privy App

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
        accessToken: threadsToken,
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


    // 2. Manage Wallet & User State
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

            // Only create wallet if user is FULLY authenticated with privy
            if (privyUser && !walletAddress && typeof createWallet === 'function') {
                console.log("[Kiroro] Creating embedded wallet...");
                createWallet().catch((err: any) => {
                    // Ignore if already creating or unrelated error
                    console.warn("[Kiroro] Wallet creation skipped:", err.message);
                });
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
    const backendUrl = config.backendUrl || DEFAULT_BACKEND;

    return (
        <ThreadsAuthProvider backendUrl={backendUrl}>
            <PrivyWrapper config={config}>
                {children}
            </PrivyWrapper>
        </ThreadsAuthProvider>
    );
}

function PrivyWrapper({ children, config }: { children: React.ReactNode; config: KiroroConfig }) {
    const privyAppId = config.privyAppId || DEFAULT_PRIVY_APP_ID;
    const theme = config.appearance?.theme || "dark";
    const { getAccessToken, isLoading: isThreadsLoading } = useThreadsAuth();

    return (
        <PrivyProvider
            appId={privyAppId}
            config={{
                loginMethods: ["wallet"],
                appearance: {
                    theme,
                    logo: config.appearance?.logo,
                },
                embeddedWallets: {
                    createOnLogin: "users-without-wallets",
                },
                defaultChain: base,
                supportedChains: [base],
                customAuth: {
                    enabled: true,
                    isLoading: isThreadsLoading,
                    getCustomAccessToken: async () => {
                        const token = await getAccessToken();
                        return token || undefined;
                    }
                }
            }}
        >
            <SmartWalletsProvider>
                <KiroroInternalProvider config={config}>
                    {children}
                </KiroroInternalProvider>
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
