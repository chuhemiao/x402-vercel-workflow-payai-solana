import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import type { Cluster, ParsedMessageAccount, ParsedTransactionWithMeta } from '@solana/web3.js';
import { FatalError, sleep } from 'workflow';

export type PremiumAccessInput = {
  txSignature: string;
  wallet: string;
  feature?: string;
};

export async function handlePremiumAccess(input: PremiumAccessInput) {
  'use workflow';

  const receipt = await verifyPayment(input);
  await sleep('5s'); // give chain a beat to finalize
  await unlockFeature(receipt);

  return {
    feature: receipt.feature,
    status: 'unlocking',
    wallet: receipt.wallet
  };
}

async function verifyPayment(input: PremiumAccessInput) {
  'use step';

  console.log('[Workflow] Verifying on-chain payment', input);

  if (!input.txSignature || input.txSignature.length < 10) {
    throw new FatalError('Invalid transaction signature; refusing to retry');
  }

  const receiver = getReceiverPublicKey();
  const wallet = parsePublicKey(input.wallet, 'wallet address');
  const cluster = normalizeSolanaNetwork(process.env.NEXT_PUBLIC_SOLANA_NETWORK);
  const rpcUrl = process.env.SOLANA_RPC_URL ?? clusterApiUrl(cluster);
  const connection = new Connection(rpcUrl, 'confirmed');
  const transaction = await connection.getParsedTransaction(input.txSignature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0
  });

  if (!transaction) {
    throw new FatalError('Transaction not found on Solana; refusing to retry');
  }

  if (transaction.meta?.err) {
    throw new FatalError('On-chain transaction reverted; refusing to retry');
  }

  assertSigner(transaction, wallet);
  assertReceiverPaid(transaction, receiver, cluster);

  return input;
}

async function unlockFeature(input: PremiumAccessInput) {
  'use step';

  console.log(
    `[Workflow] Unlocking ${input.feature ?? 'default feature'} for wallet ${input.wallet}`
  );
  // TODO: Call downstream systems or agents here.
}

function normalizeSolanaNetwork(value?: string | null): Cluster {
  const normalized = value?.toLowerCase().trim();
  switch (normalized) {
    case undefined:
    case null:
    case '':
    case 'devnet':
    case 'solana-devnet':
      return 'devnet';
    case 'mainnet-beta':
    case 'mainnet':
    case 'solana':
    case 'solana-mainnet':
      return 'mainnet-beta';
    case 'testnet':
    case 'solana-testnet':
      return 'testnet';
    default:
      throw new FatalError(`Unsupported Solana network: ${value}`);
  }
}

function getReceiverPublicKey(): PublicKey {
  const raw =
    process.env.PREMIUM_RECEIVER_PUBKEY ??
    process.env.NEXT_PUBLIC_RECEIVER_PUBKEY ??
    process.env.RECEIVER_PUBKEY;
  if (!raw) {
    throw new FatalError('Receiver wallet is not configured; refusing to retry');
  }
  return parsePublicKey(raw, 'receiver wallet');
}

function parsePublicKey(value: string, label: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new FatalError(`Invalid ${label}; refusing to retry`);
  }
}

function assertSigner(tx: ParsedTransactionWithMeta, wallet: PublicKey) {
  const walletAddress = wallet.toBase58();
  const accountKeys = tx.transaction.message.accountKeys as ParsedMessageAccount[];
  const signer = accountKeys.some(
    account => getAccountAddress(account) === walletAddress && account.signer
  );
  if (!signer) {
    throw new FatalError('Provided wallet did not sign the transaction; refusing to retry');
  }
}

const USDC_MINTS: Record<'devnet' | 'mainnet-beta', string> = {
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

function assertReceiverPaid(tx: ParsedTransactionWithMeta, receiver: PublicKey, cluster: Cluster) {
  const lamportDelta = getLamportDelta(tx, receiver);
  const usdcMint = cluster === 'devnet' || cluster === 'mainnet-beta' ? USDC_MINTS[cluster] : undefined;
  const tokenDelta = usdcMint ? getTokenDelta(tx, receiver, usdcMint) : 0;

  if (lamportDelta <= 0 && tokenDelta <= 0) {
    throw new FatalError('No payment to the configured receiver detected in transaction; refusing to retry');
  }
}

function getLamportDelta(tx: ParsedTransactionWithMeta, receiver: PublicKey): number {
  const receiverAddress = receiver.toBase58();
  const accountKeys = tx.transaction.message.accountKeys as ParsedMessageAccount[];
  const receiverIndex = accountKeys.findIndex(
    account => getAccountAddress(account) === receiverAddress
  );
  if (receiverIndex === -1) {
    return 0;
  }

  const pre = tx.meta?.preBalances?.[receiverIndex] ?? 0;
  const post = tx.meta?.postBalances?.[receiverIndex] ?? 0;
  return post - pre;
}

function getTokenDelta(
  tx: ParsedTransactionWithMeta,
  receiver: PublicKey,
  mint: string
): number {
  const receiverAddress = receiver.toBase58();
  const postBalances = tx.meta?.postTokenBalances ?? [];
  const preBalances = tx.meta?.preTokenBalances ?? [];
  const receiverPost = postBalances.find(
    balance => balance.owner === receiverAddress && balance.mint === mint
  );

  if (!receiverPost) {
    return 0;
  }

  const receiverPre = preBalances.find(
    balance => balance.accountIndex === receiverPost.accountIndex && balance.mint === mint
  );
  const postAmount = Number(receiverPost.uiTokenAmount.amount);
  const preAmount = receiverPre ? Number(receiverPre.uiTokenAmount.amount) : 0;
  return postAmount - preAmount;
}

function getAccountAddress(account: ParsedMessageAccount): string {
  const pubkey = account.pubkey as string | PublicKey;
  return typeof pubkey === 'string' ? pubkey : pubkey.toBase58();
}
