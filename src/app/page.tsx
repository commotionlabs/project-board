'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ListView } from '@/components/ListView';
import { TaskDetailSidebar } from '@/components/TaskDetailSidebar';
import { TaskDialog } from '@/components/TaskDialog';
import { Task, TaskAttachment, TaskStatus, DashboardData } from '@/types';
import { Plus, LayoutGrid, List, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({ projects: [], tasks: [] });
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [loading, setLoading] = useState(true);

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
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const upsertTasks = (updatedTasks: Task[]) => {
    const newData = { ...data, tasks: updatedTasks };
    setData(newData);
    saveData(newData);
    if (activeTask) {
      const refreshed = updatedTasks.find(t => t.id === activeTask.id) ?? null;
      setActiveTask(refreshed);
    }
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    const updatedTasks = data.tasks.map(t =>
      t.id === taskId
        ? { ...t, status, updatedAt: new Date().toISOString() }
        : t
    );
    upsertTasks(updatedTasks);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleDelete = (taskId: string) => {
    const updatedTasks = data.tasks.filter(t => t.id !== taskId);
    upsertTasks(updatedTasks);
  };

  const handleAddTask = (status: TaskStatus) => {
    setEditingTask(null);
    setDefaultStatus(status);
    setIsDialogOpen(true);
  };

  const handleSaveTask = (taskData: Partial<Task> & { id?: string }) => {
    const now = new Date().toISOString();

    if (taskData.id) {
      const updatedTasks = data.tasks.map(t =>
        t.id === taskData.id
          ? { ...t, ...taskData, updatedAt: now }
          : t
      );
      upsertTasks(updatedTasks);
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: taskData.title!,
        description: taskData.description,
        status: taskData.status!,
        priority: taskData.priority!,
        projectId: taskData.projectId!,
        assignee: taskData.assignee ?? null,
        dueDate: taskData.dueDate,
        tags: taskData.tags,
        notes: [],
        attachments: [],
        createdAt: now,
        updatedAt: now,
      };
      upsertTasks([...data.tasks, newTask]);
    }
  };

  const handleAddNote = (taskId: string, body: string) => {
    const now = new Date().toISOString();
    const updatedTasks = data.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            notes: [
              ...(t.notes ?? []),
              { id: `note-${Date.now()}`, body, createdAt: now, author: 'gideon' },
            ],
            updatedAt: now,
          }
        : t
    );
    upsertTasks(updatedTasks);
  };

  const handleAddAttachments = async (taskId: string, files: FileList) => {
    const now = new Date().toISOString();
    const toAttachment = (file: File): Promise<TaskAttachment> => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          createdAt: now,
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        });
      };
      reader.readAsDataURL(file);
    });

    const attachments = await Promise.all(Array.from(files).map(toAttachment));
    const updatedTasks = data.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            attachments: [...(t.attachments ?? []), ...attachments],
            updatedAt: now,
          }
        : t
    );
    upsertTasks(updatedTasks);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeFilter = filterProjectId === 'all' ? undefined : filterProjectId;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">relay.</h1>
                <p className="text-xs text-muted-foreground">Project Dashboard</p>
              </div>
              <Button size="sm" onClick={() => handleAddTask('todo')}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {data.projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
                <TabsList className="h-9">
                  <TabsTrigger value="kanban" className="px-2.5"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="list" className="px-2.5"><List className="h-4 w-4" /></TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">relay.</h1>
              <p className="text-sm text-muted-foreground">Project Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All Projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {data.projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
                <TabsList>
                  <TabsTrigger value="kanban" className="px-3"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="list" className="px-3"><List className="h-4 w-4" /></TabsTrigger>
                </TabsList>
              </Tabs>
              <Button onClick={() => handleAddTask('todo')}><Plus className="h-4 w-4 mr-2" />New Task</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {view === 'kanban' ? (
          <KanbanBoard tasks={data.tasks} projects={data.projects} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} filterProjectId={activeFilter} />
        ) : (
          <ListView tasks={data.tasks} projects={data.projects} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onOpenTask={setActiveTask} filterProjectId={activeFilter} />
        )}
      </main>

      {activeTask && (
        <TaskDetailSidebar task={activeTask} projects={data.projects} onClose={() => setActiveTask(null)} onAddNote={handleAddNote} onAddAttachments={handleAddAttachments} />
      )}

      <TaskDialog open={isDialogOpen} onClose={() => { setIsDialogOpen(false); setEditingTask(null); }} onSave={handleSaveTask} task={editingTask} projects={data.projects} defaultStatus={defaultStatus} />
    </div>
  );
}
