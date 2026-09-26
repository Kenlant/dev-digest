/**
 * Domain error taxonomy + structured API error envelope. The UX taxonomy
 * (toast/inline/full-screen) is the frontend's concern; the API returns a
 * stable structured body (ApiErrorBody): { error: { code, message, details } }.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: unknown) {
    super('not_found', message, 404, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super('validation_error', message, 422, details);
  }
}

/**
 * 409 — the request is well-formed but conflicts with current server state.
 * Used for "this work is already in flight": a duplicate review run costs a real
 * LLM call, so the server rejects it rather than relying on the UI to disable a
 * button.
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super('conflict', message, 409, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, details?: unknown) {
    super('external_service_error', message, 502, details);
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super('config_error', message, 500, details);
  }
}
