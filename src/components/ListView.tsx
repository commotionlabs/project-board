'use client';

import * as React from 'react';
import { Task, Project, TaskStatus, STATUS_CONFIG, PRIORITY_CONFIG, ASSIGNEE_CONFIG } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Calendar, ArrowRight, Columns3, UserRound } from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  projects: Project[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onOpenTask?: (task: Task) => void;
  filterProjectId?: string;
}

type ListColumn = 'status' | 'priority' | 'assignee' | 'project' | 'dueDate';

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];
const DEFAULT_COLUMNS: ListColumn[] = ['status', 'priority', 'assignee', 'project', 'dueDate'];

export function ListView({ tasks, projects, onStatusChange, onEdit, onDelete, onOpenTask, filterProjectId }: ListViewProps) {
  const filteredTasks = filterProjectId ? tasks.filter(t => t.projectId === filterProjectId) : tasks;
  const [visibleColumns, setVisibleColumns] = React.useState<ListColumn[]>(DEFAULT_COLUMNS);

  const getProjectById = (id: string) => projects.find(p => p.id === id);
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const formatDateShort = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const statusOrder = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
    if (statusOrder !== 0) return statusOrder;
    const priorityOrder = ['urgent', 'high', 'medium', 'low'];
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });

  const toggleColumn = (column: ListColumn) => {
    setVisibleColumns((current) => {
      if (current.includes(column)) {
        if (current.length === 1) return current;
        return current.filter(c => c !== column);
      }
      return [...current, column];
    });
  };

  const renderTaskActions = (task: Task) => {
    const currentIndex = STATUSES.indexOf(task.status);
    const nextStatus = STATUSES[currentIndex + 1];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={(e) => e.stopPropagation()}>
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
          {STATUSES.map((status) => status !== task.status && (
            <DropdownMenuItem key={status} onClick={() => onStatusChange(task.id, status)}>
              Move to {STATUS_CONFIG[status].label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className="mb-3 hidden sm:flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2"><Columns3 className="h-4 w-4" /> Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={visibleColumns.includes('status')} onCheckedChange={() => toggleColumn('status')}>Status</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.includes('priority')} onCheckedChange={() => toggleColumn('priority')}>Priority</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.includes('assignee')} onCheckedChange={() => toggleColumn('assignee')}>Assignee</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.includes('project')} onCheckedChange={() => toggleColumn('project')}>Project</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.includes('dueDate')} onCheckedChange={() => toggleColumn('dueDate')}>Due date</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3 sm:hidden">
        {sortedTasks.map((task) => {
          const project = getProjectById(task.projectId);
          return (
            <Card key={task.id} className="overflow-hidden" onClick={() => onOpenTask?.(task)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>}
                  </div>
                  {renderTaskActions(task)}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 text-white ${STATUS_CONFIG[task.status].color}`}>{STATUS_CONFIG[task.status].label}</Badge>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 text-white ${PRIORITY_CONFIG[task.priority].color}`}>{PRIORITY_CONFIG[task.priority].label}</Badge>
                  {project && <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: project.color, color: project.color }}>{project.name}</Badge>}
                  {task.dueDate && <span className="flex items-center text-[10px] text-muted-foreground ml-auto"><Calendar className="h-3 w-3 mr-1" />{formatDateShort(task.dueDate)}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sortedTasks.length === 0 && <div className="text-center py-8 text-muted-foreground">No tasks found</div>}
      </div>

      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-left text-sm">
              <th className="px-4 py-3 font-medium">Task</th>
              {visibleColumns.includes('status') && <th className="px-4 py-3 font-medium w-32">Status</th>}
              {visibleColumns.includes('priority') && <th className="px-4 py-3 font-medium w-24">Priority</th>}
              {visibleColumns.includes('assignee') && <th className="px-4 py-3 font-medium w-32">Assignee</th>}
              {visibleColumns.includes('project') && <th className="px-4 py-3 font-medium w-40">Project</th>}
              {visibleColumns.includes('dueDate') && <th className="px-4 py-3 font-medium w-32">Due Date</th>}
              <th className="px-4 py-3 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedTasks.map((task) => {
              const project = getProjectById(task.projectId);
              return (
                <tr key={task.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => onOpenTask?.(task)}>
                  <td className="px-4 py-3"><p className="font-medium text-sm">{task.title}</p>{task.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>}</td>
                  {visibleColumns.includes('status') && <td className="px-4 py-3"><Badge variant="secondary" className={`text-xs text-white ${STATUS_CONFIG[task.status].color}`}>{STATUS_CONFIG[task.status].label}</Badge></td>}
                  {visibleColumns.includes('priority') && <td className="px-4 py-3"><Badge variant="secondary" className={`text-xs text-white ${PRIORITY_CONFIG[task.priority].color}`}>{PRIORITY_CONFIG[task.priority].label}</Badge></td>}
                  {visibleColumns.includes('assignee') && <td className="px-4 py-3 text-sm text-muted-foreground">{task.assignee ? <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{ASSIGNEE_CONFIG[task.assignee].label}</span> : 'Unassigned'}</td>}
                  {visibleColumns.includes('project') && <td className="px-4 py-3">{project && <Badge variant="outline" className="text-xs" style={{ borderColor: project.color, color: project.color }}>{project.name}</Badge>}</td>}
                  {visibleColumns.includes('dueDate') && <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(task.dueDate)}</td>}
                  <td className="px-4 py-3"><div className="opacity-0 group-hover:opacity-100 transition-opacity">{renderTaskActions(task)}</div></td>
                </tr>
              );
            })}
            {sortedTasks.length === 0 && <tr><td colSpan={visibleColumns.length + 2} className="px-4 py-8 text-center text-muted-foreground">No tasks found</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
