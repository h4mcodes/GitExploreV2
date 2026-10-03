import { z } from 'zod';

export const CommitExplanationResponseSchema = z.object({
  intent: z.enum([
    'FEATURE',
    'BUGFIX',
    'REFACTOR',
    'PERFORMANCE',
    'DOCUMENTATION',
    'DEPENDENCY',
    'CHORE',
    'MERGE',
    'OTHER',
  ]),
  summary: z.string().min(1, 'Summary is required'),
  technicalImpact: z.string().min(1, 'Technical impact is required'),
  modifiedComponents: z.array(
    z.object({
      filename: z.string(),
      summary: z.string(),
      riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('LOW'),
    })
  ).default([]),
  potentialRisks: z.array(z.string()).default([]),
  isBreakingChange: z.boolean().default(false),
});

export type CommitExplanationResponse = z.infer<typeof CommitExplanationResponseSchema>;
