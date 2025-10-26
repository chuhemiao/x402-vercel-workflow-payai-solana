import { NextRequest, NextResponse } from 'next/server';
import { triggerWorkflow } from '../../../lib/workflow';

export async function POST(req: NextRequest) {
  try {
    const { txSignature, wallet, feature } = await req.json();
    if (!txSignature || !wallet) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    await triggerWorkflow({ txSignature, wallet, feature });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
