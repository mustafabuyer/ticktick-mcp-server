import { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  createTaskTool,
  createTaskWithSubtasksTool,
  updateTaskTool,
  completeTaskTool,
  deleteTaskTool,
  getTaskTool,
  searchTasksTool,
  getTodaysTasksTool,
  getUpcomingTasksTool,
  batchCreateSubtasksTool,
  handleCreateTask,
  handleCreateTaskWithSubtasks,
  handleUpdateTask,
  handleCompleteTask,
  handleDeleteTask,
  handleGetTask,
  handleSearchTasks,
  handleGetTodaysTasks,
  handleGetUpcomingTasks,
  handleBatchCreateSubtasks
} from './taskTools.js';

import {
  getAllProjectsTool,
  getProjectWithTasksTool,
  createProjectTool,
  updateProjectTool,
  deleteProjectTool,
  handleGetAllProjects,
  handleGetProjectWithTasks,
  handleCreateProject,
  handleUpdateProject,
  handleDeleteProject
} from './projectTools.js';

// Export all tools as an array
export const tools: Tool[] = [
  // Task tools
  createTaskTool,
  createTaskWithSubtasksTool,
  updateTaskTool,
  completeTaskTool,
  deleteTaskTool,
  getTaskTool,
  searchTasksTool,
  getTodaysTasksTool,
  getUpcomingTasksTool,
  batchCreateSubtasksTool,
  
  // Project tools
  getAllProjectsTool,
  getProjectWithTasksTool,
  createProjectTool,
  updateProjectTool,
  deleteProjectTool
];

// Tool handler mapping
export const toolHandlers: Record<string, (input: any) => Promise<any>> = {
  // Task handlers
  'create_task': handleCreateTask,
  'create_task_with_subtasks': handleCreateTaskWithSubtasks,
  'update_task': handleUpdateTask,
  'complete_task': handleCompleteTask,
  'delete_task': handleDeleteTask,
  'get_task': handleGetTask,
  'search_tasks': handleSearchTasks,
  'get_todays_tasks': handleGetTodaysTasks,
  'get_upcoming_tasks': handleGetUpcomingTasks,
  'batch_create_subtasks': handleBatchCreateSubtasks,
  
  // Project handlers
  'get_all_projects': handleGetAllProjects,
  'get_project_with_tasks': handleGetProjectWithTasks,
  'create_project': handleCreateProject,
  'update_project': handleUpdateProject,
  'delete_project': handleDeleteProject
};

// Helper function to get tool by name
export function getToolByName(name: string): Tool | undefined {
  return tools.find(tool => tool.name === name);
}

// Helper function to execute tool
export async function executeTool(toolName: string, input: any): Promise<any> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return handler(input);
}

// Export tool categories for documentation
export const toolCategories = {
  tasks: {
    name: 'Task Management',
    description: 'Tools for creating, updating, and managing tasks',
    tools: [
      'create_task',
      'create_task_with_subtasks',
      'update_task',
      'complete_task',
      'delete_task',
      'get_task',
      'search_tasks',
      'get_todays_tasks',
      'get_upcoming_tasks',
      'batch_create_subtasks'
    ]
  },
  projects: {
    name: 'Project Management',
    description: 'Tools for managing projects/lists',
    tools: [
      'get_all_projects',
      'get_project_with_tasks',
      'create_project',
      'update_project',
      'delete_project'
    ]
  }
};