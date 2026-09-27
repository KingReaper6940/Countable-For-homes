import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeProject } from '@/lib/analysis';

export const runtime='nodejs';
export async function POST(request:Request) {
  try { const {projectId}=z.object({projectId:z.string().min(1)}).parse(await request.json()); return NextResponse.json(await analyzeProject(projectId)); }
  catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'Analysis failed'},{status:500}); }
}
