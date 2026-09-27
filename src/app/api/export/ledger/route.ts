import { ledgerCsv } from '@/lib/ledger';
export const runtime='nodejs';
export function GET(request:Request) {
  const scope=new URL(request.url).searchParams.get('scope')==='synthetic'?'synthetic':'real';
  return new Response(ledgerCsv(scope),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="countable-${scope}-ledger.csv"`}});
}
