'use client';

import { useState } from 'react';
import { Task, Project, TaskStatus, STATUS_CONFIG } from '@/types';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
  filterProjectId?: string;
}

const COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];

export function KanbanBoard({ 
  tasks, 
  projects, 
  onStatusChange, 
  onEdit, 
  onDelete,
  onAddTask,
  filterProjectId 
}: KanbanBoardProps) {
  const [mobileColumnIndex, setMobileColumnIndex] = useState(1); // Start on "To Do"
  
  const filteredTasks = filterProjectId 
    ? tasks.filter(t => t.projectId === filterProjectId)
    : tasks;

  const getProjectById = (id: string) => projects.find(p => p.id === id);

  const goToPrevColumn = () => {
    setMobileColumnIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextColumn = () => {
    setMobileColumnIndex(prev => Math.min(COLUMNS.length - 1, prev + 1));
  };

  // Mobile Single Column View
  const MobileKanbanView = () => {
    const currentStatus = COLUMNS[mobileColumnIndex];
    const columnTasks = filteredTasks.filter(t => t.status === currentStatus);
    const config = STATUS_CONFIG[currentStatus];

    return (
      <div className="sm:hidden">
        {/* Column Selector */}
        <div className="flex items-center justify-between mb-4 bg-muted/50 rounded-lg p-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToPrevColumn}
            disabled={mobileColumnIndex === 0}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${config.color}`} />
            <span className="font-medium text-sm">{config.label}</span>
            <Badge variant="secondary" className="text-xs">
              {columnTasks.length}
            </Badge>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToNextColumn}
            disabled={mobileColumnIndex === COLUMNS.length - 1}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Column Dots Indicator */}
        <div className="flex justify-center gap-1.5 mb-4">
          {COLUMNS.map((status, index) => {
            const count = filteredTasks.filter(t => t.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setMobileColumnIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === mobileColumnIndex 
                    ? 'w-6 bg-primary' 
                    : 'w-2 bg-muted-foreground/30'
                }`}
                title={`${STATUS_CONFIG[status].label} (${count})`}
              />
            );
          })}
        </div>

        {/* Add Task Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mb-3"
          onClick={() => onAddTask(currentStatus)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to {config.label}
        </Button>

        {/* Tasks */}
        <div className="space-y-2">
          {columnTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              project={getProjectById(task.projectId)}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {columnTasks.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground bg-muted/30 rounded-lg">
              No tasks in {config.label}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Desktop Multi-Column View
  const DesktopKanbanView = () => (
    <div className="hidden sm:flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((status) => {
        const columnTasks = filteredTasks.filter(t => t.status === status);
        const config = STATUS_CONFIG[status];
        
        return (
          <div 
            key={status} 
            className="flex-shrink-0 w-72 bg-muted/50 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${config.color}`} />
                <h3 className="font-medium text-sm">{config.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => onAddTask(status)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  project={getProjectById(task.projectId)}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <MobileKanbanView />
      <DesktopKanbanView />
    </>
  );
}
