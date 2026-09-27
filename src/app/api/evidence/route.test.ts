import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const fixture=(name:string)=>readFileSync(join(process.cwd(),'tests','fixtures',name));
async function upload(bytes:Buffer,label:string,manualText='') {
  const form=new FormData();
  form.set('projectId','development-10c-sandbox');
  form.set('label',label);
  form.set('sourceRef',`${label}.pdf`);
  form.set('synthetic','true');
  form.set('type','occupancy');
  form.set('file',new File([new Uint8Array(bytes)],`${label}.pdf`,{type:'application/pdf'}));
  if (manualText) { form.set('text',manualText); form.set('pageRef','manual passage 2'); }
  const {POST}=await import('./route');
  return POST(new Request('http://localhost/api/evidence',{method:'POST',body:form}));
}

describe('PDF evidence ingestion',()=>{
  it('extracts text with a page reference and retains the original',async()=>{
    vi.resetModules();
    process.env.COUNTABLE_DB_PATH=join(tmpdir(),`countable-pdf-${randomUUID()}.db`);
    const response=await upload(fixture('synthetic-occupancy-text.pdf'),'text-example');
    expect(response.status).toBe(200);
    const data=await response.json();
    expect(data.evidence.text).toContain('Synthetic A3 occupancy nine apartments');
    expect(data.evidence.pageRef).toContain('1');
    expect(data.evidence.originalFileUrl).toMatch(/^\/api\/evidence\/.+\/file$/);
    const {GET}=await import('./[id]/file/route');
    const file=await GET(new Request('http://localhost'+data.evidence.originalFileUrl),{params:Promise.resolve({id:data.evidence.id})});
    expect(file.status).toBe(200);
    expect(Buffer.from(await file.arrayBuffer())).toEqual(fixture('synthetic-occupancy-text.pdf'));
  });
  it('saves a scan without extractable text for linked manual transcription',async()=>{
    vi.resetModules();
    process.env.COUNTABLE_DB_PATH=join(tmpdir(),`countable-scan-${randomUUID()}.db`);
    const response=await upload(fixture('synthetic-occupancy-blank.pdf'),'scan-example');
    expect(response.status).toBe(200);
    const data=await response.json();
    expect(data.evidence.extractionStatus).toBe('manual-needed');
    expect(data.evidence.originalFileUrl).toBeTruthy();
  });
  it('keeps a reviewer transcription alongside extracted text',async()=>{
    vi.resetModules();
    process.env.COUNTABLE_DB_PATH=join(tmpdir(),`countable-mixed-${randomUUID()}.db`);
    const response=await upload(fixture('synthetic-occupancy-text.pdf'),'mixed-example','Reviewer transcription: condition ends on 2025-11-01.');
    expect(response.status).toBe(200);
    const data=await response.json();
    expect(data.evidence.text).toContain('Synthetic A3 occupancy nine apartments');
    expect(data.evidence.text).toContain('Reviewer transcription: condition ends on 2025-11-01.');
    expect(data.evidence.pageRef).toBe('manual passage 2');
  });
  it('rejects a file that only claims to be a PDF',async()=>{
    vi.resetModules();
    process.env.COUNTABLE_DB_PATH=join(tmpdir(),`countable-malformed-${randomUUID()}.db`);
    const response=await upload(Buffer.from('not a pdf'),'bad-example');
    expect(response.status).toBe(400);
    const corrupted=await upload(Buffer.from('%PDF-1.4\ncorrupted'),'corrupted-example');
    expect(corrupted.status).toBe(400);
    expect((await corrupted.json()).error).toContain('could not be parsed');
  });
});
