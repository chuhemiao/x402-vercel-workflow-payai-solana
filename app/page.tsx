'use client';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import dynamic from 'next/dynamic';
const PaywallGate = dynamic(() => import('../components/PaywallGate'), {
  ssr: false
});

export default function Page() {
  return (
    <main className='max-w-2xl mx-auto p-6 space-y-6'>
      <h1 className='text-2xl font-semibold'>x402 + Workflow Devnet Demo</h1>
      <WalletMultiButton />
      <PaywallGate
        amount={0.1}
        currency='USDC'
        description='AI Agent Task Access'>
        <div>✅ 你已成功解锁内容，可以访问 Premium Agent 或高级功能。</div>
      </PaywallGate>
    </main>
  );
}
