import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  TickTickTask,
  TickTickProject,
  ProjectData,
  CreateTaskInput,
  UpdateTaskInput,
  CreateProjectInput,
  UpdateProjectInput
} from './types.js';
import { handleAxiosError, RateLimitError } from '../utils/errors.js';
import { tokenManager } from '../auth/tokenManager.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'api-client' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export class TickTickApiClient {
  private client: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private requestQueue: Promise<any> = Promise.resolve();

  constructor(
    baseURL: string = process.env.TICKTICK_API_BASE_URL || 'https://api.ticktick.com/open/v1',
    clientId: string = process.env.TICKTICK_CLIENT_ID || '',
    clientSecret: string = process.env.TICKTICK_CLIENT_SECRET || ''
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await tokenManager.getValidAccessToken(this.clientId, this.clientSecret);
          config.headers.Authorization = `Bearer ${token}`;
          logger.debug('Request:', { method: config.method, url: config.url });
          return config;
        } catch (error) {
          logger.error('Failed to get access token:', error);
          throw error;
        }
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Response:', { status: response.status, url: response.config.url });
        return response;
      },
      async (error) => {
        if (error.response?.status === 429) {
          // Handle rate limiting
          const retryAfter = error.response.headers['retry-after'] || 60;
          logger.warn(`Rate limited. Retrying after ${retryAfter} seconds`);
          
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client.request(error.config);
        }

        logger.error('API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        });

        throw handleAxiosError(error);
      }
    );
  }

  /**
   * Queue requests to avoid rate limiting
   */
  private async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    this.requestQueue = this.requestQueue.then(
      () => new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay between requests
    );
    await this.requestQueue;
    return request();
  }

  // Task Methods

  async getTask(projectId: string, taskId: string): Promise<TickTickTask> {
    return this.queueRequest(async () => {
      const response = await this.client.get<TickTickTask>(`/project/${projectId}/task/${taskId}`);
      return response.data;
    });
  }

  async createTask(task: CreateTaskInput): Promise<TickTickTask> {
    return this.queueRequest(async () => {
      const response = await this.client.post<TickTickTask>('/task', task);
      return response.data;
    });
  }

  async updateTask(taskId: string, task: UpdateTaskInput): Promise<TickTickTask> {
    return this.queueRequest(async () => {
      const response = await this.client.post<TickTickTask>(`/task/${taskId}`, task);
      return response.data;
    });
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    return this.queueRequest(async () => {
      await this.client.post(`/project/${projectId}/task/${taskId}/complete`);
    });
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    return this.queueRequest(async () => {
      await this.client.delete(`/project/${projectId}/task/${taskId}`);
    });
  }

  // Project Methods

  async getAllProjects(): Promise<TickTickProject[]> {
    return this.queueRequest(async () => {
      const response = await this.client.get<TickTickProject[]>('/project');
      return response.data;
    });
  }

  async getProject(projectId: string): Promise<TickTickProject> {
    return this.queueRequest(async () => {
      const response = await this.client.get<TickTickProject>(`/project/${projectId}`);
      return response.data;
    });
  }

  async getProjectWithTasks(projectId: string): Promise<ProjectData> {
    return this.queueRequest(async () => {
      const response = await this.client.get<ProjectData>(`/project/${projectId}/data`);
      return response.data;
    });
  }

  async createProject(project: CreateProjectInput): Promise<TickTickProject> {
    return this.queueRequest(async () => {
      const response = await this.client.post<TickTickProject>('/project', project);
      return response.data;
    });
  }

  async updateProject(projectId: string, project: UpdateProjectInput): Promise<TickTickProject> {
    return this.queueRequest(async () => {
      const response = await this.client.post<TickTickProject>(`/project/${projectId}`, project);
      return response.data;
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.queueRequest(async () => {
      await this.client.delete(`/project/${projectId}`);
    });
  }

  // Helper methods

  /**
   * Search tasks across all projects
   * Note: TickTick API doesn't have a direct search endpoint, so we implement it by fetching all projects
   */
  async searchTasks(
    query: string,
    options?: {
      projectId?: string;
      status?: 'active' | 'completed' | 'all';
      priority?: 0 | 1 | 3 | 5;
    }
  ): Promise<TickTickTask[]> {
    const projects = options?.projectId 
      ? [await this.getProject(options.projectId)]
      : await this.getAllProjects();

    const allTasks: TickTickTask[] = [];

    for (const project of projects) {
      try {
        const projectData = await this.getProjectWithTasks(project.id);
        const tasks = projectData.tasks.filter(task => {
          // Search in title and content
          const matchesQuery = task.title.toLowerCase().includes(query.toLowerCase()) ||
                             (task.content && task.content.toLowerCase().includes(query.toLowerCase()));

          // Filter by status
          const matchesStatus = !options?.status || 
                              options.status === 'all' ||
                              (options.status === 'active' && task.status === 0) ||
                              (options.status === 'completed' && task.status === 2);

          // Filter by priority
          const matchesPriority = !options?.priority || task.priority === options.priority;

          return matchesQuery && matchesStatus && matchesPriority;
        });

        allTasks.push(...tasks);
      } catch (error) {
        logger.error(`Failed to search tasks in project ${project.id}:`, error);
      }
    }

    return allTasks;
  }

  /**
   * Get today's tasks
   */
  async getTodaysTasks(includeOverdue: boolean = false): Promise<TickTickTask[]> {
    const projects = await this.getAllProjects();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allTasks: TickTickTask[] = [];

    for (const project of projects) {
      try {
        const projectData = await this.getProjectWithTasks(project.id);
        const tasks = projectData.tasks.filter(task => {
          if (task.status === 2) return false; // Skip completed tasks

          if (!task.dueDate) return false;

          const dueDate = new Date(task.dueDate);
          
          if (includeOverdue && dueDate < today) {
            return true; // Include overdue tasks
          }

          return dueDate >= today && dueDate < tomorrow;
        });

        allTasks.push(...tasks);
      } catch (error) {
        logger.error(`Failed to get today's tasks from project ${project.id}:`, error);
      }
    }

    return allTasks;
  }

  /**
   * Get upcoming tasks for the next N days
   */
  async getUpcomingTasks(days: number = 7): Promise<TickTickTask[]> {
    const projects = await this.getAllProjects();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const allTasks: TickTickTask[] = [];

    for (const project of projects) {
      try {
        const projectData = await this.getProjectWithTasks(project.id);
        const tasks = projectData.tasks.filter(task => {
          if (task.status === 2) return false; // Skip completed tasks

          if (!task.dueDate) return false;

          const dueDate = new Date(task.dueDate);
          return dueDate >= today && dueDate <= endDate;
        });

        allTasks.push(...tasks);
      } catch (error) {
        logger.error(`Failed to get upcoming tasks from project ${project.id}:`, error);
      }
    }

    // Sort by due date
    allTasks.sort((a, b) => {
      const dateA = new Date(a.dueDate!);
      const dateB = new Date(b.dueDate!);
      return dateA.getTime() - dateB.getTime();
    });

    return allTasks;
  }
}

// Singleton instance
export const apiClient = new TickTickApiClient();