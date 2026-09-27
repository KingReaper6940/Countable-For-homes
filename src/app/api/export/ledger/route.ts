import { ledgerCsv } from '@/lib/ledger';
export const runtime='nodejs';
export function GET(request:Request) {
  if (new URL(request.url).searchParams.get('scope')==='synthetic') return new Response('Ledger not found.',{status:404});
  const scope='real';
  return new Response(ledgerCsv(scope),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="countable-${scope}-ledger.csv"`}});
}
