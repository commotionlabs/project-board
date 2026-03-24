import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { UPLOAD_DIR } from '@/lib/data-store';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const taskId = (form.get('taskId') as string) || 'task';
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storageKey = `${taskId}-${id}-${safe}`;
    const filePath = path.join(UPLOAD_DIR, storageKey);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      id,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: new Date().toISOString(),
      storageKey,
      path: `uploads/${storageKey}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
