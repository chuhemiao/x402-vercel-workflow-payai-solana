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

  // TODO: Add real RPC/facilitator validation here.
  return input;
}

async function unlockFeature(input: PremiumAccessInput) {
  'use step';

  console.log(
    `[Workflow] Unlocking ${input.feature ?? 'default feature'} for wallet ${input.wallet}`
  );
  // TODO: Call downstream systems or agents here.
}
