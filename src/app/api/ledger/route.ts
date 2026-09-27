import { NextResponse } from 'next/server';
import { getLedger } from '@/lib/ledger';
export const runtime='nodejs';
export function GET(request:Request) {
  const scope=new URL(request.url).searchParams.get('scope')==='synthetic'?'synthetic':'real';
  return NextResponse.json(getLedger(scope));
}
