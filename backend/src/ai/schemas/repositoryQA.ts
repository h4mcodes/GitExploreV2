import { z } from 'zod';

export const RepositoryQAResponseSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
  confidence: z
    .preprocess((val) => (typeof val === 'string' ? val.toUpperCase() : val), z.enum(['HIGH', 'MEDIUM', 'LOW']))
    .default('HIGH'),
  supportingEvidence: z.array(z.string()).default([]),
  limitations: z.string().nullable().optional(),
  suggestedFollowUps: z.array(z.string()).default([]),
});

export type RepositoryQAResponse = z.infer<typeof RepositoryQAResponseSchema>;
