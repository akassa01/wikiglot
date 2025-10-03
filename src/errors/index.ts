export class WikiglotError extends Error {
  statusCode?: number;
  errorCode?: string;

  constructor(message: string, statusCode?: number, errorCode?: string) {
    super(message);
    this.name = 'WikiglotError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class WikiglotNotFoundError extends WikiglotError {
  constructor(word: string) {
    super(`Word "${word}" not found`);
    this.name = 'WikiglotNotFoundError';
  }
}

export class WikiglotTimeoutError extends WikiglotError {
  constructor(message: string) {
    super(message);
    this.name = 'WikiglotTimeoutError';
  }
}
