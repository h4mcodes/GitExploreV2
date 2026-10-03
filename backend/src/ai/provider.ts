import {
  AIAnalysisRequest,
  AIRawResponse,
  AIProviderConfig,
  ProviderValidationResult,
  AIConfigurationError,
} from './types.js';
import { env } from '../config/env.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { MockAIProvider } from './providers/mockProvider.js';

/**
 * Mandatory architectural interface boundary for all AI providers in GitExplore V2.
 * All controllers, services, and prompt builders must depend exclusively on this interface.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;

  /**
   * Executes structured AI analysis.
   */
  analyze(request: AIAnalysisRequest): Promise<AIRawResponse>;

  /**
   * Checks whether the provider is currently ready with credentials.
   */
  isAvailable(): boolean;

  /**
   * Validates provider configuration without performing inference.
   */
  validateConfiguration(): ProviderValidationResult;
}

// Global active provider instance (singleton with test override capabilities)
let activeProvider: AIProvider | null = null;

/**
 * Creates an instance of an AI provider based on name and config.
 */
export function createAIProvider(
  providerName: string = env.aiProvider,
  config?: AIProviderConfig
): AIProvider {
  const normalized = (providerName || 'gemini').trim().toLowerCase();

  switch (normalized) {
    case 'gemini':
    case 'google':
      return new GeminiProvider({
        apiKey: config?.apiKey ?? env.geminiApiKey,
        model: config?.model ?? env.geminiModel,
        baseUrl: config?.baseUrl,
        timeoutMs: config?.timeoutMs,
      });

    case 'mock':
    case 'test':
      return new MockAIProvider({
        model: config?.model ?? 'mock-model-v1',
      });

    default:
      throw new AIConfigurationError(
        `Unsupported AI provider "${providerName}". Supported providers: "gemini", "mock".`
      );
  }
}

/**
 * Retrieves the global default AIProvider instance.
 */
export function getAIProvider(): AIProvider {
  if (!activeProvider) {
    activeProvider = createAIProvider(env.aiProvider);
  }
  return activeProvider;
}

/**
 * Overrides the active AIProvider instance (useful for testing or runtime provider swapping).
 */
export function setAIProvider(provider: AIProvider | null): void {
  activeProvider = provider;
}

/**
 * Resets the active provider instance to default.
 */
export function resetAIProvider(): void {
  activeProvider = null;
}
