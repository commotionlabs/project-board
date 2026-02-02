import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { DashboardData } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'dashboard.json');

export async function GET() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading data:', error);
    return NextResponse.json({ projects: [], tasks: [] });
  }
}

export async function POST(request: Request) {
  try {
    const data: DashboardData = await request.json();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing data:', error);
    return NextResponse.json({ success: false, error: 'Failed to save data' }, { status: 500 });
  }
}
