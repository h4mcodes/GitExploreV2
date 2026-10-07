import { AppError } from '../types/api.js';

export type AnalysisType =
  | 'REPOSITORY_OVERVIEW'
  | 'COMMIT_EXPLANATION'
  | 'DIFF_REVIEW'
  | 'BRANCH_ANALYSIS'
  | 'REPOSITORY_HEALTH'
  | 'REPOSITORY_QA'
  | 'CUSTOM';

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface AIAnalysisRequest {
  readonly type: AnalysisType;
  readonly context: Record<string, unknown>;
  readonly prompt: string;
  readonly systemInstruction?: string;
  readonly responseSchema?: Record<string, unknown>;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly stopSequences?: readonly string[];
  readonly timeoutMs?: number;
}

export interface AIRawResponse {
  readonly content: string;
  readonly tokenUsage: TokenUsage;
  readonly model: string;
  readonly provider: string;
  readonly finishReason?: string;
}

export interface AIProviderConfig {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

export interface ProviderValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

// AI Error Hierarchy
export class AIProviderError extends AppError {
  constructor(
    message: string = 'AI provider error',
    statusCode: number = 502,
    code: string = 'AI_PROVIDER_ERROR',
    details?: unknown
  ) {
    super(message, statusCode, code, details);
    this.name = 'AIProviderError';
  }
}

export class AIConfigurationError extends AIProviderError {
  constructor(message: string = 'AI provider not properly configured') {
    super(message, 500, 'AI_CONFIGURATION_ERROR');
    this.name = 'AIConfigurationError';
  }
}

export class AIRateLimitError extends AIProviderError {
  constructor(message: string = 'AI provider rate limit exceeded') {
    super(message, 429, 'AI_RATE_LIMIT_EXCEEDED');
    this.name = 'AIRateLimitError';
  }
}

export class AITimeoutError extends AIProviderError {
  constructor(message: string = 'AI request timed out') {
    super(message, 504, 'AI_TIMEOUT');
    this.name = 'AITimeoutError';
  }
}

export class AIInvalidResponseError extends AIProviderError {
  constructor(message: string = 'AI provider returned invalid response format', details?: unknown) {
    super(message, 502, 'AI_INVALID_RESPONSE', details);
    this.name = 'AIInvalidResponseError';
  }
}
