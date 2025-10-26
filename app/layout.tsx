import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'x402 + Workflow Integration',
  description: 'Solana devnet demo with x402 paywall'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}