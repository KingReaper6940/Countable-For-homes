import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/db';

export const runtime='nodejs';
export function GET() { return NextResponse.json(listProjects()); }
