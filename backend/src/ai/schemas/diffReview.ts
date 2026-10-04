import { z } from 'zod';

export const DiffObservationSeveritySchema = z.enum(['CRITICAL', 'WARNING', 'INFO']);
export type DiffObservationSeverity = z.infer<typeof DiffObservationSeveritySchema>;

export const DiffObservationCategorySchema = z.enum([
  'BUG',
  'SECURITY',
  'PERFORMANCE',
  'CODE_QUALITY',
  'MAINTAINABILITY',
  'ARCHITECTURE',
  'OTHER',
]);
export type DiffObservationCategory = z.infer<typeof DiffObservationCategorySchema>;

export const DiffObservationSchema = z.object({
  message: z.string().min(1, 'Observation message is required'),
  severity: DiffObservationSeveritySchema.default('INFO'),
  category: DiffObservationCategorySchema.default('CODE_QUALITY'),
  lineNumber: z.number().int().positive().optional(),
  suggestion: z.string().optional(),
});
export type DiffObservation = z.infer<typeof DiffObservationSchema>;

export const FileDiffReviewSchema = z.object({
  filename: z.string(),
  status: z.string().default('modified'),
  feedback: z.string().default(''),
  issuesFound: z.array(z.string()).default([]),
  observations: z.array(DiffObservationSchema).default([]),
});
export type FileDiffReview = z.infer<typeof FileDiffReviewSchema>;

export const BaseDiffReviewResponseSchema = z.object({
  overallAssessment: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'NEUTRAL', 'HIGH_RISK']),
  summary: z.string().min(1, 'Summary is required'),
  netChangesSummary: z.string().default(''),
  fileReviews: z.array(FileDiffReviewSchema).default([]),
  riskFactors: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  keyObservations: z.array(DiffObservationSchema).default([]),
});

export const DiffReviewResponseSchema = BaseDiffReviewResponseSchema.transform((val) => {
  const harmonizedFileReviews = val.fileReviews.map((review) => {
    let obs = review.observations;
    let issues = review.issuesFound;

    if (obs.length === 0 && issues.length > 0) {
      obs = issues.map((issue) => ({
        message: issue,
        severity: 'WARNING' as const,
        category: 'CODE_QUALITY' as const,
      }));
    } else if (issues.length === 0 && obs.length > 0) {
      issues = obs.map((o) => o.message);
    }

    return {
      ...review,
      issuesFound: issues,
      observations: obs,
    };
  });

  return {
    ...val,
    fileReviews: harmonizedFileReviews,
    keyObservations: val.keyObservations ?? [],
  };
});

export type DiffReviewResponse = z.infer<typeof DiffReviewResponseSchema>;

