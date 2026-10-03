import { z } from 'zod';

export const BranchAnalysisResponseSchema = z.object({
  divergenceSummary: z.string().min(1, 'Divergence summary is required'),
  syncStatus: z.enum(['SYNCED', 'AHEAD', 'BEHIND', 'DIVERGED']),
  mergeReadiness: z.enum(['READY', 'NEEDS_REBASE', 'CONFLICT_RISK', 'NOT_READY']),
  keyContributions: z.array(z.string()).default([]),
  mainAuthors: z.array(z.string()).default([]),
  riskFactors: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

export type BranchAnalysisResponse = z.infer<typeof BranchAnalysisResponseSchema>;
