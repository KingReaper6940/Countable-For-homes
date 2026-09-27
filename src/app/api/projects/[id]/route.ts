import { NextResponse } from 'next/server';
import { getProject } from '@/lib/db';

export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const project=getProject(id);
  return project ? NextResponse.json(project) : NextResponse.json({error:'Project not found'},{status:404});
}
