'use client';

import { useMemo, useState } from 'react';
import { ASSIGNEE_CONFIG, PRIORITY_CONFIG, Project, STATUS_CONFIG, Task, TaskAttachment } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Download, Eye, Paperclip, Send, X } from 'lucide-react';

interface TaskDetailSidebarProps {
  task: Task | null;
  projects: Project[];
  allTasks: Task[];
  onClose: () => void;
  onAddComment: (taskId: string, body: string) => void;
  onAddDependency: (taskId: string, dependencyTaskId: string) => void;
  onAddAttachments: (taskId: string, files: FileList) => void;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function TaskDetailSidebar({ task, projects, allTasks, onClose, onAddComment, onAddDependency, onAddAttachments }: TaskDetailSidebarProps) {
  const [commentText, setCommentText] = useState('');
  const [depId, setDepId] = useState('');
  const project = useMemo(() => projects.find(p => p.id === task?.projectId), [projects, task?.projectId]);
  if (!task) return null;

  const attachments: TaskAttachment[] = task.attachments ?? [];
  const assigneeLabel = task.assignee ? `${ASSIGNEE_CONFIG[task.assignee].emoji} ${ASSIGNEE_CONFIG[task.assignee].label}` : 'Unassigned';
  const blockers = (task.dependencies ?? []).map((id) => allTasks.find((t) => t.id === id)).filter(Boolean) as Task[];

  return (
    <aside className="fixed right-0 top-0 z-40 h-screen w-full border-l bg-background shadow-xl sm:w-[460px]">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between border-b px-4 py-3">
          <div><h2 className="text-base font-semibold">{task.title}</h2><p className="text-xs text-muted-foreground">Task details</p></div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={`text-white ${STATUS_CONFIG[task.status].color}`}>{STATUS_CONFIG[task.status].label}</Badge>
            <Badge className={`text-white ${PRIORITY_CONFIG[task.priority].color}`}>{PRIORITY_CONFIG[task.priority].label}</Badge>
            {project && <Badge variant="outline" style={{ borderColor: project.color, color: project.color }}>{project.name}</Badge>}
            <Badge variant="outline">{assigneeLabel}</Badge>
          </div>

          {task.description && <section><h3 className="mb-1 text-sm font-medium">Description</h3><p className="text-sm text-muted-foreground">{task.description}</p></section>}
          {task.dueDate && <section className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />Due {new Date(task.dueDate).toLocaleDateString()}</section>}

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Dependencies</h3>
            <div className="flex gap-2">
              <select className="border rounded px-2 py-1 text-sm flex-1" value={depId} onChange={(e) => setDepId(e.target.value)}>
                <option value="">Select a blocking task…</option>
                {allTasks.filter((t) => t.id !== task.id).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <Button size="sm" onClick={() => { if (!depId) return; onAddDependency(task.id, depId); setDepId(''); }}>Add</Button>
            </div>
            <div className="space-y-1">
              {blockers.length === 0 ? <p className="text-xs text-muted-foreground">No dependencies.</p> : blockers.map((b) => (
                <p key={b.id} className="text-xs border rounded px-2 py-1">{b.title} · {STATUS_CONFIG[b.status].label}</p>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Comments (@mentions supported)</h3>
            <div className="flex gap-2">
              <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." />
              <Button size="icon" onClick={() => { if (!commentText.trim()) return; onAddComment(task.id, commentText.trim()); setCommentText(''); }}><Send className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {(task.comments ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No comments yet.</p> : task.comments!.slice().reverse().map((note) => (
                <div key={note.id} className="rounded border p-2"><p className="text-sm">{note.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{note.author} · {new Date(note.createdAt).toLocaleString()}</p></div>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Files</h3>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-muted/60">
              <Paperclip className="h-4 w-4" /> Upload file(s)
              <input type="file" className="hidden" multiple onChange={(e) => { if (e.target.files?.length) onAddAttachments(task.id, e.target.files); e.currentTarget.value = ''; }} />
            </label>
            <div className="space-y-2">
              {attachments.length === 0 ? <p className="text-xs text-muted-foreground">No files yet.</p> : attachments.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map((file) => (
                <div key={file.id} className="rounded border p-2">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)} · {new Date(file.createdAt).toLocaleString()}</p>
                  <div className="mt-2 flex gap-2">
                    <Button asChild size="sm" variant="outline"><a href={`/api/attachments/${task.id}/${file.id}`} target="_blank" rel="noreferrer"><Eye className="h-3.5 w-3.5 mr-1" />Preview</a></Button>
                    <Button asChild size="sm" variant="outline"><a href={`/api/attachments/${task.id}/${file.id}?download=1`} download={file.name}><Download className="h-3.5 w-3.5 mr-1" />Download</a></Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
