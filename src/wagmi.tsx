"use client";

/**
 * Kiroro Wagmi Connector
 * 
 * This module provides a Wagmi-compatible connector for the Kiroro embedded wallet.
 * Import from "@kirorolabs/sdk/wagmi" to use with Wagmi hooks.
 * 
 * @example
 * ```tsx
 * import { kiroroWagmiConnector } from "@kirorolabs/sdk/wagmi";
 * import { createConfig } from "wagmi";
 * import { base } from "wagmi/chains";
 * 
 * const config = createConfig({
 *   chains: [base],
 *   connectors: [kiroroWagmiConnector()],
 *   transports: { [base.id]: http() },
 * });
 * 
 * // Now you can use standard Wagmi hooks with the Kiroro wallet!
 * // useWriteContract(), useSendTransaction(), etc.
 * ```
 */

import { createConnector } from "@wagmi/core";
import type { Chain } from "viem";
import { base, baseSepolia, arbitrum, optimism, polygon, mainnet } from "viem/chains";

// Supported chains
const KIRORO_SUPPORTED_CHAINS = [base, baseSepolia, arbitrum, optimism, polygon, mainnet] as const;

interface KiroroConnectorOptions {
    /** Custom name for the connector (default: "Kiroro") */
    name?: string;
    /** Chains to support (defaults to all Kiroro-supported chains) */
    chains?: readonly Chain[];
}

/**
 * Creates a Wagmi connector for the Kiroro embedded wallet.
 * 
 * Note: This connector works in conjunction with KiroroProvider.
 * The wallet will be automatically available after the user logs in.
 */
export function kiroroWagmiConnector(options: KiroroConnectorOptions = {}) {
    const connectorName = options.name ?? "Kiroro";

    return createConnector((config) => ({
        id: "kiroro",
        name: connectorName,
        type: "kiroro" as const,

        async connect({ chainId } = {}) {
            const accounts = await this.getAccounts();
            const chain = chainId
                ? config.chains.find((c) => c.id === chainId) ?? config.chains[0]
                : config.chains[0];

            return {
                accounts,
                chainId: chain.id,
            };
        },

        async disconnect() {
            // Disconnection is handled by KiroroProvider's logout
        },

        async getAccounts(): Promise<readonly `0x${string}`[]> {
            try {
                const stored = localStorage.getItem("kiroro_threads_session");
                if (stored) {
                    const session = JSON.parse(stored);
                    if (session.user?.walletAddress) {
                        return [session.user.walletAddress as `0x${string}`];
                    }
                }
            } catch {
                // Ignore parsing errors
            }
            return [];
        },

        async getChainId() {
            return base.id;
        },

        async getProvider() {
            return undefined;
        },

        async isAuthorized() {
            try {
                const accounts = await this.getAccounts();
                return accounts.length > 0;
            } catch {
                return false;
            }
        },

        onAccountsChanged(accounts: string[]) {
            const typedAccounts = accounts.map(a => a as `0x${string}`);
            config.emitter.emit("change", { accounts: typedAccounts });
        },

        onChainChanged(chainId: string) {
            const id = Number(chainId);
            config.emitter.emit("change", { chainId: id });
        },

        onConnect(connectInfo: { chainId: string }) {
            config.emitter.emit("connect", {
                chainId: Number(connectInfo.chainId),
            });
        },

        onDisconnect() {
            config.emitter.emit("disconnect");
        },

        async switchChain({ chainId }: { chainId: number }) {
            const chain = config.chains.find((c) => c.id === chainId);
            if (!chain) {
                throw new Error(`Chain ${chainId} not supported`);
            }
            return chain;
        },
    }));
}

// Re-export for convenience
export { KIRORO_SUPPORTED_CHAINS };
