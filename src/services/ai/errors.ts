export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

export class AIResponseParseError extends Error {
  readonly rawText: string;

  constructor(rawText: string) {
    super("Nhà cung cấp AI trả về JSON không thể phân tích.");
    this.name = "AIResponseParseError";
    this.rawText = rawText;
  }
}

export class AIProviderError extends Error {
  readonly userMessage: string;

  constructor(userMessage: string, options?: { cause?: unknown }) {
    super(userMessage, options);
    this.name = "AIProviderError";
    this.userMessage = userMessage;
  }
}

export class AIValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIValidationError";
  }
}
