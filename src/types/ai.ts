/**
 * GitExplore V2 — Frontend AI Types
 * Mirrors the validated backend schemas from D7-P1 through D7-P5.
 */

export interface TokenUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
}

export interface AIAnalysisEnvelope<T> {
  readonly type: string;
  readonly data: T;
  readonly cached: boolean;
  readonly contextHash: string;
  readonly provider: string;
  readonly modelId: string;
  readonly tokenUsage: TokenUsage;
  readonly analysisId?: string;
}

// 1. Repository Overview (D7-P1)
export interface RepositoryOverviewData {
  summary: string;
  purpose?: string;
  primaryStack?: string[];
  techStack?: string[];
  activityLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'INACTIVE';
  maintenanceAssessment: string;
  architectureObservations?: string[];
  notablePatterns?: string[];
  hotspotAnalysis?: {
    criticalFiles?: string[];
    observations?: string;
  };
  growthTrajectory?: string;
  keyTakeaways: string[];
}

// 2. Commit Explainer (D7-P2)
export interface ComponentChange {
  filename: string;
  summary: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CommitExplanationData {
  intent: 'FEATURE' | 'BUGFIX' | 'REFACTOR' | 'PERFORMANCE' | 'DOCUMENTATION' | 'DEPENDENCY' | 'CHORE' | 'MERGE' | 'OTHER';
  summary: string;
  motivation?: string;
  technicalImpact: string;
  complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
  modifiedComponents: ComponentChange[];
  changesPerFile?: ComponentChange[];
  potentialRisks: string[];
  isBreakingChange?: boolean;
  keyChanges?: string[];
}

// 3. Diff Review (D7-P3)
export interface DiffObservation {
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'BUG' | 'SECURITY' | 'PERFORMANCE' | 'CODE_QUALITY' | 'MAINTAINABILITY' | 'ARCHITECTURE' | 'OTHER';
  lineNumber?: number;
  suggestion?: string;
}

export interface FileDiffReview {
  filename: string;
  status: 'modified' | 'added' | 'deleted';
  feedback: string;
  issuesFound?: string[];
  observations?: DiffObservation[];
}

export interface DiffReviewData {
  overallAssessment: 'APPROVED' | 'CHANGES_REQUESTED' | 'NEUTRAL' | 'HIGH_RISK';
  summary: string;
  netChangesSummary: string;
  fileReviews: FileDiffReview[];
  riskFactors?: string[];
  recommendations: string[];
  keyObservations?: DiffObservation[];
}

// 4. Branch Analysis (D7-P4)
export interface BranchAnalysisData {
  divergenceSummary: string;
  summary?: string;
  syncStatus: 'SYNCED' | 'AHEAD' | 'BEHIND' | 'DIVERGED';
  mergeReadiness: 'READY' | 'NEEDS_REBASE' | 'CONFLICT_RISK' | 'NOT_READY';
  mergeRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  keyContributions: string[];
  notableChanges: string[];
  mainAuthors: string[];
  riskFactors: string[];
  recommendations: string[];
  aheadBehindAssessment?: string;
}

// 5. Repository Health (D7-P5)
export interface RepositoryHealthData {
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  healthScore: number;
  vitalityStatus: 'THRIVING' | 'HEALTHY' | 'MAINTENANCE' | 'STAGNANT' | 'AT_RISK';
  summary: string;
  trajectoryAssessment: string;
  activityAssessment?: string;
  maintenanceSignals?: string[];
  maintenanceRisks: string[];
  risks?: string[];
  codeChurnHotspots: string[];
  actionableRecommendations: string[];
  recommendations?: string[];
}

// 6. Repository Q&A (D8-P2 / D8-P3)
export interface RepositoryQAData {
  answer: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  supportingEvidence: string[];
  limitations?: string | null;
  suggestedFollowUps: string[];
}
