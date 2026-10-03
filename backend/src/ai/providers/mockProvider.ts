import {
  AIAnalysisRequest,
  AIRawResponse,
  AIProviderConfig,
  ProviderValidationResult,
} from '../types.js';
import { AIProvider } from '../provider.js';

export class MockAIProvider implements AIProvider {
  public readonly name = 'mock';
  public readonly model: string;
  private mockResponseGenerator?: (request: AIAnalysisRequest) => string;

  constructor(config: AIProviderConfig = {}) {
    this.model = config.model || 'mock-model-v1';
  }

  public setMockResponse(generator: (request: AIAnalysisRequest) => string): void {
    this.mockResponseGenerator = generator;
  }

  public isAvailable(): boolean {
    return true;
  }

  public validateConfiguration(): ProviderValidationResult {
    return { valid: true };
  }

  public async analyze(request: AIAnalysisRequest): Promise<AIRawResponse> {
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
