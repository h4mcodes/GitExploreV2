import { z } from 'zod';

export const RepositoryOverviewResponseSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  purpose: z.string().optional(),
  primaryStack: z.array(z.string()).default([]),
  techStack: z.array(z.string()).optional(),
  activityLevel: z.enum(['HIGH', 'MODERATE', 'LOW', 'INACTIVE']),
  maintenanceAssessment: z.string().optional(),
  architectureObservations: z.array(z.string()).default([]),
  notablePatterns: z.array(z.string()).optional(),
  hotspotAnalysis: z.object({
    criticalFiles: z.array(z.string()).default([]),
    observations: z.string(),
  }),
  growthTrajectory: z.string(),
  keyTakeaways: z.array(z.string()).min(1, 'At least one takeaway is required'),
});

export type RepositoryOverviewResponse = z.infer<typeof RepositoryOverviewResponseSchema>;
