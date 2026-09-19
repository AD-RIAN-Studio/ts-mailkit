/**
 * Base error class for all ts-mailkit errors.
 */
export class MailKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailKitError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when transport configuration is missing or invalid.
 */
export class ConfigurationError extends MailKitError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an email transport fails to dispatch an email.
 */
export class TransportError extends MailKitError {
  readonly transportName: string;
  readonly statusCode?: number;
  readonly responseBody?: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      transportName: string;
      statusCode?: number;
      responseBody?: string;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'TransportError';
    this.transportName = options.transportName;
    this.statusCode = options.statusCode;
    this.responseBody = options.responseBody;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when template rendering or DTO validation fails.
 */
export class TemplateError extends MailKitError {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
