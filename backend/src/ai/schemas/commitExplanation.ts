import { z } from 'zod';

export const ModifiedComponentSchema = z.object({
  filename: z.string(),
  summary: z.string(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('LOW'),
});

export type ModifiedComponent = z.infer<typeof ModifiedComponentSchema>;

export const BaseCommitExplanationResponseSchema = z.object({
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
  motivation: z.string().optional(),
  technicalImpact: z.string().min(1, 'Technical impact is required'),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('LOW'),
  modifiedComponents: z.array(ModifiedComponentSchema).default([]),
  changesPerFile: z.array(ModifiedComponentSchema).default([]),
  potentialRisks: z.array(z.string()).default([]),
  isBreakingChange: z.boolean().default(false),
  keyChanges: z.array(z.string()).default([]),
});

export const CommitExplanationResponseSchema = BaseCommitExplanationResponseSchema.transform((val) => {
  const fileChanges =
    val.changesPerFile && val.changesPerFile.length > 0
      ? val.changesPerFile
      : val.modifiedComponents;

  return {
    ...val,
    motivation: val.motivation ?? val.summary,
    complexity: val.complexity ?? 'LOW',
    modifiedComponents: fileChanges,
    changesPerFile: fileChanges,
    keyChanges: val.keyChanges ?? [],
  };
});

export type CommitExplanationResponse = z.infer<typeof CommitExplanationResponseSchema>;

