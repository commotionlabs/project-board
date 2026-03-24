/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, Project, TaskStatus, TaskPriority, TaskAssignee, STATUS_CONFIG, PRIORITY_CONFIG, ASSIGNEE_CONFIG } from '@/types';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task> & { id?: string }) => void;
  task?: Task | null;
  projects: Project[];
  defaultStatus?: TaskStatus;
}

export function TaskDialog({ open, onClose, onSave, task, projects, defaultStatus = 'todo' }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState('');
  const [assignee, setAssignee] = useState<TaskAssignee>(null);
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [interval, setInterval] = useState(1);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setProjectId(task.projectId);
      setAssignee(task.assignee);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setTags(task.tags?.join(', ') || '');
      setIsTemplate(Boolean(task.isTemplate));
      setRecurrenceEnabled(Boolean(task.recurrence?.enabled));
      setFrequency(task.recurrence?.frequency ?? 'weekly');
      setInterval(task.recurrence?.interval ?? 1);
    } else {
      setTitle('');setDescription('');setStatus(defaultStatus);setPriority('medium');setProjectId(projects[0]?.id || '');setAssignee(null);setDueDate('');setTags('');setIsTemplate(false);setRecurrenceEnabled(false);setFrequency('weekly');setInterval(1);
    }
  }, [task, defaultStatus, projects]);

  const handleSave = () => {
    const taskData: Partial<Task> & { id?: string } = {
      title,
      description: description || undefined,
      status,
      priority,
      projectId,
      assignee,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      isTemplate,
      recurrence: recurrenceEnabled ? { enabled: true, frequency, interval, nextDueAt: dueDate ? new Date(dueDate).toISOString() : undefined } : undefined,
    };
    if (task) taskData.id = task.id;
    onSave(taskData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] rounded-lg">
        <DialogHeader><DialogTitle className="text-lg">{task ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 sm:py-4">
          <div className="space-y-1.5"><label className="text-sm font-medium">Title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title..." className="h-10" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Description</label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." className="h-10" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Status</label><Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_CONFIG).map(([key, config]) => <SelectItem key={key} value={key}>{config.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Priority</label><Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRIORITY_CONFIG).map(([key, config]) => <SelectItem key={key} value={key}>{config.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Project</label><Select value={projectId} onValueChange={setProjectId}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Assignee</label><Select value={assignee || 'unassigned'} onValueChange={(v) => setAssignee(v === 'unassigned' ? null : v as TaskAssignee)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{Object.entries(ASSIGNEE_CONFIG).map(([key, config]) => <SelectItem key={key} value={key}>{config.emoji} {config.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Due Date</label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Tags</label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2..." className="h-10" /></div>
          <div className="flex items-center justify-between border rounded p-2"><label className="text-sm">Task template</label><input type="checkbox" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} /></div>
          <div className="space-y-2 border rounded p-2"><div className="flex items-center justify-between"><label className="text-sm">Recurring task</label><input type="checkbox" checked={recurrenceEnabled} onChange={(e) => setRecurrenceEnabled(e.target.checked)} /></div>{recurrenceEnabled && <div className="grid grid-cols-2 gap-2"><Select value={frequency} onValueChange={(v) => setFrequency(v as 'daily'|'weekly'|'monthly')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select><Input type="number" min={1} value={interval} onChange={(e) => setInterval(Number(e.target.value) || 1)} /></div>}</div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0"><Button variant="outline" onClick={onClose} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button><Button onClick={handleSave} disabled={!title || !projectId} className="w-full sm:w-auto order-1 sm:order-2">{task ? 'Save Changes' : 'Create Task'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
