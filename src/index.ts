#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createHttpServer } from './server.js';
import { tools, executeTool } from './tools/index.js';
import { tokenManager } from './auth/tokenManager.js';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ticktick-mcp' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Initialize token manager with environment tokens
tokenManager.initializeFromEnv();

// Create MCP server
const mcpServer = new Server(
  {
    name: 'ticktick-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle list tools request
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing tools');
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

// Handle tool execution
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  logger.info(`Executing tool: ${name}`, { arguments: args });
  
  try {
    const result = await executeTool(name, args || {});
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error(`Tool execution failed: ${name}`, error);
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
});

// Start servers based on mode
async function start() {
  const mode = process.env.MODE || 'http';
  
  if (mode === 'stdio') {
    // Start MCP server in stdio mode
    logger.info('Starting MCP server in stdio mode');
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    logger.info('MCP server running in stdio mode');
  } else {
    // Start HTTP server
    const port = parseInt(process.env.PORT || '3000', 10);
    const httpServer = createHttpServer(mcpServer);
    
    httpServer.listen(port, () => {
      logger.info(`TickTick MCP server running on http://localhost:${port}`);
      logger.info('Endpoints:');
      logger.info(`  - Health: http://localhost:${port}/health`);
      logger.info(`  - Tools: http://localhost:${port}/tools`);
      logger.info(`  - Stream: http://localhost:${port}/stream`);
      logger.info(`  - OAuth: http://localhost:${port}/oauth/authorize`);
      
      if (!process.env.TICKTICK_ACCESS_TOKEN) {
        logger.warn('No TICKTICK_ACCESS_TOKEN found. Please authenticate via OAuth or provide tokens in environment variables.');
      }
    });
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the server
start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});