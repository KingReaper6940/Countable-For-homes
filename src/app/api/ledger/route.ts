import { NextResponse } from 'next/server';
import { getLedger } from '@/lib/ledger';
export const runtime='nodejs';
export function GET(request:Request) {
  if (new URL(request.url).searchParams.get('scope')==='synthetic') return NextResponse.json({error:'Ledger not found.'},{status:404});
  const scope='real';
  return NextResponse.json(getLedger(scope));
}
