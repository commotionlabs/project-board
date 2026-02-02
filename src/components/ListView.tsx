'use client';

import { Task, Project, TaskStatus, STATUS_CONFIG, PRIORITY_CONFIG } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Calendar, ArrowRight } from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  projects: Project[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  filterProjectId?: string;
}

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];

export function ListView({ 
  tasks, 
  projects, 
  onStatusChange, 
  onEdit, 
  onDelete,
  filterProjectId 
}: ListViewProps) {
  const filteredTasks = filterProjectId 
    ? tasks.filter(t => t.projectId === filterProjectId)
    : tasks;

  const getProjectById = (id: string) => projects.find(p => p.id === id);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Sort by status order, then by priority
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const statusOrder = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
    if (statusOrder !== 0) return statusOrder;
    const priorityOrder = ['urgent', 'high', 'medium', 'low'];
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });

  const TaskActions = ({ task }: { task: Task }) => {
    const currentIndex = STATUSES.indexOf(task.status);
    const nextStatus = STATUSES[currentIndex + 1];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(task)}>
            Edit
          </DropdownMenuItem>
          {nextStatus && (
            <DropdownMenuItem onClick={() => onStatusChange(task.id, nextStatus)}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Move to {STATUS_CONFIG[nextStatus].label}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {STATUSES.map((status) => (
            status !== task.status && (
              <DropdownMenuItem 
                key={status}
                onClick={() => onStatusChange(task.id, status)}
              >
                Move to {STATUS_CONFIG[status].label}
              </DropdownMenuItem>
            )
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onDelete(task.id)}
            className="text-red-600"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Mobile Card View
  const MobileListView = () => (
    <div className="space-y-3 sm:hidden">
      {sortedTasks.map((task) => {
        const project = getProjectById(task.projectId);
        const statusConfig = STATUS_CONFIG[task.status];
        const priorityConfig = PRIORITY_CONFIG[task.priority];

        return (
          <Card key={task.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {task.description}
                    </p>
                  )}
                </div>
                <TaskActions task={task} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge 
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 text-white ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </Badge>
                <Badge 
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 text-white ${priorityConfig.color}`}
                >
                  {priorityConfig.label}
                </Badge>
                {project && (
                  <Badge 
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={{ borderColor: project.color, color: project.color }}
                  >
                    {project.name}
                  </Badge>
                )}
                {task.dueDate && (
                  <span className="flex items-center text-[10px] text-muted-foreground ml-auto">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDateShort(task.dueDate)}
                  </span>
                )}
              </div>
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {sortedTasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No tasks found
        </div>
      )}
    </div>
  );

  // Desktop Table View
  const DesktopTableView = () => (
    <div className="hidden sm:block border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr className="text-left text-sm">
            <th className="px-4 py-3 font-medium">Task</th>
            <th className="px-4 py-3 font-medium w-32">Status</th>
            <th className="px-4 py-3 font-medium w-24">Priority</th>
            <th className="px-4 py-3 font-medium w-40">Project</th>
            <th className="px-4 py-3 font-medium w-32">Due Date</th>
            <th className="px-4 py-3 font-medium w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedTasks.map((task) => {
            const project = getProjectById(task.projectId);
            const statusConfig = STATUS_CONFIG[task.status];
            const priorityConfig = PRIORITY_CONFIG[task.priority];

            return (
              <tr 
                key={task.id} 
                className="hover:bg-muted/30 transition-colors group"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {task.tags.map((tag) => (
                          <span 
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge 
                    variant="secondary"
                    className={`text-xs text-white ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge 
                    variant="secondary"
                    className={`text-xs text-white ${priorityConfig.color}`}
                  >
                    {priorityConfig.label}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {project && (
                    <Badge 
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: project.color, color: project.color }}
                    >
                      {project.name}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(task.dueDate)}
                </td>
                <td className="px-4 py-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <TaskActions task={task} />
                  </div>
                </td>
              </tr>
            );
          })}
          {sortedTasks.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No tasks found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <MobileListView />
      <DesktopTableView />
    </>
  );
}
