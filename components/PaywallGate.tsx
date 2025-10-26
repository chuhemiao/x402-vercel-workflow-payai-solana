'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { useCallback, useState } from 'react';
import { createX402Transaction, normalizeSolanaNetwork } from '../lib/createX402Transaction';

type PaywallGateProps = {
  amount: number;
  currency?: 'USDC' | 'SOL';
  description?: string;
  children: React.ReactNode;
};

const RECEIVER = new PublicKey(process.env.NEXT_PUBLIC_RECEIVER_PUBKEY!);
const SOLANA_CLUSTER = normalizeSolanaNetwork(process.env.NEXT_PUBLIC_SOLANA_NETWORK);

export default function PaywallGate({
  amount,
  currency = 'USDC',
  description = 'Premium Feature',
  children
}: PaywallGateProps) {
  const { publicKey, sendTransaction } = useWallet();
  const [unlocked, setUnlocked] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePay = useCallback(async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl(SOLANA_CLUSTER));
      const tx = await createX402Transaction({
        connection,
        payer: publicKey,
        receiver: RECEIVER,
        amount,
        currency, // 'SOL' or 'USDC'
        memo: description,
        cluster: SOLANA_CLUSTER
      });

      // ✅ Sign and submit via wallet
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      setTxSig(signature);

      // ✅ Trigger backend workflow after payment
      await fetch('/api/run-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txSignature: signature,
          wallet: publicKey.toBase58(),
          feature: 'premium-access'
        })
      });

      setUnlocked(true);
    } catch (err) {
      console.error(err);
      alert('Payment failed or signature was rejected');
    } finally {
      setLoading(false);
    }
  }, [publicKey, amount, currency, description, sendTransaction]);

  if (unlocked) {
    return (
      <div className='p-4 border rounded-2xl'>
        <div className='text-sm text-neutral-500 mb-2'>
          Unlocked (tx: {txSig?.slice(0, 8)}...)
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className='p-6 border rounded-2xl'>
      <div className='mb-3 font-medium'>
        Payment required to unlock: {amount} {currency}
      </div>
      <button
        disabled={loading}
        onClick={handlePay}
        className='px-4 py-2 bg-black text-white rounded-lg'>
        {loading ? 'Processing...' : 'Pay now'}
      </button>
    </div>
  );
}
