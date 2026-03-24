import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { UPLOAD_DIR } from '@/lib/data-store';

export async function GET(_: Request, context: { params: Promise<{ taskId: string; attachmentId: string }> }) {
  try {
    const { taskId, attachmentId } = await context.params;
    const files = await fs.readdir(UPLOAD_DIR);
    const key = files.find((f) => f.startsWith(`${taskId}-${attachmentId}-`));
    if (!key) return new NextResponse('Not found', { status: 404 });

    const fullPath = path.join(UPLOAD_DIR, key);
    const data = await fs.readFile(fullPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `inline; filename="${key.split('-').slice(3).join('-')}"`,
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
