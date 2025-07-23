import NodeCache from 'node-cache';
import { TokenResponse } from '../api/types.js';
import { TokenRefreshError } from '../utils/errors.js';
import { refreshAccessToken } from './oauth.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'token-manager' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export class TokenManager {
  private cache: NodeCache;
  private refreshPromise: Promise<TokenResponse> | null = null;

  constructor(ttlSeconds: number = 3600) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false
    });
  }

  /**
   * Store tokens with automatic expiry
   */
  public setTokens(tokens: TokenResponse): void {
    const expiresIn = tokens.expires_in || 3600;
    const ttl = Math.max(expiresIn - 300, 60); // Expire 5 minutes before actual expiry, minimum 1 minute

    this.cache.set('access_token', tokens.access_token, ttl);
    
    if (tokens.refresh_token) {
      // Refresh tokens typically don't expire, but we'll store with a long TTL
      this.cache.set('refresh_token', tokens.refresh_token, 30 * 24 * 60 * 60); // 30 days
    }

    logger.info(`Tokens stored with TTL: ${ttl} seconds`);
  }

  /**
   * Get current access token
   */
  public getAccessToken(): string | undefined {
    return this.cache.get<string>('access_token');
  }

  /**
   * Get refresh token
   */
  public getRefreshToken(): string | undefined {
    return this.cache.get<string>('refresh_token');
  }

  /**
   * Check if access token is valid
   */
  public isAccessTokenValid(): boolean {
    return this.cache.has('access_token');
  }

  /**
   * Get access token with automatic refresh if needed
   */
  public async getValidAccessToken(
    clientId: string,
    clientSecret: string
  ): Promise<string> {
    // Check if we have a valid access token
    const accessToken = this.getAccessToken();
    if (accessToken) {
      return accessToken;
    }

    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      logger.info('Token refresh already in progress, waiting...');
      try {
        const tokens = await this.refreshPromise;
        return tokens.access_token;
      } catch (error) {
        this.refreshPromise = null;
        throw error;
      }
    }

    // Get refresh token
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new TokenRefreshError(
        'No refresh token available. Please re-authenticate with TickTick.'
      );
    }

    // Start refresh process
    logger.info('Starting token refresh...');
    this.refreshPromise = refreshAccessToken(clientId, clientSecret, refreshToken);

    try {
      const tokens = await this.refreshPromise;
      this.setTokens(tokens);
      logger.info('Token refresh successful');
      return tokens.access_token;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new TokenRefreshError(
        'Failed to refresh access token. Please re-authenticate with TickTick.',
        error
      );
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Clear all stored tokens
   */
  public clearTokens(): void {
    this.cache.del(['access_token', 'refresh_token']);
    logger.info('All tokens cleared');
  }

  /**
   * Get token statistics
   */
  public getStats(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    accessTokenTTL: number | undefined;
  } {
    return {
      hasAccessToken: this.cache.has('access_token'),
      hasRefreshToken: this.cache.has('refresh_token'),
      accessTokenTTL: this.cache.getTtl('access_token')
    };
  }

  /**
   * Initialize tokens from environment variables
   */
  public initializeFromEnv(): void {
    const accessToken = process.env.TICKTICK_ACCESS_TOKEN;
    const refreshToken = process.env.TICKTICK_REFRESH_TOKEN;

    if (accessToken) {
      // For manually provided tokens, we'll use a default expiry
      this.setTokens({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 3600 // 1 hour default
      });
      logger.info('Tokens initialized from environment variables');
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager();