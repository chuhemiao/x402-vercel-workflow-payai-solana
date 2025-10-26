# 🪙 X402 + Workflow Integration (Solana Devnet Demo)

This is a complete example of integrating **x402-solana@0.1.1** with **Next.js** and **Solana Wallets**.

It demonstrates how to use the x402 protocol to handle on-chain payments and trigger a backend workflow automatically after a successful transaction — such as unlocking premium features or running an AI Agent task.

---

## 🚀 Overview

- ✅ On-chain payments via `x402-solana@0.1.1`
- ✅ Solana wallet support (Phantom / Solflare)
- ✅ Frontend Paywall component for paid content unlock
- ✅ Backend API (`/api/run-workflow`) to trigger workflows after payment
- ✅ Configurable network (`devnet` or `mainnet-beta`)
- ✅ Environment variable for receiver address
- ✅ Built with TypeScript & Next.js App Router

---

## 🧩 Tech Stack

- **Next.js 14 (App Router)**
- **React 18**
- **Solana Web3.js / Wallet Adapter**
- **x402-solana@0.1.1**
- **TypeScript**

---

## 🛠️ Setup & Run

```bash
# Unzip or clone the project
cd x402_workflow_integration_devnet

# Install dependencies
pnpm install

# Start local dev server
pnpm dev
```

Then open:
👉 [http://localhost:3000](http://localhost:3000)

Connect your **Phantom** or **Solflare** wallet to Solana **devnet** and test the flow.

---

## ⚙️ Environment Variables

Project root `.env.example`:

```bash
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RECEIVER_PUBKEY=3uDFCz66dZ3mksfMjUKwj4ZANF3nPavGiPenJsx77jhb
```

> For mainnet deployment:
> `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
> and set your own receiver (merchant) wallet address.

---

## 💳 Payment Flow

The main logic lives in `components/PaywallGate.tsx`.

1. Create an x402 client via `createX402Client()`
2. Generate a transaction using `client.createTransaction()`
3. Request wallet signature and send the transaction
4. Wait for on-chain confirmation
5. Trigger the backend workflow with the transaction signature

Example core logic:

```ts
const connection = new Connection(clusterApiUrl(SOLANA_CLUSTER));
const tx = await createX402Transaction({
  connection,
  payer: publicKey,
  receiver: RECEIVER,
  amount,
  currency, // 'SOL' 或 'USDC'
  memo: description,
  cluster: SOLANA_CLUSTER
});
const signature = await sendTransaction(tx, connection);
await connection.confirmTransaction(signature, 'confirmed');
setTxSig(signature);
```

---

## 🔁 Workflow Trigger (Backend)

The endpoint `/api/run-workflow/route.ts` is called by the frontend after a successful transaction.

Example:

```ts
await triggerWorkflow({
  txSignature,
  wallet,
  feature: 'premium-access'
});
```

In `lib/workflow.ts`, you can connect it to:

- **Vercel Workflows**
- **Cloudflare Workers**
- **BullMQ / Temporal Queues**
- **Custom AI Agent APIs**

---

## 🧠 Directory Structure

```
app/
  layout.tsx
  page.tsx
  providers.tsx
  api/
    run-workflow/
      route.ts
components/
  PaywallGate.tsx
lib/
  workflow.ts
.env.example
next.config.js
package.json
```

---

## 🧩 Extensions

- **Multi-currency support:** pass `'SOL'` or `'USDC'` in props
- **Mainnet deployment:** switch network and update receiver key
- **Transaction verification:** validate `txSignature` on backend to prevent spoofing
- **Custom unlock logic:** display NFT, subscription, or AI-agent features after payment

---

## ⚠️ Notes

- Use `createX402Client()`, **not** `createX402Transaction()` (removed in v0.1.1).
- Ensure the wallet is connected to the correct network.
- For USDC payments, ensure you hold devnet USDC test tokens.
- This demo is **for development/testing only** — not production-grade financial use.

---

## 📜 License

MIT © 2025 kkk
