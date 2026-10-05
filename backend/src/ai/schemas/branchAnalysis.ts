import { z } from 'zod';

export const BaseBranchAnalysisResponseSchema = z.object({
  divergenceSummary: z.string().optional(),
  summary: z.string().optional(),
  syncStatus: z.enum(['SYNCED', 'AHEAD', 'BEHIND', 'DIVERGED']),
  mergeReadiness: z.enum(['READY', 'NEEDS_REBASE', 'CONFLICT_RISK', 'NOT_READY']),
  mergeRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('LOW'),
  keyContributions: z.array(z.string()).default([]),
  notableChanges: z.array(z.string()).default([]),
  mainAuthors: z.array(z.string()).default([]),
  riskFactors: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  aheadBehindAssessment: z.string().optional(),
  supportingEvidence: z.array(z.string()).default([]),
});

export const BranchAnalysisResponseSchema = BaseBranchAnalysisResponseSchema.refine(
  (data) => Boolean(data.divergenceSummary || data.summary),
  {
    message: 'Divergence summary is required',
    path: ['divergenceSummary'],
  }
).transform((val) => {
  const summary = val.divergenceSummary || val.summary || 'Branch divergence analysis completed.';
  const contributions =
    val.keyContributions.length > 0 ? val.keyContributions : val.notableChanges;
  const changes =
    val.notableChanges.length > 0 ? val.notableChanges : val.keyContributions;

  return {
    ...val,
    divergenceSummary: summary,
    summary,
    mergeRisk: val.mergeRisk ?? 'LOW',
    keyContributions: contributions,
    notableChanges: changes,
    supportingEvidence: val.supportingEvidence ?? [],
  };
});

export type BranchAnalysisResponse = z.infer<typeof BranchAnalysisResponseSchema>;
