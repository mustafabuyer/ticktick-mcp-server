import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiClient } from '../api/client.js';
import {
  validateInput,
  parseDate,
  validateRRule,
  validateReminders,
  CreateTaskSchema,
  UpdateTaskSchema,
  CompleteTaskSchema,
  DeleteTaskSchema,
  GetTaskSchema,
  SearchTasksSchema,
  GetTodaysTasksSchema,
  GetUpcomingTasksSchema,
  BatchSubtaskSchema
} from '../utils/validators.js';
import { createUserFriendlyError } from '../utils/errors.js';
import { TickTickTask, UpdateTaskInput } from '../api/types.js';

export const createTaskTool: Tool = {
  name: 'create_task',
  description: 'Create a new task in TickTick. Use this to add tasks to your todo list with optional due dates, priorities, and reminders.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Task title (required). Example: "Buy groceries" or "Complete project report"'
      },
      projectId: {
        type: 'string',
        description: 'Project ID to add the task to (optional). If not provided, task will be added to Inbox'
      },
      content: {
        type: 'string',
        description: 'Task description or notes (optional). Can include detailed information about the task'
      },
      dueDate: {
        type: 'string',
        description: 'Due date in ISO format (optional). Examples: "2024-12-25" or "2024-12-25T14:30:00Z"'
      },
      priority: {
        type: 'number',
        enum: [0, 1, 3, 5],
        description: 'Task priority (optional). 0=None (default), 1=Low, 3=Medium, 5=High'
      },
      startDate: {
        type: 'string',
        description: 'Start date in ISO format (optional). For tasks that should start at a specific time'
      },
      isAllDay: {
        type: 'boolean',
        description: 'Whether this is an all-day task (optional). Default is false'
      },
      timeZone: {
        type: 'string',
        description: 'Time zone for the task (optional). Example: "America/New_York" or "Europe/London"'
      },
      reminders: {
        type: 'array',
        items: { type: 'string' },
        description: 'Reminder triggers (optional). Examples: ["TRIGGER:PT0S"] for at time, ["TRIGGER:P0DT9H0M0S"] for 9 hours before'
      },
      repeatFlag: {
        type: 'string',
        description: 'Recurring rule in RRULE format (optional). Example: "RRULE:FREQ=DAILY;INTERVAL=1" for daily repeat'
      }
    },
    required: ['title']
  }
};

export const createTaskWithSubtasksTool: Tool = {
  name: 'create_task_with_subtasks',
  description: 'Create a new task with subtasks in TickTick. Perfect for creating structured tasks like recipes (with ingredients as subtasks), projects with multiple steps, or shopping lists.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Main task title (required). Example: "Apple Pie Recipe" or "Vacation Planning"'
      },
      content: {
        type: 'string',
        description: 'Task description or full instructions (optional). For recipes, this could be the cooking instructions'
      },
      projectId: {
        type: 'string',
        description: 'Project ID (optional). Defaults to Inbox if not specified'
      },
      dueDate: {
        type: 'string',
        description: 'Due date in ISO format (optional). Example: "2024-12-25" or "2024-12-25T18:00:00Z"'
      },
      priority: {
        type: 'number',
        enum: [0, 1, 3, 5],
        description: 'Priority level: 0=None, 1=Low, 3=Medium, 5=High'
      },
      subtasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Subtask title (e.g., ingredient name, step description)'
            },
            sortOrder: {
              type: 'number',
              description: 'Order of the subtask (optional). Lower numbers appear first'
            }
          },
          required: ['title']
        },
        description: 'List of subtasks. For recipes: ingredients list. For projects: individual steps or items'
      }
    },
    required: ['title']
  }
};

export const updateTaskTool: Tool = {
  name: 'update_task',
  description: 'Update an existing task in TickTick. You can modify any aspect of the task including title, dates, priority, or subtasks.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'Task ID to update (required)'
      },
      projectId: {
        type: 'string',
        description: 'Project ID where the task is located (required)'
      },
      title: {
        type: 'string',
        description: 'New task title (optional)'
      },
      content: {
        type: 'string',
        description: 'New task description (optional)'
      },
      dueDate: {
        type: 'string',
        description: 'New due date in ISO format (optional)'
      },
      priority: {
        type: 'number',
        enum: [0, 1, 3, 5],
        description: 'New priority: 0=None, 1=Low, 3=Medium, 5=High'
      },
      startDate: {
        type: 'string',
        description: 'New start date in ISO format (optional)'
      },
      isAllDay: {
        type: 'boolean',
        description: 'Update all-day status (optional)'
      },
      timeZone: {
        type: 'string',
        description: 'New time zone (optional)'
      },
      reminders: {
        type: 'array',
        items: { type: 'string' },
        description: 'New reminder triggers (optional)'
      },
      repeatFlag: {
        type: 'string',
        description: 'New recurring rule in RRULE format (optional)'
      }
    },
    required: ['taskId', 'projectId']
  }
};

export const completeTaskTool: Tool = {
  name: 'complete_task',
  description: 'Mark a task as completed in TickTick. This will also mark the task\'s completion time.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID where the task is located (required)'
      },
      taskId: {
        type: 'string',
        description: 'Task ID to complete (required)'
      }
    },
    required: ['projectId', 'taskId']
  }
};

export const deleteTaskTool: Tool = {
  name: 'delete_task',
  description: 'Delete a task from TickTick. This action cannot be undone.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID where the task is located (required)'
      },
      taskId: {
        type: 'string',
        description: 'Task ID to delete (required)'
      }
    },
    required: ['projectId', 'taskId']
  }
};

export const getTaskTool: Tool = {
  name: 'get_task',
  description: 'Get detailed information about a specific task in TickTick, including its subtasks, reminders, and all other properties.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID where the task is located (required)'
      },
      taskId: {
        type: 'string',
        description: 'Task ID to retrieve (required)'
      }
    },
    required: ['projectId', 'taskId']
  }
};

export const searchTasksTool: Tool = {
  name: 'search_tasks',
  description: 'Search for tasks across all projects or within a specific project. You can filter by status and priority.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to find in task titles and content (required)'
      },
      projectId: {
        type: 'string',
        description: 'Limit search to a specific project (optional). If not provided, searches all projects'
      },
      status: {
        type: 'string',
        enum: ['active', 'completed', 'all'],
        description: 'Filter by task status (optional). Default is "active"'
      },
      priority: {
        type: 'number',
        enum: [0, 1, 3, 5],
        description: 'Filter by priority level (optional): 0=None, 1=Low, 3=Medium, 5=High'
      }
    },
    required: ['query']
  }
};

export const getTodaysTasksTool: Tool = {
  name: 'get_todays_tasks',
  description: 'Get all tasks due today. Optionally include overdue tasks from previous days.',
  inputSchema: {
    type: 'object',
    properties: {
      includeOverdue: {
        type: 'boolean',
        description: 'Include overdue tasks from previous days (optional). Default is false'
      }
    }
  }
};

export const getUpcomingTasksTool: Tool = {
  name: 'get_upcoming_tasks',
  description: 'Get all upcoming tasks for the specified number of days. Tasks are sorted by due date.',
  inputSchema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Number of days to look ahead (optional). Default is 7, maximum is 30'
      }
    }
  }
};

export const batchCreateSubtasksTool: Tool = {
  name: 'batch_create_subtasks',
  description: 'Add multiple subtasks to an existing task at once. Useful for adding a list of items like ingredients, checklist items, or steps.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'Task ID to add subtasks to (required)'
      },
      projectId: {
        type: 'string',
        description: 'Project ID where the task is located (required)'
      },
      subtasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Subtask title'
            },
            sortOrder: {
              type: 'number',
              description: 'Order of the subtask (optional)'
            }
          },
          required: ['title']
        },
        description: 'Array of subtasks to add'
      }
    },
    required: ['taskId', 'projectId', 'subtasks']
  }
};

// Tool handlers
export async function handleCreateTask(input: any): Promise<TickTickTask> {
  try {
    const validated = validateInput(CreateTaskSchema, input);
    
    // Parse dates
    const taskData = {
      ...validated,
      startDate: parseDate(validated.startDate),
      dueDate: parseDate(validated.dueDate),
      repeatFlag: validateRRule(validated.repeatFlag),
      reminders: validateReminders(validated.reminders)
    };

    return await apiClient.createTask(taskData);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleCreateTaskWithSubtasks(input: any): Promise<TickTickTask> {
  try {
    const { subtasks, ...taskInput } = input;
    const validated = validateInput(CreateTaskSchema, taskInput);
    
    // Parse dates
    const taskData = {
      ...validated,
      startDate: parseDate(validated.startDate),
      dueDate: parseDate(validated.dueDate),
      repeatFlag: validateRRule(validated.repeatFlag),
      reminders: validateReminders(validated.reminders),
      items: subtasks?.map((st: any, index: number) => ({
        title: st.title,
        sortOrder: st.sortOrder || index * 100
      }))
    };

    return await apiClient.createTask(taskData);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleUpdateTask(input: any): Promise<TickTickTask> {
  try {
    const validated = validateInput(UpdateTaskSchema, input);
    const { taskId, ...updateData } = validated;
    
    // Parse dates if provided
    const taskData: UpdateTaskInput = {
      ...updateData,
      id: taskId,
      startDate: parseDate(updateData.startDate),
      dueDate: parseDate(updateData.dueDate),
      repeatFlag: validateRRule(updateData.repeatFlag),
      reminders: validateReminders(updateData.reminders)
    };

    return await apiClient.updateTask(taskId, taskData);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleCompleteTask(input: any): Promise<{ success: boolean; message: string }> {
  try {
    const validated = validateInput(CompleteTaskSchema, input);
    await apiClient.completeTask(validated.projectId, validated.taskId);
    return {
      success: true,
      message: 'Task completed successfully'
    };
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleDeleteTask(input: any): Promise<{ success: boolean; message: string }> {
  try {
    const validated = validateInput(DeleteTaskSchema, input);
    await apiClient.deleteTask(validated.projectId, validated.taskId);
    return {
      success: true,
      message: 'Task deleted successfully'
    };
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleGetTask(input: any): Promise<TickTickTask> {
  try {
    const validated = validateInput(GetTaskSchema, input);
    return await apiClient.getTask(validated.projectId, validated.taskId);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleSearchTasks(input: any): Promise<TickTickTask[]> {
  try {
    const validated = validateInput(SearchTasksSchema, input);
    return await apiClient.searchTasks(validated.query, {
      projectId: validated.projectId,
      status: validated.status,
      priority: validated.priority
    });
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleGetTodaysTasks(input: any): Promise<TickTickTask[]> {
  try {
    const validated = validateInput(GetTodaysTasksSchema, input);
    return await apiClient.getTodaysTasks(validated.includeOverdue);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleGetUpcomingTasks(input: any): Promise<TickTickTask[]> {
  try {
    const validated = validateInput(GetUpcomingTasksSchema, input);
    return await apiClient.getUpcomingTasks(validated.days);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleBatchCreateSubtasks(input: any): Promise<TickTickTask> {
  try {
    const validated = validateInput(BatchSubtaskSchema, input);
    
    // Get current task
    const task = await apiClient.getTask(validated.projectId, validated.taskId);
    
    // Add new subtasks to existing ones
    const existingItems = task.items || [];
    const maxSortOrder = Math.max(...existingItems.map(item => item.sortOrder || 0), 0);
    
    const newItems = validated.subtasks.map((st, index) => ({
      title: st.title,
      sortOrder: st.sortOrder || (maxSortOrder + (index + 1) * 100)
    }));
    
    // Update task with new subtasks
    const updateData: UpdateTaskInput = {
      id: validated.taskId,
      projectId: validated.projectId,
      items: [...existingItems, ...newItems]
    };
    
    return await apiClient.updateTask(validated.taskId, updateData);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}