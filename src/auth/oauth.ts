import axios from 'axios';
import { OAuthConfig, TokenResponse } from '../api/types.js';
import { AuthenticationError, handleAxiosError } from '../utils/errors.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'oauth' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const TICKTICK_AUTH_URL = 'https://ticktick.com/oauth/authorize';
const TICKTICK_TOKEN_URL = 'https://ticktick.com/oauth/token';

/**
 * Generate OAuth authorization URL
 */
export function getAuthorizationUrl(config: OAuthConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scope,
    ...(state && { state })
  });

  const url = `${TICKTICK_AUTH_URL}?${params.toString()}`;
  logger.info('Generated authorization URL', { url });
  return url;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string
): Promise<TokenResponse> {
  try {
    logger.info('Exchanging authorization code for tokens');

    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      scope: config.scope,
      redirect_uri: config.redirectUri
    });

    const response = await axios.post<TokenResponse>(
      TICKTICK_TOKEN_URL,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
        }
      }
    );

    logger.info('Successfully obtained tokens');
    return response.data;
  } catch (error) {
    logger.error('Failed to exchange code for tokens:', error);
    if (axios.isAxiosError(error)) {
      throw handleAxiosError(error);
    }
    throw new AuthenticationError('Failed to exchange authorization code for tokens', error);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<TokenResponse> {
  try {
    logger.info('Refreshing access token');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await axios.post<TokenResponse>(
      TICKTICK_TOKEN_URL,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        }
      }
    );

    logger.info('Successfully refreshed access token');
    return response.data;
  } catch (error) {
    logger.error('Failed to refresh access token:', error);
    if (axios.isAxiosError(error)) {
      throw handleAxiosError(error);
    }
    throw new AuthenticationError('Failed to refresh access token', error);
  }
}

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(config: Partial<OAuthConfig>): OAuthConfig {
  const errors: string[] = [];

  if (!config.clientId) {
    errors.push('Client ID is required');
  }

  if (!config.clientSecret) {
    errors.push('Client secret is required');
  }

  if (!config.redirectUri) {
    errors.push('Redirect URI is required');
  }

  if (!config.scope) {
    config.scope = 'tasks:read tasks:write'; // Default scope
  }

  if (errors.length > 0) {
    throw new AuthenticationError(
      `Invalid OAuth configuration: ${errors.join(', ')}`
    );
  }

  return config as OAuthConfig;
}

/**
 * Create OAuth config from environment variables
 */
export function createOAuthConfigFromEnv(): OAuthConfig {
  return validateOAuthConfig({
    clientId: process.env.TICKTICK_CLIENT_ID || '',
    clientSecret: process.env.TICKTICK_CLIENT_SECRET || '',
    redirectUri: process.env.TICKTICK_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
    scope: process.env.TICKTICK_SCOPE || 'tasks:read tasks:write'
  });
}