# Kiroro SDK 🛡️💎

The ultimate Social-Native Auth & Gasless stack for the next generation of social dApps. 

Built on top of **Privy** and **Base**, Kiroro allows you to onboard users with their favorite social accounts (Threads, Email, etc.) and sponsor their gas fees with zero friction.

## Features ✨

- **Social-Native Auth**: Seamless login via Threads, Email, and SMS.
- **Embedded Wallets**: Automatic smart wallet creation for every user.
- **Gasless Transactions**: Integrated Paymaster support to sponsor your users' gas.
- **SaaS Managed**: Manage API keys, domain whitelists, and usage analytics via the [Kiroro Dashboard](https://kiroro.xyz/dashboard).

## Installation 📦

```bash
npm install @kirorolabs/sdk
# or
yarn add @kirorolabs/sdk
```

## Quick Start 🚀

1. Wrap your application with the `KiroroProvider`:

```tsx
import { KiroroProvider } from '@kirorolabs/sdk';

function App() {
  return (
    <KiroroProvider config={{ kiroroClientId: "your_kiro_key_goes_here" }}>
      <YourAppContents />
    </KiroroProvider>
  );
}
```

2. Use the auth hook in your components:

```tsx
import { useKiroroAuth } from '@kirorolabs/sdk';

function LoginButton() {
  const { login, isAuthenticated, user } = useKiroroAuth();

  if (isAuthenticated) {
    return <p>Welcome, {user?.username}!</p>;
  }

  return <button onClick={login}>Connect with Threads</button>;
}
```

## Configuration ⚙️

| Option | Type | Description |
| :--- | :--- | :--- |
| `kiroroClientId` | `string` | **Required**. Get this from your [Kiroro Dashboard](https://kiroro.xyz/dashboard). |
| `gasless` | `boolean` | Enable sponsored transactions (Pro/Scale plans). |
| `appearance` | `object` | Customize the modal colors and theme. |

## Dashboard & Keys 🔑

Manage your projects and get your API keys at:
[https://kiroro.xyz/dashboard](https://kiroro.xyz/dashboard)

## License 📄

MIT © [Kiroro Labs](https://kiroro.xyz)
