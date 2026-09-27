import { expect, test } from 'vitest';
import snapshot from '../../data/permits.snapshot.json';
import { savedAiAnalysis } from './ai-replay';
import type { ProjectDetail } from './types';

const project = {
  project: { id: 'development-10c' },
  records: snapshot.records.map(record => ({ permitId: record.permit_id, description: record.work_description })),
} as ProjectDetail;

test('saved AI replay is grounded in the selected real source text', () => {
  expect(savedAiAnalysis(project)?.findings).toHaveLength(5);
  const changed = {
    ...project,
    records: project.records.map(record => record.permitId === 'SSP-2025-03861'
      ? { ...record, description: 'Revised source text without the cited permit reference.' }
      : record),
  };
  expect(() => savedAiAnalysis(changed)).toThrow('no longer matches');
});
