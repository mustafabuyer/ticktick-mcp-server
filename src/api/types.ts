// TickTick API Types

export interface TickTickTask {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string; // yyyy-MM-dd'T'HH:mm:ssZ format
  dueDate?: string; // yyyy-MM-dd'T'HH:mm:ssZ format
  timeZone?: string;
  reminders?: string[]; // e.g., ["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"]
  repeatFlag?: string; // RRULE format
  priority?: 0 | 1 | 3 | 5; // 0=None, 1=Low, 3=Medium, 5=High
  status?: 0 | 2; // 0=Normal, 2=Completed
  completedTime?: string;
  sortOrder?: number;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id?: string;
  title: string;
  status?: 0 | 1; // 0=Normal, 1=Completed
  completedTime?: string;
  isAllDay?: boolean;
  sortOrder?: number;
  startDate?: string;
  timeZone?: string;
}

export interface TickTickProject {
  id: string;
  name: string;
  color?: string;
  sortOrder?: number;
  closed?: boolean;
  groupId?: string;
  viewMode?: 'list' | 'kanban' | 'timeline';
  permission?: 'read' | 'write' | 'comment';
  kind?: 'TASK' | 'NOTE';
}

export interface TickTickColumn {
  id: string;
  projectId: string;
  name: string;
  sortOrder?: number;
}

export interface ProjectData {
  project: TickTickProject;
  tasks: TickTickTask[];
  columns: TickTickColumn[];
}

export interface CreateTaskInput {
  title: string;
  projectId?: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  reminders?: string[];
  repeatFlag?: string;
  priority?: 0 | 1 | 3 | 5;
  sortOrder?: number;
  items?: Omit<ChecklistItem, 'id'>[];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  projectId: string;
}

export interface CreateProjectInput {
  name: string;
  color?: string;
  sortOrder?: number;
  viewMode?: 'list' | 'kanban' | 'timeline';
  kind?: 'TASK' | 'NOTE';
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  // All fields are optional for update
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface SearchTasksInput {
  query: string;
  projectId?: string;
  status?: 'active' | 'completed' | 'all';
  priority?: 0 | 1 | 3 | 5;
}

export interface BatchSubtaskInput {
  taskId: string;
  projectId: string;
  subtasks: Array<{
    title: string;
    sortOrder?: number;
  }>;
}

export interface GetUpcomingTasksInput {
  days?: number;
}

export interface GetTodaysTasksInput {
  includeOverdue?: boolean;
}