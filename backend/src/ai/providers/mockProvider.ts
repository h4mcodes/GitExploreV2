import {
  AIAnalysisRequest,
  AIRawResponse,
  AIProviderConfig,
  ProviderValidationResult,
  AITimeoutError,
} from '../types.js';
import { AIProvider } from '../provider.js';

export class MockAIProvider implements AIProvider {
  public readonly name = 'mock';
  public readonly model: string;
  private mockResponseGenerator?: (request: AIAnalysisRequest) => string;
  private simulatedDelayMs: number = 0;
  private simulatedError?: Error | (() => Error) | null;

  constructor(config: AIProviderConfig = {}) {
    this.model = config.model || 'mock-model-v1';
  }

  public setMockResponse(generator: (request: AIAnalysisRequest) => string): void {
    this.mockResponseGenerator = generator;
  }

  public setSimulatedDelay(ms: number): void {
    this.simulatedDelayMs = ms;
  }

  public setSimulatedError(error: Error | (() => Error) | null): void {
    this.simulatedError = error;
  }

  public isAvailable(): boolean {
    return true;
  }

  public validateConfiguration(): ProviderValidationResult {
    return { valid: true };
  }

  public async analyze(request: AIAnalysisRequest): Promise<AIRawResponse> {
    if (this.simulatedDelayMs > 0) {
      if (typeof request.timeoutMs === 'number' && this.simulatedDelayMs > request.timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(request.timeoutMs as number, 50)));
        throw new AITimeoutError(`Mock AI request timed out after ${request.timeoutMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs));
    }

    if (this.simulatedError) {
      const err = typeof this.simulatedError === 'function' ? this.simulatedError() : this.simulatedError;
      throw err;
    }

    const content = this.mockResponseGenerator
      ? this.mockResponseGenerator(request)
      : JSON.stringify({
          summary: `Mock analysis response for ${request.type}`,
          type: request.type,
          timestamp: new Date().toISOString(),
          contextReceived: Boolean(request.context && Object.keys(request.context).length > 0),
        });

    return {
      content,
      tokenUsage: {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
      },
      model: this.model,
      provider: this.name,
      finishReason: 'STOP',
    };
  }
}

