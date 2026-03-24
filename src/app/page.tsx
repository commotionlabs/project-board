'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ListView } from '@/components/ListView';
import { TaskDetailSidebar } from '@/components/TaskDetailSidebar';
import { TaskDialog } from '@/components/TaskDialog';
import { Task, TaskActivity, TaskAttachment, TaskStatus, DashboardData, STATUS_CONFIG, SavedView, TaskTemplate } from '@/types';
import { Plus, LayoutGrid, List, RefreshCw, Search, Bell, Command, Save, BarChart3, CheckCheck } from 'lucide-react';

const makeActivity = (type: TaskActivity['type'], summary: string, detail?: string): TaskActivity => ({
  id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  summary,
  detail,
  createdAt: new Date().toISOString(),
});

const dayDiff = (iso?: string) => {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
};

const applySavedView = (tasks: Task[], view?: SavedView, q?: string) => {
  return tasks.filter((t) => {
    if (view?.projectId && t.projectId !== view.projectId) return false;
    if (view?.assignee !== undefined && t.assignee !== view.assignee) return false;
    if (view?.statuses?.length && !view.statuses.includes(t.status)) return false;
    if (view?.overdueOnly && !((dayDiff(t.dueDate) ?? 99) < 0)) return false;
    if (view?.dueSoonOnly && !((dayDiff(t.dueDate) ?? 99) <= 2)) return false;
    const query = (q ?? view?.query ?? '').trim().toLowerCase();
    if (!query) return true;
    const body = `${t.title} ${t.description ?? ''} ${(t.tags ?? []).join(' ')}`.toLowerCase();
    return body.includes(query);
  });
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({ projects: [], tasks: [] });
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [loading, setLoading] = useState(true);
  const [activeSavedViewId, setActiveSavedViewId] = useState('none');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const paletteInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveData = async (newData: DashboardData) => {
    setData(newData);
    try {
      await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    setPaletteQuery('');
    requestAnimationFrame(() => paletteInputRef.current?.focus());
  }, [paletteOpen]);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
    const unread = (data.notifications ?? []).filter((n) => !n.read).slice(0, 2);
    unread.forEach((n) => {
      if (Notification.permission === 'granted') new Notification(n.title, { body: n.body });
    });
  }, [data.notifications]);

  const withWorkspaceActivity = (newData: DashboardData, summary: string, taskId?: string) => ({
    ...newData,
    activityFeed: [{ id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, actor: 'gideon', type: 'event', summary, taskId, createdAt: new Date().toISOString() }, ...(newData.activityFeed ?? [])].slice(0, 100),
  });

  const upsertTasks = (updatedTasks: Task[], summary?: string, taskId?: string) => {
    let newData = { ...data, tasks: updatedTasks };
    if (summary) newData = withWorkspaceActivity(newData, summary, taskId);
    saveData(newData);
    if (activeTask) setActiveTask(updatedTasks.find(t => t.id === activeTask.id) ?? null);
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    const now = new Date().toISOString();
    const updatedTasks = data.tasks.map(t => t.id !== taskId ? t : { ...t, status, updatedAt: now, activity: [...(t.activity ?? []), makeActivity('status-changed', 'Status changed', `${STATUS_CONFIG[t.status].label} → ${STATUS_CONFIG[status].label}`)] });
    const notifications = [...(data.notifications ?? [])];
    const previous = data.tasks.find((t) => t.id === taskId);
    if (previous && previous.status !== 'done' && status === 'done') {
      data.tasks.filter((t) => (t.dependencies ?? []).includes(taskId) && t.status !== 'done').forEach((t) => {
        notifications.unshift({ id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind: 'dependency-unblocked', title: 'Task unblocked', body: `${t.title} is now unblocked because ${previous.title} was completed.`, createdAt: now, taskId: t.id, read: false });
      });
    }
    saveData(withWorkspaceActivity({ ...data, tasks: updatedTasks, notifications }, `Changed task status to ${STATUS_CONFIG[status].label}`, taskId));
    if (activeTask) setActiveTask(updatedTasks.find(t => t.id === activeTask.id) ?? null);
  };

  const handleEdit = (task: Task) => { setEditingTask(task); setIsDialogOpen(true); };
  const handleDelete = (taskId: string) => upsertTasks(data.tasks.filter(t => t.id !== taskId), 'Deleted task', taskId);
  const handleAddTask = (status: TaskStatus) => { setEditingTask(null); setDefaultStatus(status); setIsDialogOpen(true); };

  const handleSaveTask = (taskData: Partial<Task> & { id?: string }) => {
    const now = new Date().toISOString();
    if (taskData.id) {
      const updatedTasks = data.tasks.map(t => t.id !== taskData.id ? t : ({ ...t, ...taskData, updatedAt: now, activity: [...(t.activity ?? []), makeActivity('updated', 'Task details updated')] }));
      upsertTasks(updatedTasks, 'Updated task', taskData.id);
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: taskData.title!, description: taskData.description, status: taskData.status!, priority: taskData.priority!,
        projectId: taskData.projectId!, assignee: taskData.assignee ?? null, dueDate: taskData.dueDate, tags: taskData.tags,
        comments: [], dependencies: [], attachments: [], activity: [makeActivity('created', 'Task created')], isTemplate: taskData.isTemplate,
        recurrence: taskData.recurrence, createdAt: now, updatedAt: now,
      };
      const newData = { ...data, tasks: [...data.tasks, newTask] };
      if (newTask.isTemplate) {
        const tpl: TaskTemplate = { id: `tpl-${Date.now()}`, name: newTask.title, title: newTask.title, description: newTask.description, priority: newTask.priority, projectId: newTask.projectId, assignee: newTask.assignee, tags: newTask.tags, recurrence: newTask.recurrence, createdAt: now };
        newData.templates = [tpl, ...(newData.templates ?? [])];
      }
      saveData(withWorkspaceActivity(newData, 'Created task', newTask.id));
    }
  };

  const handleAddComment = (taskId: string, body: string) => {
    const mentions = Array.from(body.matchAll(/@([a-zA-Z0-9_-]+)/g)).map((m) => m[1].toLowerCase());
    const now = new Date().toISOString();
    const updatedTasks = data.tasks.map((t) => t.id === taskId ? {
      ...t,
      comments: [...(t.comments ?? []), { id: `comment-${Date.now()}`, body, author: 'gideon', mentions, createdAt: now }],
      activity: [...(t.activity ?? []), makeActivity('comment-added', 'Comment added', body)],
      updatedAt: now,
    } : t);
    const notifications = [...(data.notifications ?? [])];
    mentions.forEach((m) => notifications.unshift({ id: `notif-${Date.now()}-${m}`, kind: 'mention', title: 'Mention', body: `You were mentioned by @gideon: ${body}`, createdAt: now, taskId, read: false }));
    saveData(withWorkspaceActivity({ ...data, tasks: updatedTasks, notifications }, 'Added comment', taskId));
  };

  const handleAddDependency = (taskId: string, dependencyTaskId: string) => {
    const now = new Date().toISOString();
    const updated = data.tasks.map((t) => t.id !== taskId ? t : ({ ...t, dependencies: Array.from(new Set([...(t.dependencies ?? []), dependencyTaskId])), activity: [...(t.activity ?? []), makeActivity('dependency-added', 'Dependency linked', dependencyTaskId)], updatedAt: now }));
    upsertTasks(updated, 'Added dependency', taskId);
  };

  const handleAddAttachments = async (taskId: string, files: FileList) => {
    const uploaded: TaskAttachment[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', taskId);
      const res = await fetch('/api/attachments/upload', { method: 'POST', body: formData });
      if (res.ok) uploaded.push(await res.json());
    }
    const now = new Date().toISOString();
    const updatedTasks = data.tasks.map((t) => t.id === taskId ? { ...t, attachments: [...(t.attachments ?? []), ...uploaded], activity: [...(t.activity ?? []), ...uploaded.map((a) => makeActivity('file-uploaded', 'File uploaded', `${a.name}`))], updatedAt: now } : t);
    upsertTasks(updatedTasks, `Uploaded ${uploaded.length} file(s)`, taskId);
  };

  const markNotificationRead = (id: string, read = true) => {
    saveData({ ...data, notifications: (data.notifications ?? []).map((n) => n.id === id ? { ...n, read } : n) });
  };

  const markAllNotificationsRead = () => {
    saveData({ ...data, notifications: (data.notifications ?? []).map((n) => ({ ...n, read: true })) });
  };

  const saveCurrentView = () => {
    const name = prompt('Name this view');
    if (!name) return;
    const saved: SavedView = { id: `view-${Date.now()}`, name, query, projectId: filterProjectId === 'all' ? undefined : filterProjectId, createdAt: new Date().toISOString() };
    saveData(withWorkspaceActivity({ ...data, savedViews: [saved, ...(data.savedViews ?? [])] }, `Saved view: ${name}`));
  };

  const createFromTemplate = (templateId: string) => {
    const tpl = (data.templates ?? []).find((t) => t.id === templateId);
    if (!tpl) return;
    handleSaveTask({ ...tpl, status: 'todo' as TaskStatus, isTemplate: false });
  };

  const selectedView = useMemo(() => (data.savedViews ?? []).find((v) => v.id === activeSavedViewId), [data.savedViews, activeSavedViewId]);
  const searched = useMemo(() => applySavedView(data.tasks, selectedView, query), [data.tasks, selectedView, query]);
  const visibleTasks = filterProjectId === 'all' ? searched : searched.filter((t) => t.projectId === filterProjectId);
  const metrics = useMemo(() => {
    const overdue = visibleTasks.filter((t) => t.status !== 'done' && (dayDiff(t.dueDate) ?? 99) < 0).length;
    const dueSoon = visibleTasks.filter((t) => t.status !== 'done' && (dayDiff(t.dueDate) ?? 99) >= 0 && (dayDiff(t.dueDate) ?? 99) <= 2).length;
    const completed = visibleTasks.filter((t) => t.status === 'done').length;
    const blocked = visibleTasks.filter((t) => (t.dependencies ?? []).some((id) => data.tasks.find((x) => x.id === id && x.status !== 'done'))).length;
    return { overdue, dueSoon, completed, blocked };
  }, [visibleTasks, data.tasks]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3">
          <div className="hidden sm:flex items-center justify-between">
            <div><h1 className="text-2xl font-bold">relay.</h1><p className="text-sm text-muted-foreground">Project Dashboard</p></div>
            <div className="flex items-center gap-2"><Button variant="outline" onClick={() => setPaletteOpen(true)}><Command className="h-4 w-4 mr-2" />Command Palette</Button><Button variant="outline" onClick={saveCurrentView}><Save className="h-4 w-4 mr-2" />Save view</Button><Button onClick={() => handleAddTask('todo')}><Plus className="h-4 w-4 mr-2" />New Task</Button></div>
          </div>
          <div className="grid sm:grid-cols-4 gap-2"><div className="sm:col-span-2 relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks, tags, descriptions..." className="pl-8" /></div><Select value={filterProjectId} onValueChange={setFilterProjectId}><SelectTrigger><SelectValue placeholder="All Projects" /></SelectTrigger><SelectContent><SelectItem value="all">All Projects</SelectItem>{data.projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select><Select value={activeSavedViewId} onValueChange={setActiveSavedViewId}><SelectTrigger><SelectValue placeholder="Saved views" /></SelectTrigger><SelectContent><SelectItem value="none">No saved view</SelectItem>{(data.savedViews ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm"><div className="border rounded p-2"><BarChart3 className="h-4 w-4 inline mr-1" />Overdue: <b>{metrics.overdue}</b></div><div className="border rounded p-2">Due soon: <b>{metrics.dueSoon}</b></div><div className="border rounded p-2">Blocked: <b>{metrics.blocked}</b></div><div className="border rounded p-2">Done: <b>{metrics.completed}</b></div></div>
          <div className="flex items-center justify-between"><Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}><TabsList><TabsTrigger value="kanban" className="px-3"><LayoutGrid className="h-4 w-4" /></TabsTrigger><TabsTrigger value="list" className="px-3"><List className="h-4 w-4" /></TabsTrigger></TabsList></Tabs><div className="text-xs text-muted-foreground flex items-center gap-1"><Bell className="h-3 w-3" /> {(data.notifications ?? []).filter((n) => !n.read).length} unread</div></div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {(data.templates ?? []).length > 0 && <div className="border rounded p-3"><p className="text-sm font-medium mb-2">Templates</p><div className="flex flex-wrap gap-2">{data.templates!.map((t) => <Button key={t.id} variant="outline" size="sm" onClick={() => createFromTemplate(t.id)}>{t.name}</Button>)}</div></div>}
        {view === 'kanban' ? <KanbanBoard tasks={visibleTasks} projects={data.projects} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} onOpenTask={setActiveTask} /> : <ListView tasks={visibleTasks} projects={data.projects} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onOpenTask={setActiveTask} />}
        <div className="grid sm:grid-cols-2 gap-4"><div className="border rounded p-3"><h3 className="font-medium mb-2">Workspace activity</h3><div className="space-y-1 max-h-40 overflow-auto text-sm">{(data.activityFeed ?? []).slice(0, 20).map((a) => <div key={a.id} className="border rounded px-2 py-1">{a.summary} <span className="text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleString()}</span></div>)}</div></div><div className="border rounded p-3"><div className="flex items-center justify-between mb-2"><h3 className="font-medium">Notifications</h3><Button variant="ghost" size="sm" onClick={markAllNotificationsRead}><CheckCheck className="h-4 w-4 mr-1" />Mark all</Button></div><div className="space-y-1 max-h-40 overflow-auto text-sm">{(data.notifications ?? []).slice(0, 20).map((n) => <button key={n.id} onClick={() => markNotificationRead(n.id, !n.read)} className={`w-full text-left border rounded px-2 py-1 ${n.read ? '' : 'bg-blue-50'}`}>{n.title}: {n.body}</button>)}</div></div></div>
      </main>

      {activeTask && <TaskDetailSidebar task={activeTask} projects={data.projects} allTasks={data.tasks} onClose={() => setActiveTask(null)} onAddComment={handleAddComment} onAddDependency={handleAddDependency} onAddAttachments={handleAddAttachments} />}
      <TaskDialog open={isDialogOpen} onClose={() => { setIsDialogOpen(false); setEditingTask(null); }} onSave={handleSaveTask} task={editingTask} projects={data.projects} defaultStatus={defaultStatus} />

      {paletteOpen && <div className="fixed inset-0 bg-black/30 flex items-start justify-center pt-24 z-50" onClick={() => setPaletteOpen(false)}><div className="bg-background w-[95%] max-w-xl border rounded p-3" onClick={(e) => e.stopPropagation()}><p className="text-sm font-medium mb-2">Command Palette (Ctrl/Cmd+K)</p><Input ref={paletteInputRef} value={paletteQuery} onChange={(e) => { setPaletteQuery(e.target.value); }} placeholder="Search commands, views, tasks..." className="mb-2" /><div className="space-y-1 max-h-80 overflow-auto text-sm"><button className="w-full text-left border rounded px-2 py-1" onClick={() => { setIsDialogOpen(true); setPaletteOpen(false); }}>+ New task</button><button className="w-full text-left border rounded px-2 py-1" onClick={() => { setView(view === 'kanban' ? 'list' : 'kanban'); setPaletteOpen(false); }}>Toggle view</button>{(data.savedViews ?? []).filter((sv) => (`open view ${sv.name}`).toLowerCase().includes(paletteQuery.toLowerCase())).map((sv) => <button key={sv.id} className="w-full text-left border rounded px-2 py-1" onClick={() => { setActiveSavedViewId(sv.id); setPaletteOpen(false); }}>Open view: {sv.name}</button>)}{data.tasks.filter((t) => `${t.title} ${t.description ?? ''} ${(t.tags ?? []).join(' ')}`.toLowerCase().includes(paletteQuery.toLowerCase())).slice(0, 20).map((t) => <button key={t.id} className="w-full text-left border rounded px-2 py-1" onClick={() => { setActiveTask(t); setPaletteOpen(false); }}>{t.title}</button>)}</div></div></div>}
    </div>
  );
}
