<img width="1800" height="600" alt="kiroro-sdk-banner" src="https://github.com/user-attachments/assets/a76090c2-36da-41db-abc5-8e5dc38d35a0" />

# Kiroro SDK 🛡️💎

The Social-Native Auth & Gasless SDK for dApps. Onboard users with their **Threads** account and give them an embedded wallet on **Base** - all with zero friction.

## Features ✨

- **Threads Authentication**: Native OAuth login via Threads (Meta)
- **Embedded Wallets**: Automatic smart wallet creation for every user
- **Gasless Transactions**: Integrated Paymaster support to sponsor gas
- **SaaS Managed**: API keys, domain whitelists, and user analytics via the [Kiroro Dashboard](https://app.kiroro.xyz/dashboard)

## Installation 📦

```bash
npm install @kirorolabs/sdk
# or
yarn add @kirorolabs/sdk
```

Peer dependencies:
```bash
npm install react react-dom viem
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

### 3. Add Login Button

```tsx
import { useKiroroAuth } from '@kirorolabs/sdk';

function LoginButton() {
  const { user, isAuthenticated, isLoading, login, logout } = useKiroroAuth();

  if (isLoading) {
    return <button disabled>Loading...</button>;
  }

  if (isAuthenticated && user) {
    return (
      <div>
        <img src={user.picture} alt={user.username} />
        <p>Welcome, @{user.username}!</p>
        <p>Wallet: {user.walletAddress}</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <button onClick={login}>Connect with Threads</button>;
}
```

Or use the pre-built button:

```tsx
import { KiroroConnectButton } from '@kirorolabs/sdk';

function Nav() {
  return <KiroroConnectButton />;
}
```

## Configuration ⚙️

| Option | Type | Description |
| :--- | :--- | :--- |
| `kiroroClientId` | `string` | **Required**. Your API key from the dashboard |
| `gasless` | `boolean` | Enable sponsored transactions (Pro/Scale plans) |
| `appearance.theme` | `"dark" \| "light"` | Theme for auth modal |
| `appearance.logo` | `string` | Custom logo URL |
| `backendUrl` | `string` | Override backend (default: `https://app.kiroro.xyz`) |
| `privyAppId` | `string` | Custom Privy App ID for white-label mode |

## User Object 👤

```typescript
interface KiroroUser {
  id: string;
  threadsId: string;
  username: string;       // e.g., "john_doe"
  picture: string;        // Profile picture URL
  walletAddress?: string; // Embedded wallet on Base
  isVerified?: boolean;   // Threads verification status
}
```

## Hook API 🪝

```typescript
const {
  user,              // KiroroUser | null
  isAuthenticated,   // boolean
  isLoading,         // boolean
  isValidated,       // API key validation status
  error,             // string | null
  projectName,       // Your project name from dashboard
  tier,              // "starter" | "pro" | "scale" | "enterprise"
  login,             // () => void - Opens Threads login
  logout,            // () => void
  getAccessToken,    // () => Promise<string | null>
} = useKiroroAuth();
```

## Security 🔒

- **Domain Whitelisting**: Only approved domains can use your API key
- **CORS Protection**: Backend validates origin headers
- **Session Tokens**: Secure, short-lived auth tokens

## Dashboard

Manage your projects, view SDK users, and monitor usage at:
[https://app.kiroro.xyz/dashboard](https://app.kiroro.xyz/dashboard)

## Requirements

- React 18+
- Only supports **Base Mainnet**

## License 📄

MIT © [Kiroro Labs](https://kiroro.xyz)
