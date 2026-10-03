import { z } from 'zod';

export const DiffReviewResponseSchema = z.object({
  overallAssessment: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'NEUTRAL', 'HIGH_RISK']),
  summary: z.string().min(1, 'Summary is required'),
  netChangesSummary: z.string(),
  fileReviews: z.array(
    z.object({
      filename: z.string(),
      status: z.string(),
      feedback: z.string(),
      issuesFound: z.array(z.string()).default([]),
    })
  ).default([]),
  riskFactors: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

export type DiffReviewResponse = z.infer<typeof DiffReviewResponseSchema>;
