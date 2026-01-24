"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { KiroroUser, ThreadsOAuthState, ThreadsAuthResponse } from "./types";

const KIRORO_BACKEND = "https://app.kiroro.xyz";
const ALLOWED_BACKENDS = ["https://app.kiroro.xyz", "https://staging.kiroro.xyz", "http://localhost:3000"];
const IS_DEV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

interface ThreadsAuthContextType {
    isLoading: boolean;
    error: string | null;
    user: KiroroUser | null;
    accessToken: string | null;
    initiateThreadsLogin: (clientId: string, backendUrl?: string) => void;
    handleCallback: (code: string, clientId: string, backendUrl?: string) => Promise<ThreadsAuthResponse>;
    logout: () => void;
    getAccessToken: () => Promise<string | null>;
}

const ThreadsAuthContext = createContext<ThreadsAuthContextType | null>(null);

export function useThreadsAuth() {
    const context = useContext(ThreadsAuthContext);
    if (!context) {
        throw new Error("useThreadsAuth must be used within ThreadsAuthProvider");
    }
    return context;
}

interface ThreadsAuthProviderProps {
    children: React.ReactNode;
    backendUrl?: string;
}

const STORAGE_KEY = "kiroro_threads_session";

interface StoredSession {
    accessToken: string;
    user: KiroroUser;
    expiresAt: number;
}

export function ThreadsAuthProvider({ children, backendUrl = KIRORO_BACKEND }: ThreadsAuthProviderProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<KiroroUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Restore session on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const session: StoredSession = JSON.parse(stored);
                // Check if session is still valid (with 5 min buffer)
                if (session.expiresAt > Date.now() + 5 * 60 * 1000) {
                    setUser(session.user);
                    setAccessToken(session.accessToken);
                    if (IS_DEV) console.log("[Kiroro] Restored session for", session.user.username);
                } else {
                    // Session expired, clear it
                    localStorage.removeItem(STORAGE_KEY);
                    if (IS_DEV) console.log("[Kiroro] Session expired, cleared");
                }
            }
        } catch (e) {
            console.warn("[Kiroro] Failed to restore session:", e);
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    /**
     * Opens Threads OAuth popup
     */
    const initiateThreadsLogin = useCallback((clientId: string, customBackendUrl?: string) => {
        const backend = customBackendUrl || backendUrl;

        // SECURITY: Warn if using untrusted backend
        if (!ALLOWED_BACKENDS.some(allowed => backend.startsWith(allowed))) {
            console.warn("[Kiroro] Warning: Using custom backend URL. Ensure it is trusted:", backend);
        }

        setIsLoading(true);
        setError(null);

        // Generate state for CSRF protection
        const state = crypto.randomUUID();
        sessionStorage.setItem("kiroro_oauth_state", state);
        sessionStorage.setItem("kiroro_client_id", clientId);

        // Redirect to our backend which handles the Threads OAuth
        const authUrl = `${backend}/api/threads/authorize?client_id=${clientId}&state=${state}`;

        // Open in popup for better UX
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            authUrl,
            "kiroro_threads_auth",
            `width=${width},height=${height},left=${left},top=${top},popup=1`
        );

        if (!popup) {
            setError("Popup blocked. Please allow popups and try again.");
            setIsLoading(false);
            return;
        }

        // Listen for callback message from popup
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== backend) return;

            if (event.data.type === "KIRORO_AUTH_SUCCESS") {
                const { token, user: authUser } = event.data;

                // Store session
                const session: StoredSession = {
                    accessToken: token,
                    user: authUser,
                    expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

                setAccessToken(token);
                setUser(authUser);
                setIsLoading(false);

                popup.close();
                window.removeEventListener("message", handleMessage);
            } else if (event.data.type === "KIRORO_AUTH_ERROR") {
                setError(event.data.error || "Authentication failed");
                setIsLoading(false);
                popup.close();
                window.removeEventListener("message", handleMessage);
            }
        };

        window.addEventListener("message", handleMessage);

        // Also poll for popup close (user might close manually)
        const pollTimer = setInterval(() => {
            if (popup.closed) {
                clearInterval(pollTimer);
                window.removeEventListener("message", handleMessage);
                if (!user) {
                    setIsLoading(false);
                }
            }
        }, 500);
    }, [backendUrl, user]);

    /**
     * Handle OAuth callback (for redirect-based flow)
     */
    const handleCallback = useCallback(async (
        code: string,
        clientId: string,
        customBackendUrl?: string
    ): Promise<ThreadsAuthResponse> => {
        const backend = customBackendUrl || backendUrl;
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${backend}/api/threads/callback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, clientId }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Authentication failed");
            }

            // Store session
            const session: StoredSession = {
                accessToken: data.token,
                user: data.user,
                expiresAt: Date.now() + 60 * 60 * 1000
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

            setAccessToken(data.token);
            setUser(data.user);
            setIsLoading(false);

            return data;
        } catch (err: any) {
            const errorMsg = err.message || "Authentication failed";
            setError(errorMsg);
            setIsLoading(false);
            return { success: false, error: errorMsg };
        }
    }, [backendUrl]);

    /**
     * Logout - clear session
     */
    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem("kiroro_oauth_state");
        sessionStorage.removeItem("kiroro_client_id");
        setUser(null);
        setAccessToken(null);
        setError(null);
        if (IS_DEV) console.log("[Kiroro] Logged out");
    }, []);

    /**
     * Get current access token (refresh if needed in future)
     */
    const getAccessToken = useCallback(async (): Promise<string | null> => {
        // Check if token is still valid
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const session: StoredSession = JSON.parse(stored);
                if (session.expiresAt > Date.now() + 5 * 60 * 1000) {
                    return session.accessToken;
                }
            }
        } catch (e) {
            // Fall through
        }
        return accessToken;
    }, [accessToken]);

    return (
        <ThreadsAuthContext.Provider
            value={{
                isLoading,
                error,
                user,
                accessToken,
                initiateThreadsLogin,
                handleCallback,
                logout,
                getAccessToken,
            }}
        >
            {children}
        </ThreadsAuthContext.Provider>
    );
}
