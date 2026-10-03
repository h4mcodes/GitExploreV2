import { createHash } from 'node:crypto';
import type { AIAnalysis } from '@prisma/client';
import type { AnalysisType, TokenUsage } from './types.js';
import {
  createAIAnalysis,
  findAIAnalysisByContextHash,
} from '../repositories/aiAnalysisRepository.js';

// Default TTLs per analysis type (in milliseconds)
export const DEFAULT_AI_CACHE_TTLS: Record<AnalysisType, number> = {
  REPOSITORY_OVERVIEW: 24 * 60 * 60 * 1000, // 24 hours
  COMMIT_EXPLANATION: 7 * 24 * 60 * 60 * 1000, // 7 days (immutable commit data)
  DIFF_REVIEW: 24 * 60 * 60 * 1000, // 24 hours
  BRANCH_ANALYSIS: 4 * 60 * 60 * 1000, // 4 hours (branches can update)
  REPOSITORY_HEALTH: 24 * 60 * 60 * 1000, // 24 hours
  REPOSITORY_QA: 12 * 60 * 60 * 1000, // 12 hours
  CUSTOM: 60 * 60 * 1000, // 1 hour
};

/**
 * Recursively sorts all keys in an object or array to ensure deterministic JSON serialization.
 */
export function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Computes a deterministic SHA-256 hash from the analysis type, context, and prompt version.
 */
export function computeContextHash(
  type: AnalysisType,
  context: Record<string, unknown>,
  promptVersion: string = '1.0.0'
): string {
  const normalized = {
    type,
    promptVersion,
    context: sortObjectKeys(context),
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export interface CachedAnalysisResult<T> {
  readonly id: string;
  readonly contextHash: string;
  readonly data: T;
  readonly provider: string;
  readonly modelId: string;
  readonly tokenUsage: TokenUsage;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
}

export interface StoreCachedAnalysisParams<T> {
  readonly type: AnalysisType;
  readonly contextHash: string;
  readonly prompt: string;
  readonly data: T;
  readonly provider: string;
  readonly modelId: string;
  readonly tokenUsage: TokenUsage;
  readonly repositoryId?: string | null;
  readonly ttlMs?: number;
}

/**
 * Retrieves a cached AI analysis if available and not expired.
 */
export async function getCachedAnalysis<T = Record<string, unknown>>(
  contextHash: string,
  now: Date = new Date()
): Promise<CachedAnalysisResult<T> | null> {
  const record = await findAIAnalysisByContextHash(contextHash, now);
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    contextHash: record.contextHash,
    data: record.response as unknown as T,
    provider: record.provider,
    modelId: record.modelId,
    tokenUsage: record.tokenUsage as unknown as TokenUsage,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
}

/**
 * Stores a freshly computed and validated AI analysis in the database cache.
 */
export async function storeCachedAnalysis<T = Record<string, unknown>>(
  params: StoreCachedAnalysisParams<T>
): Promise<AIAnalysis> {
  const {
    type,
    contextHash,
    prompt,
    data,
    provider,
    modelId,
    tokenUsage,
    repositoryId,
    ttlMs = DEFAULT_AI_CACHE_TTLS[type] || 24 * 60 * 60 * 1000,
  } = params;

  const expiresAt = new Date(Date.now() + ttlMs);

  return createAIAnalysis({
    repositoryId: repositoryId || null,
    analysisType: type,
    contextHash,
    prompt,
    response: data as unknown as Record<string, unknown>,
    provider,
    modelId,
    tokenUsage,
    expiresAt,
  });
}

export interface WithAICacheOptions<T> {
  readonly type: AnalysisType;
  readonly context: Record<string, unknown>;
  readonly prompt: string;
  readonly promptVersion?: string;
  readonly repositoryId?: string | null;
  readonly ttlMs?: number;
  readonly bypassCache?: boolean;
  readonly fetcher: () => Promise<{
    data: T;
    provider: string;
    modelId: string;
    tokenUsage: TokenUsage;
  }>;
}

export interface WithAICacheResult<T> {
  readonly data: T;
  readonly cached: boolean;
  readonly contextHash: string;
  readonly provider: string;
  readonly modelId: string;
  readonly tokenUsage: TokenUsage;
  readonly analysisId?: string;
}

/**
 * Higher-order cache orchestrator: checks cache -> returns hit OR invokes fetcher, caches result, and returns.
 */
export async function withAICache<T = Record<string, unknown>>(
  options: WithAICacheOptions<T>
): Promise<WithAICacheResult<T>> {
  const {
    type,
    context,
    prompt,
    promptVersion = '1.0.0',
    repositoryId,
    ttlMs,
    bypassCache = false,
    fetcher,
  } = options;

  const contextHash = computeContextHash(type, context, promptVersion);

  if (!bypassCache) {
    try {
      const cached = await getCachedAnalysis<T>(contextHash);
      if (cached) {
        return {
          data: cached.data,
          cached: true,
          contextHash,
          provider: cached.provider,
          modelId: cached.modelId,
          tokenUsage: cached.tokenUsage,
          analysisId: cached.id,
        };
      }
    } catch (cacheErr) {
      console.warn('[AI Cache] DB cache lookup failed (falling back to direct inference):', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }
  }

  // Cache miss: execute provider call
  const result = await fetcher();

  // Cache store (resilient to DB errors)
  let savedId: string | undefined;
  try {
    const saved = await storeCachedAnalysis<T>({
      type,
      contextHash,
      prompt,
      data: result.data,
      provider: result.provider,
      modelId: result.modelId,
      tokenUsage: result.tokenUsage,
      repositoryId,
      ttlMs,
    });
    savedId = saved.id;
  } catch (storeErr) {
    console.warn('[AI Cache] DB cache store failed (continuing without persistence):', storeErr instanceof Error ? storeErr.message : storeErr);
  }

  return {
    data: result.data,
    cached: false,
    contextHash,
    provider: result.provider,
    modelId: result.modelId,
    tokenUsage: result.tokenUsage,
    analysisId: savedId,
  };
}
