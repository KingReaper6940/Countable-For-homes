import replay from '../../data/ai-replay.json';
import snapshot from '../../data/permits.snapshot.json';
import { supportedQuote } from './rules';
import type { ProjectDetail } from './types';

export function savedAiAnalysis(project: ProjectDetail) {
  if (project.project.id !== replay.projectId) return null;
  if (snapshot.sha256 !== replay.snapshotSha256) {
    throw new Error('The saved AI analysis belongs to a different permit snapshot. Refresh or remove the replay before presenting it.');
  }
  for (const finding of replay.findings) {
    const source = project.records.find(record => record.permitId === finding.permitId);
    if (!source || !supportedQuote(source.description, finding.quote)) {
      throw new Error(`The saved AI quote for ${finding.permitId} no longer matches the current source record.`);
    }
  }
  return replay;
}
