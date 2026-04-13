import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { UPLOAD_DIR } from '@/lib/data-store';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const safeFilename = (name: string) => name.replace(/[\r\n"]/g, '_');

export async function GET(request: Request, context: { params: Promise<{ taskId: string; attachmentId: string }> }) {
  try {
    const { taskId, attachmentId } = await context.params;
    const files = await fs.readdir(UPLOAD_DIR);
    const key = files.find((f) => f.startsWith(`${taskId}-${attachmentId}-`));
    if (!key) return new NextResponse('Not found', { status: 404 });

    const fullPath = path.join(UPLOAD_DIR, key);
    const data = await fs.readFile(fullPath);
    const originalName = key.split('-').slice(3).join('-') || 'attachment';
    const ext = path.extname(originalName).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
    const url = new URL(request.url);
    const asDownload = url.searchParams.get('download') === '1';
    const filename = safeFilename(originalName);

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `${asDownload ? 'attachment' : 'inline'}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
