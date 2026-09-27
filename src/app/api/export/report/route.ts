import { evidenceReport } from '@/lib/ledger';
export const runtime='nodejs';
export function GET(request:Request) {
  if (new URL(request.url).searchParams.get('scope')==='synthetic') return new Response('Ledger not found.',{status:404});
  const scope='real';
  return new Response(evidenceReport(scope),{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="countable-${scope}-evidence-report.md"`}});
}
