import { NextResponse } from 'next/server';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { z } from 'zod';
import { addAudit, getProject, saveEvidence } from '../../../lib/db';

export const runtime='nodejs';
const jsonSchema=z.object({projectId:z.string().min(1),type:z.enum(['permit','occupancy','other']).default('occupancy'),label:z.string().trim().min(1).max(200),text:z.string().max(200000),sourceRef:z.string().trim().min(1).max(500),pageRef:z.string().max(100).nullable().optional(),synthetic:z.boolean().default(false),relatedEventId:z.string().nullable().optional()});

export async function POST(request:Request) {
  try {
    const contentType=request.headers.get('content-type')??'';
    if (contentType.includes('multipart/form-data')) {
      const form=await request.formData();
      const file=form.get('file');
      const projectId=String(form.get('projectId')??'');
      const project=getProject(projectId);
      if (!project) throw new Error('Unknown project');
      const synthetic=form.get('synthetic')==='true';
      const relatedEventId=String(form.get('relatedEventId')??'').trim()||null;
      const manualText=String(form.get('text')??'').trim();
      let text=manualText;
      let pageRef=String(form.get('pageRef')??'').trim()||null;
      let extractionStatus:'ready'|'manual-needed'=text?'ready':'manual-needed';
      let fileName='';
      let originalFile: {name:string;bytes:Buffer}|undefined;
      if (file instanceof File && file.size) {
        if (file.size>10*1024*1024) throw new Error('PDF must be 10 MB or smaller.');
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type!=='application/pdf') throw new Error('Only PDF files are supported.');
        fileName=file.name;
        const bytes=Buffer.from(await file.arrayBuffer());
        if (bytes.subarray(0,5).toString()!=='%PDF-') throw new Error('The file is not a valid PDF.');
        originalFile={name:fileName,bytes};
        try {
          const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true});
          const document=await task.promise;
          const pages:string[]=[];
          for (let pageNumber=1;pageNumber<=document.numPages;pageNumber++) {
            const page=await document.getPage(pageNumber);
            const content=await page.getTextContent();
            const pageText=content.items.map(item=>'str' in item?item.str:'').join(' ').trim();
            pages.push(pageText);
          }
          const extracted=pages.map((p,i)=>p?`[Page ${i+1}] ${p}`:'').filter(Boolean).join('\n\n');
          if (extracted) {
            text=`[PDF extracted text]\n${extracted}${manualText?`\n\n[Manual transcription supplied by reviewer${pageRef?` — ${pageRef}`:''}]\n${manualText}`:''}`.slice(0,200000);
            pageRef=pageRef??`pages 1–${document.numPages}`;
            extractionStatus='ready';
          } else if (manualText) {
            text=`[Manual transcription supplied by reviewer${pageRef?` — ${pageRef}`:''}]\n${manualText}`;
            extractionStatus='ready';
          } else { text=''; extractionStatus='manual-needed'; }
          await task.destroy();
        } catch {
          if (manualText) { text=`[Manual transcription supplied by reviewer${pageRef?` — ${pageRef}`:''}]\n${manualText}`; extractionStatus='ready'; }
          else throw new Error('PDF could not be parsed. Upload a readable PDF or paste a transcription with its source reference.');
        }
      }
      if (!text && !fileName) throw new Error('Provide PDF evidence or pasted source text.');
      const sourceRef=String(form.get('sourceRef')??'').trim()||fileName||'Pasted source text';
      const type=z.enum(['permit','occupancy','other']).parse(String(form.get('type')??'occupancy'));
      const evidence=saveEvidence({projectId,type,label:String(form.get('label')??'').trim()||fileName||'Pasted evidence',text,sourceRef,pageRef,synthetic,extractionStatus,originalFile,relatedEventId});
      if (extractionStatus==='manual-needed') addAudit(projectId,'extraction_failed','evidence',evidence.id,'PDF text could not be extracted; manual transcription required',{fileName});
      return NextResponse.json({evidence,project:getProject(projectId)});
    }
    const input=jsonSchema.parse(await request.json());
    if (!input.text.trim()) throw new Error('Pasted source text is required.');
    const evidence=saveEvidence({...input,pageRef:input.pageRef??null,extractionStatus:'ready'});
    return NextResponse.json({evidence,project:getProject(input.projectId)});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Invalid evidence'}, {status:400});
  }
}
