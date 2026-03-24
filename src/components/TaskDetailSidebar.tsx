'use client';

import { useMemo, useState } from 'react';
import { ASSIGNEE_CONFIG, PRIORITY_CONFIG, Project, STATUS_CONFIG, Task, TaskAttachment, TaskNote } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Paperclip, Send, X } from 'lucide-react';

interface TaskDetailSidebarProps {
  task: Task | null;
  projects: Project[];
  onClose: () => void;
  onAddNote: (taskId: string, body: string) => void;
  onAddAttachments: (taskId: string, files: FileList) => void;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function TaskDetailSidebar({ task, projects, onClose, onAddNote, onAddAttachments }: TaskDetailSidebarProps) {
  const [noteText, setNoteText] = useState('');

  const project = useMemo(() => projects.find(p => p.id === task?.projectId), [projects, task?.projectId]);

  if (!task) return null;

  const notes: TaskNote[] = task.notes ?? [];
  const attachments: TaskAttachment[] = task.attachments ?? [];

  const timeline = [
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      at: n.createdAt,
      label: `Note added${n.author ? ` by ${n.author}` : ''}`,
      detail: n.body,
      type: 'note' as const,
    })),
    ...attachments.map((a) => ({
      id: `file-${a.id}`,
      at: a.createdAt,
      label: 'File uploaded',
      detail: `${a.name} (${formatBytes(a.size)})`,
      type: 'file' as const,
    })),
    {
      id: 'updated',
      at: task.updatedAt,
      label: 'Task updated',
      detail: `${STATUS_CONFIG[task.status].label} · ${PRIORITY_CONFIG[task.priority].label}`,
      type: 'event' as const,
    },
    {
      id: 'created',
      at: task.createdAt,
      label: 'Task created',
      detail: 'Initial creation',
      type: 'event' as const,
    },
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const assigneeLabel = task.assignee ? `${ASSIGNEE_CONFIG[task.assignee].emoji} ${ASSIGNEE_CONFIG[task.assignee].label}` : 'Unassigned';

  return (
    <aside className="fixed right-0 top-0 z-40 h-screen w-full border-l bg-background shadow-xl sm:w-[460px]">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">{task.title}</h2>
            <p className="text-xs text-muted-foreground">Task details</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={`text-white ${STATUS_CONFIG[task.status].color}`}>{STATUS_CONFIG[task.status].label}</Badge>
            <Badge className={`text-white ${PRIORITY_CONFIG[task.priority].color}`}>{PRIORITY_CONFIG[task.priority].label}</Badge>
            {project && (
              <Badge variant="outline" style={{ borderColor: project.color, color: project.color }}>
                {project.name}
              </Badge>
            )}
            <Badge variant="outline">{assigneeLabel}</Badge>
          </div>

          {task.description && (
            <section>
              <h3 className="mb-1 text-sm font-medium">Description</h3>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </section>
          )}

          {task.dueDate && (
            <section className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Due {new Date(task.dueDate).toLocaleDateString()}
            </section>
          )}

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Notes</h3>
            <div className="flex gap-2">
              <Input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
              />
              <Button
                size="icon"
                onClick={() => {
                  if (!noteText.trim()) return;
                  onAddNote(task.id, noteText.trim());
                  setNoteText('');
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notes yet.</p>
              ) : (
                notes
                  .slice()
                  .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                  .map((note) => (
                    <div key={note.id} className="rounded border p-2">
                      <p className="text-sm">{note.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Files</h3>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-muted/60">
              <Paperclip className="h-4 w-4" /> Upload file(s)
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) onAddAttachments(task.id, e.target.files);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            <div className="space-y-2">
              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No files yet.</p>
              ) : (
                attachments
                  .slice()
                  .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                  .map((file) => (
                    <div key={file.id} className="rounded border p-2">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)} · {new Date(file.createdAt).toLocaleString()}</p>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Timeline</h3>
            <div className="space-y-2">
              {timeline.map((item) => (
                <div key={item.id} className="rounded border p-2">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{new Date(item.at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
