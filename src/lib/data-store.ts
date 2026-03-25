import { promises as fs } from 'fs';
import path from 'path';
import type { DashboardData, Task, TaskAttachment, TaskRecurrence } from '@/types';

export const DATA_FILE = path.join(process.cwd(), 'data', 'dashboard.json');
export const DB_FILE = path.join(process.cwd(), 'data', 'dashboard.sqlite');
export const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
export const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

const DASHBOARD_KEY = 'dashboard_data';

const ensureTask = (task: Task): Task => ({
  ...task,
  comments: task.comments ?? [],
  dependencies: task.dependencies ?? [],
  notes: task.notes ?? [],
  attachments: (task.attachments ?? []).map((a: TaskAttachment) => ({ ...a, dataUrl: undefined })),
  activity: task.activity ?? [],
});

export const normalizeDashboardData = (raw: DashboardData): DashboardData => ({
  version: 2,
  projects: raw.projects ?? [],
  tasks: (raw.tasks ?? []).map(ensureTask),
  templates: raw.templates ?? [],
  savedViews: raw.savedViews ?? [],
  activityFeed: raw.activityFeed ?? [],
  notifications: raw.notifications ?? [],
});

const getDb = async () => {
  const sqlite = await import('node:sqlite');
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  const db = new sqlite.DatabaseSync(DB_FILE);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      k TEXT PRIMARY KEY,
      v TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
};

const readFromJsonFallback = async (): Promise<DashboardData | null> => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return normalizeDashboardData(JSON.parse(data) as DashboardData);
  } catch {
    return null;
  }
};

const writeSnapshot = async (payload: string) => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `dashboard-${stamp}.json`);
  await fs.writeFile(file, payload);
  const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.startsWith('dashboard-') && f.endsWith('.json')).sort();
  const keep = 50;
  const remove = files.slice(0, Math.max(0, files.length - keep));
  await Promise.all(remove.map((f) => fs.unlink(path.join(BACKUP_DIR, f)).catch(() => {})));
};

const saveToSqlite = async (payload: string) => {
  const db = await getDb();
  try {
    const stmt = db.prepare(`
      INSERT INTO kv_store (k, v, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(k) DO UPDATE SET
        v=excluded.v,
        updated_at=excluded.updated_at
    `);
    stmt.run(DASHBOARD_KEY, payload, new Date().toISOString());
  } finally {
    db.close();
  }
};

export async function loadDashboardData(): Promise<DashboardData> {
  const db = await getDb();
  try {
    const row = db.prepare('SELECT v FROM kv_store WHERE k = ?').get(DASHBOARD_KEY) as { v?: string } | undefined;
    if (row?.v) {
      return normalizeDashboardData(JSON.parse(row.v) as DashboardData);
    }
  } catch (error) {
    console.error('SQLite load failed, trying JSON fallback:', error);
  } finally {
    db.close();
  }

  const fallback = await readFromJsonFallback();
  if (fallback) {
    const payload = JSON.stringify(fallback, null, 2);
    await saveToSqlite(payload);
    return fallback;
  }

  return normalizeDashboardData({ projects: [], tasks: [] });
}

export async function saveDashboardData(data: DashboardData): Promise<void> {
  const normalized = normalizeDashboardData(data);
  const payload = JSON.stringify(normalized, null, 2);

  try {
    await writeSnapshot(payload);
  } catch (e) {
    console.error('Snapshot write failed:', e);
  }

  await saveToSqlite(payload);

  // Keep JSON mirror for human-readable recovery/debugging.
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, payload);
}

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const nextRecurrenceDate = (rec: TaskRecurrence, from = new Date()): Date => {
  const interval = Math.max(1, rec.interval || 1);
  if (rec.frequency === 'daily') return addDays(from, interval);
  if (rec.frequency === 'weekly') return addDays(from, interval * 7);
  const d = new Date(from);
  d.setMonth(d.getMonth() + interval);
  return d;
};

export function materializeRecurringTasks(data: DashboardData): DashboardData {
  const now = new Date();
  const generated: Task[] = [];
  const tasks = data.tasks.map((task) => {
    if (!task.recurrence?.enabled || task.isTemplate) return task;
    const nextDueAt = task.recurrence.nextDueAt ? new Date(task.recurrence.nextDueAt) : undefined;
    if (!nextDueAt || nextDueAt > now) return task;

    const newId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    generated.push({
      ...task,
      id: newId,
      title: `${task.title} (recurring)`,
      status: 'todo',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dueDate: nextDueAt.toISOString(),
      comments: [],
      notes: [],
      attachments: [],
      activity: [{
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'recurrence-generated',
        summary: 'Generated from recurring rule',
        createdAt: now.toISOString(),
      }],
    });

    return {
      ...task,
      recurrence: {
        ...task.recurrence,
        nextDueAt: nextRecurrenceDate(task.recurrence, nextDueAt).toISOString(),
      },
    };
  });

  if (!generated.length) return data;

  return {
    ...data,
    tasks: [...tasks, ...generated],
    activityFeed: [
      {
        id: `wa-${Date.now()}-recurring`,
        createdAt: now.toISOString(),
        actor: 'system',
        type: 'recurrence',
        summary: `Generated ${generated.length} recurring task(s)`,
      },
      ...(data.activityFeed ?? []),
    ],
  };
}
