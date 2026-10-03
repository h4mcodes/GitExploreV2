import { z } from 'zod';

export const RepositoryOverviewResponseSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  primaryStack: z.array(z.string()).default([]),
  activityLevel: z.enum(['HIGH', 'MODERATE', 'LOW', 'INACTIVE']),
  architectureObservations: z.array(z.string()).default([]),
  hotspotAnalysis: z.object({
    criticalFiles: z.array(z.string()).default([]),
    observations: z.string(),
  }),
  growthTrajectory: z.string(),
  keyTakeaways: z.array(z.string()).min(1, 'At least one takeaway is required'),
});

export type RepositoryOverviewResponse = z.infer<typeof RepositoryOverviewResponseSchema>;
