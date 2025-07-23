import { z } from 'zod';
import { parse, isValid, format } from 'date-fns';
import { ValidationError } from './errors.js';

// Date validation and parsing
export function parseDate(dateString: string | undefined): string | undefined {
  if (!dateString) return undefined;

  // Try to parse ISO format first
  const isoDate = new Date(dateString);
  if (isValid(isoDate)) {
    return format(isoDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }

  // Try common date formats
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd HH:mm:ss'
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(dateString, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, "yyyy-MM-dd'T'HH:mm:ssXXX");
      }
    } catch {
      // Continue to next format
    }
  }

  throw new ValidationError(`Invalid date format: ${dateString}. Please use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)`);
}

// Priority validation
export const PrioritySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(3),
  z.literal(5)
]).optional();

// Task schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  projectId: z.string().optional(),
  content: z.string().optional(),
  desc: z.string().optional(),
  isAllDay: z.boolean().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  timeZone: z.string().optional(),
  reminders: z.array(z.string()).optional(),
  repeatFlag: z.string().optional(),
  priority: PrioritySchema,
  sortOrder: z.number().optional(),
  items: z.array(z.object({
    title: z.string().min(1, 'Subtask title is required'),
    sortOrder: z.number().optional()
  })).optional()
});

export const UpdateTaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().optional(),
  content: z.string().optional(),
  desc: z.string().optional(),
  isAllDay: z.boolean().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  timeZone: z.string().optional(),
  reminders: z.array(z.string()).optional(),
  repeatFlag: z.string().optional(),
  priority: PrioritySchema,
  sortOrder: z.number().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Subtask title is required'),
    status: z.union([z.literal(0), z.literal(1)]).optional(),
    sortOrder: z.number().optional()
  })).optional()
});

export const CompleteTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  taskId: z.string().min(1, 'Task ID is required')
});

export const DeleteTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  taskId: z.string().min(1, 'Task ID is required')
});

export const GetTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  taskId: z.string().min(1, 'Task ID is required')
});

export const SearchTasksSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  projectId: z.string().optional(),
  status: z.enum(['active', 'completed', 'all']).optional(),
  priority: PrioritySchema
});

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF0000)').optional(),
  sortOrder: z.number().optional(),
  viewMode: z.enum(['list', 'kanban', 'timeline']).optional(),
  kind: z.enum(['TASK', 'NOTE']).optional()
});

export const UpdateProjectSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  name: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  sortOrder: z.number().optional(),
  viewMode: z.enum(['list', 'kanban', 'timeline']).optional(),
  kind: z.enum(['TASK', 'NOTE']).optional()
});

export const DeleteProjectSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required')
});

export const GetProjectSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required')
});

// Utility schemas
export const GetTodaysTasksSchema = z.object({
  includeOverdue: z.boolean().optional()
});

export const GetUpcomingTasksSchema = z.object({
  days: z.number().min(1).max(30).optional().default(7)
});

export const BatchSubtaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  subtasks: z.array(z.object({
    title: z.string().min(1, 'Subtask title is required'),
    sortOrder: z.number().optional()
  })).min(1, 'At least one subtask is required')
});

// Validation helper
export function validateInput<T>(schema: z.ZodSchema<T>, input: any): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Invalid input: ${errors}`, error.errors);
    }
    throw error;
  }
}

// RRULE validation helper
export function validateRRule(rrule: string | undefined): string | undefined {
  if (!rrule) return undefined;

  // Basic RRULE validation
  if (!rrule.startsWith('RRULE:')) {
    throw new ValidationError('Repeat rule must start with "RRULE:"');
  }

  // Check for required FREQ parameter
  if (!rrule.includes('FREQ=')) {
    throw new ValidationError('Repeat rule must include FREQ parameter');
  }

  // Validate FREQ values
  const validFreqs = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
  const freqMatch = rrule.match(/FREQ=(\w+)/);
  if (freqMatch && !validFreqs.includes(freqMatch[1])) {
    throw new ValidationError(`Invalid FREQ value. Must be one of: ${validFreqs.join(', ')}`);
  }

  return rrule;
}

// Reminder validation helper
export function validateReminders(reminders: string[] | undefined): string[] | undefined {
  if (!reminders || reminders.length === 0) return undefined;

  return reminders.map(reminder => {
    if (!reminder.startsWith('TRIGGER:')) {
      throw new ValidationError('Reminder must start with "TRIGGER:"');
    }
    return reminder;
  });
}