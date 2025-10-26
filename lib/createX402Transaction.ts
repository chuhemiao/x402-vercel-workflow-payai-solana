import {
  Cluster,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress
} from '@solana/spl-token';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const USDC_DECIMALS = 6;
const USDC_MINTS: Record<'devnet' | 'mainnet-beta', string> = {
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

export function normalizeSolanaNetwork(value?: string | null): Cluster {
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
      throw new Error(`Unsupported Solana network: ${value}`);
  }
}

type SupportedCurrency = 'USDC' | 'SOL';

type CreateTransactionInput = {
  connection: Connection;
  payer: PublicKey;
  receiver: PublicKey;
  amount: number;
  currency: SupportedCurrency;
  memo?: string;
  cluster: Cluster;
};

export async function createX402Transaction({
  connection,
  payer,
  receiver,
  amount,
  currency,
  memo,
  cluster
}: CreateTransactionInput): Promise<Transaction> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  const instructions =
    currency === 'SOL'
      ? await createSolTransferInstructions(payer, receiver, amount)
      : await createUsdcTransferInstructions(connection, payer, receiver, amount, cluster);

  const transaction = new Transaction();
  transaction.add(...instructions);
  if (memo) {
    transaction.add(createMemoInstruction(memo));
  }
  transaction.feePayer = payer;
  return transaction;
}

async function createSolTransferInstructions(
  payer: PublicKey,
  receiver: PublicKey,
  amount: number
): Promise<TransactionInstruction[]> {
  const lamports = Math.round(amount * LAMPORTS_PER_SOL);
  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error('Invalid SOL amount');
  }
  return [
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: receiver,
      lamports
    })
  ];
}

async function createUsdcTransferInstructions(
  connection: Connection,
  payer: PublicKey,
  receiver: PublicKey,
  amount: number,
  cluster: Cluster
): Promise<TransactionInstruction[]> {
  if (cluster === 'testnet') {
    throw new Error('USDC transfers are not supported on Solana testnet');
  }
  const mintAddress = USDC_MINTS[cluster];
  if (!mintAddress) {
    throw new Error(`Missing USDC mint for cluster "${cluster}"`);
  }
  const mint = new PublicKey(mintAddress);
  const payerAta = await getAssociatedTokenAddress(mint, payer);
  const receiverAta = await getAssociatedTokenAddress(mint, receiver);
  const payerAtaInfo = await connection.getAccountInfo(payerAta, 'confirmed');
  if (!payerAtaInfo) {
    throw new Error('钱包缺少 USDC 账户，请先在钱包中创建或持有 USDC');
  }

  const instructions: TransactionInstruction[] = [];
  const receiverAtaInfo = await connection.getAccountInfo(receiverAta, 'confirmed');
  if (!receiverAtaInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(payer, receiverAta, receiver, mint)
    );
  }

  const atomicAmount = BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));
  if (atomicAmount <= 0) {
    throw new Error('Invalid USDC amount');
  }

  instructions.push(
    createTransferCheckedInstruction(
      payerAta,
      mint,
      receiverAta,
      payer,
      atomicAmount,
      USDC_DECIMALS
    )
  );

  return instructions;
}

function createMemoInstruction(memo: string): TransactionInstruction {
  const data = Buffer.from(memo, 'utf8');
  return new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data
  });
}
