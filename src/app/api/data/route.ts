import { NextResponse } from 'next/server';
import { loadDashboardData, materializeRecurringTasks, saveDashboardData } from '@/lib/data-store';
import type { DashboardData } from '@/types';

const dayDiff = (iso?: string) => {
  if (!iso) return null;
  const now = new Date();
  const due = new Date(iso);
  return Math.floor((due.getTime() - now.getTime()) / 86400000);
};

const withDueDateIntelligence = (data: DashboardData): DashboardData => {
  const now = new Date().toISOString();
  const notifications = [...(data.notifications ?? [])];

  for (const t of data.tasks) {
    if (!t.dueDate || t.status === 'done') continue;
    const diff = dayDiff(t.dueDate);
    if (diff === null) continue;

    if (diff < 0 && !notifications.some((n) => n.taskId === t.id && n.kind === 'overdue')) {
      notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'overdue',
        title: 'Task overdue',
        body: `${t.title} is overdue.`,
        createdAt: now,
        taskId: t.id,
        read: false,
      });
    } else if (diff <= 2 && !notifications.some((n) => n.taskId === t.id && n.kind === 'due-soon')) {
      notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'due-soon',
        title: 'Task due soon',
        body: `${t.title} is due in ${Math.max(0, diff)} day(s).`,
        createdAt: now,
        taskId: t.id,
        read: false,
      });
    }
  }

  return { ...data, notifications };
};

export async function GET() {
  try {
    let data = await loadDashboardData();
    data = materializeRecurringTasks(data);
    data = withDueDateIntelligence(data);
    await saveDashboardData(data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return NextResponse.json({ projects: [], tasks: [], templates: [], savedViews: [], activityFeed: [], notifications: [] });
  }
}

export async function POST(request: Request) {
  try {
    const data: DashboardData = await request.json();
    const current = await loadDashboardData();
    const incomingCount = data.tasks?.length ?? 0;
    const currentCount = current.tasks?.length ?? 0;
    const force = request.headers.get('x-force-save') === '1';

    // Guard against accidental stale overwrite/wipe from old clients.
    if (!force && currentCount >= 20 && incomingCount <= Math.floor(currentCount * 0.5)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rejected suspicious save: incoming task set is much smaller than server state.',
          currentCount,
          incomingCount,
        },
        { status: 409 }
      );
    }

    await saveDashboardData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing data:', error);
    return NextResponse.json({ success: false, error: 'Failed to save data' }, { status: 500 });
  }
}
