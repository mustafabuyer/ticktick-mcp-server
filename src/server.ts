import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { tools, executeTool } from './tools/index.js';
import { tokenManager } from './auth/tokenManager.js';
import { createOAuthConfigFromEnv, getAuthorizationUrl, exchangeCodeForTokens } from './auth/oauth.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'http-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware for API key authentication
function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedApiKey = process.env.MCP_API_KEY;

  if (!expectedApiKey) {
    logger.warn('No MCP_API_KEY configured, skipping authentication');
    return next();
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  next();
}

// Create HTTP server
export function createHttpServer(mcpServer: MCPServer) {
  const app = express();

  // Middleware
  app.use(cors({
    origin: true, // Allow all origins for n8n compatibility
    credentials: true
  }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    const stats = tokenManager.getStats();
    res.json({
      status: 'ok',
      service: 'ticktick-mcp-server',
      version: '1.0.0',
      auth: {
        hasAccessToken: stats.hasAccessToken,
        hasRefreshToken: stats.hasRefreshToken
      }
    });
  });

  // OAuth endpoints
  app.get('/oauth/authorize', (req, res) => {
    try {
      const config = createOAuthConfigFromEnv();
      const state = req.query.state as string;
      const authUrl = getAuthorizationUrl(config, state);
      res.redirect(authUrl);
    } catch (error) {
      logger.error('OAuth authorization error:', error);
      res.status(500).json({
        error: 'OAuth configuration error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/oauth/callback', async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code) {
        return res.status(400).json({
          error: 'Missing authorization code'
        });
      }

      const config = createOAuthConfigFromEnv();
      const tokens = await exchangeCodeForTokens(config, code);
      tokenManager.setTokens(tokens);

      res.send(`
        <html>
          <body>
            <h2>TickTick Authorization Successful!</h2>
            <p>You can now close this window and return to your application.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.status(500).json({
        error: 'Failed to exchange code for tokens',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP endpoints
  app.post('/tools', authenticateApiKey, (req, res) => {
    res.json({
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    });
  });

  app.post('/tools/:toolName', authenticateApiKey, async (req, res) => {
    try {
      const { toolName } = req.params;
      const input = req.body;

      logger.info(`Executing tool: ${toolName}`, { input });

      const result = await executeTool(toolName, input);

      res.json({
        success: true,
        result
      });
    } catch (error) {
      logger.error('Tool execution error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP streaming endpoint for n8n
  app.post('/stream', authenticateApiKey, async (req, res) => {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const { method, params, id } = req.body;

      logger.info('Streaming request:', { method, id });

      // Handle different MCP methods
      switch (method) {
        case 'initialize':
          res.write(`data: ${JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '1.0',
              capabilities: {
                tools: true
              },
              serverInfo: {
                name: 'ticktick-mcp-server',
                version: '1.0.0'
              }
            }
          })}\n\n`);
          break;

        case 'tools/list':
          res.write(`data: ${JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: {
              tools: tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
              }))
            }
          })}\n\n`);
          break;

        case 'tools/call':
          try {
            const { name, arguments: args } = params;
            const result = await executeTool(name, args);
            
            res.write(`data: ${JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                  }
                ]
              }
            })}\n\n`);
          } catch (error) {
            res.write(`data: ${JSON.stringify({
              jsonrpc: '2.0',
              id,
              error: {
                code: -32603,
                message: error instanceof Error ? error.message : 'Internal error'
              }
            })}\n\n`);
          }
          break;

        default:
          res.write(`data: ${JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          })}\n\n`);
      }

      res.end();
    } catch (error) {
      logger.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: req.body.id,
        error: {
          code: -32603,
          message: 'Internal server error'
        }
      })}\n\n`);
      res.end();
    }
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  });

  return app;
}