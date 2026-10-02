export * from './types.js';
export { buildCommitRelationshipGraph, clearCommitGraphCache } from './commitGraph.js';
export {
  computeCommitFrequency,
  computeChangeStats,
  computeActiveTimeline,
  computeCommitStatistics,
} from './statistics.js';
export { computeDivergence, summarizeCommitDelta } from './divergence.js';
export {
  computeFileChurn,
  findHotspotFiles,
  aggregateFileChanges,
} from './fileAnalysis.js';
export {
  computeEvolutionTimeline,
  identifyActivityPeriods,
  assessGrowthTrajectory,
  computeRepositoryEvolution,
} from './evolution.js';
