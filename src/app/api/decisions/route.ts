import { NextResponse } from 'next/server';
import { applyDecision, decisionSchema } from '@/lib/decisions';

export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    const input=decisionSchema.parse(await request.json());
    return NextResponse.json(applyDecision(input));
  } catch (error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Invalid decision'}, {status:400});
  }
}
