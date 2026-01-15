"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { base } from "viem/chains";

interface KiroroUser {
    id: string;
    username: string;
    picture: string;
    walletAddress?: string;
}

interface KiroroAuthContextType {
    user: KiroroUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isValidated: boolean;
    error: string | null;
    login: () => void;
    logout: () => void;
}

const KiroroAuthContext = createContext<KiroroAuthContextType | null>(null);

export function useKiroroAuth() {
    const context = useContext(KiroroAuthContext);
    if (!context) {
        throw new Error("useKiroroAuth must be used within KiroroProvider");
    }
    return context;
}

interface KiroroProviderProps {
    children: React.ReactNode;
    config: {
        kiroroClientId: string; // The API Key from dashboard
        privyAppId?: string;    // Optional: for custom white-label mode
        backendUrl?: string;    // Optional: override API endpoint
        gasless?: boolean;
    };
}

const KIRORO_MANAGED_PRIVY_ID = "cm5s8zw0n00v1v7q6l7q6l7q6"; // Kiroro's Master Privy ID
const DEFAULT_BACKEND = "https://app.kiroro.xyz"; // Production API endpoint

function KiroroInternalProvider({ children, config }: { children: React.ReactNode, config: KiroroProviderProps['config'] }) {
    const { login, logout, authenticated, user: privyUser, ready: privyReady } = usePrivy();
    const [user, setUser] = useState<KiroroUser | null>(null);
    const [isValidated, setIsValidated] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validating, setValidating] = useState(true);

    useEffect(() => {
        const validateKey = async () => {
            try {
                const response = await fetch(`${config.backendUrl || DEFAULT_BACKEND}/api/validate-key`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ apiKey: config.kiroroClientId }),
                });

                const data = await response.json();

                if (response.ok && data.valid) {
                    setIsValidated(true);
                    console.log(`[Kiroro] Successfully connected to ${data.projectName} (${data.tier} tier)`);
                } else {
                    setError(data.error || "Invalid Kiroro Client ID");
                    console.error(`[Kiroro Error] ${data.error || "Invalid Client ID"}`);
                }
            } catch (err) {
                console.warn("[Kiroro] Backend validation offline. Running in offline/dev mode.");
                // For dev UX, we might allow it anyway with a warning
                setIsValidated(true);
            } finally {
                setValidating(false);
            }
        };

        validateKey();
    }, [config.kiroroClientId, config.backendUrl]);

    useEffect(() => {
        if (privyReady && authenticated && privyUser) {
            setUser({
                id: privyUser.id,
                username: "threads_user",
                picture: "https://threads.net/avatar.png",
                walletAddress: privyUser.wallet?.address
            });
        } else {
            setUser(null);
        }
    }, [privyReady, authenticated, privyUser]);

    const handleLogin = () => {
        if (!isValidated && !validating) {
            alert(`Kiroro SDK Error: ${error || "Invalid API Key"}`);
            return;
        }
        login();
    };

    return (
        <KiroroAuthContext.Provider value={{
            user,
            isAuthenticated: authenticated,
            isLoading: (!privyReady || validating),
            isValidated,
            error,
            login: handleLogin,
            logout
        }}>
            {children}
        </KiroroAuthContext.Provider>
    );
}

export function KiroroProvider({ children, config }: KiroroProviderProps) {
    const appId = config.privyAppId || KIRORO_MANAGED_PRIVY_ID;

    return (
        <PrivyProvider
            appId={appId}
            config={{
                loginMethods: ["wallet", "email", "sms"],
                appearance: {
                    theme: "dark",
                    accentColor: "#2563EB",
                    showWalletLoginFirst: false,
                },
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: "users-without-wallets",
                    },
                },
                defaultChain: base,
                supportedChains: [base],
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
