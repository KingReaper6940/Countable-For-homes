import { getOriginalPdf } from '../../../../../lib/db';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const file=getOriginalPdf(id);
  if (!file) return new Response('Original PDF not found',{status:404});
  return new Response(new Uint8Array(file.bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${file.fileName.replace(/["\r\n]/g,'_')}"`,'Cache-Control':'private, no-store'}});
}
