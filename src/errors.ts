export class TelegramAdsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TelegramAdsError';
  }
}

export class TelegramAdsHttpError extends TelegramAdsError {
  readonly status: number;
  readonly bodyPreview: string;

  constructor(message: string, status: number, bodyPreview: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TelegramAdsHttpError';
    this.status = status;
    this.bodyPreview = bodyPreview;
  }
}

export class TelegramAdsParseError extends TelegramAdsError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TelegramAdsParseError';
  }
}

export class TelegramAdsValidationError extends TelegramAdsError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TelegramAdsValidationError';
  }
}

