import { z } from 'zod';

export const RepositoryHealthResponseSchema = z.object({
  healthGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
  vitalityStatus: z.enum(['THRIVING', 'HEALTHY', 'MAINTENANCE', 'STAGNANT', 'AT_RISK']),
  summary: z.string().min(1, 'Summary is required'),
  trajectoryAssessment: z.string(),
  maintenanceRisks: z.array(z.string()).default([]),
  codeChurnHotspots: z.array(z.string()).default([]),
  actionableRecommendations: z.array(z.string()).min(1, 'At least one recommendation is required'),
});

export type RepositoryHealthResponse = z.infer<typeof RepositoryHealthResponseSchema>;
