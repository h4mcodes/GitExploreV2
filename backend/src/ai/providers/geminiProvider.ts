import {
  AIAnalysisRequest,
  AIRawResponse,
  AIProviderConfig,
  ProviderValidationResult,
  AIConfigurationError,
  AIRateLimitError,
  AITimeoutError,
  AIInvalidResponseError,
  AIProviderError,
} from '../types.js';
import { AIProvider } from '../provider.js';

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
  finishReason?: string;
  index?: number;
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  modelVersion?: string;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';
  public readonly model: string;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(config: AIProviderConfig = {}) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-flash';
    this.baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    this.defaultTimeoutMs = config.timeoutMs ?? 30000; // 30 seconds default
  }

  /**
   * Checks whether the provider is configured with an API key.
   */
  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Validates provider configuration.
   */
  public validateConfiguration(): ProviderValidationResult {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      return {
        valid: false,
        reason: 'GEMINI_API_KEY is not configured in backend environment.',
      };
    }
    return { valid: true };
  }

  /**
   * Executes an analysis request against Google Gemini API.
   */
  public async analyze(request: AIAnalysisRequest): Promise<AIRawResponse> {
    const validation = this.validateConfiguration();
    if (!validation.valid || !this.apiKey) {
      throw new AIConfigurationError(validation.reason || 'Missing Gemini API configuration');
    }

    const endpoint = `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

    // Construct prompt payload combining context and user prompt
    const promptText = request.context && Object.keys(request.context).length > 0
      ? `EVIDENCE CONTEXT:\n\`\`\`json\n${JSON.stringify(request.context, null, 2)}\n\`\`\`\n\nTASK / INSTRUCTION:\n${request.prompt}`
      : request.prompt;

    const requestBody: {
      contents: GeminiContent[];
      systemInstruction?: GeminiContent;
      generationConfig: {
        temperature?: number;
        maxOutputTokens?: number;
        responseMimeType?: string;
        responseSchema?: Record<string, unknown>;
        stopSequences?: readonly string[];
      };
    } = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 2048,
        responseMimeType: 'application/json',
        ...(request.responseSchema ? { responseSchema: request.responseSchema } : {}),
        ...(request.stopSequences ? { stopSequences: request.stopSequences } : {}),
      },
    };

    if (request.systemInstruction) {
      requestBody.systemInstruction = {
        role: 'system',
        parts: [{ text: request.systemInstruction }],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      // Send API key via x-goog-api-key header to avoid exposing secrets in query string or access logs
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = (await response.json()) as GeminiApiResponse;

      if (data.error) {
        throw new AIProviderError(
          'Gemini API returned an error response.',
          502,
          'AI_PROVIDER_ERROR',
          { message: data.error.message }
        );
      }

      const candidate = data.candidates?.[0];
      const textPart = candidate?.content?.parts?.find((p) => typeof p.text === 'string')?.text ?? '';

      if (!textPart) {
        throw new AIInvalidResponseError('Gemini API returned empty candidate content.');
      }

      return {
        content: textPart,
        tokenUsage: {
          promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
        },
        model: data.modelVersion || this.model,
        provider: this.name,
        finishReason: candidate?.finishReason,
      };
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AITimeoutError(`Gemini request timed out after ${this.defaultTimeoutMs}ms`);
      }
      throw new AIProviderError(
        'Failed to communicate with Google Gemini API.',
        502,
        'AI_NETWORK_ERROR',
        { originalMessage: error instanceof Error ? error.message : 'Unknown error' }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Safely maps HTTP error status codes to typed AIProviderError instances without leaking keys.
   */
  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage = `Gemini API returned HTTP ${status}`;

    try {
      const errorJson = (await response.json()) as GeminiApiResponse;
      if (errorJson.error?.message) {
        // Sanitize error message to ensure no secret fragments leak
        errorMessage = errorJson.error.message.replace(/key=[^&\s]+/gi, 'key=REDACTED');
      }
    } catch {
      // Ignore JSON parse errors on non-200 responses
    }

    if (status === 401 || status === 403) {
      throw new AIConfigurationError('Google Gemini API authentication failed. Verify server GEMINI_API_KEY.');
    }
    if (status === 429) {
      throw new AIRateLimitError('Google Gemini API rate limit reached. Please retry shortly.');
    }
    if (status >= 500) {
      throw new AIProviderError('Google Gemini service is temporarily unavailable.', 503, 'AI_SERVICE_UNAVAILABLE');
    }

    throw new AIProviderError(errorMessage, 502, 'AI_HTTP_ERROR');
  }
}
