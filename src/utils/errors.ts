import { AxiosError } from 'axios';

export class TickTickError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'TickTickError';
  }
}

export class AuthenticationError extends TickTickError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

export class AuthorizationError extends TickTickError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

export class NotFoundError extends TickTickError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

export class ValidationError extends TickTickError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class RateLimitError extends TickTickError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter });
  }
}

export class ApiClientError extends TickTickError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'API_CLIENT_ERROR', statusCode, details);
  }
}

export class TokenRefreshError extends TickTickError {
  constructor(message: string, details?: any) {
    super(message, 'TOKEN_REFRESH_ERROR', 401, details);
  }
}

export function handleAxiosError(error: AxiosError): TickTickError {
  if (!error.response) {
    return new TickTickError(
      'Network error occurred while connecting to TickTick API',
      'NETWORK_ERROR',
      undefined,
      { originalError: error.message }
    );
  }

  const { status, data } = error.response;
  const message = (data as any)?.message || error.message;

  switch (status) {
    case 401:
      return new AuthenticationError(
        message || 'Invalid or expired authentication token',
        data
      );
    case 403:
      return new AuthorizationError(
        message || 'You do not have permission to perform this action',
        data
      );
    case 404:
      return new NotFoundError(
        message || 'The requested resource was not found',
        data
      );
    case 429:
      const retryAfter = error.response.headers['retry-after'];
      return new RateLimitError(
        message || 'Rate limit exceeded. Please try again later.',
        retryAfter ? parseInt(retryAfter) : undefined
      );
    case 400:
      return new ValidationError(
        message || 'Invalid request parameters',
        data
      );
    default:
      return new ApiClientError(
        message || `TickTick API error: ${status}`,
        status,
        data
      );
  }
}

export function createUserFriendlyError(error: any): string {
  if (error instanceof TickTickError) {
    switch (error.code) {
      case 'AUTHENTICATION_ERROR':
        return 'Authentication failed. Please check your TickTick credentials and try again.';
      case 'AUTHORIZATION_ERROR':
        return 'You do not have permission to perform this action in TickTick.';
      case 'NOT_FOUND':
        return 'The requested item was not found in TickTick. It may have been deleted or you may not have access to it.';
      case 'VALIDATION_ERROR':
        return `Invalid input: ${error.message}`;
      case 'RATE_LIMIT_ERROR':
        return 'Too many requests to TickTick. Please wait a moment and try again.';
      case 'NETWORK_ERROR':
        return 'Unable to connect to TickTick. Please check your internet connection and try again.';
      case 'TOKEN_REFRESH_ERROR':
        return 'Failed to refresh authentication token. Please re-authenticate with TickTick.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return `An error occurred: ${error.message}`;
  }

  return 'An unexpected error occurred. Please try again.';
}