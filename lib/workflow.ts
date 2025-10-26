import { start } from 'workflow/api';
import { handlePremiumAccess, type PremiumAccessInput } from '../workflows/premium-access';

export async function triggerWorkflow(input: PremiumAccessInput) {
  await start(handlePremiumAccess, [input]);
  return { ok: true };
}
