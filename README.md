<img width="1800" height="600" alt="kirorolabs-banner" src="https://github.com/user-attachments/assets/3bdf388d-2cca-4a4d-80de-189a3ef638c2" />

# Kiroro SDK 🛡️💎

The Social-Native Web3 SDK for dApps. Connect users with **Threads** accounts, give them embedded smart wallets, and enable full blockchain transactions across multiple chains.

[![npm version](https://img.shields.io/npm/v/@kirorolabs/sdk.svg)](https://www.npmjs.com/package/@kirorolabs/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features ✨

- **Threads Authentication**: Native OAuth login via Threads (Meta)
- **Embedded Wallets**: Automatic ERC-4337 smart wallet creation
- **Full Transaction Support**: sendTransaction, writeContract, signMessage, signTypedData
- **Multi-Chain**: Base, Arbitrum, Optimism, Polygon, Ethereum
- **Wagmi Integration**: Works with standard Wagmi hooks
- **Helper Hooks**: useKiroroToken (ERC-20), useKiroroNFT (ERC-721)
- **Gasless Transactions**: Integrated Paymaster support

## Installation 📦

```bash
npm install @kirorolabs/sdk viem
# or
yarn add @kirorolabs/sdk viem
```

## Quick Start 🚀

### 1. Get your API Key

Create a project at [app.kiroro.xyz/dashboard](https://app.kiroro.xyz/dashboard) to get your `kiroroClientId`.

### 2. Wrap your App

```tsx
import { KiroroProvider } from '@kirorolabs/sdk';

function App() {
  return (
    <KiroroProvider config={{ kiroroClientId: "kiro_your_key_here" }}>
      <YourApp />
    </KiroroProvider>
  );
}
```

### 3. Use the Hooks

```tsx
import { useKiroroAuth, useKiroroWallet } from '@kirorolabs/sdk';

function MyComponent() {
  // Authentication
  const { user, isAuthenticated, login, logout } = useKiroroAuth();
  
  // Wallet & Transactions
  const { sendTransaction, writeContract, signMessage, isReady } = useKiroroWallet();

  const handleSend = async () => {
    const hash = await sendTransaction({
      to: "0x1234...",
      value: BigInt(1e16), // 0.01 ETH
    });
    console.log("Transaction:", hash);
  };

  if (!isAuthenticated) {
    return <button onClick={login}>Connect with Threads</button>;
  }

  return (
    <div>
      <p>Welcome, @{user.username}!</p>
      <button onClick={handleSend} disabled={!isReady}>Send ETH</button>
    </div>
  );
}
```

## Hooks API 🪝

### useKiroroAuth

```typescript
const {
  user,              // KiroroUser | null
  isAuthenticated,   // boolean
  isLoading,         // boolean
  login,             // () => void
  logout,            // () => void
  getAccessToken,    // () => Promise<string | null>
} = useKiroroAuth();
```

### useKiroroWallet

```typescript
const {
  address,           // Primary wallet address
  smartWalletAddress,// ERC-4337 smart wallet
  isReady,           // Ready for transactions
  chainId,           // Current chain
  
  // Transactions
  sendTransaction,   // (request) => Promise<hash>
  writeContract,     // (request) => Promise<hash>
  
  // Signing
  signMessage,       // (message) => Promise<signature>
  signTypedData,     // (typedData) => Promise<signature>
  
  // Chain
  switchChain,       // (chainId) => Promise<void>
  waitForTransaction,// (hash) => Promise<receipt>
} = useKiroroWallet();
```

### useKiroroToken

```typescript
import { useKiroroToken } from '@kirorolabs/sdk';

const { balance, transfer, approve, allowance } = useKiroroToken("0xTokenAddress");

// Transfer tokens
await transfer("0xRecipient", BigInt(1e18));
```

### useKiroroNFT

```typescript
import { useKiroroNFT } from '@kirorolabs/sdk';

const { balance, transfer, ownerOf } = useKiroroNFT("0xNFTContract");

// Transfer an NFT
await transfer("0xRecipient", BigInt(tokenId));
```

## Wagmi Integration

```typescript
import { kiroroWagmiConnector } from '@kirorolabs/sdk/wagmi';
import { createConfig } from 'wagmi';

const config = createConfig({
  connectors: [kiroroWagmiConnector()],
  // ... rest of wagmi config
});

// Now standard Wagmi hooks work with Kiroro!
// useWriteContract(), useSendTransaction(), etc.
```

## Types

```typescript
interface KiroroUser {
  id: string;
  threadsId: string;
  username: string;
  picture: string;
  walletAddress?: string;
  smartWalletAddress?: string;
  eoaAddress?: string;
  chainId?: number;
  isVerified?: boolean;
}

interface SendTransactionRequest {
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
}

interface WriteContractRequest<TAbi> {
  address: `0x${string}`;
  abi: TAbi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}
```

## Configuration ⚙️

| Option | Type | Description |
| :--- | :--- | :--- |
| `kiroroClientId` | `string` | **Required**. Your API key from the dashboard |
| `gasless` | `boolean` | Enable sponsored transactions |
| `chains` | `Chain[]` | Supported chains (defaults to Base) |
| `defaultChain` | `Chain` | Default chain |
| `appearance.theme` | `"dark" \| "light"` | Theme for auth modal |
| `appearance.logo` | `string` | Custom logo URL |

## Supported Chains 🌐

- Base (default)
- Base Sepolia
- Arbitrum
- Optimism
- Polygon
- Ethereum Mainnet

## Security 🔒

- **Domain Whitelisting**: Only approved domains can use your API key
- **ERC-4337 Smart Wallets**: Secure account abstraction
- **Session Tokens**: Secure, short-lived auth tokens

## Dashboard

Manage your projects, view SDK users, and monitor usage at:
[https://app.kiroro.xyz/dashboard](https://app.kiroro.xyz/dashboard)

## Requirements

- React 18+
- viem 2.0+
- wagmi 2.0+ (optional, for Wagmi integration)

## License 📄

MIT © [Kiroro Labs](https://kiroro.xyz)
