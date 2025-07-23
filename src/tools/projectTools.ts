import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiClient } from '../api/client.js';
import {
  validateInput,
  CreateProjectSchema,
  UpdateProjectSchema,
  DeleteProjectSchema,
  GetProjectSchema
} from '../utils/validators.js';
import { createUserFriendlyError } from '../utils/errors.js';
import { TickTickProject, ProjectData } from '../api/types.js';

export const getAllProjectsTool: Tool = {
  name: 'get_all_projects',
  description: 'Get a list of all projects/lists in TickTick. This includes both active and archived projects.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export const getProjectWithTasksTool: Tool = {
  name: 'get_project_with_tasks',
  description: 'Get a project along with all its tasks and columns (for kanban view). This provides complete project data including undone tasks.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID to retrieve with its tasks (required)'
      }
    },
    required: ['projectId']
  }
};

export const createProjectTool: Tool = {
  name: 'create_project',
  description: 'Create a new project/list in TickTick. Projects are used to organize and group related tasks.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Project name (required). Example: "Work Tasks", "Personal Goals", "Shopping Lists"'
      },
      color: {
        type: 'string',
        description: 'Project color in hex format (optional). Example: "#FF5733" for orange, "#3498DB" for blue'
      },
      viewMode: {
        type: 'string',
        enum: ['list', 'kanban', 'timeline'],
        description: 'Default view mode for the project (optional). "list" is default, "kanban" for board view, "timeline" for calendar view'
      },
      kind: {
        type: 'string',
        enum: ['TASK', 'NOTE'],
        description: 'Project type (optional). "TASK" for task lists (default), "NOTE" for note lists'
      }
    },
    required: ['name']
  }
};

export const updateProjectTool: Tool = {
  name: 'update_project',
  description: 'Update an existing project\'s properties such as name, color, or view mode.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID to update (required)'
      },
      name: {
        type: 'string',
        description: 'New project name (optional)'
      },
      color: {
        type: 'string',
        description: 'New project color in hex format (optional). Example: "#FF5733"'
      },
      viewMode: {
        type: 'string',
        enum: ['list', 'kanban', 'timeline'],
        description: 'New view mode (optional)'
      },
      kind: {
        type: 'string',
        enum: ['TASK', 'NOTE'],
        description: 'New project type (optional)'
      }
    },
    required: ['projectId']
  }
};

export const deleteProjectTool: Tool = {
  name: 'delete_project',
  description: 'Delete a project and all its tasks. This action cannot be undone. All tasks in the project will be permanently deleted.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID to delete (required)'
      }
    },
    required: ['projectId']
  }
};

// Tool handlers
export async function handleGetAllProjects(): Promise<TickTickProject[]> {
  try {
    return await apiClient.getAllProjects();
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleGetProjectWithTasks(input: any): Promise<ProjectData> {
  try {
    const validated = validateInput(GetProjectSchema, input);
    return await apiClient.getProjectWithTasks(validated.projectId);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleCreateProject(input: any): Promise<TickTickProject> {
  try {
    const validated = validateInput(CreateProjectSchema, input);
    return await apiClient.createProject(validated);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleUpdateProject(input: any): Promise<TickTickProject> {
  try {
    const validated = validateInput(UpdateProjectSchema, input);
    const { projectId, ...updateData } = validated;
    return await apiClient.updateProject(projectId, updateData);
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}

export async function handleDeleteProject(input: any): Promise<{ success: boolean; message: string }> {
  try {
    const validated = validateInput(DeleteProjectSchema, input);
    await apiClient.deleteProject(validated.projectId);
    return {
      success: true,
      message: 'Project and all its tasks deleted successfully'
    };
  } catch (error) {
    throw new Error(createUserFriendlyError(error));
  }
}