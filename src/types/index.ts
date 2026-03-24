export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskAssignee = 'forge' | 'arcus' | 'gideon' | null;

export interface TaskNote {
  id: string;
  body: string;
  createdAt: string;
  author?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  dataUrl?: string;
}

export interface TaskActivity {
  id: string;
  type: 'created' | 'updated' | 'status-changed' | 'assignee-changed' | 'note-added' | 'file-uploaded';
  createdAt: string;
  summary: string;
  detail?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assignee: TaskAssignee;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  notes?: TaskNote[];
  attachments?: TaskAttachment[];
  activity?: TaskActivity[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

export interface DashboardData {
  projects: Project[];
  tasks: Task[];
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  'backlog': { label: 'Backlog', color: 'bg-slate-500' },
  'todo': { label: 'To Do', color: 'bg-blue-500' },
  'in-progress': { label: 'In Progress', color: 'bg-yellow-500' },
  'review': { label: 'Review', color: 'bg-purple-500' },
  'done': { label: 'Done', color: 'bg-green-500' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  'low': { label: 'Low', color: 'bg-slate-400' },
  'medium': { label: 'Medium', color: 'bg-blue-400' },
  'high': { label: 'High', color: 'bg-orange-400' },
  'urgent': { label: 'Urgent', color: 'bg-red-500' },
};

export const ASSIGNEE_CONFIG: Record<Exclude<TaskAssignee, null>, { label: string; emoji: string; color: string }> = {
  'forge': { label: 'Forge', emoji: '🔨', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'arcus': { label: 'Arcus', emoji: '🔷', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'gideon': { label: 'Gideon', emoji: '👤', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};
