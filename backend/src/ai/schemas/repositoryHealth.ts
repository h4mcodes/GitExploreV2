import { z } from 'zod';

const GRADE_TO_SCORE: Record<'A' | 'B' | 'C' | 'D' | 'F', number> = {
  A: 92,
  B: 82,
  C: 72,
  D: 62,
  F: 45,
};

export const BaseRepositoryHealthResponseSchema = z.object({
  healthGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
  healthScore: z.number().min(0).max(100).optional(),
  vitalityStatus: z.enum(['THRIVING', 'HEALTHY', 'MAINTENANCE', 'STAGNANT', 'AT_RISK']),
  summary: z.string().min(1, 'Summary is required'),
  trajectoryAssessment: z.string().default('Stable trajectory'),
  activityAssessment: z.string().optional(),
  maintenanceSignals: z.array(z.string()).default([]),
  maintenanceRisks: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  codeChurnHotspots: z.array(z.string()).default([]),
  actionableRecommendations: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  supportingEvidence: z.array(z.string()).default([]),
});

export const RepositoryHealthResponseSchema = BaseRepositoryHealthResponseSchema.refine(
  (data) => data.actionableRecommendations.length > 0 || data.recommendations.length > 0,
  {
    message: 'At least one recommendation is required',
    path: ['actionableRecommendations'],
  }
).transform((val) => {
  const score = val.healthScore ?? GRADE_TO_SCORE[val.healthGrade] ?? 80;
  const activity = val.activityAssessment ?? `Vitality classified as ${val.vitalityStatus.toLowerCase()}`;
  const allRisks = val.maintenanceRisks.length > 0 ? val.maintenanceRisks : val.risks;
  const allRecs =
    val.actionableRecommendations.length > 0
      ? val.actionableRecommendations
      : val.recommendations;

  return {
    ...val,
    healthScore: score,
    activityAssessment: activity,
    maintenanceRisks: allRisks,
    risks: allRisks,
    actionableRecommendations: allRecs,
    recommendations: allRecs,
    supportingEvidence: val.supportingEvidence ?? [],
  };
});

export type RepositoryHealthResponse = z.infer<typeof RepositoryHealthResponseSchema>;
