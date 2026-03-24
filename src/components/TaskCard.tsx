'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Task, Project, PRIORITY_CONFIG, ASSIGNEE_CONFIG, TaskStatus, STATUS_CONFIG } from '@/types';
import { MoreHorizontal, Calendar, ArrowRight } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onOpenTask?: (task: Task) => void;
}

export function TaskCard({ task, project, onStatusChange, onEdit, onDelete, onOpenTask }: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const statuses: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];
  const currentIndex = statuses.indexOf(task.status);
  const nextStatus = statuses[currentIndex + 1];

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpenTask?.(task)}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight">{task.title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
              {nextStatus && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, nextStatus)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move to {STATUS_CONFIG[nextStatus].label}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {statuses.map((status) => (
                status !== task.status && (
                  <DropdownMenuItem key={status} onClick={() => onStatusChange(task.id, status)}>
                    Move to {STATUS_CONFIG[status].label}
                  </DropdownMenuItem>
                )
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {task.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 text-white ${priorityConfig.color}`}>{priorityConfig.label}</Badge>
          {project && <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: project.color, color: project.color }}>{project.name}</Badge>}
          {task.assignee && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${ASSIGNEE_CONFIG[task.assignee].color}`}>{ASSIGNEE_CONFIG[task.assignee].emoji} {ASSIGNEE_CONFIG[task.assignee].label}</Badge>}
          {task.dueDate && <span className="flex items-center text-[10px] text-muted-foreground ml-auto"><Calendar className="h-3 w-3 mr-1" />{formatDate(task.dueDate)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
