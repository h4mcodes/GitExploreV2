import { AIAnalysis, AnalysisType as PrismaAnalysisType, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import type { AnalysisType, TokenUsage } from '../ai/types.js';

export function toPrismaAnalysisType(type: AnalysisType): PrismaAnalysisType {
  switch (type) {
    case 'REPOSITORY_OVERVIEW':
      return PrismaAnalysisType.OVERVIEW;
    case 'COMMIT_EXPLANATION':
      return PrismaAnalysisType.COMMIT;
    case 'DIFF_REVIEW':
      return PrismaAnalysisType.DIFF;
    case 'BRANCH_ANALYSIS':
      return PrismaAnalysisType.BRANCH;
    case 'REPOSITORY_HEALTH':
      return PrismaAnalysisType.HEALTH;
    case 'REPOSITORY_QA':
    case 'CUSTOM':
    default:
      return PrismaAnalysisType.OVERVIEW;
  }
}

export interface CreateAIAnalysisInput {
  readonly repositoryId?: string | null;
  readonly analysisType: AnalysisType;
  readonly contextHash: string;
  readonly prompt: string;
  readonly response: Record<string, unknown> | Prisma.InputJsonValue;
  readonly provider: string;
  readonly modelId: string;
  readonly tokenUsage: TokenUsage | Record<string, unknown>;
  readonly expiresAt?: Date | null;
}

/**
 * Creates and persists a new AIAnalysis record in the database.
 */
export async function createAIAnalysis(input: CreateAIAnalysisInput): Promise<AIAnalysis> {
  return prisma.aIAnalysis.create({
    data: {
      repositoryId: input.repositoryId || null,
      analysisType: toPrismaAnalysisType(input.analysisType),
      contextHash: input.contextHash,
      prompt: input.prompt,
      response: input.response as Prisma.InputJsonValue,
      provider: input.provider,
      modelId: input.modelId,
      tokenUsage: input.tokenUsage as Prisma.InputJsonValue,
      expiresAt: input.expiresAt || null,
    },
  });
}

/**
 * Retrieves an active (non-expired) AIAnalysis record by its deterministic contextHash.
 */
export async function findAIAnalysisByContextHash(
  contextHash: string,
  now: Date = new Date()
): Promise<AIAnalysis | null> {
  const analysis = await prisma.aIAnalysis.findFirst({
    where: {
      contextHash,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!analysis) {
    return null;
  }

  // Check TTL expiration
  if (analysis.expiresAt && analysis.expiresAt <= now) {
    return null;
  }

  return analysis;
}

/**
 * Retrieves an AIAnalysis by its primary key ID.
 */
export async function findAIAnalysisById(id: string): Promise<AIAnalysis | null> {
  return prisma.aIAnalysis.findUnique({
    where: { id },
  });
}

/**
 * Retrieves all analyses stored for a specific repository.
 */
export async function findAIAnalysesByRepoId(repositoryId: string): Promise<AIAnalysis[]> {
  return prisma.aIAnalysis.findMany({
    where: { repositoryId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Deletes an AIAnalysis by ID.
 */
export async function deleteAIAnalysis(id: string): Promise<AIAnalysis> {
  return prisma.aIAnalysis.delete({
    where: { id },
  });
}

/**
 * Deletes all expired AIAnalysis records from the database.
 */
export async function deleteExpiredAnalyses(now: Date = new Date()): Promise<number> {
  const result = await prisma.aIAnalysis.deleteMany({
    where: {
      expiresAt: {
        lte: now,
      },
    },
  });
  return result.count;
}
